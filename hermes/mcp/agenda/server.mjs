// server.mjs — servidor MCP "agenda": a Google Agenda do Bruno para o Atlas, em 5 ferramentas:
//   agenda_listar, agenda_livre, agenda_criar, agenda_mudar, agenda_cancelar.
// Regras que viraram código (preferência E do Bruno e princípio 7): todo compromisso criado sai com alertas de
// 60 e 30 min; conflito é checado ANTES de criar ou mudar e a ferramenta devolve o choque em vez de criar;
// convite por e-mail só quando pedido; horários sempre no fuso do Bruno (America/Manaus) salvo quando dito.
// Feito para o Hermes Agent (mcp_servers em config.yaml) com o SDK oficial do MCP. Docs: docs-google-calendar/.
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { listarEventos, consultarLivre, inserirEvento, obterEvento, remendarEvento, apagarEvento, listarAgendas, ErroGoogle, chamadasHoje, FONTE } from './google.mjs';
import { FUSO_PADRAO, ErroTempo, fusoValido, lerData, lerDataHora, localParaUtc, rfc3339, dataIso, somarDias, hojeNoFuso, fmtFaixa, fmtDia, fmtDiaLongo, fmtHora, fmtDataSolta, cruzam, buracos, fmtMinutos } from './tempo.mjs';

const limiteDiario = Number(process.env.AGENDA_LIMITE_DIARIO) || 300;
const LIMITE_TEXTO = 1800;
const ALERTAS_PADRAO = [60, 30];
const log = (...a) => console.error('[agenda]', new Date().toISOString(), ...a);

const ok = (texto) => ({ content: [{ type: 'text', text: texto.length > LIMITE_TEXTO ? texto.slice(0, LIMITE_TEXTO - 15) + '\n[cortado]' : texto }] });
const falha = (texto) => ({ content: [{ type: 'text', text: texto }], isError: true });
const fim = (ferramenta, texto, ...extra) => { log(ferramenta, ...extra, `chamadas_hoje=${chamadasHoje()}`); return ok(texto); };
const limpa = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

function mensagemErro(e) {
  const c = e?.code || '';
  if (c === 'TOKEN_AUSENTE' || c === 'TOKEN_INCOMPLETO') return 'A agenda do Google ainda não está autorizada neste servidor. Diga ao Bruno que o Felipe cuida disso.';
  if (c === 'TOKEN_REVOGADO' || c === 'TOKEN_RENOVACAO_FALHOU' || c === 'GOOGLE_HTTP_401') return 'A autorização da agenda do Google expirou ou foi revogada. Diga ao Bruno que o Felipe precisa autorizar de novo.';
  if (c === 'GOOGLE_LIMITE_DIARIO') return 'Limite diário de consultas à agenda atingido. Diga que não dá para conferir hoje.';
  if (c === 'GOOGLE_HTTP_403') return `O Google recusou a operação na agenda${e.detalhe ? ` (${e.detalhe})` : ''}. Diga ao Bruno que o Felipe cuida disso.`;
  if (c === 'GOOGLE_HTTP_404') return 'Compromisso não encontrado na agenda (o identificador não existe ou já foi apagado).';
  if (c === 'GOOGLE_HTTP_410') return 'Esse compromisso já tinha sido cancelado.';
  if (c === 'GOOGLE_HTTP_400') return `O Google rejeitou os dados do compromisso${e.detalhe ? ` (${e.detalhe})` : ''}. Confira datas, horas e e-mails.`;
  if (c === 'GOOGLE_HTTP_409') return 'Já existe um compromisso com esse identificador.';
  if (c === 'GOOGLE_HTTP_412') return 'O compromisso mudou enquanto você alterava. Consulte de novo e repita.';
  if (c === 'DATA_INVALIDA') return `Data inválida (${e.detalhe}): use AAAA-MM-DD.`;
  if (c === 'DATA_HORA_INVALIDA') return `Data e hora inválidas (${e.detalhe}): use AAAA-MM-DDTHH:MM, por exemplo 2026-10-16T15:00.`;
  if (c === 'FUSO_INVALIDO') return `Fuso inválido (${e.detalhe}): use um nome IANA, por exemplo America/Manaus ou Europe/Rome.`;
  if (c === 'FIM_ANTES_DO_INICIO') return 'O fim precisa ser depois do início.';
  if (c === 'PERIODO_INVALIDO') return 'O período precisa ter o fim depois do início e no máximo 62 dias.';
  if (c === 'AGENDA_DESCONHECIDA') return `Não existe calendário com esse nome (${e.detalhe}).`;
  if (e?.transitorio) return 'O Google Agenda não respondeu agora. Tente de novo em instantes; se falhar, diga que não conseguiu confirmar.';
  return 'Falha ao acessar a agenda do Google. Diga que não conseguiu confirmar.';
}

