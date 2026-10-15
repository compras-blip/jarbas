// mime.mjs — o mínimo de MIME que o e-mail do Bruno precisa: ler a mensagem que o Gmail devolve (partes,
// cabeçalhos codificados, base64url, HTML -> texto) e montar a mensagem para enviar (texto UTF-8 e anexos).
// Sem dependências. RFC 2822/2045/2047 só no que é usado.

export const base64urlParaBytes = (s) => Buffer.from(String(s ?? '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
export const bytesParaBase64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// "=?UTF-8?B?...?=" e "=?ISO-8859-1?Q?...?=" -> texto
export function decodificarCabecalho(v) {
  return String(v ?? '').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, enc, dados) => {
    try {
      const bytes = enc.toUpperCase() === 'B' ? Buffer.from(dados, 'base64') : Buffer.from(dados.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (__, h) => String.fromCharCode(parseInt(h, 16))), 'latin1');
      return new TextDecoder(/utf-?8/i.test(cs) ? 'utf-8' : /8859|latin/i.test(cs) ? 'latin1' : 'utf-8').decode(bytes);
    } catch { return dados; }
  }).replace(/\?=\s+=\?/g, '?==?');
}

export function cabecalho(parte, nome) {
  const h = (parte?.headers || []).find((x) => x.name.toLowerCase() === nome.toLowerCase());
  return h ? decodificarCabecalho(h.value) : '';
}

// "Nome Sobrenome <a@b.com>, c@d.com" -> [{ nome, email }]
export function lerEnderecos(v) {
  const out = [];
  for (const m of String(v ?? '').matchAll(/(?:"?([^"<,]*?)"?\s*<([^>]+)>)|([^\s,<>]+@[^\s,<>]+)/g)) {
    if (m[2]) out.push({ nome: (m[1] || '').trim(), email: m[2].trim().toLowerCase() });
    else if (m[3]) out.push({ nome: '', email: m[3].trim().toLowerCase() });
  }
  return out;
}

export function htmlParaTexto(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n').replace(/<\/td>/gi, ' ')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, u, t) => { const tx = t.replace(/<[^>]+>/g, '').trim(); return tx && !/^https?:/.test(tx) ? `${tx} (${u})` : u; })
    .replace(/<[^>]+>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/&(zwnj|zwj|shy|#8203|#8204|#8205|#173);/gi, '').replace(/[\u200b\u200c\u200d\u00ad\ufeff]/g, '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

const decodificarCorpo = (parte) => {
  const dados = parte?.body?.data;
  if (!dados) return '';
  const cs = /charset="?([^";\s]+)/i.exec(cabecalho(parte, 'Content-Type'))?.[1] || 'utf-8';
  const bytes = base64urlParaBytes(dados);
  // Muitos remetentes declaram ISO-8859-1 e mandam UTF-8 (Registro.br, Apple): tenta UTF-8 estrito primeiro; se houver byte inválido, usa o charset declarado.
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { /* não é UTF-8 válido */ }
  try { return new TextDecoder(/8859|latin|windows-1252/i.test(cs) ? 'windows-1252' : 'utf-8').decode(bytes); } catch { return bytes.toString('latin1'); }
};

// Percorre as partes: texto (prefere text/plain; senão HTML convertido) e anexos (partes com nome de arquivo).
export function extrairMensagem(payload) {
  let texto = '', html = '';
  const anexos = [];
  const andar = (p) => {
    if (!p) return;
    const tipo = (p.mimeType || '').toLowerCase();
    if (p.filename && p.body?.attachmentId) { anexos.push({ nome: p.filename, tipo, tamanho: p.body.size || 0, id_anexo: p.body.attachmentId }); }
    else if (p.filename && p.body?.data) { anexos.push({ nome: p.filename, tipo, tamanho: p.body.size || 0, embutido: true }); }
    else if (tipo === 'text/plain' && !texto) texto = decodificarCorpo(p);
    else if (tipo === 'text/html' && !html) html = decodificarCorpo(p);
    for (const f of p.parts || []) andar(f);
  };
  andar(payload);
  const corpo = texto.trim() ? texto.trim() : htmlParaTexto(html);
  const links = [...new Set([...corpo.matchAll(/https?:\/\/[^\s)>\]"']+/g)].map((m) => m[0]))].slice(0, 5);
  return { corpo, anexos, links, veioDeHtml: !texto.trim() && Boolean(html) };
}

// ---- montar mensagem para enviar ----
const precisaCodificar = (s) => /[^\x20-\x7e]/.test(s);
export const cabecalhoCodificado = (s) => (precisaCodificar(s) ? `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=` : s);
const formatarEndereco = ({ nome, email }) => (nome ? `${cabecalhoCodificado(nome)} <${email}>` : email);
const quebrar = (b64) => b64.replace(/(.{76})/g, '$1\r\n');

// Devolve a mensagem RFC 2822 completa (texto) pronta para base64url.
export function montarMensagem({ de, para, cc = [], assunto, texto, emResposta = null, anexos = [] }) {
  const limite = `----atlas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const linhas = [];
  if (de) linhas.push(`From: ${formatarEndereco(de)}`);
  linhas.push(`To: ${para.map(formatarEndereco).join(', ')}`);
  if (cc.length) linhas.push(`Cc: ${cc.map(formatarEndereco).join(', ')}`);
  linhas.push(`Subject: ${cabecalhoCodificado(assunto)}`);
  linhas.push(`Date: ${new Date().toUTCString().replace('GMT', '+0000')}`);
  if (emResposta?.messageId) { linhas.push(`In-Reply-To: ${emResposta.messageId}`); linhas.push(`References: ${[emResposta.references, emResposta.messageId].filter(Boolean).join(' ')}`); }
  linhas.push('MIME-Version: 1.0');
  const corpoTexto = ['Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', quebrar(Buffer.from(texto, 'utf8').toString('base64'))].join('\r\n');
  if (!anexos.length) return linhas.concat([corpoTexto]).join('\r\n');
  linhas.push(`Content-Type: multipart/mixed; boundary="${limite}"`, '', `--${limite}`, corpoTexto);
  for (const a of anexos) {
    linhas.push(`--${limite}`, `Content-Type: ${a.tipo || 'application/octet-stream'}; name="${cabecalhoCodificado(a.nome)}"`, `Content-Disposition: attachment; filename="${cabecalhoCodificado(a.nome)}"`, 'Content-Transfer-Encoding: base64', '', quebrar(Buffer.from(a.bytes).toString('base64')));
  }
  linhas.push(`--${limite}--`);
  return linhas.join('\r\n');
}

export function tipoPorNome(nome) {
  const ext = String(nome).toLowerCase().split('.').pop();
  return { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', txt: 'text/plain', csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', zip: 'application/zip' }[ext] || 'application/octet-stream';
}
