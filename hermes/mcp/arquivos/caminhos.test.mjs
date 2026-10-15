import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCaminho, ErroCaminho, pastaDe, nomeSeguro, linkSite, fmtTamanho, tipoPorNome, ehImagemMiniatura, temPreviewPdf, validarNome, juntar, dentroDe } from './caminhos.mjs';

test('caminhos: raiz, normalização, id e rev', () => {
  assert.equal(validarCaminho(''), '');
  assert.equal(validarCaminho('/'), '');
  assert.equal(validarCaminho(' Contratos/ '), '/Contratos');
  assert.equal(validarCaminho('//Contratos//Amazônia.pdf/'), '/Contratos/Amazônia.pdf');
  assert.equal(validarCaminho('id:a4ayc_80_OEAAAAAAAAAXw'), 'id:a4ayc_80_OEAAAAAAAAAXw');
  assert.equal(validarCaminho('rev:a1c10ce0dd78'), 'rev:a1c10ce0dd78');
  assert.throws(() => validarCaminho('/Contratos/../x'), (e) => e instanceof ErroCaminho && e.code === 'CAMINHO_INVALIDO');
  assert.throws(() => validarCaminho('id:'), ErroCaminho);
  assert.throws(() => validarCaminho('/a\u0000b'), ErroCaminho);
});

test('pasta, nome seguro e links do site', () => {
  assert.equal(pastaDe('/Contratos/Amazônia.pdf'), '/Contratos');
  assert.equal(pastaDe('/x.pdf'), '/');
  assert.equal(nomeSeguro('Exame: sangue (2026)?.pdf'), 'Exame_ sangue _2026_.pdf');
  assert.equal(nomeSeguro(''), 'arquivo');
  assert.equal(linkSite({ '.tag': 'file', name: 'Amazônia.pdf', path_display: '/Contratos/Amazônia.pdf' }), 'https://www.dropbox.com/home/Contratos?preview=Amaz%C3%B4nia.pdf');
  assert.equal(linkSite({ '.tag': 'file', name: 'x.pdf', path_display: '/x.pdf' }), 'https://www.dropbox.com/home?preview=x.pdf');
  assert.equal(linkSite({ '.tag': 'folder', name: 'Exames 2026', path_display: '/Saúde/Exames 2026' }), 'https://www.dropbox.com/home/Sa%C3%BAde/Exames%202026');
});

test('tamanho e tipo', () => {
  assert.equal(fmtTamanho(512), '512 B');
  assert.equal(fmtTamanho(7212), '7,0 KB');
  assert.equal(fmtTamanho(1958858), '1,9 MB');
  assert.equal(fmtTamanho(3 * 1024 ** 3), '3,00 GB');
  assert.equal(fmtTamanho(2.5 * 1024 ** 4), '2,50 TB');
  assert.equal(tipoPorNome('x.PDF'), 'PDF');
  assert.equal(tipoPorNome('x.xlsx'), 'planilha');
  assert.equal(tipoPorNome('sem-extensao'), 'arquivo');
  assert.equal(tipoPorNome('a.abc'), 'ABC');
  assert.equal(ehImagemMiniatura('f.HEIC'), false);
  assert.equal(ehImagemMiniatura('f.jpg'), true);
  assert.equal(temPreviewPdf('c.docx'), true);
  assert.equal(temPreviewPdf('c.xlsx'), false);
});

test('escrita: nome válido, juntar e raiz local', () => {
  assert.equal(validarNome('  Contrato Amazônia 2026.pdf '), 'Contrato Amazônia 2026.pdf');
  assert.equal(validarNome('nome '), 'nome'); // espaço no fim é aparado, não recusado
  for (const ruim of ['', 'a/b', 'nome.', '..', '.DS_Store', '~$doc.docx', 'a\u0000b']) assert.throws(() => validarNome(ruim), (e) => e instanceof ErroCaminho && e.code === 'NOME_INVALIDO', ruim);
  assert.equal(juntar('', 'x.pdf'), '/x.pdf');
  assert.equal(juntar('/Contratos', 'x.pdf'), '/Contratos/x.pdf');
  assert.equal(dentroDe('/opt/data/cache/anexos/a.pdf', '/opt/data/'), true);
  assert.equal(dentroDe('/opt/data', '/opt/data'), true);
  assert.equal(dentroDe('/opt/datax/a.pdf', '/opt/data'), false);
  assert.equal(dentroDe('/etc/passwd', '/opt/data'), false);
});
