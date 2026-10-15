// google.mjs — cliente da Google Calendar API v3 para o Atlas. Só o que a agenda usa:
//   GET  /calendars/{id}/events            listar (singleEvents, orderBy=startTime, timeMin/timeMax, q)
//   POST /freeBusy                          faixas ocupadas
//   POST /calendars/{id}/events             criar (conferenceDataVersion=1, sendUpdates)
//   GET  /calendars/{id}/events/{eventId}   obter
//   PATCH /calendars/{id}/events/{eventId}  alterar só os campos enviados
//   DELETE /calendars/{id}/events/{eventId} cancelar
// Token: o mesmo arquivo que a skill google-workspace do Hermes gerou (google_token.json: token, refresh_token,
// token_uri, client_id, client_secret, expiry). O acesso é renovado em memória com o refresh_token; nada é
// gravado de volta e nenhum valor de token sai em log ou resposta.
// Docs lidas em 13/10/2026: docs-google-calendar/ (events, freebusy, erros, cotas).
import { readFile } from 'node:fs/promises';

export const BASE = 'https://www.googleapis.com/calendar/v3';
export const FONTE = 'Google Agenda (consultado agora)';
const TOKEN_PATH = process.env.AGENDA_TOKEN_PATH || '/opt/data/google_token.json';

export class ErroGoogle extends Error {
  constructor(code, transitorio = false, detalhe = '') { super(code); this.code = code; this.transitorio = transitorio; this.detalhe = detalhe; }
}

const estado = { dia: '', chamadas: 0, acesso: null, expiraMs: 0 };
export const chamadasHoje = () => estado.chamadas;
export const zerarEstado = () => { estado.dia = ''; estado.chamadas = 0; estado.acesso = null; estado.expiraMs = 0; };

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function lerToken() {
  let j;
  try { j = JSON.parse(await readFile(TOKEN_PATH, 'utf8')); }
  catch { throw new ErroGoogle('TOKEN_AUSENTE'); }
  if (!j?.refresh_token || !j?.client_id || !j?.client_secret) throw new ErroGoogle('TOKEN_INCOMPLETO');
  return j;
}

// Token de acesso válido: o do arquivo enquanto não expirou, senão renova pelo refresh_token.
async function tokenDeAcesso({ fetchImpl = fetch, agora = Date.now, forcar = false } = {}) {
  const t = agora();
  if (!forcar && estado.acesso && t < estado.expiraMs - 60000) return estado.acesso;
  const j = await lerToken();
  if (!forcar && j.token && j.expiry) {
    const exp = Date.parse(j.expiry.endsWith('Z') || /[+-]\d\d:\d\d$/.test(j.expiry) ? j.expiry : j.expiry + 'Z');
    if (Number.isFinite(exp) && t < exp - 60000) { estado.acesso = j.token; estado.expiraMs = exp; return j.token; }
  }
  const corpo = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: j.refresh_token, client_id: j.client_id, client_secret: j.client_secret });
  let r;
  try { r = await fetchImpl(j.token_uri || 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo, signal: AbortSignal.timeout(10000) }); }
  catch { throw new ErroGoogle('GOOGLE_REDE', true); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new ErroGoogle(d.error === 'invalid_grant' ? 'TOKEN_REVOGADO' : 'TOKEN_RENOVACAO_FALHOU', false, String(d.error || r.status));
  estado.acesso = d.access_token;
  estado.expiraMs = t + (Number(d.expires_in) || 3600) * 1000;
  return estado.acesso;
}

const query = (q) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(q || {})) if (v !== undefined && v !== null && v !== '') u.append(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
};

