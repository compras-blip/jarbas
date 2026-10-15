// migrar-apple.mjs — migra os TSV extraídos do app Calendário da Apple (extrair-calendario.applescript) para a
// Google Agenda do Bruno. Mesma lógica do migrar-ics.mjs (calendário por arquivo, events.import com iCalUID,
// manifesto para desfazer), mas a entrada é o TSV: uid, titulo, inicio, fim (hora local do Mac que extraiu),
// dia_inteiro, local, descricao, url, status, recorrencia (RRULE sem prefixo), exdates (locais), sequencia.
// Uso: node migrar-apple.mjs <pasta-com-tsv> [--aplicar] [--fuso-origem America/Recife] | --desfazer <manifesto>
// Alertas: a Apple não exporta os alarmes por este caminho; os eventos entram com "useDefault" e cada calendário
// criado recebe os alertas padrão do Bruno (60 e 30 min), o que vale para todos os eventos de uma vez.
import { readdir, readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chamar, ErroGoogle } from './google.mjs';
import { localParaUtc, rfc3339, lerDataHora, fusoValido } from './tempo.mjs';

const FUSO_DESTINO = process.env.AGENDA_FUSO_PADRAO || 'America/Manaus';
const LIMITE = 20000;
const NOMES = { 'agenda-diaria': 'primary', 'contas-casa': 'Contas casa', 'medico': 'Médico', 'curso-psicodrama': 'Curso psicodrama', 'calendario-familia': 'Família', 'lembretes-agendados': 'Lembretes agendados' };
const ALERTAS_PADRAO = [60, 30];
const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const log = (...a) => console.log(...a);
const dois = (n) => String(n).padStart(2, '0');

function lerTsv(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').split('\n').filter((l) => l.length);
  const cab = linhas[0].split('\t');
  return linhas.slice(1).map((l) => { const v = l.split('\t'); const o = {}; cab.forEach((k, i) => { o[k] = (v[i] ?? '').replace(/\\n/g, '\n'); }); return o; });
}

// "2026-10-16T15:30:00" na hora local do Mac de origem -> instante UTC
const instante = (txt, fusoOrigem) => localParaUtc(fusoOrigem, lerDataHora(txt.slice(0, 16)));
// instante -> "AAAA-MM-DDTHH:MM:SS" no fuso de destino (sem deslocamento; vai com timeZone)
const localDestino = (ms) => rfc3339(FUSO_DESTINO, ms).slice(0, 19);
const compacto = (ms) => localDestino(ms).replace(/[-:]/g, '');

export function montarEvento(r, fusoOrigem, { excecao = 0 } = {}) {
  const avisos = [];
  const diaInteiro = r.dia_inteiro === 'true';
  const corpo = { iCalUID: excecao ? `${r.uid}-exc-${excecao}` : r.uid, summary: r.titulo || '(sem título)', reminders: { useDefault: true } };
  if (r.local) corpo.location = r.local;
  const desc = [r.descricao, r.url ? `Link: ${r.url}` : ''].filter(Boolean).join('\n');
  if (desc) corpo.description = desc;
  if (r.status === 'tentative') corpo.status = 'tentative';
  if (diaInteiro) {
    const d0 = r.inicio.slice(0, 10), d1 = r.fim.slice(0, 10);
    const fim = new Date(d1 + 'T00:00:00Z'); fim.setUTCDate(fim.getUTCDate() + 1);
    corpo.start = { date: d0 }; corpo.end = { date: fim.toISOString().slice(0, 10) };
    if (corpo.end.date <= d0) { const f = new Date(d0 + 'T00:00:00Z'); f.setUTCDate(f.getUTCDate() + 1); corpo.end.date = f.toISOString().slice(0, 10); }
  } else {
    const a = instante(r.inicio, fusoOrigem);
    let b = r.fim ? instante(r.fim, fusoOrigem) : a + 3600000;
    if (b < a) { avisos.push('fim antes do início: ajustado para 1 h'); b = a + 3600000; }
    corpo.start = { dateTime: localDestino(a), timeZone: FUSO_DESTINO }; corpo.end = { dateTime: localDestino(b), timeZone: FUSO_DESTINO };
  }
  if (!excecao && r.recorrencia) {
    const rec = [`RRULE:${r.recorrencia.replace(/^RRULE:/i, '').replace(/UNTIL=(\d{8}T\d{6})(?![\dZ])/, 'UNTIL=$1Z')}`];
    if (r.exdates) {
      const ex = r.exdates.split(',').filter(Boolean).map((t) => diaInteiro ? t.slice(0, 10).replace(/-/g, '') : compacto(instante(t, fusoOrigem)));
      if (ex.length) rec.push(diaInteiro ? `EXDATE;VALUE=DATE:${ex.join(',')}` : `EXDATE;TZID=${FUSO_DESTINO}:${ex.join(',')}`);
    }
    corpo.recurrence = rec;
  }
  return { corpo, avisos };
}

