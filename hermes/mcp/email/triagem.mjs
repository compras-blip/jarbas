// triagem.mjs — classificação determinística de e-mails (fase 2c, 15/10/2026): cobrança, pagamento feito, segurança,
// golpe provável, propaganda, aviso automático, pessoal. Regras em código para que a profundidade da triagem não
// dependa do modelo decidir abrir cada e-mail. Funções puras, testadas em triagem.test.mjs.
import { htmlParaTexto } from './mime.mjs';

export const dominio = (email) => { const m = /@([^>\s,;]+)/.exec(String(email || '').trim().toLowerCase()); return m ? m[1] : ''; };
const CC_TLD = ['com.br', 'org.br', 'gov.br', 'net.br', 'adv.br', 'edu.br', 'co.uk', 'com.ar'];
export const dominioBase = (d) => { const p = String(d || '').toLowerCase().split('.').filter(Boolean); if (p.length <= 2) return p.join('.'); return CC_TLD.includes(p.slice(-2).join('.')) ? p.slice(-3).join('.') : p.slice(-2).join('.'); };
const dentroDe = (dom, legitimos) => legitimos.some((l) => dom === l || dom.endsWith('.' + l));

// Valores em reais e dólares: "R$ 1.234,56", "R$40", "US$ 1,100", "USD 1,100.00", "1.100 reais".
export function extrairValores(texto) {
  const t = String(texto || ''); const out = [];
  for (const m of t.matchAll(/(R\$|US\$|USD|U\$|BRL)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/g)) out.push(`${/^(R\$|BRL)$/.test(m[1]) ? 'R$' : 'US$'} ${m[2]}`);
  for (const m of t.matchAll(/\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s?(reais|d[óo]lares)\b/gi)) out.push(`${/d[óo]lar/i.test(m[2]) ? 'US$' : 'R$'} ${m[1]}`);
  return [...new Set(out)].slice(0, 6);
}
// Datas dd/mm[/aaaa]; marca as que vêm depois de "vencimento", "vence em", "até o dia", "prazo", "pagar até".
export function extrairDatas(texto) {
  const t = String(texto || ''); const out = [];
  for (const m of t.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g)) {
    const dia = +m[1], mes = +m[2]; if (dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
    let ano = m[3] ? +m[3] : null; if (ano !== null && ano < 100) ano += 2000;
    const antes = t.slice(Math.max(0, m.index - 45), m.index);
    out.push({ dia, mes, ano, texto: m[0], vencimento: /venc|vence|at[ée] o dia|prazo|pagar at[ée]|expira|validade/i.test(antes) });
    if (out.length >= 8) break;
  }
  return out;
}
export const dominiosDosLinks = (links) => [...new Set((links || []).map((u) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }).filter(Boolean))];

// Quem o e-mail diz ser (nome ou assunto) e de onde ele poderia vir de verdade.
const ORGS = [
  { nome: 'Receita Federal', re: /receita federal|\bdarf\b|e-?cac\b/i, dominios: ['gov.br'] },
  { nome: 'Correios', re: /\bcorreios\b/i, dominios: ['correios.com.br'] },
  { nome: 'Serasa', re: /\bserasa\b/i, dominios: ['serasa.com.br', 'serasaexperian.com.br'] },
  { nome: 'Detran', re: /\bdetran\b/i, dominios: ['gov.br'] },
  { nome: 'banco', re: /banco do brasil|\bbradesco\b|\bita[úu]\b|\bsantander\b|caixa econ[ôo]mica|\bnubank\b|\bsicredi\b|\bsicoob\b/i, dominios: ['bb.com.br', 'bradesco.com.br', 'itau.com.br', 'santander.com.br', 'caixa.gov.br', 'nubank.com.br', 'sicredi.com.br', 'sicoob.com.br'] },
  { nome: 'Apple', re: /\bapple\b|\bicloud\b/i, dominios: ['apple.com', 'icloud.com'] },
  { nome: 'Google', re: /\bgoogle\b|\bgmail\b/i, dominios: ['google.com', 'googlemail.com'] },
  { nome: 'Dropbox', re: /\bdropbox\b/i, dominios: ['dropbox.com', 'dropboxmail.com'] },
  { nome: 'Registro.br', re: /registro\.br|\bnic\.br/i, dominios: ['registro.br', 'nic.br'] },
  { nome: 'Mercado Livre', re: /mercado ?livre|mercado ?pago/i, dominios: ['mercadolivre.com.br', 'mercadopago.com.br', 'mercadolivre.com', 'mercadopago.com'] },
  { nome: 'Amazon', re: /\bamazon\b(?![ .-]*vital)/i, dominios: ['amazon.com', 'amazon.com.br'] },
  { nome: 'Wise', re: /\bwise\b/i, dominios: ['wise.com', 'transferwise.com'] },
  { nome: 'PayPal', re: /\bpaypal\b/i, dominios: ['paypal.com'] },
  { nome: 'Netflix', re: /\bnetflix\b/i, dominios: ['netflix.com'] },
  { nome: 'Microsoft', re: /\bmicrosoft\b|\boutlook\b/i, dominios: ['microsoft.com', 'outlook.com'] },
];
const LINKS_COMUNS = /^(google\.com|goo\.gl|apple\.com|dropbox\.com|wa\.me|whatsapp\.com|instagram\.com|facebook\.com|linkedin\.com|youtube\.com|youtu\.be|linktr\.ee|twitter\.com|x\.com|bit\.ly)$/;

