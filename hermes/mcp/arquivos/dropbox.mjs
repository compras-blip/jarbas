// dropbox.mjs — cliente HTTP da API v2 do Dropbox para o servidor "arquivos" (só rotas de leitura).
// Segredos: app key e secret em DROPBOX_APP_PATH (digitados pelo Felipe no servidor) e refresh token em
// DROPBOX_TOKEN_PATH (gravado uma vez por autorizar.mjs). O token de acesso (4 h) vive só em memória.
// Nada disso vai para log ou resposta. Docs lidas em 14/10/2026: docs-dropbox/ (OAuth, tipos de autenticação,
// acesso a arquivos, erros e limites) e a spec Stone (files.stone, users.stone).
import { readFile, writeFile } from 'node:fs/promises';

export const API = 'https://api.dropboxapi.com/2/';
export const CONTEUDO = 'https://content.dropboxapi.com/2/';
export const OAUTH_TOKEN = 'https://api.dropboxapi.com/oauth2/token';
export const FONTE = 'Dropbox (consultado agora)';
const appPath = () => process.env.DROPBOX_APP_PATH || '/opt/data/dropbox_app.json';
const tokenPath = () => process.env.DROPBOX_TOKEN_PATH || '/opt/data/dropbox_token.json';

export class ErroDropbox extends Error {
  constructor(code, transitorio = false, detalhe = '', mensagem = '') { super(code); this.code = code; this.transitorio = transitorio; this.detalhe = detalhe; this.mensagem = mensagem; }
}

const estado = { dia: '', chamadas: 0, acesso: null, expiraMs: 0 };
export const chamadasHoje = () => estado.chamadas;
export const zerarEstado = () => { estado.dia = ''; estado.chamadas = 0; estado.acesso = null; estado.expiraMs = 0; };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// JSON só com ASCII: o cabeçalho Dropbox-API-Arg não aceita acento cru (nomes como "Contrato Amazônia.pdf").
export const jsonAscii = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

export async function lerApp() {
  let j;
  try { j = JSON.parse(await readFile(appPath(), 'utf8')); } catch { throw new ErroDropbox('APP_AUSENTE'); }
  if (!j?.app_key || !j?.app_secret) throw new ErroDropbox('APP_AUSENTE');
  return { app_key: String(j.app_key).trim(), app_secret: String(j.app_secret).trim() };
}
export async function lerToken() {
  let j;
  try { j = JSON.parse(await readFile(tokenPath(), 'utf8')); } catch { throw new ErroDropbox('TOKEN_AUSENTE'); }
  if (!j?.refresh_token) throw new ErroDropbox('TOKEN_AUSENTE');
  return j;
}

// Fluxo de código sem redirect: o Dropbox mostra o código na tela para o Bruno copiar. offline = vem refresh token.
export const urlAutorizacao = (appKey) => `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(appKey)}&response_type=code&token_access_type=offline`;

async function pedirToken(corpo, { fetchImpl = fetch } = {}) {
  let r;
  try { r = await fetchImpl(OAUTH_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(corpo), signal: AbortSignal.timeout(10000) }); }
  catch { throw new ErroDropbox('DROPBOX_REDE', true); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new ErroDropbox(d.error === 'invalid_grant' ? 'TOKEN_REVOGADO' : 'TOKEN_RENOVACAO_FALHOU', false, String(d.error_description || d.error || r.status).slice(0, 120));
  return d;
}

// Troca o código colado pelo refresh token e grava só o necessário (modo 600). Uma vez.
export async function trocarCodigo(codigo, { fetchImpl = fetch } = {}) {
  const app = await lerApp();
  const d = await pedirToken({ code: String(codigo).trim(), grant_type: 'authorization_code', client_id: app.app_key, client_secret: app.app_secret }, { fetchImpl });
  if (!d.refresh_token) throw new ErroDropbox('SEM_REFRESH_TOKEN', false, 'a autorização não veio com token_access_type=offline');
  const guardar = { refresh_token: d.refresh_token, account_id: d.account_id || '', uid: d.uid || '', scope: d.scope || '', obtido_em: new Date().toISOString() };
  await writeFile(tokenPath(), JSON.stringify(guardar, null, 2) + '\n', { mode: 0o600 });
  estado.acesso = d.access_token; estado.expiraMs = Date.now() + (Number(d.expires_in) || 14400) * 1000;
  return { account_id: guardar.account_id, scope: guardar.scope };
}

// Token de acesso válido: o da memória enquanto não expirou, senão renova pelo refresh token.
async function tokenDeAcesso({ fetchImpl = fetch, agora = Date.now, forcar = false } = {}) {
  const t = agora();
  if (!forcar && estado.acesso && t < estado.expiraMs - 60000) return estado.acesso;
  const app = await lerApp();
  const tk = await lerToken();
  const d = await pedirToken({ grant_type: 'refresh_token', refresh_token: tk.refresh_token, client_id: app.app_key, client_secret: app.app_secret }, { fetchImpl });
  estado.acesso = d.access_token;
  estado.expiraMs = t + (Number(d.expires_in) || 14400) * 1000;
  return estado.acesso;
}

function contar(agora, limiteDiario) {
  const dia = new Date(agora()).toISOString().slice(0, 10);
  if (estado.dia !== dia) { estado.dia = dia; estado.chamadas = 0; }
  if (estado.chamadas >= limiteDiario) throw new ErroDropbox('DROPBOX_LIMITE_DIARIO');
  estado.chamadas += 1;
}