async function protegido(fn) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof ErroGoogle || e instanceof ErroTempo) { log('erro', e.code, e.detalhe || ''); return falha(mensagemErro(e)); }
    log('erro inesperado', e?.message || e); return falha('Falha inesperada ao acessar a agenda. Diga que não conseguiu confirmar.');
  }
}

// Calendários da conta (a principal + os secundários: Médico, Família...). Cache de 10 min.
const normal = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cacheAgendas = { em: 0, lista: [] };
async function agendas() {
  if (Date.now() - cacheAgendas.em < 10 * 60000 && cacheAgendas.lista.length) return cacheAgendas.lista;
  const r = await listarAgendas({ limiteDiario });
  cacheAgendas.lista = (r.items || []).filter((a) => !a.hidden && !a.deleted && a.selected !== false).map((a) => ({ id: a.id, nome: a.summaryOverride || a.summary || a.id, principal: Boolean(a.primary), escreve: ['owner', 'writer'].includes(a.accessRole) }));
  cacheAgendas.em = Date.now();
  return cacheAgendas.lista;
}
// "Médico", "medico", "primary", id -> id do calendário. Nome desconhecido = erro claro.
async function resolverAgenda(nomeOuId) {
  const t = limpa(nomeOuId);
  if (!t || t === 'primary' || normal(t) === 'principal') return 'primary';
  const lista = await agendas();
  const n = normal(t);
  const achou = lista.find((a) => normal(a.nome) === n) || lista.find((a) => a.id === t) || lista.find((a) => normal(a.nome).includes(n));
  if (!achou) throw new ErroTempo('AGENDA_DESCONHECIDA', `${t}; existem: ${lista.map((a) => a.nome).join(', ')}`);
  return achou.principal ? 'primary' : achou.id;
}
const nomeDaAgenda = async (id) => { if (id === 'primary') return ''; const a = (await agendas()).find((x) => x.id === id); return a ? (a.principal ? '' : a.nome) : id; };
// Acha um evento pelo id quando a agenda não foi dita: tenta a principal e depois as outras.
async function acharEvento(id, agendaDita) {
  if (agendaDita) { const ag = await resolverAgenda(agendaDita); return { agenda: ag, evento: await obterEvento({ agenda: ag, id, limiteDiario }) }; }
  const todas = ['primary', ...(await agendas()).filter((a) => !a.principal).map((a) => a.id)];
  let ultimo = null;
  for (const ag of todas) {
    try { return { agenda: ag, evento: await obterEvento({ agenda: ag, id, limiteDiario }) }; }
    catch (e) { if (e instanceof ErroGoogle && (e.code === 'GOOGLE_HTTP_404' || e.code === 'GOOGLE_HTTP_410')) { ultimo = e; continue; } throw e; }
  }
  throw ultimo || new ErroGoogle('GOOGLE_HTTP_404');
}

const fusoOu = (f) => {
  const z = limpa(f) || FUSO_PADRAO;
  if (!fusoValido(z)) throw new ErroTempo('FUSO_INVALIDO', z);
  return z;
};

// Instantes de um evento do Google (ms UTC) e se é dia inteiro.
function janelaDoEvento(ev) {
  if (ev?.start?.date) {
    const a = lerData(ev.start.date), b = lerData(ev.end?.date || dataIso(somarDias(a, 1)));
    return { diaInteiro: true, inicio: Date.UTC(a.ano, a.mes - 1, a.dia), fim: Date.UTC(b.ano, b.mes - 1, b.dia), dataInicio: ev.start.date, dataFim: ev.end?.date };
  }
  return { diaInteiro: false, inicio: Date.parse(ev?.start?.dateTime), fim: Date.parse(ev?.end?.dateTime) };
}