export function preparar(registros, fusoOrigem) {
  const vistos = new Map();
  const saida = [];
  const problemas = [];
  for (const r of registros) {
    if (!r.uid || !r.inicio) { problemas.push(`sem uid ou início: ${r.titulo}`); continue; }
    if (r.status === 'cancelled') continue;
    const n = (vistos.get(r.uid) || 0); vistos.set(r.uid, n + 1);
    try { const { corpo, avisos } = montarEvento(r, fusoOrigem, { excecao: n }); saida.push({ corpo, avisos, titulo: r.titulo }); }
    catch (e) { problemas.push(`${r.uid} (${r.titulo}): ${e.message}`); }
  }
  return { eventos: saida, problemas, duplicados: [...vistos.values()].filter((v) => v > 1).length };
}

async function listarAgendas() { const r = await chamar({ caminho: '/users/me/calendarList', q: { maxResults: 250, showHidden: 'true' }, limiteDiario: LIMITE }); return r.items || []; }

async function uidsExistentes(agendaId) {
  const uids = new Set(); let pageToken;
  do {
    const r = await chamar({ caminho: `/calendars/${encodeURIComponent(agendaId)}/events`, q: { maxResults: 2500, singleEvents: 'false', showDeleted: 'false', pageToken, fields: 'nextPageToken,items(iCalUID)' }, limiteDiario: LIMITE });
    for (const it of r.items || []) if (it.iCalUID) uids.add(it.iCalUID);
    pageToken = r.nextPageToken;
  } while (pageToken);
  return uids;
}

async function importar(agendaId, corpo) {
  for (let i = 0; i < 5; i++) {
    try { return await chamar({ metodo: 'POST', caminho: `/calendars/${encodeURIComponent(agendaId)}/events/import`, corpo, limiteDiario: LIMITE, tentativas: 1 }); }
    catch (e) { if (e instanceof ErroGoogle && (e.transitorio || e.code === 'GOOGLE_HTTP_403') && i < 4) { await new Promise((r) => setTimeout(r, 2000 * (i + 1))); continue; } throw e; }
  }
}

async function garantirAlertasPadrao(agendaId) {
  await chamar({ metodo: 'PATCH', caminho: `/users/me/calendarList/${encodeURIComponent(agendaId)}`, corpo: { defaultReminders: ALERTAS_PADRAO.map((m) => ({ method: 'popup', minutes: m })) }, limiteDiario: LIMITE });
}

