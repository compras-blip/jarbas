import test from 'node:test';
import assert from 'node:assert/strict';
import { decodificarCabecalho, lerEnderecos, htmlParaTexto, extrairMensagem, montarMensagem, bytesParaBase64url, base64urlParaBytes, cabecalhoCodificado } from './mime.mjs';

test('cabeçalho RFC 2047 em base64 e quoted-printable', () => {
  assert.equal(decodificarCabecalho('=?UTF-8?B?UmV1bmnDo28gZGUgb3LDp2FtZW50bw==?='), 'Reunião de orçamento');
  assert.equal(decodificarCabecalho('=?ISO-8859-1?Q?Ol=E1_Bruno?='), 'Olá Bruno');
  assert.equal(decodificarCabecalho('Assunto simples'), 'Assunto simples');
});

test('endereços com nome, sem nome e vários', () => {
  assert.deepEqual(lerEnderecos('"Williams Jezini" <w@x.com>, bruno@y.com'), [{ nome: 'Williams Jezini', email: 'w@x.com' }, { nome: '', email: 'bruno@y.com' }]);
});

test('HTML vira texto legível com links', () => {
  const t = htmlParaTexto('<div><p>Fatura <b>vence</b> em 20/10.</p><a href="https://pague.com/x">Pagar agora</a><br>&nbsp;Obrigado&amp;até</div>');
  assert.equal(t, 'Fatura vence em 20/10.\nPagar agora (https://pague.com/x)\n Obrigado&até');
});

test('mensagem multipart: texto, html e anexo', () => {
  const b64 = (s) => bytesParaBase64url(Buffer.from(s, 'utf8'));
  const payload = { mimeType: 'multipart/mixed', parts: [
    { mimeType: 'multipart/alternative', parts: [
      { mimeType: 'text/plain', headers: [{ name: 'Content-Type', value: 'text/plain; charset="UTF-8"' }], body: { data: b64('Olá, segue o boleto.\n') } },
      { mimeType: 'text/html', body: { data: b64('<p>Olá, segue o boleto.</p>') } } ] },
    { mimeType: 'application/pdf', filename: 'boleto.pdf', body: { attachmentId: 'ANX1', size: 12345 } } ] };
  const m = extrairMensagem(payload);
  assert.equal(m.corpo, 'Olá, segue o boleto.');
  assert.deepEqual(m.anexos, [{ nome: 'boleto.pdf', tipo: 'application/pdf', tamanho: 12345, id_anexo: 'ANX1' }]);
  assert.equal(m.veioDeHtml, false);
  const soHtml = extrairMensagem({ mimeType: 'text/html', body: { data: b64('<p>Só <i>HTML</i> aqui https://a.b/c</p>') } });
  assert.equal(soHtml.corpo, 'Só HTML aqui https://a.b/c'); assert.deepEqual(soHtml.links, ['https://a.b/c']); assert.equal(soHtml.veioDeHtml, true);
});

test('montar mensagem simples e com anexo, com acentos no assunto', () => {
  const raw = montarMensagem({ para: [{ nome: 'Williams', email: 'w@x.com' }], assunto: 'Reunião amanhã', texto: 'Chego às 15h.' });
  assert.match(raw, /^To: Williams <w@x.com>\r\n/);
  assert.match(raw, /Subject: =\?UTF-8\?B\?/);
  assert.match(raw, /Content-Type: text\/plain; charset="UTF-8"/);
  assert.equal(Buffer.from(raw.split('\r\n\r\n')[1], 'base64').toString('utf8'), 'Chego às 15h.');
  const comAnexo = montarMensagem({ de: { nome: '', email: 'bruno@icloud.com' }, para: [{ nome: '', email: 'a@b.c' }], assunto: 'x', texto: 'y', emResposta: { messageId: '<m1@x>', references: '<m0@x>' }, anexos: [{ nome: 'nota.txt', tipo: 'text/plain', bytes: Buffer.from('oi') }] });
  assert.match(comAnexo, /^From: bruno@icloud.com\r\n/); assert.match(comAnexo, /In-Reply-To: <m1@x>\r\nReferences: <m0@x> <m1@x>/); assert.match(comAnexo, /multipart\/mixed; boundary=/); assert.match(comAnexo, /filename="nota.txt"/);
  assert.equal(cabecalhoCodificado('ascii'), 'ascii');
  assert.equal(base64urlParaBytes(bytesParaBase64url(Buffer.from([0, 255, 62, 63]))).toString('hex'), '00ff3e3f');
});