// Erro do Dropbox: 409 traz error_summary (prefixo é o que importa, o fim tem "..." aleatórios) e às vezes user_message.
async function erroDaResposta(r) {
  const texto = await r.text().catch(() => '');
  let j = null; try { j = texto ? JSON.parse(texto) : null; } catch { j = null; }
  const resumo = String(j?.error_summary || (j ? '' : texto) || '').replace(/\.+$/, '').slice(0, 160);
  const um = j?.user_message; const msg = String((um && typeof um === 'object' ? um.text : um) || '').slice(0, 200);
  if (r.status === 409) return new ErroDropbox('DROPBOX_409', /^(retry_error|internal_error)|too_many_write_operations/.test(resumo), resumo, msg);
  if (r.status === 401) return new ErroDropbox('DROPBOX_HTTP_401', false, resumo);
  if (r.status === 403) return new ErroDropbox('DROPBOX_HTTP_403', false, resumo, msg);
  if (r.status === 429) return new ErroDropbox('DROPBOX_HTTP_429', true, resumo);
  if (r.status >= 500) return new ErroDropbox(`DROPBOX_HTTP_${r.status}`, true, resumo);
  return new ErroDropbox(`DROPBOX_HTTP_${r.status}`, false, resumo || msg);
}

async function executar({ url, headers, body, lerCorpo, fetchImpl = fetch, timeoutMs = 20000, tentativas = 2, esperar = dormir, agora = Date.now, limiteDiario = 1000 }) {
  let ultimo = 'DROPBOX_FALHOU';
  let renovou = false;
  for (let i = 1; i <= tentativas + 1; i++) {
    const acesso = await tokenDeAcesso({ fetchImpl, agora, forcar: renovou });
    contar(agora, limiteDiario);
    let espera = 1000 * i + Math.floor(Math.random() * 400);
    try {
      const r = await fetchImpl(url, { method: 'POST', headers: { Authorization: `Bearer ${acesso}`, ...headers }, body, signal: AbortSignal.timeout(timeoutMs) });
      if (r.ok) return await lerCorpo(r);
      const e = await erroDaResposta(r);
      if (r.status === 401 && !renovou) { renovou = true; continue; } // acesso expirado: renova e repete
      if (!e.transitorio) throw e;
      ultimo = e.code;
      const ra = Number(r.headers.get('retry-after')); if (Number.isFinite(ra) && ra > 0) espera = Math.min(ra, 10) * 1000;
    } catch (e) {
      if (e instanceof ErroDropbox) { if (!e.transitorio) throw e; ultimo = e.code; }
      else ultimo = e?.name === 'TimeoutError' ? 'DROPBOX_TEMPO_ESGOTADO' : 'DROPBOX_REDE';
    }
    if (i <= tentativas) await esperar(espera);
  }
  throw new ErroDropbox(ultimo, true);
}

// Rota RPC (api.dropboxapi.com): JSON vai e volta. Sem argumento (Void) vai sem corpo e sem Content-Type.
export async function rpc(rota, arg, opts = {}) {
  const semArg = arg === undefined || arg === null;
  return executar({
    ...opts,
    url: API + rota,
    headers: semArg ? {} : { 'Content-Type': 'application/json' },
    body: semArg ? undefined : JSON.stringify(arg),
    lerCorpo: async (r) => { const t = await r.text(); try { return t ? JSON.parse(t) : {}; } catch { throw new ErroDropbox('DROPBOX_RESPOSTA_INVALIDA', true); } },
  });
}

// Rota de conteúdo (content.dropboxapi.com): argumento no cabeçalho Dropbox-API-Arg, bytes no corpo,
// metadados no cabeçalho dropbox-api-result. Corta em maxBytes sem baixar o resto.
export async function conteudo(rota, arg, { maxBytes = 25 * 1024 * 1024, timeoutMs = 60000, ...opts } = {}) {
  return executar({
    ...opts, timeoutMs,
    url: CONTEUDO + rota,
    headers: { 'Dropbox-API-Arg': jsonAscii(arg) },
    body: undefined,
    lerCorpo: async (r) => {
      const cl = Number(r.headers.get('content-length'));
      if (Number.isFinite(cl) && cl > maxBytes) throw new ErroDropbox('ARQUIVO_GRANDE', false, String(cl));
      const partes = []; let total = 0;
      const reader = r.body?.getReader ? r.body.getReader() : null;
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.length;
          if (total > maxBytes) { await reader.cancel().catch(() => {}); throw new ErroDropbox('ARQUIVO_GRANDE', false, String(total)); }
          partes.push(value);
        }
      } else {
        const b = new Uint8Array(await r.arrayBuffer());
        if (b.length > maxBytes) throw new ErroDropbox('ARQUIVO_GRANDE', false, String(b.length));
        partes.push(b); total = b.length;
      }
      const bytes = Buffer.concat(partes.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)), total);
      let meta = {}; try { meta = JSON.parse(r.headers.get('dropbox-api-result') || '{}'); } catch { meta = {}; }
      return { bytes, meta };
    },
  });
}

// Rota de envio (style upload): argumento no cabeçalho, bytes no corpo (octet-stream), JSON de volta no corpo.
// Só 1 repetição: se o 1º envio tiver gravado e a resposta se perdido, o 2º com mode "add" devolve conflito (seguro, nada duplica).
export async function enviar(rota, arg, bytes, { timeoutMs = 120000, tentativas = 1, ...opts } = {}) {
  return executar({
    ...opts, timeoutMs, tentativas,
    url: CONTEUDO + rota,
    headers: { 'Dropbox-API-Arg': jsonAscii(arg), 'Content-Type': 'application/octet-stream' },
    body: bytes,
    lerCorpo: async (r) => { const t = await r.text(); try { return t ? JSON.parse(t) : {}; } catch { throw new ErroDropbox('DROPBOX_RESPOSTA_INVALIDA', true); } },
  });
}