export async function chamar({ metodo = 'GET', caminho, q, corpo, fetchImpl = fetch, timeoutMs = 10000, tentativas = 2, esperar = dormir, agora = Date.now, limiteDiario = 300 }) {
  const t = agora();
  const dia = new Date(t).toISOString().slice(0, 10);
  if (estado.dia !== dia) { estado.dia = dia; estado.chamadas = 0; }
  if (estado.chamadas >= limiteDiario) throw new ErroGoogle('GOOGLE_LIMITE_DIARIO');
  let ultimo = 'GOOGLE_FALHOU';
  let renovou = false;
  for (let i = 1; i <= tentativas + 1; i++) {
    const acesso = await tokenDeAcesso({ fetchImpl, agora, forcar: renovou });
    estado.chamadas += 1;
    try {
      const r = await fetchImpl(BASE + caminho + query(q), {
        method: metodo,
        headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (r.status === 204) return {};
      const texto = await r.text();
      let j = null;
      try { j = texto ? JSON.parse(texto) : {}; } catch { j = null; }
      if (r.ok) { if (j && typeof j === 'object') return j; ultimo = 'GOOGLE_RESPOSTA_INVALIDA'; }
      else {
        const motivo = j?.error?.errors?.[0]?.reason || j?.error?.status || '';
        if (r.status === 401 && !renovou) { renovou = true; continue; } // acesso expirado: renova e repete
        if (r.status === 429 || r.status >= 500 || (r.status === 403 && /rateLimit|userRateLimit|quotaExceeded/i.test(motivo))) ultimo = `GOOGLE_HTTP_${r.status}`;
        else throw new ErroGoogle(`GOOGLE_HTTP_${r.status}`, false, motivo || (j?.error?.message ?? '').slice(0, 120));
      }
    } catch (e) {
      if (e instanceof ErroGoogle) throw e;
      ultimo = e?.name === 'TimeoutError' ? 'GOOGLE_TEMPO_ESGOTADO' : 'GOOGLE_REDE';
    }
    if (i <= tentativas) await esperar(1000 * i + Math.floor(Math.random() * 400));
  }
  throw new ErroGoogle(ultimo, true);
}

const enc = encodeURIComponent;

export const listarEventos = ({ agenda = 'primary', timeMin, timeMax, fuso, texto, max = 50, ...resto }) =>
  chamar({ caminho: `/calendars/${enc(agenda)}/events`, q: { singleEvents: 'true', orderBy: 'startTime', timeMin, timeMax, timeZone: fuso, q: texto, maxResults: max, eventTypes: undefined }, ...resto });

export const consultarLivre = ({ agenda = 'primary', agendas, timeMin, timeMax, fuso, ...resto }) =>
  chamar({ metodo: 'POST', caminho: '/freeBusy', corpo: { timeMin, timeMax, timeZone: fuso, items: (agendas || [agenda]).map((id) => ({ id })) }, ...resto });

export const inserirEvento = ({ agenda = 'primary', evento, comMeet = false, avisar = 'none', ...resto }) =>
  chamar({ metodo: 'POST', caminho: `/calendars/${enc(agenda)}/events`, q: { conferenceDataVersion: comMeet ? 1 : 0, sendUpdates: avisar }, corpo: evento, ...resto });

export const obterEvento = ({ agenda = 'primary', id, ...resto }) =>
  chamar({ caminho: `/calendars/${enc(agenda)}/events/${enc(id)}`, ...resto });

export const remendarEvento = ({ agenda = 'primary', id, mudancas, comMeet = false, avisar = 'none', ...resto }) =>
  chamar({ metodo: 'PATCH', caminho: `/calendars/${enc(agenda)}/events/${enc(id)}`, q: { conferenceDataVersion: comMeet ? 1 : 0, sendUpdates: avisar }, corpo: mudancas, ...resto });

export const apagarEvento = ({ agenda = 'primary', id, avisar = 'none', ...resto }) =>
  chamar({ metodo: 'DELETE', caminho: `/calendars/${enc(agenda)}/events/${enc(id)}`, q: { sendUpdates: avisar }, ...resto });

export const listarAgendas = ({ ...resto } = {}) =>
  chamar({ caminho: '/users/me/calendarList', q: { maxResults: 250, minAccessRole: 'reader' }, ...resto });
