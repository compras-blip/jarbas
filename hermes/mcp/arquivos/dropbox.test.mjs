import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { rpc, conteudo, enviar, trocarCodigo, jsonAscii, urlAutorizacao, zerarEstado, chamadasHoje, ErroDropbox, OAUTH_TOKEN, API, CONTEUDO } from './dropbox.mjs';

const dir = await mkdtemp(path.join(tmpdir(), 'atlas-dbx-'));
process.env.DROPBOX_APP_PATH = path.join(dir, 'app.json');
process.env.DROPBOX_TOKEN_PATH = path.join(dir, 'token.json');
await writeFile(process.env.DROPBOX_APP_PATH, JSON.stringify({ app_key: 'chave', app_secret: 'segredo' }));
await writeFile(process.env.DROPBOX_TOKEN_PATH, JSON.stringify({ refresh_token: 'refresh-1' }));

const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });
const tokenOk = () => json({ access_token: 'acesso-1', expires_in: 14400, token_type: 'bearer' });
// fetch de mentira: devolve as respostas na ordem, guardando cada pedido
function fetchFalso(respostas) {
  const pedidos = [];
  const f = async (url, init) => { pedidos.push({ url, init }); const r = respostas.shift(); if (!r) throw new Error('sem resposta prevista'); return typeof r === 'function' ? r() : r; };
  f.pedidos = pedidos; return f;
}
const semEspera = async () => {};

test('jsonAscii escapa acento para o cabeçalho Dropbox-API-Arg; URL de autorização pede offline', () => {
  assert.equal(jsonAscii({ path: '/Amazônia.pdf' }), '{"path":"/Amaz\\u00f4nia.pdf"}');
  assert.equal(urlAutorizacao('ab c'), 'https://www.dropbox.com/oauth2/authorize?client_id=ab%20c&response_type=code&token_access_type=offline');
});

test('rpc: renova o acesso pelo refresh token e manda JSON com Bearer', async () => {
  zerarEstado();
  const f = fetchFalso([tokenOk(), json({ used: 5, allocation: { '.tag': 'individual', allocated: 10 } })]);
  const r = await rpc('users/get_space_usage', undefined, { fetchImpl: f, esperar: semEspera });
  assert.equal(r.used, 5);
  assert.equal(f.pedidos[0].url, OAUTH_TOKEN);
  assert.equal(String(f.pedidos[0].init.body), 'grant_type=refresh_token&refresh_token=refresh-1&client_id=chave&client_secret=segredo');
  assert.equal(f.pedidos[1].url, API + 'users/get_space_usage');
  assert.equal(f.pedidos[1].init.headers.Authorization, 'Bearer acesso-1');
  assert.equal(f.pedidos[1].init.body, undefined);
  assert.equal(f.pedidos[1].init.headers['Content-Type'], undefined);
  assert.equal(chamadasHoje(), 1);
});

test('rpc: 409 vira ErroDropbox com o prefixo do error_summary; não repete', async () => {
  zerarEstado();
  const f = fetchFalso([tokenOk(), json({ error_summary: 'path/not_found/...', error: { '.tag': 'path', path: { '.tag': 'not_found' } } }, 409)]);
  await assert.rejects(rpc('files/get_metadata', { path: '/x' }, { fetchImpl: f, esperar: semEspera }), (e) => e instanceof ErroDropbox && e.code === 'DROPBOX_409' && e.detalhe.startsWith('path/not_found') && !e.transitorio);
  assert.equal(f.pedidos.length, 2);
  assert.equal(f.pedidos[1].init.body, '{"path":"/x"}');
});

test('rpc: 429 espera o Retry-After e repete; 401 renova o token e repete', async () => {
  zerarEstado();
  const esperas = [];
  const f = fetchFalso([tokenOk(), json({ error_summary: 'too_many_requests/..' }, 429, { 'retry-after': '2' }), json({ entries: [], has_more: false })]);
  const r = await rpc('files/list_folder', { path: '' }, { fetchImpl: f, esperar: async (ms) => { esperas.push(ms); } });
  assert.deepEqual(r.entries, []);
  assert.deepEqual(esperas, [2000]);
  zerarEstado();
  const g = fetchFalso([tokenOk(), json({ error_summary: 'expired_access_token/..' }, 401), json({ access_token: 'acesso-2', expires_in: 14400 }), json({ ok: true })]);
  const r2 = await rpc('users/get_current_account', undefined, { fetchImpl: g, esperar: semEspera });
  assert.equal(r2.ok, true);
  assert.equal(g.pedidos[3].init.headers.Authorization, 'Bearer acesso-2');
});