const RESPOSTA = { accepted: 'aceitou', declined: 'recusou', tentative: 'talvez', needsAction: 'sem resposta' };
function convidados(ev) {
  const lista = (ev.attendees || []).filter((a) => !a.self && !a.resource);
  if (!lista.length) return '';
  return 'com ' + lista.map((a) => `${a.displayName || a.email}${a.optional ? ' (opcional)' : ''} (${RESPOSTA[a.responseStatus] || 'sem resposta'})`).join(', ');
}
function meetDe(ev) {
  const v = (ev.conferenceData?.entryPoints || []).find((p) => p.entryPointType === 'video');
  return v?.uri || ev.hangoutLink || '';
}
function alertasDe(ev) {
  if (ev.reminders?.useDefault) return 'alertas padrão da agenda';
  const o = ev.reminders?.overrides || [];
  if (!o.length) return 'sem alerta';
  return 'alertas ' + o.map((r) => `${fmtMinutos(r.minutes)} antes${r.method === 'email' ? ' (e-mail)' : ''}`).join(', ');
}

// Uma linha por evento, no fuso pedido. O id vai no fim para mudar/cancelar (o SOUL proíbe mostrá-lo ao Bruno).
function linhaEvento(ev, zona, { comId = true, agendaNome = '' } = {}) {
  const j = janelaDoEvento(ev);
  const quando = j.diaInteiro
    ? (j.dataFim && dataIso(somarDias(lerData(j.dataInicio), 1)) !== j.dataFim ? `${fmtDataSolta(j.dataInicio)} a ${fmtDataSolta(dataIso(somarDias(lerData(j.dataFim), -1)))}, dia inteiro` : `${fmtDataSolta(j.dataInicio)}, dia inteiro`)
    : fmtFaixa(zona, j.inicio, j.fim);
  const partes = [quando, limpa(ev.summary) || '(sem título)'];
  if (ev.location) partes.push(`em ${limpa(ev.location)}`);
  const c = convidados(ev); if (c) partes.push(c);
  const m = meetDe(ev); if (m) partes.push(`Meet ${m}`);
  if (ev.status === 'tentative') partes.push('(provisório)');
  if (ev.recurringEventId) partes.push('(recorrente)');
  partes.push(alertasDe(ev));
  if (comId) partes.push(agendaNome ? `[id: ${ev.id} · agenda: ${agendaNome}]` : `[id: ${ev.id}]`);
  return '• ' + (agendaNome ? `[${agendaNome}] ` : '') + partes.join(' · ');
}

// Eventos que cruzam [inicio, fim) numa agenda, exceto o id dado.
async function eventosNaJanela({ agenda, zona, inicioMs, fimMs, exceto, texto }) {
  const alvos = agenda ? [{ id: agenda, nome: await nomeDaAgenda(agenda) }] : [{ id: 'primary', nome: '' }, ...(await agendas()).filter((a) => !a.principal)];
  const tudo = [];
  for (const a of alvos) {
    const r = await listarEventos({ agenda: a.id, timeMin: rfc3339(zona, inicioMs), timeMax: rfc3339(zona, fimMs), fuso: zona, texto, max: 50, limiteDiario });
    for (const ev of r.items || []) { ev._agenda = a.nome; ev._agendaId = a.id; tudo.push(ev); }
    if (r.nextPageToken) tudo.maisPaginas = true;
  }
  return tudo.filter((ev) => ev.id !== exceto && ev.status !== 'cancelled' && (texto !== undefined || ev.transparency !== 'transparent')).filter((ev) => { const j = janelaDoEvento(ev); return cruzam(j.inicio, j.fim, inicioMs, fimMs); }).sort((x, y) => janelaDoEvento(x).inicio - janelaDoEvento(y).inicio);
}

// Converte a lista de e-mails em attendees; aceita "Nome <email>".
function montarConvidados(lista) {
  return (lista || []).map((s) => {
    const m = /^(.*?)<\s*([^>]+)\s*>$/.exec(limpa(s));
    return m ? { email: m[2].trim(), displayName: limpa(m[1]) || undefined } : { email: limpa(s) };
  });
}

const server = new McpServer({ name: 'agenda', version: '1.0.0' });

