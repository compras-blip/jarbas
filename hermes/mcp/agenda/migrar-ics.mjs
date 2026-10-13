// migrar-ics.mjs — migra calendários exportados do Calendário da Apple (.ics) para a Google Agenda do Bruno.
// Uso (dentro do container, com o token em /opt/data/google_token.json):
//   node migrar-ics.mjs <pasta-com-ics>                 só lê e mostra o que faria (nada é gravado)
//   node migrar-ics.mjs <pasta-com-ics> --aplicar       cria os calendários e importa os eventos
//   node migrar-ics.mjs --desfazer <manifesto.jsonl>    apaga tudo o que o manifesto registra (eventos e calendários criados)
// Regras: "agenda diaria" vai para a agenda principal; os outros viram calendários secundários com o mesmo nome.
// Cada evento é importado por events.import (preserva o iCalUID; não manda convite a ninguém). Exceções de
// recorrência (RECURRENCE-ID) viram eventos próprios e o dia original sai da série por EXDATE. Reexecutar é
// seguro: o que já existe (mesmo iCalUID no mesmo calendário) é pulado. Tudo que é criado vai para o manifesto.
import { readdir, readFile, appendFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { lerIcs, dataGoogle, minutosDoTrigger, msDaDuracao, recorrenciaGoogle } from './ics.mjs';
import { chamar, ErroGoogle } from './google.mjs';

const FUSO = process.env.AGENDA_FUSO_PADRAO || 'America/Manaus';
const LIMITE = 20000;
const NOMES = { 'agenda diaria': 'primary', 'contas casa': 'Contas casa', 'medico': 'Médico', 'curso psicodrama': 'Curso psicodrama', 'calendario familia': 'Família', 'lembretes agendados': 'Lembretes agendados' };
const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const fusoOk = (z) => { try { new Intl.DateTimeFormat('en-US', { timeZone: z }); return true; } catch { return false; } };
const log = (...a) => console.log(...a);

function montarEvento(ev, fusoCal, { excecao = false } = {}) {
  const avisos = [];
  const fusoDe = (d) => { if (!d?.tzid) return undefined; if (fusoOk(d.tzid)) return d.tzid; avisos.push(`fuso desconhecido ${d.tzid} -> ${fusoCal}`); return fusoCal; };
  const g = (d) => { const r = dataGoogle({ ...d, tzid: fusoDe(d) }, fusoCal); return r; };
  const inicio = g(ev.inicio);
  if (!inicio) throw new Error('sem DTSTART');
  let fim = ev.fim ? g(ev.fim) : null;
  if (!fim) {
    if (inicio.date) { const d = new Date(inicio.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + Math.max(1, Math.round((msDaDuracao(ev.duracao) || 86400000) / 86400000))); fim = { date: d.toISOString().slice(0, 10) }; }
    else { const ms = msDaDuracao(ev.duracao) ?? 3600000; const base = Date.parse(inicio.dateTime.endsWith('Z') ? inicio.dateTime : inicio.dateTime + 'Z'); const f = new Date(base + ms).toISOString().slice(0, 19); fim = inicio.dateTime.endsWith('Z') ? { dateTime: f + 'Z' } : { dateTime: f, timeZone: inicio.timeZone }; }
  }
  if (inicio.date && !fim.date) { fim = { date: inicio.date }; avisos.push('fim com hora em evento de dia inteiro: ajustado'); }
  if (inicio.date && fim.date <= inicio.date) { const d = new Date(inicio.date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); fim = { date: d.toISOString().slice(0, 10) }; }
  const corpo = { iCalUID: excecao ? `${ev.uid}-exc-${ev.recurrenceId.valor}` : ev.uid, summary: ev.titulo || '(sem título)', start: inicio, end: fim };
  if (ev.local) corpo.location = ev.local;
  const desc = [ev.descricao, ev.url ? `Link: ${ev.url}` : ''].filter(Boolean).join('\n');
  if (desc) corpo.description = desc;
  if (!excecao) { const rec = recorrenciaGoogle(ev); if (rec.length) corpo.recurrence = rec; }
  const minutos = [...new Set(ev.alarmes.map((a) => minutosDoTrigger(a.trigger)).filter((m) => m !== null && m <= 40320))].slice(0, 5);
  corpo.reminders = { useDefault: false, overrides: minutos.map((m) => ({ method: 'popup', minutes: m })) };
  if (ev.transp === 'TRANSPARENT') corpo.transparency = 'transparent';
  if (ev.classe === 'PRIVATE' || ev.classe === 'CONFIDENTIAL') corpo.visibility = 'private';
  if (ev.status === 'TENTATIVE') corpo.status = 'tentative';
  const conv = ev.convidados.filter((c) => /^[^@\s]+@[^@\s]+$/.test(c.email)).slice(0, 50);
  if (conv.length) corpo.attendees = conv.map((c) => ({ email: c.email, displayName: c.nome || undefined }));
  return { corpo, avisos };
}

// Prepara os eventos de um .ics: mestres (com EXDATE das exceções) + exceções como eventos próprios.
export function prepararCalendario(cal) {
  const fusoCal = cal.fuso && fusoOk(cal.fuso) ? cal.fuso : FUSO;
  const mestres = new Map();
  const excecoes = [];
  const problemas = [];
  for (const ev of cal.eventos) {
    if (!ev.uid) { problemas.push(`sem UID: ${ev.titulo}`); continue; }
    if (ev.status === 'CANCELLED') continue;
    if (ev.recurrenceId) excecoes.push(ev); else mestres.set(ev.uid, ev);
  }
  for (const ex of excecoes) {
    const m = mestres.get(ex.uid);
    if (m) m.exdates.push({ ...ex.recurrenceId });
  }
  const saida = [];
  for (const ev of mestres.values()) {
    try { const { corpo, avisos } = montarEvento(ev, fusoCal); saida.push({ uid: ev.uid, corpo, avisos, titulo: ev.titulo }); }
    catch (e) { problemas.push(`${ev.uid} (${ev.titulo}): ${e.message}`); }
  }
  for (const ex of excecoes) {
    try { const { corpo, avisos } = montarEvento(ex, fusoCal, { excecao: true }); saida.push({ uid: corpo.iCalUID, corpo, avisos, titulo: ex.titulo, excecao: true }); }
    catch (e) { problemas.push(`${ex.uid} exceção (${ex.titulo}): ${e.message}`); }
  }
  return { fusoCal, eventos: saida, problemas, mestres: mestres.size, excecoes: excecoes.length };
}

async function listarAgendas() {
  const r = await chamar({ caminho: '/users/me/calendarList', q: { maxResults: 250, showHidden: 'true' }, limiteDiario: LIMITE });
  return r.items || [];
}

async function uidsExistentes(agendaId) {
  const uids = new Set();
  let pageToken;
  do {
    const r = await chamar({ caminho: `/calendars/${encodeURIComponent(agendaId)}/events`, q: { maxResults: 2500, singleEvents: 'false', showDeleted: 'false', pageToken, fields: 'nextPageToken,items(iCalUID)' }, limiteDiario: LIMITE });
    for (const it of r.items || []) if (it.iCalUID) uids.add(it.iCalUID);
    pageToken = r.nextPageToken;
  } while (pageToken);
  return uids;
}

async function importarComRepeticao(agendaId, corpo) {
  for (let i = 0; i < 5; i++) {
    try { return await chamar({ metodo: 'POST', caminho: `/calendars/${encodeURIComponent(agendaId)}/events/import`, corpo, limiteDiario: LIMITE, tentativas: 1 }); }
    catch (e) { if (e instanceof ErroGoogle && (e.transitorio || e.code === 'GOOGLE_HTTP_403') && i < 4) { await new Promise((r) => setTimeout(r, 2000 * (i + 1))); continue; } throw e; }
  }
}

async function migrar(pasta, aplicar) {
  const manifesto = path.join(pasta, `manifesto-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
  const arquivos = (await readdir(pasta)).filter((f) => f.toLowerCase().endsWith('.ics')).sort();
  if (!arquivos.length) { log('nenhum .ics em', pasta); return; }
  const agendas = aplicar ? await listarAgendas() : [];
  const resumo = [];
  for (const arq of arquivos) {
    const cal = lerIcs(await readFile(path.join(pasta, arq), 'utf8'));
    const nomeArq = normal(cal.nome || arq.replace(/\.ics$/i, ''));
    const alvo = NOMES[nomeArq] ?? (cal.nome || arq.replace(/\.ics$/i, ''));
    const prep = prepararCalendario(cal);
    const comAviso = prep.eventos.filter((e) => e.avisos.length).length;
    log(`\n### ${arq}: calendário "${cal.nome || '?'}" (fuso ${prep.fusoCal}) -> ${alvo === 'primary' ? 'agenda principal' : `calendário "${alvo}"`}`);
    log(`eventos no arquivo: ${cal.eventos.length} | mestres: ${prep.mestres} | exceções de recorrência: ${prep.excecoes} | a importar: ${prep.eventos.length} | com aviso: ${comAviso} | problemas: ${prep.problemas.length}`);
    for (const p of prep.problemas.slice(0, 10)) log('  problema:', p);
    for (const e of prep.eventos.filter((x) => x.avisos.length).slice(0, 5)) log('  aviso:', e.titulo, '->', e.avisos.join('; '));
    if (!aplicar) { resumo.push({ arq, alvo, total: prep.eventos.length }); continue; }
    let agendaId = 'primary';
    if (alvo !== 'primary') {
      const existente = agendas.find((a) => normal(a.summary) === normal(alvo));
      if (existente) { agendaId = existente.id; log(`calendário "${alvo}" já existe (${agendaId})`); }
      else {
        const novo = await chamar({ metodo: 'POST', caminho: '/calendars', corpo: { summary: alvo, timeZone: prep.fusoCal }, limiteDiario: LIMITE });
        agendaId = novo.id; agendas.push(novo);
        await appendFile(manifesto, JSON.stringify({ tipo: 'calendario', id: agendaId, nome: alvo }) + '\n');
        log(`calendário "${alvo}" criado (${agendaId})`);
      }
    }
    const existentes = await uidsExistentes(agendaId);
    let ok = 0, pulados = 0, erros = 0;
    const fila = [...prep.eventos];
    const trabalhador = async () => {
      while (fila.length) {
        const e = fila.shift();
        if (existentes.has(e.corpo.iCalUID)) { pulados++; continue; }
        try {
          const r = await importarComRepeticao(agendaId, e.corpo);
          ok++;
          await appendFile(manifesto, JSON.stringify({ tipo: 'evento', agenda: agendaId, id: r.id, uid: e.corpo.iCalUID, titulo: e.titulo }) + '\n');
        } catch (err) { erros++; log('  erro:', e.titulo, '|', err.code || err.message, err.detalhe || ''); }
        if ((ok + pulados + erros) % 100 === 0) log(`  ... ${ok + pulados + erros}/${prep.eventos.length}`);
      }
    };
    await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
    log(`importados: ${ok} | já existiam: ${pulados} | erros: ${erros}`);
    resumo.push({ arq, alvo, importados: ok, pulados, erros });
  }
  log('\n### resumo'); for (const r of resumo) log(JSON.stringify(r));
  if (aplicar) log('manifesto:', manifesto);
}

async function desfazer(arquivo) {
  const linhas = (await readFile(arquivo, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let ev = 0, cal = 0, erros = 0;
  for (const l of linhas.filter((x) => x.tipo === 'evento')) {
    try { await chamar({ metodo: 'DELETE', caminho: `/calendars/${encodeURIComponent(l.agenda)}/events/${encodeURIComponent(l.id)}`, limiteDiario: LIMITE }); ev++; }
    catch (e) { if (e.code !== 'GOOGLE_HTTP_410' && e.code !== 'GOOGLE_HTTP_404') { erros++; log('erro', l.id, e.code); } else ev++; }
  }
  for (const l of linhas.filter((x) => x.tipo === 'calendario')) {
    try { await chamar({ metodo: 'DELETE', caminho: `/calendars/${encodeURIComponent(l.id)}`, limiteDiario: LIMITE }); cal++; } catch (e) { erros++; log('erro calendário', l.nome, e.code); }
  }
  log(`desfeito: ${ev} eventos, ${cal} calendários, ${erros} erros`);
}

const args = process.argv.slice(2);
if (args[0] === '--desfazer' && args[1]) await desfazer(args[1]);
else if (args[0]) await migrar(args[0], args.includes('--aplicar'));
else { log('uso: node migrar-ics.mjs <pasta> [--aplicar] | --desfazer <manifesto.jsonl>'); process.exit(1); }
