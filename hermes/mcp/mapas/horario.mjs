// horario.mjs — a conta "está aberto no dia D às H?" feita por código, a partir dos campos
// currentOpeningHours (próximos 7 dias, com feriados) e regularOpeningHours (semana típica)
// da Places API (New). O modelo recebe o veredito pronto e não refaz a conta.
// Referência: https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
//   Period { open: Point, close?: Point }; Point { day 0-6 (0 = domingo), hour, minute, date?, truncated? }
//   open sem close = aberto 24 horas, todos os dias.

export const DIAS_PT = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MIN_DIA = 1440;
const MIN_SEMANA = 7 * MIN_DIA;

export class ErroHorario extends Error {
  constructor(code) { super(code); this.code = code; }
}

// "2026-10-10" -> número do dia (dias desde 1970-01-01), sem fuso.
export function ordinalDaData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim());
  if (!m) throw new ErroHorario('DATA_INVALIDA');
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) throw new ErroHorario('DATA_INVALIDA');
  return Math.floor(t / 86400000);
}

export function diaDaSemana(iso) {
  return ((ordinalDaData(iso) + 4) % 7 + 7) % 7; // 1970-01-01 foi quinta-feira (4)
}

export function dataDoOrdinal(ord) {
  return new Date(ord * 86400000).toISOString().slice(0, 10);
}

