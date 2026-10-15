import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPt, partes } from './soniox-tts.mjs';

test('normalização em português: reais, dólares, horas, datas, links, marcadores', () => {
  assert.equal(normalizarPt('Custa R$ 59,90 e R59,90 dollars; enviou US$ 1.100 e 1.100 US dollars.'), 'Custa 59,90 reais e 59,90 reais; enviou 1.100 dólares e 1.100 dólares.');
  assert.equal(normalizarPt('Almoço às 12h30, treino às 7h, reunião às 9h00, 1h de duração.'), 'Almoço às 12 e 30, treino às 7 horas, reunião às 9 horas, 1 hora de duração.');
  assert.equal(normalizarPt('Fechado na segunda, 19/10. Vence em 05/11/2026. Placa 30/99 não é data.'), 'Fechado na segunda, 19 de outubro. Vence em 5 de novembro de 2026. Placa 30/99 não é data.');
  assert.equal(normalizarPt('• Link: https://maps.google.com/?cid=123 • Telefone (92) 3644-7000'), 'Link: Telefone (92) 3644-7000');
});

test('partes: corta em fim de frase e nunca passa do máximo', () => {
  const frase = 'Esta é uma frase de teste com algumas palavras. ';
  const texto = frase.repeat(30);
  const ps = partes(texto, 400);
  assert.ok(ps.length >= 3);
  for (const p of ps) { assert.ok(p.length <= 400, `parte com ${p.length}`); assert.match(p, /\.$/); }
  assert.equal(ps.join(' ').replace(/\s+/g, ' ').trim(), texto.replace(/\s+/g, ' ').trim());
  assert.deepEqual(partes('curto'), ['curto']);
});