test('conteudo: bytes do corpo e metadados do cabeçalho; corta acima de maxBytes', async () => {
  zerarEstado();
  const corpo = Buffer.from('%PDF-1.4 teste');
  const f = fetchFalso([tokenOk(), new Response(corpo, { status: 200, headers: { 'dropbox-api-result': JSON.stringify({ name: 'Amazônia.pdf', size: corpo.length }) } })]);
  const r = await conteudo('files/download', { path: '/Amazônia.pdf' }, { fetchImpl: f, esperar: semEspera });
  assert.equal(r.bytes.toString(), '%PDF-1.4 teste');
  assert.equal(r.meta.name, 'Amazônia.pdf');
  assert.equal(f.pedidos[1].url, CONTEUDO + 'files/download');
  assert.equal(f.pedidos[1].init.headers['Dropbox-API-Arg'], '{"path":"/Amaz\\u00f4nia.pdf"}');
  const g = fetchFalso([new Response(Buffer.alloc(50), { status: 200 })]);
  await assert.rejects(conteudo('files/download', { path: '/g.bin' }, { fetchImpl: g, esperar: semEspera, maxBytes: 20 }), (e) => e.code === 'ARQUIVO_GRANDE');
});

test('limite diário bloqueia antes de chamar', async () => {
  zerarEstado();
  const f = fetchFalso([tokenOk(), json({}), json({})]);
  await rpc('users/get_space_usage', undefined, { fetchImpl: f, esperar: semEspera, limiteDiario: 1 });
  await assert.rejects(rpc('users/get_space_usage', undefined, { fetchImpl: f, esperar: semEspera, limiteDiario: 1 }), (e) => e.code === 'DROPBOX_LIMITE_DIARIO');
});

test('trocarCodigo grava só o refresh token e dados da conta; sem refresh é erro', async () => {
  zerarEstado();
  const f = fetchFalso([json({ access_token: 'a', refresh_token: 'refresh-novo', expires_in: 14400, scope: 'files.metadata.read files.content.read account_info.read', account_id: 'dbid:1', uid: '7' })]);
  const r = await trocarCodigo('  codigo-colado  ', { fetchImpl: f });
  assert.equal(r.account_id, 'dbid:1');
  assert.equal(String(f.pedidos[0].init.body), 'code=codigo-colado&grant_type=authorization_code&client_id=chave&client_secret=segredo');
  const gravado = JSON.parse(await readFile(process.env.DROPBOX_TOKEN_PATH, 'utf8'));
  assert.equal(gravado.refresh_token, 'refresh-novo');
  assert.equal(gravado.access_token, undefined);
  const g = fetchFalso([json({ access_token: 'a', expires_in: 14400 })]);
  await assert.rejects(trocarCodigo('codigo-colado-2', { fetchImpl: g }), (e) => e.code === 'SEM_REFRESH_TOKEN');
});

test('enviar: bytes no corpo, argumento ASCII no cabeçalho, JSON de volta', async () => {
  zerarEstado();
  const f = fetchFalso([tokenOk(), json({ '.tag': 'file', name: 'nota.txt', path_display: '/Atlas testes/nota.txt', size: 2 })]);
  const r = await enviar('files/upload', { path: '/Atlas testes/nota.txt', mode: 'add', autorename: false, mute: false, strict_conflict: false }, Buffer.from('oi'), { fetchImpl: f, esperar: semEspera });
  assert.equal(r.path_display, '/Atlas testes/nota.txt');
  assert.equal(f.pedidos[1].url, CONTEUDO + 'files/upload');
  assert.equal(f.pedidos[1].init.headers['Content-Type'], 'application/octet-stream');
  assert.equal(f.pedidos[1].init.headers['Dropbox-API-Arg'], '{"path":"/Atlas testes/nota.txt","mode":"add","autorename":false,"mute":false,"strict_conflict":false}');
  assert.equal(Buffer.from(f.pedidos[1].init.body).toString(), 'oi');
  const g = fetchFalso([json({ error_summary: 'path/conflict/file/...' }, 409)]);
  await assert.rejects(enviar('files/upload', { path: '/x' }, Buffer.from('a'), { fetchImpl: g, esperar: semEspera }), (e) => e.code === 'DROPBOX_409' && e.detalhe.startsWith('path/conflict/file'));
  assert.equal(g.pedidos.length, 1);
});