export function sinaisDeGolpe({ deEmail, deNome = '', assunto = '', corpo = '', links = [], agoraMs = Date.now() }) {
  const motivos = []; const dom = dominio(deEmail); const cabeca = `${deNome} ${assunto}`; const texto = `${cabeca} ${String(corpo).slice(0, 3000)}`;
  for (const o of ORGS) if (o.re.test(cabeca) && dom && !dentroDe(dom, o.dominios)) { motivos.push(`diz ser ${o.nome}, mas o remetente é ${dom}`); break; }
  const base = dominioBase(dom);
  const estranhos = dominiosDosLinks(links).filter((d) => base && dominioBase(d) !== base && !LINKS_COMUNS.test(dominioBase(d)));
  if (/pag(ar|amento)|boleto|\bdarf\b|fatura|regulariz|d[ée]bito/i.test(texto) && estranhos.length) motivos.push(`link de pagamento em domínio diferente do remetente (${estranhos.slice(0, 2).join(', ')})`);
  if (/\burgente\b|imediat[ao]|ser[áa] (bloquead|suspens|cancelad)|[úu]ltimo aviso|evite (o )?bloqueio|regularize (sua|a) situa[çc][ãa]o|sob pena/i.test(texto)) motivos.push('tom de urgência ou ameaça');
  for (const d of extrairDatas(texto)) if (d.vencimento && d.ano) { const ms = Date.UTC(d.ano, d.mes - 1, d.dia); if (agoraMs - ms > 60 * 86400000) { motivos.push(`vencimento no passado distante (${d.texto})`); break; } }
  if (/\.(xyz|top|click|buzz|icu|cfd|zip|mov)\b/i.test(dominiosDosLinks(links).join(' '))) motivos.push('link em domínio descartável');
  return { pontos: motivos.length, motivos };
}

const RE = {
  cobranca: /\bboleto|\bfatura|cobran[çc]a|vencimento|vence (em|no dia|dia|hoje|amanh)|instru[çc][õo]es de pagamento|pagamento pendente|\bem aberto\b|\binvoice\b|payment due|amount due|\bdarf\b|\bguia (de|da|do) |mensalidade|renova[çc][ãa]o|segunda via|pix copia|c[óo]digo de barras|linha digit[áa]vel|pagar agora|efetue o pagamento|valor a pagar|aguardando pagamento|honor[áa]rios/i,
  pagamento: /pagamento (confirmado|recebido|aprovado|efetuado|realizado|conclu[íi]do)|comprovante|\brecibo\b|nota fiscal|nfs-?e\b|\breceipt\b|payment (received|confirmed|successful|completed)|obrigado pelo (seu )?pagamento|sua compra foi (aprovada|confirmada)|transfer[êe]ncia (enviada|conclu[íi]da|realizada|recebida)|you (sent|paid)|chegaram? (na|à|em) (sua )?conta|foi pag[ao]\b|est[áa] pag[ao]\b/i,
  seguranca: /alerta de seguran[çc]a|security alert|\bsenha\b|\bpassword\b|c[óo]digo de (verifica[çc][ãa]o|acesso|confirma[çc][ãa]o|seguran[çc]a)|verification code|novo (login|acesso|dispositivo)|new sign-?in|autentica[çc][ãa]o|\b2fa\b|foi conectado|was granted access|recupera[çc][ãa]o (de|da) conta|e-?mail de recupera[çc][ãa]o|acesso aos dados|app .* (recebeu|tem) acesso/i,
  propaganda: /unsubscribe|descadastr|cancelar (a )?inscri[çc][ãa]o|newsletter|promo[çc][ãa]o|\boferta|desconto|cupom|black friday|% ?off|frete gr[áa]tis|aproveite|imperd[íi]vel|\bsale\b/i,
  automatico: /^(no-?reply|noreply|no_reply|nao-?responda|naoresponda|notification|notifications|alerts?|mailer-daemon|bounce|donotreply|do-not-reply|newsletters?|news|marketing|comunica[cç][aã]o|atendimento|suporte|support|billing|faturamento|financeiro|cobranca|hostmaster|automated|system|info|updates?|hello|hi|team|promo|offers?|digest|notify|mail|email|contact)@/i,
  recibo_no_assunto: /comprovante|\brecibo\b|nota fiscal|nfs-?e\b|pagamento (confirmado|recebido|aprovado|efetuado|realizado)|\breceipt\b|chegaram? (na|à)/i,
};
// Aviso de segurança só conta quando vem de uma plataforma de verdade (pelo domínio do remetente), não de qualquer e-mail com a palavra "senha".
const PLATAFORMAS = ['google.com', 'googlemail.com', 'apple.com', 'icloud.com', 'dropbox.com', 'dropboxmail.com', 'microsoft.com', 'outlook.com', 'live.com', 'wise.com', 'transferwise.com', 'nubank.com.br', 'bb.com.br', 'itau.com.br', 'bradesco.com.br', 'santander.com.br', 'caixa.gov.br', 'paypal.com', 'mercadolivre.com.br', 'mercadopago.com.br', 'amazon.com', 'amazon.com.br', 'meta.com', 'facebookmail.com', 'instagram.com', 'whatsapp.com', 'telegram.org', 'airbnb.com', 'uber.com', 'netflix.com', 'spotify.com', 'registro.br', 'nic.br', 'gov.br', 'state.gov', 'github.com', 'openai.com', 'anthropic.com', 'x.com', 'linkedin.com', 'me.com'];
const FORTES = /\bboleto|\bdarf\b|linha digit[áa]vel|pix copia|c[óo]digo de barras|instru[çc][õo]es de pagamento|efetue o pagamento|pagar agora|aguardando pagamento|honor[áa]rios|segunda via|valor a pagar|pagamento pendente/i;
const NEWSLETTER = /ver (no|em seu) navegador|view (in|this email in) (your )?browser|ver online|unsubscribe|descadastr|cancelar (a )?inscri[çc][ãa]o/i;