async function migrar(pasta, aplicar, fusoOrigem) {
  if (!fusoValido(fusoOrigem)) throw new Error(`fuso de origem inválido: ${fusoOrigem}`);
  const manifesto = path.join(pasta, `manifesto-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.tsv')).sort();
  const agendas = aplicar ? await listarAgendas() : [];
  const resumo = [];
  for (const arq of arquivos) {
    const chave = normal(arq.replace(/\.tsv$/, ''));
    const alvo = NOMES[chave] ?? arq.replace(/\.tsv$/, '');
    const regs = lerTsv(await readFile(path.join(pasta, arq), 'utf8'));
    const prep = preparar(regs, fusoOrigem);
    const futuros = prep.eventos.filter((e) => (e.corpo.start.dateTime || e.corpo.start.date) >= new Date().toISOString().slice(0, 10)).length;
    const recorrentes = prep.eventos.filter((e) => e.corpo.recurrence).length;
    log(`\n### ${arq} -> ${alvo === 'primary' ? 'agenda principal' : `calendário "${alvo}"`}: ${regs.length} linhas | a importar ${prep.eventos.length} | recorrentes ${recorrentes} | futuros ${futuros} | uids repetidos ${prep.duplicados} | problemas ${prep.problemas.length}`);
    for (const p of prep.problemas.slice(0, 8)) log('  problema:', p);
    for (const e of prep.eventos.filter((x) => x.avisos.length).slice(0, 5)) log('  aviso:', e.titulo, '->', e.avisos.join('; '));
    if (!aplicar) { log('  exemplo:', JSON.stringify(prep.eventos[0]?.corpo || {}).slice(0, 300)); resumo.push({ arq, alvo, total: prep.eventos.length }); continue; }
    let agendaId = 'primary';
    if (alvo !== 'primary') {
      const ex = agendas.find((a) => normal(a.summary) === normal(alvo));
      if (ex) { agendaId = ex.id; log(`  calendário "${alvo}" já existe`); }
      else { const novo = await chamar({ metodo: 'POST', caminho: '/calendars', corpo: { summary: alvo, timeZone: FUSO_DESTINO }, limiteDiario: LIMITE }); agendaId = novo.id; agendas.push(novo); await appendFile(manifesto, JSON.stringify({ tipo: 'calendario', id: agendaId, nome: alvo }) + '\n'); log(`  calendário "${alvo}" criado`); }
    }
    try { await garantirAlertasPadrao(agendaId); log('  alertas padrão do calendário: 60 e 30 min'); } catch (e) { log('  (não deu para definir alertas padrão:', e.code || e.message, ')'); }
    const existentes = await uidsExistentes(agendaId);
    let ok = 0, pulados = 0, erros = 0; const fila = [...prep.eventos];
    const trab = async () => { while (fila.length) { const e = fila.shift(); if (existentes.has(e.corpo.iCalUID)) { pulados++; continue; } try { const r = await importar(agendaId, e.corpo); ok++; await appendFile(manifesto, JSON.stringify({ tipo: 'evento', agenda: agendaId, id: r.id, uid: e.corpo.iCalUID, titulo: e.titulo }) + '\n'); } catch (err) { erros++; log('  erro:', e.titulo, '|', err.code || err.message, err.detalhe || ''); } const t = ok + pulados + erros; if (t % 100 === 0) log(`  ... ${t}/${prep.eventos.length}`); } };
    await Promise.all([trab(), trab(), trab(), trab()]);
    log(`  importados ${ok} | já existiam ${pulados} | erros ${erros}`);
    resumo.push({ arq, alvo, importados: ok, pulados, erros });
  }
  log('\n### resumo'); for (const r of resumo) log(JSON.stringify(r));
  if (aplicar) log('manifesto:', manifesto);
}

// Ocorrências destacadas (mesmo uid do mestre recorrente) foram importadas como eventos próprios; o mestre ainda
// gera a instância naquele dia. Este passo acrescenta EXDATE no mestre para o DIA de cada ocorrência destacada.
export function exdatesParaMestre(mestre, destacados, fusoOrigem) {
  const diaInteiro = mestre.dia_inteiro === 'true';
  const out = new Set();
  for (const d of destacados) {
    if (diaInteiro) out.add(d.inicio.slice(0, 10).replace(/-/g, ''));
    else {
      const horaMestre = localDestino(instante(mestre.inicio, fusoOrigem)).slice(11, 19).replace(/:/g, '');
      const diaDestacado = localDestino(instante(d.inicio, fusoOrigem)).slice(0, 10).replace(/-/g, '');
      out.add(`${diaDestacado}T${horaMestre}`);
    }
  }
  return { diaInteiro, lista: [...out].sort() };
}

