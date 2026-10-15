import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { chamar, buscarTexto, ficha, referencia, zerarEstado, chamadasHoje, MASCARA_BUSCA, MASCARA_FICHA, MASCARA_AVALIACOES, ErroGoogle } from './google.mjs';

const resposta = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
const fakeFetch = (fila) => { const chamadas = []; const f = async (url, init) => { chamadas.push({ url, init }); const r = fila.shift(); if (typeof r === 'function') return r(); return r; }; f.chamadas = chamadas; return f; };
const semEspera = async () => {};
beforeEach(() => zerarEstado());

test('busca manda cabecalhos certos e corpo em pt-BR com viés de local', async () => {
  const f = fakeFetch([resposta(200, { places: [{ id: 'A1', displayName: { text: 'Bem Brasil' } }] })]);
  const ps = await buscarTexto({ chave: 'k', texto: 'restaurante', locationBias: { latitude: 1, longitude: 2, raioMetros: 500 }, abertoAgora: true, quantos: 3, notaMinima: 4.2, fetchImpl: f });
  assert.equal(ps.length, 1);
  const { url, init } = f.chamadas[0];
  assert.equal(url, 'https://places.googleapis.com/v1/places:searchText');
  assert.equal(init.headers['X-Goog-Api-Key'], 'k');
  assert.equal(init.headers['X-Goog-FieldMask'], MASCARA_BUSCA);
  assert.ok(!MASCARA_BUSCA.includes('OpeningHours'), 'a busca nunca pede horário (nível mais caro)');
  const corpo = JSON.parse(init.body);
  assert.equal(corpo.languageCode, 'pt-BR');
  assert.equal(corpo.pageSize, 3);
  assert.equal(corpo.openNow, true);
  assert.equal(corpo.minRating, 4);
  assert.deepEqual(corpo.locationBias.circle, { center: { latitude: 1, longitude: 2 }, radius: 500 });
});

test('ficha usa GET /places/{id} e a mascara certa; avaliacoes so quando pedido', async () => {
  const f = fakeFetch([resposta(200, { id: 'A1' }), resposta(200, { id: 'A1' })]);
  await ficha({ chave: 'k', placeId: 'places/ChIJabc1234567', fetchImpl: f });
  await ficha({ chave: 'k', placeId: 'ChIJabc1234567', comAvaliacoes: true, fetchImpl: f });
  assert.equal(f.chamadas[0].init.method, 'GET');
  assert.ok(f.chamadas[0].url.startsWith('https://places.googleapis.com/v1/places/ChIJabc1234567?languageCode=pt-BR'));
  assert.equal(f.chamadas[0].init.headers['X-Goog-FieldMask'], MASCARA_FICHA);
  assert.equal(f.chamadas[1].init.headers['X-Goog-FieldMask'], MASCARA_AVALIACOES);
  await assert.rejects(() => ficha({ chave: 'k', placeId: 'x; rm -rf', fetchImpl: f }), (e) => e.code === 'GOOGLE_ID_INVALIDO');
});

test('sem chave falha antes de chamar o Google', async () => {
  const f = fakeFetch([]);
  await assert.rejects(() => buscarTexto({ chave: '', texto: 'x', fetchImpl: f }), (e) => e instanceof ErroGoogle && e.code === 'GOOGLE_SEM_CHAVE');
  assert.equal(f.chamadas.length, 0);
});

test('erro passageiro repete 1 vez; erro de chave nao repete', async () => {
  const f = fakeFetch([resposta(500, {}), resposta(200, { places: [] })]);
  await buscarTexto({ chave: 'k', texto: 'x', fetchImpl: f, esperar: semEspera });
  assert.equal(f.chamadas.length, 2);
  const g = fakeFetch([resposta(403, {}), resposta(200, { places: [] })]);
  await assert.rejects(() => buscarTexto({ chave: 'k', texto: 'y', fetchImpl: g, esperar: semEspera }), (e) => e.code === 'GOOGLE_HTTP_403' && !e.transitorio);
  assert.equal(g.chamadas.length, 1);
  const h = fakeFetch([resposta(503, {}), resposta(503, {})]);
  await assert.rejects(() => buscarTexto({ chave: 'k', texto: 'z', fetchImpl: h, esperar: semEspera }), (e) => e.code === 'GOOGLE_HTTP_503' && e.transitorio);
});

test('cache de 5 minutos e limite diario', async () => {
  const fila = [resposta(200, { places: [{ id: '1' }] })];
  const f = fakeFetch(fila);
  let t = 1_000_000;
  const agora = () => t;
  await buscarTexto({ chave: 'k', texto: 'igual', fetchImpl: f, agora });
  await buscarTexto({ chave: 'k', texto: 'igual', fetchImpl: f, agora });
  assert.equal(f.chamadas.length, 1, 'segunda consulta igual vem do cache');
  t += 6 * 60 * 1000;
  fila.push(resposta(200, { places: [] }));
  await buscarTexto({ chave: 'k', texto: 'igual', fetchImpl: f, agora });
  assert.equal(f.chamadas.length, 2, 'depois de 5 min consulta de novo');
  zerarEstado();
  const g = fakeFetch([resposta(200, { places: [] }), resposta(200, { places: [] }), resposta(200, { places: [] })]);
  await buscarTexto({ chave: 'k', texto: 'a', fetchImpl: g, limiteDiario: 2 });
  await buscarTexto({ chave: 'k', texto: 'b', fetchImpl: g, limiteDiario: 2 });
  await assert.rejects(() => buscarTexto({ chave: 'k', texto: 'c', fetchImpl: g, limiteDiario: 2 }), (e) => e.code === 'GOOGLE_LIMITE_DIARIO');
  assert.equal(chamadasHoje(), 2);
});

test('referencia devolve coordenadas do primeiro lugar', async () => {
  const f = fakeFetch([resposta(200, { places: [{ displayName: { text: 'Uptown Palace' }, formattedAddress: 'Via Santa Sofia 10, Milão', location: { latitude: 45.46, longitude: 9.19 } }] })]);
  const r = await referencia({ chave: 'k', pertoDe: 'Uptown Palace Milão', fetchImpl: f });
  assert.deepEqual(r, { nome: 'Uptown Palace', endereco: 'Via Santa Sofia 10, Milão', latitude: 45.46, longitude: 9.19 });
  assert.equal(JSON.parse(f.chamadas[0].init.body).pageSize, 1);
});
