// google.mjs — cliente HTTP autenticado das APIs do Google para o servidor de e-mail (Gmail v1 e People v1).
// Token: o mesmo google_token.json da agenda (renovado em memória pelo refresh_token; nunca gravado nem logado).
// Docs lidas em 14/10/2026: docs-gmail/ e docs-google-contatos/.
import { readFile } from 'node:fs/promises';

export const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
export const PEOPLE = 'https://people.googleapis.com/v1';
export const FONTE = 'Gmail (consultado agora)';
const TOKEN_PATH = process.env.EMAIL_TOKEN_PATH || process.env.AGENDA_TOKEN_PATH || '/opt/data/google_token.json';

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

export async function chamar({ base = GMAIL, metodo = 'GET', caminho, q, corpo, bruto = false, fetchImpl = fetch, timeoutMs = 15000, tentativas = 2, esperar = dormir, agora = Date.now, limiteDiario = 2000 }) {
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
      const r = await fetchImpl(base + caminho + query(q), {
        method: metodo,
        headers: { Authorization: `Bearer ${acesso}`, 'Content-Type': bruto ? 'message/rfc822' : 'application/json', Accept: 'application/json' },
        body: corpo ? (bruto ? corpo : JSON.stringify(corpo)) : undefined,
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