// "19:45", "19h45", "19h", "19", "9:05" -> minutos desde a meia-noite.
export function lerHora(txt) {
  const m = /^([01]?\d|2[0-3])(?:\s*[:hH]\s*([0-5]\d)?)?$/.exec(String(txt ?? '').trim());
  if (!m) throw new ErroHorario('HORA_INVALIDA');
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

export function hhmm(min) {
  const m = ((min % MIN_DIA) + MIN_DIA) % MIN_DIA;
  const r = m % 60;
  return `${Math.floor(m / 60)}h${r ? String(r).padStart(2, '0') : ''}`;
}

// Data e hora no lugar, pelo deslocamento de fuso que o Google devolve com o lugar.
export function agoraNoLugar(agoraMs, utcOffsetMinutes) {
  const off = Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes : 0;
  const t = new Date(agoraMs + off * 60000);
  return {
    data: t.toISOString().slice(0, 10),
    minutos: t.getUTCHours() * 60 + t.getUTCMinutes(),
    ordinal: Math.floor(t.getTime() / 86400000),
  };
}

const pontoMin = (p) => (p.hour ?? 0) * 60 + (p.minute ?? 0);

// currentOpeningHours: cada período traz a data. Devolve intervalos absolutos em minutos, ou null se não houver datas.
function periodosDatados(periods) {
  const out = [];
  for (const p of Array.isArray(periods) ? periods : []) {
    const a = p?.open;
    const f = p?.close;
    if (!a?.date) return null;
    const ini = Math.floor(Date.UTC(a.date.year, a.date.month - 1, a.date.day) / 86400000) * MIN_DIA + pontoMin(a);
    let fim;
    if (f?.date) fim = Math.floor(Date.UTC(f.date.year, f.date.month - 1, f.date.day) / 86400000) * MIN_DIA + pontoMin(f) + (f.truncated ? 1 : 0);
    else fim = Infinity;
    out.push({ ini, fim, fimCortado: f?.truncated === true || !f });
  }
  return out;
}

// regularOpeningHours: por dia da semana. Um período sem fechamento = aberto 24 horas, todos os dias.
function periodosSemanais(periods) {
  const ps = Array.isArray(periods) ? periods : [];
  if (ps.some((p) => p?.open && !p.close)) return 'SEMPRE';
  return ps
    .filter((p) => p?.open && p?.close)
    .map((p) => {
      const ini = p.open.day * MIN_DIA + pontoMin(p.open);
      let fim = p.close.day * MIN_DIA + pontoMin(p.close);
      if (fim <= ini) fim += MIN_SEMANA; // vira a semana (ex.: sábado 22h -> domingo 2h)
      return { ini, fim };
    });
}

function peloRegular(place, data, minutos) {
  const sem = periodosSemanais(place?.regularOpeningHours?.periods);
  if (sem === 'SEMPRE') return { origem: 'regular', vinteQuatro: true, faixas: [], aberto: minutos === null ? null : true, fechaEm: null };
  const wd = diaDaSemana(data);
  const base = wd * MIN_DIA;
  const faixas = sem
    .filter((i) => Math.floor(i.ini / MIN_DIA) === wd)
    .map((i) => ({ abre: i.ini - base, fecha: i.fim - base }))
    .sort((a, b) => a.abre - b.abre);
  const cobre = (i, k) => (i.ini <= k && k < i.fim) || (i.ini <= k + MIN_SEMANA && k + MIN_SEMANA < i.fim);
  const vinteQuatro = sem.some((i) => (i.ini <= base && i.fim >= base + MIN_DIA) || (i.ini <= base + MIN_SEMANA && i.fim >= base + MIN_SEMANA + MIN_DIA));
  let aberto = null;
  let fechaEm = null;
  if (minutos !== null) {
    const k = base + minutos;
    const dentro = sem.find((i) => cobre(i, k));
    aberto = Boolean(dentro);
    if (dentro) fechaEm = (dentro.ini <= k && k < dentro.fim ? dentro.fim : dentro.fim - MIN_SEMANA) - base;
  }
  return { origem: 'regular', vinteQuatro, faixas, aberto, fechaEm };
}

// Horário de um lugar numa data e, se pedida, numa hora (minutos desde a meia-noite, no fuso do lugar).
// Devolve null quando o Google não tem horário do lugar.
export function avaliarHorario(place, { data, minutos = null, agoraMs = Date.now() }) {
  const D = ordinalDaData(data);
  const hoje = agoraNoLugar(agoraMs, place?.utcOffsetMinutes).ordinal;
  const temAtual = place?.currentOpeningHours && typeof place.currentOpeningHours === 'object';
  const temRegular = place?.regularOpeningHours && typeof place.regularOpeningHours === 'object';
  const cur = temAtual ? periodosDatados(place.currentOpeningHours.periods) : null;
  if (cur && D >= hoje && D <= hoje + 6) {
    const base = D * MIN_DIA;
    const doDia = cur.filter((i) => i.ini >= base && i.ini < base + MIN_DIA);
    // Na borda da janela de 7 dias o Google corta o fechamento em 23h59: aí vale o horário regular do dia.
    if (doDia.some((i) => i.fimCortado && i.ini > base) && temRegular) return peloRegular(place, data, minutos);
    const vinteQuatro = cur.some((i) => i.ini <= base && i.fim >= base + MIN_DIA);
    const faixas = vinteQuatro ? [] : doDia.map((i) => ({ abre: i.ini - base, fecha: i.fim - base })).sort((a, b) => a.abre - b.abre);
    let aberto = null;
    let fechaEm = null;
    if (minutos !== null) {
      const k = base + minutos;
      const dentro = cur.find((i) => i.ini <= k && k < i.fim);
      aberto = Boolean(dentro);
      if (dentro) fechaEm = dentro.fim === Infinity ? null : dentro.fim - base;
    }
    return { origem: 'proximos7dias', vinteQuatro, faixas, aberto, fechaEm };
  }
  if (temRegular) return peloRegular(place, data, minutos);
  return null;
}

const fechaTexto = (fecha) => (fecha === MIN_DIA ? 'à meia-noite' : fecha > MIN_DIA ? `às ${hhmm(fecha)} da madrugada seguinte` : `às ${hhmm(fecha)}`);
const faixaTexto = (f) => (f.fecha - f.abre >= MIN_DIA ? `${hhmm(f.abre)} em diante (segue aberto no dia seguinte)` : `${hhmm(f.abre)} ${fechaTexto(f.fecha)}`);

export function textoDoDia(h) {
  if (!h) return null;
  if (h.vinteQuatro) return 'aberto 24 horas';
  if (!h.faixas.length) return 'fechado neste dia';
  return h.faixas.map(faixaTexto).join(' e ');
}

// Frase pronta para o modelo: ele não refaz a conta.
export function veredito(h, { minutos = null, dia, agora = false }) {
  if (!h) return null;
  const quando = minutos === null ? '' : agora ? ` agora (${hhmm(minutos)})` : ` às ${hhmm(minutos)}`;
  if (minutos === null) return `Horário de ${DIAS_PT[dia]}: ${textoDoDia(h)}`;
  if (h.aberto) {
    if (h.vinteQuatro || h.fechaEm === null) return `ABERTO${quando} (24 horas)`;
    const falta = h.fechaEm - minutos;
    return `ABERTO${quando}, fecha ${fechaTexto(h.fechaEm)}${falta <= 45 ? ` — ATENÇÃO: fecha em ${falta} min` : ''}`;
  }
  const depois = h.faixas.find((f) => f.abre > minutos);
  if (depois) return `FECHADO${quando}: só abre às ${hhmm(depois.abre)} (${faixaTexto(depois)})`;
  const antes = [...h.faixas].reverse().find((f) => f.fecha <= minutos);
  if (antes) return `FECHADO${quando}: fechou ${fechaTexto(antes.fecha)} (${DIAS_PT[dia]}: ${textoDoDia(h)})`;
  if (!h.faixas.length) return `FECHADO${quando}: não abre ${dia === 0 || dia === 6 ? 'neste' : 'nesta'} ${DIAS_PT[dia]}`;
  return `FECHADO${quando} (${DIAS_PT[dia]}: ${textoDoDia(h)})`;
}

// Conferência de nome: o Google devolve o lugar mais parecido com a consulta, que pode ser outro.
const GENERICOS = new Set(['restaurante', 'ristorante', 'restaurant', 'bar', 'cafe', 'hotel', 'pizzaria', 'pizzeria', 'academia', 'parque', 'o', 'a', 'de', 'do', 'da', 'di', 'del', 'della', 'il', 'la', 'le', 'the', 'em', 'no', 'na']);
export const tokens = (s) => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((t) => t && !GENERICOS.has(t));

export function conferirNome(consulta, nome, endereco = '') {
  // A consulta costuma trazer a cidade ("Parque Ibirapuera, São Paulo"); o nome do lugar não.
  // Vale: todos os tokens do nome estão na consulta, OU metade dos tokens da consulta aparecem
  // no nome ou no endereço (cidade, bairro). Nome sem nada em comum = outro lugar.
  const a = tokens(consulta);
  const n = tokens(nome);
  const b = new Set(n);
  const end = new Set(tokens(endereco));
  if (!a.length || !n.length) return { ok: true, similaridade: 1 };
  const noNome = a.filter((t) => b.has(t)).length;
  const noNomeOuEndereco = a.filter((t) => b.has(t) || end.has(t)).length;
  const nomeCoberto = n.filter((t) => a.includes(t)).length / n.length;
  const similaridade = Math.max(nomeCoberto, noNomeOuEndereco / a.length);
  return { ok: noNome > 0 && similaridade >= 0.5, similaridade };
}