server.registerTool('agenda_listar', {
  title: 'Compromissos da agenda do Bruno',
  description: 'Lista os compromissos de todos os calendários da Google Agenda do Bruno (principal, Médico, Família, Contas casa, Curso psicodrama, Lembretes agendados) num período (padrão: hoje), no fuso dele, com título, horário, local, convidados e resposta deles, link do Meet, alertas e o identificador de cada um (use o id só para mudar ou cancelar; não mostre ao Bruno). '
    + 'Serve para "o que tenho amanhã", "minha semana", "quando é a consulta" (use `texto` para buscar por palavra). Datas em AAAA-MM-DD no fuso do Bruno. Eventos recorrentes vêm expandidos por ocorrência.',
  inputSchema: {
    de: z.string().optional().describe('Primeiro dia, AAAA-MM-DD, no fuso do Bruno. Padrão: hoje.'),
    ate: z.string().optional().describe('Último dia (inclusive), AAAA-MM-DD. Padrão: igual a `de`. Máximo 62 dias.'),
    texto: z.string().max(80).optional().describe('Palavra ou nome para filtrar (título, local, convidado).'),
    fuso: z.string().max(40).optional().describe('Fuso IANA para interpretar e mostrar as horas. Padrão America/Manaus; use o do lugar onde ele estará.'),
    agenda: z.string().max(120).optional().describe('Nome do calendário (ex.: "Médico", "Família", "Contas casa"). Padrão: todos os calendários dele.'),
  },
  annotations: { readOnlyHint: true },
}, async ({ de, ate, texto, fuso, agenda }) => protegido(async () => {
  const zona = fusoOu(fuso);
  const d0 = de ? lerData(de) : hojeNoFuso(zona);
  const d1 = ate ? lerData(ate) : d0;
  const inicioMs = localParaUtc(zona, d0), fimMs = localParaUtc(zona, somarDias(d1, 1));
  if (fimMs <= inicioMs || fimMs - inicioMs > 62 * 86400000) throw new ErroTempo('PERIODO_INVALIDO');
  const alvo = agenda ? await resolverAgenda(agenda) : null;
  const itens = await eventosNaJanela({ agenda: alvo, zona, inicioMs, fimMs, texto: limpa(texto) || undefined });
  const periodo = dataIso(d0) === dataIso(d1) ? fmtDiaLongo(zona, inicioMs) : `${fmtDia(zona, inicioMs)} a ${fmtDia(zona, localParaUtc(zona, d1))}`;
  const onde = alvo ? (await nomeDaAgenda(alvo)) || 'agenda principal' : 'todos os calendários';
  const cab = `${periodo} (horário de ${zona}, ${onde}): ${itens.length ? `${itens.length} compromisso${itens.length > 1 ? 's' : ''}` : 'nenhum compromisso'}${texto ? ` com "${limpa(texto)}"` : ''}. Fonte: ${FONTE}.`;
  const linhas = itens.map((ev) => linhaEvento(ev, zona, { agendaNome: ev._agenda }));
  if (itens.maisPaginas) linhas.push('(há mais compromissos além dos 50 primeiros de um calendário: peça um período menor)');
  return fim('agenda_listar', [cab, ...linhas].join('\n'), `periodo=${dataIso(d0)}..${dataIso(d1)}`, `eventos=${itens.length}`);
}));

