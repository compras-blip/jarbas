import test from 'node:test';
import assert from 'node:assert/strict';
import { dominio, dominioBase, extrairValores, extrairDatas, sinaisDeGolpe, classificar, trecho } from './triagem.mjs';

const agora = Date.UTC(2026, 9, 14, 20, 0, 0); // 14/10/2026

test('domínios, valores e datas', () => {
  assert.equal(dominio('Hostmaster <hostmaster@registro.br>'), 'registro.br');
  assert.equal(dominioBase('mail.receita.fazenda.gov.br'), 'fazenda.gov.br');
  assert.equal(dominioBase('accounts.google.com'), 'google.com');
  assert.deepEqual(extrairValores('Valor: R$ 2.741,94. Taxa R$40. Enviado US$ 1,100 e 150 reais.'), ['R$ 2.741,94', 'R$ 40', 'US$ 1,100', 'R$ 150']);
  const ds = extrairDatas('Emitido em 05/10/2026. Vencimento: 20/10/2026. Reunião 3/11.');
  assert.equal(ds.length, 3); assert.equal(ds[1].vencimento, true); assert.equal(ds[1].ano, 2026); assert.equal(ds[0].vencimento, false); assert.equal(ds[2].ano, null);
});

test('golpe: Receita Federal de domínio estranho, link de pagamento fora, vencimento velho', () => {
  const g = sinaisDeGolpe({ deEmail: 'Receita Federal <cobranca@filipilg.com.br>', deNome: 'Receita Federal', assunto: 'DARF em aberto - Amazon Vital', corpo: 'Regularize sua situação. Vencimento: 06/11/2025. Pague agora.', links: ['https://cdn.pagamentos-xyz.click/darf'], agoraMs: agora });
  assert.ok(g.pontos >= 3, JSON.stringify(g));
  assert.match(g.motivos[0], /Receita Federal.*filipilg\.com\.br/);
  const leg = sinaisDeGolpe({ deEmail: 'hostmaster@registro.br', deNome: 'Registro.br', assunto: 'assessoratlas.com.br - Instrucoes de pagamento', corpo: 'Vencimento 20/10/2026. Pague pelo boleto.', links: ['https://registro.br/r/ABC'], agoraMs: agora });
  assert.equal(leg.pontos, 0, JSON.stringify(leg));
});

test('classificar: cobrança, golpe, pagamento, segurança, propaganda, automático, pessoal', () => {
  const c = (x) => classificar({ agoraMs: agora, ...x });
  assert.equal(c({ deEmail: 'hostmaster@registro.br', deNome: 'Registro.br', assunto: 'assessoratlas.com.br - Instrucoes de pagamento', corpo: 'O domínio foi cadastrado com sucesso. Para ativá-lo, pague R$ 40,00 até o dia 20/10/2026 pelo boleto.' }).categoria, 'cobranca');
  assert.equal(c({ deEmail: 'caio@aplix.com.br', deNome: 'Caio', assunto: 'Honorários 1º ciclo', corpo: 'Segue apuração: R$ 2.741,94, vencimento 15/10/2026.' }).categoria, 'cobranca');
  assert.equal(c({ deEmail: 'cobranca@filipilg.com.br', deNome: 'Receita Federal', assunto: 'DARF', corpo: 'Regularize. Vencimento 06/11/2025.', links: ['https://pag.click/x'] }).categoria, 'golpe');
  assert.equal(c({ deEmail: 'noreply@wise.com', deNome: 'Wise', assunto: 'Seus 1.100 USD chegaram na conta de Williams', corpo: 'A transferência foi concluída.' }).categoria, 'pagamento');
  assert.equal(c({ deEmail: 'faturamento@z-api.io', deNome: 'Z-API', assunto: 'NFS-e 65523 - Four Pixel', corpo: 'Segue a nota fiscal referente à fatura 301090, valor R$ 99,99.' }).categoria, 'pagamento');
  assert.equal(c({ deEmail: 'no-reply@accounts.google.com', deNome: 'Google', assunto: 'Alerta de segurança', corpo: 'O app Gmail ShuttleCloud Migration recebeu acesso à sua Conta do Google.' }).categoria, 'seguranca');
  assert.equal(c({ deEmail: 'news@temu.com', deNome: 'TEMU', assunto: 'Venda na TEMU', corpo: 'Oferta especial. Unsubscribe.', rotulos: ['CATEGORY_PROMOTIONS'] }).categoria, 'propaganda');
  assert.equal(c({ deEmail: 'automated@airbnb.com', deNome: 'Airbnb', assunto: 'Confirme sua conta', corpo: 'Você tem 7 dias para confirmar.' }).categoria, 'automatico');
  const p = c({ deEmail: 'VisaRio@state.gov', deNome: 'Visa, Rio', assunto: 'Re: SIMOES, BRUNO; 221G DOCUMENTOS ADICIONAIS', corpo: 'A análise administrativa foi concluída. Envie o passaporte.' });
  assert.equal(p.categoria, 'pessoal');
  assert.equal(c({ deEmail: 'asaas@asaas.com', deNome: 'Asaas', assunto: 'Novidades', corpo: 'Confira', ruido: ['asaas'] }).categoria, 'propaganda');
  assert.equal(c({ deEmail: 'caio.cordeiro@aplix.com.br', deNome: 'Caio', assunto: 'Reuniao Amazon Vital - BPS + CCC', corpo: 'Reunião do Microsoft Teams. ID: 256 097. Senha: abc.' }).categoria, 'pessoal');
  assert.equal(c({ deEmail: 'itau.personnalite@itau.com.br', deNome: 'Itaú', assunto: 'Golpe do falso advogado: desconfie de pagamentos antecipados', corpo: 'Ver no navegador. Golpistas pedem pagamento antecipado de uma fatura ou boleto. Pague agora só o que reconhece.' }).categoria, 'propaganda');
  assert.equal(c({ deEmail: 'updates@uncrate.com', deNome: 'Uncrate', assunto: 'NSX Restomod & more', corpo: '<table><tr><td>Deals</td></tr></table> unsubscribe' }).categoria, 'propaganda');
  assert.equal(c({ deEmail: 'cobranca@asaas.com', deNome: 'Asaas', assunto: 'Fatura disponível', corpo: 'Valor R$ 250,00, vencimento 20/10/2026.', listaDeDescadastro: true }).categoria, 'cobranca');
});

test('trecho converte HTML cru e tira caracteres invisíveis', () => {
  assert.equal(trecho('<!-- x --> <table><tr><td>Olá</td></tr></table> &zwnj; &zwnj; mundo', 50), 'Olá mundo');
});

test('trecho limpa links e espaços', () => {
  assert.equal(trecho('Olá,\n\nsegue  o boleto (https://x.com/a) para hoje.', 40), 'Olá, segue o boleto para hoje.');
});