// Entrada: campos já extraídos do e-mail. Saída: categoria, motivo curto, valores, datas e sinais de golpe.
export function classificar({ deEmail, deNome = '', assunto = '', corpo = '', links = [], rotulos = [], ruido = [], listaDeDescadastro = false, agoraMs = Date.now() }) {
  const texto = `${assunto}\n${String(corpo).slice(0, 4000)}`; const dom = dominio(deEmail);
  const golpe = sinaisDeGolpe({ deEmail, deNome, assunto, corpo, links, agoraMs });
  const valores = extrairValores(texto); const datas = extrairDatas(texto);
  const temCobranca = RE.cobranca.test(texto), temPagamento = RE.pagamento.test(texto);
  const promo = rotulos.includes('CATEGORY_PROMOTIONS') || rotulos.includes('CATEGORY_SOCIAL') || ruido.some((r) => r && (dom.includes(r) || deNome.toLowerCase().includes(r)));
  const plataforma = PLATAFORMAS.some((d) => dom === d || dom.endsWith('.' + d));
  const newsletter = listaDeDescadastro || NEWSLETTER.test(texto);
  const vencimento = datas.some((d) => d.vencimento);
  let categoria, motivo;
  if (golpe.pontos >= 2) { categoria = 'golpe'; motivo = golpe.motivos.join('; '); }
  // newsletter (List-Unsubscribe ou "ver no navegador") só é cobrança com valor E vencimento; e-mail comum basta palavra forte, valor ou vencimento
  else if (temCobranca && !RE.recibo_no_assunto.test(assunto) && (newsletter ? (valores.length && vencimento) : (FORTES.test(texto) || valores.length || vencimento))) { categoria = 'cobranca'; motivo = `${valores[0] ? valores[0] : 'sem valor no texto'}${vencimento ? `, vencimento ${datas.find((d) => d.vencimento).texto}` : ''}`; }
  else if (temPagamento) { categoria = 'pagamento'; motivo = valores[0] || 'recibo ou confirmação'; }
  else if (RE.seguranca.test(texto) && plataforma) { categoria = 'seguranca'; motivo = 'aviso de conta ou acesso'; }
  else if (promo || newsletter || (RE.propaganda.test(texto) && RE.automatico.test(deEmail))) { categoria = 'propaganda'; motivo = ''; }
  else if (RE.automatico.test(deEmail) || rotulos.includes('CATEGORY_UPDATES') || rotulos.includes('CATEGORY_FORUMS')) { categoria = 'automatico'; motivo = ''; }
  else { categoria = 'pessoal'; motivo = ''; }
  return { categoria, motivo, valores, datas, golpe, dominio: dom };
}

// Trecho limpo do corpo para o relatório (sem quebras, sem assinatura longa).
export const trecho = (corpo, n = 300) => { let s = String(corpo || ''); if (/<(table|div|html|body|td|tr|p|span|a|img|br)\b[^>]*>|<!--/i.test(s)) s = htmlParaTexto(s); s = s.replace(/\s*\(https?:\/\/[^)]+\)/g, '').replace(/https?:\/\/\S+/g, '').replace(/[\u200b\u200c\u200d\u00ad\ufeff]/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const TITULOS = { cobranca: 'COBRANÇAS', golpe: 'GOLPE PROVÁVEL', seguranca: 'SEGURANÇA E CONTA', pessoal: 'PESSOAL E TRABALHO', pagamento: 'PAGAMENTOS E RECIBOS', automatico: 'AVISOS AUTOMÁTICOS', propaganda: 'PROPAGANDA' };