server.registerTool('agenda_livre', {
  title: 'Horários livres e ocupados',
  description: 'Diz se o Bruno está livre num período e quais buracos existem ("estou livre sexta às 15h?", "que horas tenho vaga na quinta?"). Devolve as faixas ocupadas com o título do compromisso e os buracos de pelo menos a duração pedida, no fuso dele.',
  inputSchema: {
    de: z.string().describe('Início do período, AAAA-MM-DDTHH:MM, no fuso do Bruno.'),
    ate: z.string().describe('Fim do período, AAAA-MM-DDTHH:MM.'),
    duracao_min: z.number().int().min(5).max(1440).optional().describe('Duração mínima do buraco, em minutos. Padrão 60.'),
    fuso: z.string().max(40).optional().describe('Fuso IANA. Padrão America/Manaus.'),
    agenda: z.string().max(120).optional(),
  },
  annotations: { readOnlyHint: true },
}, async ({ de, ate, duracao_min = 60, fuso, agenda }) => protegido(async () => {
  const zona = fusoOu(fuso);
  const inicioMs = localParaUtc(zona, lerDataHora(de)), fimMs = localParaUtc(zona, lerDataHora(ate));
  if (fimMs <= inicioMs || fimMs - inicioMs > 14 * 86400000) throw new ErroTempo('PERIODO_INVALIDO');
  const alvo = agenda ? await resolverAgenda(agenda) : null;
  const ids = alvo ? [alvo] : ['primary', ...(await agendas()).filter((a) => !a.principal).map((a) => a.id)];
  const [fb, evs] = await Promise.all([
    consultarLivre({ agendas: ids, timeMin: rfc3339(zona, inicioMs), timeMax: rfc3339(zona, fimMs), fuso: zona, limiteDiario }),
    eventosNaJanela({ agenda: alvo, zona, inicioMs, fimMs }),
  ]);
  const ocupados = Object.values(fb.calendars || {}).flatMap((c) => c.busy || []).map((b) => ({ inicio: Date.parse(b.start), fim: Date.parse(b.end) })).sort((x, y) => x.inicio - y.inicio);
  const titulo = (o) => evs.filter((ev) => { const j = janelaDoEvento(ev); return cruzam(j.inicio, j.fim, o.inicio, o.fim); }).map((ev) => limpa(ev.summary) || '(sem título)').join(' / ') || 'ocupado';
  const livres = buracos(inicioMs, fimMs, ocupados, duracao_min * 60000);
  const cab = `Entre ${fmtFaixa(zona, inicioMs, fimMs)} (horário de ${zona}). Fonte: ${FONTE}.`;
  const l1 = ocupados.length ? ['Ocupado:', ...ocupados.map((o) => `• ${fmtFaixa(zona, o.inicio, o.fim)} · ${titulo(o)}`)] : ['Nada ocupado no período.'];
  const l2 = livres.length ? [`Livre (buracos de pelo menos ${fmtMinutos(duracao_min)}):`, ...livres.map((o) => `• ${fmtFaixa(zona, o.inicio, o.fim)}`)] : [`Nenhum buraco de ${fmtMinutos(duracao_min)} no período.`];
  return fim('agenda_livre', [cab, ...l1, ...l2].join('\n'), `ocupados=${ocupados.length}`, `livres=${livres.length}`);
}));

const camposEvento = {
  titulo: z.string().min(1).max(200).describe('Título do compromisso, como o Bruno falou.'),
  inicio: z.string().describe('Início: AAAA-MM-DDTHH:MM no fuso (padrão Manaus). Para dia inteiro, só AAAA-MM-DD.'),
  fim: z.string().optional().describe('Fim: AAAA-MM-DDTHH:MM. Se faltar, usa `duracao_min`. Dia inteiro: último dia, AAAA-MM-DD (padrão: o mesmo do início).'),
  duracao_min: z.number().int().min(5).max(1440).optional().describe('Duração em minutos quando não há `fim`. Padrão 60.'),
  dia_inteiro: z.boolean().optional().describe('true para evento de dia inteiro (aniversário, viagem, feriado).'),
  fuso: z.string().max(40).optional().describe('Fuso IANA das horas informadas. Padrão America/Manaus; se ele estiver viajando, o fuso de lá.'),
  local: z.string().max(300).optional().describe('Endereço completo (rua, número, cidade) para presencial. Ache pelo mapas antes de perguntar ao Bruno.'),
  descricao: z.string().max(2000).optional().describe('Observações: pauta, telefone, o que levar.'),
  convidados: z.array(z.string().max(120)).max(30).optional().describe('E-mails dos convidados ("Nome <email>" ou só o email). Só com confirmação do Bruno (princípio 7).'),
  online: z.boolean().optional().describe('true cria um link do Google Meet no compromisso.'),
  alertas_min: z.array(z.number().int().min(0).max(40320)).max(5).optional().describe('Alertas em minutos antes. Padrão [60, 30], a preferência do Bruno. [] para nenhum.'),
  avisar_convidados: z.boolean().optional().describe('Enviar convite/aviso por e-mail aos convidados. Padrão true quando há convidados.'),
};

