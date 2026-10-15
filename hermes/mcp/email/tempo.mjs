// tempo.mjs — datas, fusos e formatação em português para a agenda. Sem dependências: usa Intl.
// O Bruno fala em hora local ("quinta às 15h"); o Google quer RFC3339 com deslocamento. Esta
// conta é feita aqui, por código, para o modelo não errar fuso nem virada de mês.

export const DIAS_PT = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const DIAS_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const FUSO_PADRAO = process.env.AGENDA_FUSO_PADRAO || 'America/Manaus';

export class ErroTempo extends Error {
  constructor(code, detalhe = '') { super(code); this.code = code; this.detalhe = detalhe; }
}

export function fusoValido(zona) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: zona }); return true; } catch { return false; }
}

// Partes da data/hora de um instante UTC vistas num fuso.
function partes(zona, msUtc) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
  const p = {};
  for (const { type, value } of f.formatToParts(new Date(msUtc))) p[type] = value;
  return { ano: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(p.hour), minuto: Number(p.minute), segundo: Number(p.second), semana: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}

// Deslocamento (minutos a somar ao UTC) do fuso num instante.
export function deslocamentoMinutos(zona, msUtc) {
  const q = partes(zona, msUtc);
  const comoUtc = Date.UTC(q.ano, q.mes - 1, q.dia, q.hora, q.minuto, q.segundo);
  return Math.round((comoUtc - Math.floor(msUtc / 1000) * 1000) / 60000);
}

// "2026-10-16T15:00" (ou com espaço, ou com segundos) -> campos. Não aceita deslocamento: o fuso vem à parte.
export function lerDataHora(txt) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(txt ?? '').trim());
  if (!m) throw new ErroTempo('DATA_HORA_INVALIDA', String(txt));
  const v = { ano: +m[1], mes: +m[2], dia: +m[3], hora: +m[4], minuto: +m[5] };
  validarData(v.ano, v.mes, v.dia);
  if (v.hora > 23 || v.minuto > 59) throw new ErroTempo('DATA_HORA_INVALIDA', String(txt));
  return v;
}

export function lerData(txt) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(txt ?? '').trim());
  if (!m) throw new ErroTempo('DATA_INVALIDA', String(txt));
  validarData(+m[1], +m[2], +m[3]);
  return { ano: +m[1], mes: +m[2], dia: +m[3] };
}

function validarData(ano, mes, dia) {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) throw new ErroTempo('DATA_INVALIDA', `${ano}-${mes}-${dia}`);
}

// Hora local num fuso -> instante UTC (ms). Resolve o deslocamento em duas passadas (vale para fusos com horário de verão).
export function localParaUtc(zona, { ano, mes, dia, hora = 0, minuto = 0 }) {
  const base = Date.UTC(ano, mes - 1, dia, hora, minuto);
  let ms = base - deslocamentoMinutos(zona, base) * 60000;
  ms = base - deslocamentoMinutos(zona, ms) * 60000;
  return ms;
}

const dois = (n) => String(n).padStart(2, '0');

// Instante -> RFC3339 com o deslocamento do fuso ("2026-10-16T15:00:00-04:00").
export function rfc3339(zona, msUtc) {
  const p = partes(zona, msUtc);
  const off = deslocamentoMinutos(zona, msUtc);
  const sinal = off < 0 ? '-' : '+';
  const a = Math.abs(off);
  return `${p.ano}-${dois(p.mes)}-${dois(p.dia)}T${dois(p.hora)}:${dois(p.minuto)}:${dois(p.segundo)}${sinal}${dois(Math.floor(a / 60))}:${dois(a % 60)}`;
}

export const dataIso = ({ ano, mes, dia }) => `${ano}-${dois(mes)}-${dois(dia)}`;

export function somarDias({ ano, mes, dia }, n) {
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

export function hojeNoFuso(zona, msUtc = Date.now()) {
  const p = partes(zona, msUtc);
  return { ano: p.ano, mes: p.mes, dia: p.dia };
}

// Formatação para o Bruno.
export const hhmm = (p) => `${p.hora}h${p.minuto ? dois(p.minuto) : ''}`;

export function fmtDia(zona, msUtc) {
  const p = partes(zona, msUtc);
  return `${DIAS_CURTO[p.semana]} ${dois(p.dia)}/${dois(p.mes)}`;
}

export function fmtDiaLongo(zona, msUtc) {
  const p = partes(zona, msUtc);
  return `${DIAS_PT[p.semana]}, ${dois(p.dia)}/${dois(p.mes)}/${p.ano}`;
}

export function fmtHora(zona, msUtc) {
  return hhmm(partes(zona, msUtc));
}

// "qui 16/10, 15h–16h" (mesmo dia) ou "qui 16/10, 22h – sex 17/10, 2h".
export function fmtFaixa(zona, inicioMs, fimMs) {
  const a = partes(zona, inicioMs), b = partes(zona, fimMs);
  const mesmoDia = a.ano === b.ano && a.mes === b.mes && a.dia === b.dia;
  if (mesmoDia) return `${DIAS_CURTO[a.semana]} ${dois(a.dia)}/${dois(a.mes)}, ${hhmm(a)}–${hhmm(b)}`;
  return `${DIAS_CURTO[a.semana]} ${dois(a.dia)}/${dois(a.mes)}, ${hhmm(a)} – ${DIAS_CURTO[b.semana]} ${dois(b.dia)}/${dois(b.mes)}, ${hhmm(b)}`;
}

// Data de dia inteiro "2026-10-16" -> "sex 16/10".
export function fmtDataSolta(iso) {
  const d = lerData(iso);
  const sem = new Date(Date.UTC(d.ano, d.mes - 1, d.dia)).getUTCDay();
  return `${DIAS_CURTO[sem]} ${dois(d.dia)}/${dois(d.mes)}`;
}

// Interseção de intervalos [a1,a2) e [b1,b2).
export const cruzam = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

// Buracos livres dentro de [de, ate) dados os ocupados; só os com duração >= minimoMs.
export function buracos(deMs, ateMs, ocupados, minimoMs) {
  const ord = [...ocupados].filter((o) => cruzam(o.inicio, o.fim, deMs, ateMs)).sort((x, y) => x.inicio - y.inicio);
  const out = [];
  let cursor = deMs;
  for (const o of ord) {
    if (o.inicio > cursor && o.inicio - cursor >= minimoMs) out.push({ inicio: cursor, fim: o.inicio });
    if (o.fim > cursor) cursor = o.fim;
  }
  if (ateMs > cursor && ateMs - cursor >= minimoMs) out.push({ inicio: cursor, fim: ateMs });
  return out;
}

// Minutos -> "1 h", "30 min", "1 h 30".
export function fmtMinutos(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${dois(m)}` : `${h} h`;
}