async function corrigirDuplicatas(pasta, fusoOrigem) {
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.tsv')).sort();
  const agendas = await listarAgendas();
  let corrigidos = 0, semMestre = 0, erros = 0;
  for (const arq of arquivos) {
    const chave = normal(arq.replace(/\.tsv$/, ''));
    const alvo = NOMES[chave] ?? arq.replace(/\.tsv$/, '');
    const agendaId = alvo === 'primary' ? 'primary' : agendas.find((a) => normal(a.summary) === normal(alvo))?.id;
    if (!agendaId) { log(`${arq}: calendário "${alvo}" não existe no Google`); continue; }
    const regs = lerTsv(await readFile(path.join(pasta, arq), 'utf8'));
    const grupos = new Map();
    for (const r of regs) { if (!grupos.has(r.uid)) grupos.set(r.uid, []); grupos.get(r.uid).push(r); }
    for (const [uid, lista] of grupos) {
      if (lista.length < 2) continue;
      const mestre = lista.find((r) => r.recorrencia);
      if (!mestre) { semMestre++; continue; }
      const destacados = lista.filter((r) => r !== mestre);
      const { diaInteiro, lista: ex } = exdatesParaMestre(mestre, destacados, fusoOrigem);
      try {
        const busca = await chamar({ caminho: `/calendars/${encodeURIComponent(agendaId)}/events`, q: { iCalUID: uid, singleEvents: 'false', fields: 'items(id,recurrence,summary)' }, limiteDiario: LIMITE });
        const ev = (busca.items || []).find((e) => e.recurrence);
        if (!ev) { log(`  mestre não achado no Google: ${uid} (${mestre.titulo})`); erros++; continue; }
        const atual = ev.recurrence || [];
        const linha = diaInteiro ? `EXDATE;VALUE=DATE:${ex.join(',')}` : `EXDATE;TZID=${FUSO_DESTINO}:${ex.join(',')}`;
        const nova = [...atual.filter((l) => !l.startsWith('EXDATE;TZID=' + FUSO_DESTINO + ':') || true), linha];
        await chamar({ metodo: 'PATCH', caminho: `/calendars/${encodeURIComponent(agendaId)}/events/${encodeURIComponent(ev.id)}`, corpo: { recurrence: nova }, limiteDiario: LIMITE });
        corrigidos++;
      } catch (e) { erros++; log(`  erro em ${mestre.titulo}: ${e.code || e.message} ${e.detalhe || ''}`); }
    }
    log(`${arq}: grupos tratados até agora ${corrigidos}`);
  }
  log(`duplicatas corrigidas: ${corrigidos} mestres | sem mestre recorrente: ${semMestre} | erros: ${erros}`);
}

async function desfazer(arquivo) {
  const linhas = (await readFile(arquivo, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let ev = 0, cal = 0, erros = 0;
  for (const l of linhas.filter((x) => x.tipo === 'evento')) { try { await chamar({ metodo: 'DELETE', caminho: `/calendars/${encodeURIComponent(l.agenda)}/events/${encodeURIComponent(l.id)}`, limiteDiario: LIMITE }); ev++; } catch (e) { if (e.code === 'GOOGLE_HTTP_410' || e.code === 'GOOGLE_HTTP_404') ev++; else { erros++; log('erro', l.id, e.code); } } }
  for (const l of linhas.filter((x) => x.tipo === 'calendario')) { try { await chamar({ metodo: 'DELETE', caminho: `/calendars/${encodeURIComponent(l.id)}`, limiteDiario: LIMITE }); cal++; } catch (e) { erros++; log('erro calendário', l.nome, e.code); } }
  log(`desfeito: ${ev} eventos, ${cal} calendários, ${erros} erros`);
}

const ehPrincipal = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
const args = ehPrincipal ? process.argv.slice(2) : [];
const fusoArg = args.includes('--fuso-origem') ? args[args.indexOf('--fuso-origem') + 1] : 'America/Recife';
if (args[0] === '--desfazer' && args[1]) await desfazer(args[1]);
else if (args[0] === '--corrigir-duplicatas' && args[1]) await corrigirDuplicatas(args[1], fusoArg);
else if (args[0] && !args[0].startsWith('--')) await migrar(args[0], args.includes('--aplicar'), fusoArg);
else if (ehPrincipal) { log('uso: node migrar-apple.mjs <pasta> [--aplicar] [--fuso-origem X] | --corrigir-duplicatas <pasta> | --desfazer <manifesto.jsonl>'); process.exit(1); }