server.registerTool('agenda_criar', {
  title: 'Criar compromisso',
  description: 'Cria um compromisso na Google Agenda do Bruno, no fuso dele, já com alertas de 60 e 30 minutos antes (preferência dele), local, convidados e link do Meet se pedido. '
    + 'ANTES de criar confere conflito: se já existe compromisso no horário, NÃO cria e devolve "CONFLITO" com o que choca, para você perguntar ao Bruno; só então chame de novo com ignorar_conflito=true. '
    + 'Compromisso com outras pessoas (convidados) só depois do sim do Bruno (princípio 7). Devolve a confirmação com o que foi criado e o id.',
  inputSchema: {
    ...camposEvento,
    recorrencia: z.string().max(200).optional().describe('Repetição em RRULE sem o prefixo, ex.: "FREQ=WEEKLY;BYDAY=MO" (toda segunda), "FREQ=MONTHLY;BYMONTHDAY=5" (dia 5), "FREQ=DAILY;COUNT=10".'),
    ignorar_conflito: z.boolean().optional().describe('true cria mesmo com choque de horário (só depois de o Bruno decidir).'),
    agenda: z.string().max(120).optional().describe('Nome do calendário onde criar ("Médico", "Família", "Contas casa", "Curso psicodrama", "Lembretes agendados"). Padrão: a principal. Use o calendário que combina com o assunto.'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (a) => protegido(async () => {
  const zona = fusoOu(a.fuso);
  const agenda = await resolverAgenda(a.agenda);
  const alertas = a.alertas_min ?? ALERTAS_PADRAO;
  const evento = { summary: limpa(a.titulo), reminders: { useDefault: false, overrides: alertas.map((m) => ({ method: 'popup', minutes: m })) } };
  if (a.local) evento.location = limpa(a.local);
  if (a.descricao) evento.description = a.descricao.trim();
  let inicioMs, fimMs, quando;
  if (a.dia_inteiro) {
    const d0 = lerData(a.inicio), d1 = a.fim ? lerData(a.fim) : d0;
    inicioMs = localParaUtc(zona, d0); fimMs = localParaUtc(zona, somarDias(d1, 1));
    if (fimMs <= inicioMs) throw new ErroTempo('FIM_ANTES_DO_INICIO');
    evento.start = { date: dataIso(d0) }; evento.end = { date: dataIso(somarDias(d1, 1)) };
    quando = dataIso(d0) === dataIso(d1) ? `${fmtDataSolta(dataIso(d0))}, dia inteiro` : `${fmtDataSolta(dataIso(d0))} a ${fmtDataSolta(dataIso(d1))}, dia inteiro`;
  } else {
    inicioMs = localParaUtc(zona, lerDataHora(a.inicio));
    fimMs = a.fim ? localParaUtc(zona, lerDataHora(a.fim)) : inicioMs + (a.duracao_min ?? 60) * 60000;
    if (fimMs <= inicioMs) throw new ErroTempo('FIM_ANTES_DO_INICIO');
    evento.start = { dateTime: rfc3339(zona, inicioMs), timeZone: zona }; evento.end = { dateTime: rfc3339(zona, fimMs), timeZone: zona };
    quando = `${fmtFaixa(zona, inicioMs, fimMs)} (horário de ${zona})`;
    if (!a.ignorar_conflito) {
      const choque = await eventosNaJanela({ agenda: null, zona, inicioMs, fimMs });
      if (choque.length) return fim('agenda_criar', `CONFLITO: ${quando} já tem ${choque.length} compromisso${choque.length > 1 ? 's' : ''}. Não criei "${evento.summary}". Pergunte ao Bruno se mantém, muda de horário ou cancela o outro:\n` + choque.map((ev) => linhaEvento(ev, zona, { agendaNome: ev._agenda })).join('\n'), 'conflito', `n=${choque.length}`);
    }
  }
  if (a.recorrencia) evento.recurrence = [/^RRULE:/i.test(a.recorrencia.trim()) ? a.recorrencia.trim() : `RRULE:${a.recorrencia.trim()}`];
  const conv = montarConvidados(a.convidados);
  if (conv.length) evento.attendees = conv;
  if (a.online) evento.conferenceData = { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } };
  const avisar = conv.length && (a.avisar_convidados ?? true) ? 'all' : 'none';
  let criado = await inserirEvento({ agenda, evento, comMeet: Boolean(a.online), avisar, limiteDiario });
  if (a.online && criado.conferenceData?.createRequest?.status?.statusCode === 'pending') {
    await new Promise((r) => setTimeout(r, 1500));
    try { criado = await obterEvento({ agenda, id: criado.id, limiteDiario }); } catch { /* fica com o que veio */ }
  }
  const meet = meetDe(criado);
  const nomeAg = await nomeDaAgenda(agenda);
  const linhas = [`CRIADO${nomeAg ? ` no calendário ${nomeAg}` : ''}: ${quando}, "${evento.summary}".`];
  if (evento.location) linhas.push(`Local: ${evento.location}`);
  if (conv.length) linhas.push(`Convidados: ${conv.map((c) => c.displayName ? `${c.displayName} (${c.email})` : c.email).join(', ')}${avisar === 'all' ? ' — convite enviado por e-mail' : ' — sem aviso por e-mail'}`);
  if (a.online) linhas.push(meet ? `Meet: ${meet}` : 'Meet: o Google ainda está gerando o link; consulte o compromisso em instantes.');
  if (evento.recurrence) linhas.push(`Repete: ${evento.recurrence[0].replace(/^RRULE:/, '')}`);
  linhas.push(alertas.length ? `Alertas: ${alertas.map(fmtMinutos).join(' e ')} antes.` : 'Sem alertas.');
  if (criado.htmlLink) linhas.push(`Link na agenda: ${criado.htmlLink}`);
  linhas.push(`[id: ${criado.id}]`);
  return fim('agenda_criar', linhas.join('\n'), `id=${criado.id}`, `convidados=${conv.length}`, `meet=${Boolean(meet)}`);
}));

server.registerTool('agenda_mudar', {
  title: 'Alterar compromisso',
  description: 'Altera só os campos informados de um compromisso existente (horário, título, local, descrição, convidados, Meet, alertas). Pegue o id em agenda_listar. '
    + 'Se mudar o horário, confere conflito antes e devolve "CONFLITO" sem alterar, salvo ignorar_conflito=true. Em recorrente, `serie: "toda"` altera todas as ocorrências; padrão altera só esta. '
    + 'Mudar compromisso que tem convidados pede o sim do Bruno antes (princípio 7); os convidados são avisados por e-mail.',
  inputSchema: {
    id: z.string().min(5).max(1024).describe('Identificador do compromisso (de agenda_listar ou agenda_criar).'),
    titulo: camposEvento.titulo.optional(),
    inicio: z.string().optional().describe('Novo início, AAAA-MM-DDTHH:MM no fuso. Sem `fim`, mantém a duração atual.'),
    fim: z.string().optional().describe('Novo fim, AAAA-MM-DDTHH:MM.'),
    fuso: camposEvento.fuso,
    local: camposEvento.local,
    descricao: camposEvento.descricao,
    convidados: z.array(z.string().max(120)).max(30).optional().describe('Lista COMPLETA de e-mails que deve ficar (substitui a atual).'),
    online: z.boolean().optional().describe('true adiciona Meet; false remove.'),
    alertas_min: camposEvento.alertas_min,
    serie: z.enum(['esta', 'toda']).optional().describe('Em recorrente: "esta" ocorrência (padrão) ou "toda" a série.'),
    avisar_convidados: camposEvento.avisar_convidados,
    ignorar_conflito: z.boolean().optional(),
    agenda: z.string().max(120).optional().describe('Nome do calendário onde o compromisso está (vem no id de agenda_listar). Sem isso, procura em todos.'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
}, async (a) => protegido(async () => {
  const zona = fusoOu(a.fuso);
  const achado = await acharEvento(a.id, a.agenda);
  const agenda = achado.agenda;
  let alvo = achado.evento;
  if (a.serie === 'toda' && alvo.recurringEventId) alvo = await obterEvento({ agenda, id: alvo.recurringEventId, limiteDiario });
  const antes = linhaEvento(alvo, zona, { comId: false });
  const m = {};
  const jAntes = janelaDoEvento(alvo);
  let inicioMs = jAntes.inicio, fimMs = jAntes.fim;
  if (a.inicio || a.fim) {
    if (jAntes.diaInteiro) throw new ErroTempo('DATA_HORA_INVALIDA', 'compromisso de dia inteiro: cancele e crie de novo com horas');
    const dur = jAntes.fim - jAntes.inicio;
    inicioMs = a.inicio ? localParaUtc(zona, lerDataHora(a.inicio)) : jAntes.inicio;
    fimMs = a.fim ? localParaUtc(zona, lerDataHora(a.fim)) : (a.inicio ? inicioMs + dur : jAntes.fim);
    if (fimMs <= inicioMs) throw new ErroTempo('FIM_ANTES_DO_INICIO');
    m.start = { dateTime: rfc3339(zona, inicioMs), timeZone: zona }; m.end = { dateTime: rfc3339(zona, fimMs), timeZone: zona };
    if (!a.ignorar_conflito) {
      const choque = await eventosNaJanela({ agenda: null, zona, inicioMs, fimMs, exceto: alvo.id });
      const outros = choque.filter((ev) => ev.recurringEventId !== alvo.id && ev.id !== alvo.id);
      if (outros.length) return fim('agenda_mudar', `CONFLITO: ${fmtFaixa(zona, inicioMs, fimMs)} já tem ${outros.length} compromisso${outros.length > 1 ? 's' : ''}. Não alterei. Pergunte ao Bruno:\n` + outros.map((ev) => linhaEvento(ev, zona, { agendaNome: ev._agenda })).join('\n'), 'conflito');
    }
  }
  if (a.titulo !== undefined) m.summary = limpa(a.titulo);
  if (a.local !== undefined) m.location = limpa(a.local);
  if (a.descricao !== undefined) m.description = a.descricao.trim();
  if (a.alertas_min !== undefined) m.reminders = { useDefault: false, overrides: a.alertas_min.map((x) => ({ method: 'popup', minutes: x })) };
  let conv = null;
  if (a.convidados !== undefined) { conv = montarConvidados(a.convidados); m.attendees = conv; }
  let comMeet = false;
  if (a.online === true && !meetDe(alvo)) { m.conferenceData = { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }; comMeet = true; }
  if (a.online === false && alvo.conferenceData) { m.conferenceData = null; comMeet = true; }
  if (!Object.keys(m).length) return fim('agenda_mudar', `Nada para alterar. Compromisso atual:\n${antes}`);
  const temConvidados = (conv ?? (alvo.attendees || []).filter((x) => !x.self)).length > 0;
  const avisar = temConvidados && (a.avisar_convidados ?? true) ? 'all' : 'none';
  let depois = await remendarEvento({ agenda, id: alvo.id, mudancas: m, comMeet, avisar, limiteDiario });
  if (comMeet && depois.conferenceData?.createRequest?.status?.statusCode === 'pending') {
    await new Promise((r) => setTimeout(r, 1500));
    try { depois = await obterEvento({ agenda, id: alvo.id, limiteDiario }); } catch { /* fica */ }
  }
  const texto = [`ALTERADO${a.serie === 'toda' ? ' (toda a série)' : ''}${avisar === 'all' ? ', convidados avisados por e-mail' : ''}.`, `Antes: ${antes}`, `Agora: ${linhaEvento(depois, zona)}`].join('\n');
  return fim('agenda_mudar', texto, `id=${alvo.id}`, `campos=${Object.keys(m).join(',')}`);
}));

server.registerTool('agenda_cancelar', {
  title: 'Cancelar compromisso',
  description: 'Cancela (apaga) um compromisso da agenda do Bruno pelo id. Apagar pede o sim do Bruno antes (princípio 7). Em recorrente, `serie: "toda"` cancela a série inteira; padrão cancela só esta ocorrência. Convidados são avisados por e-mail, salvo avisar_convidados=false. Devolve o que foi cancelado.',
  inputSchema: {
    id: z.string().min(5).max(1024),
    serie: z.enum(['esta', 'toda']).optional(),
    avisar_convidados: z.boolean().optional().describe('Padrão true.'),
    fuso: camposEvento.fuso,
    agenda: z.string().max(120).optional().describe('Nome do calendário onde o compromisso está. Sem isso, procura em todos.'),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
}, async ({ id, serie, avisar_convidados = true, fuso, agenda: agendaDita }) => protegido(async () => {
  const zona = fusoOu(fuso);
  const achado = await acharEvento(id, agendaDita);
  const agenda = achado.agenda;
  let alvo = achado.evento;
  if (alvo.status === 'cancelled') return fim('agenda_cancelar', `Esse compromisso já estava cancelado: ${linhaEvento(alvo, zona, { comId: false })}`);
  if (serie === 'toda' && alvo.recurringEventId) alvo = await obterEvento({ agenda, id: alvo.recurringEventId, limiteDiario });
  const temConvidados = (alvo.attendees || []).some((x) => !x.self);
  await apagarEvento({ agenda, id: alvo.id, avisar: temConvidados && avisar_convidados ? 'all' : 'none', limiteDiario });
  return fim('agenda_cancelar', `CANCELADO${serie === 'toda' ? ' (toda a série)' : ''}${temConvidados && avisar_convidados ? ', convidados avisados por e-mail' : ''}: ${linhaEvento(alvo, zona, { comId: false })}`, `id=${alvo.id}`);
}));

const transport = new StdioServerTransport();
await server.connect(transport);
log('pronto', `fuso_padrao=${FUSO_PADRAO}`, `limite_diario=${limiteDiario}`);
