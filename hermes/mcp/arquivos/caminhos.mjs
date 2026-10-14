// caminhos.mjs — validação de caminhos do Dropbox, nomes seguros, links do site, tamanhos e tipos.
export class ErroCaminho extends Error { constructor(code, detalhe = '') { super(code); this.code = code; this.detalhe = detalhe; } }

// Normaliza o que o modelo mandou: "" ou "/" é a raiz (o Dropbox exige "" na raiz); "id:…", "rev:…" e "ns:…"
// passam como estão; o resto vira "/Pasta/arquivo". Recusa "..", controle e mais de 1.000 caracteres.
export function validarCaminho(txt) {
  const s = String(txt ?? '').normalize('NFC').trim();
  if (s.length > 1000 || /[\u0000-\u001f\u007f]/.test(s)) throw new ErroCaminho('CAMINHO_INVALIDO', s.slice(0, 60));
  if (s === '' || s === '/') return '';
  if (/^(id|rev|ns):/.test(s)) {
    if (!/^(id|rev):[\w-]+$|^ns:\d+(\/.*)?$/.test(s)) throw new ErroCaminho('CAMINHO_INVALIDO', s.slice(0, 60));
    return s;
  }
  const p = ('/' + s).replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  if (p.split('/').some((seg) => seg === '.' || seg === '..')) throw new ErroCaminho('CAMINHO_INVALIDO', s.slice(0, 60));
  return p;
}
export const ehRaiz = (p) => p === '';
export const pastaDe = (pathDisplay) => { const s = String(pathDisplay || ''); const i = s.lastIndexOf('/'); return i <= 0 ? '/' : s.slice(0, i); };
export const nomeSeguro = (nome) => (String(nome || '').normalize('NFC').replace(/[^\w.\-áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ ]+/g, '_').slice(0, 120) || 'arquivo');
const codificarCaminho = (p) => String(p || '').split('/').map(encodeURIComponent).join('/');

// Link que abre no app ou site do Dropbox do Bruno (não expira; pede login na conta dele).
export function linkSite(meta) {
  const p = meta.path_display || meta.path_lower || '';
  if (meta['.tag'] === 'folder') return `https://www.dropbox.com/home${codificarCaminho(p)}`;
  const pasta = pastaDe(p);
  return `https://www.dropbox.com/home${pasta === '/' ? '' : codificarCaminho(pasta)}?preview=${encodeURIComponent(meta.name || '')}`;
}

export function fmtTamanho(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0).replace('.', ',')} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1).replace('.', ',')} MB`;
  return `${(n / 1024 ** 3).toFixed(2).replace('.', ',')} GB`;
}
export const extensao = (nome) => { const m = /\.([a-z0-9]{1,8})$/i.exec(String(nome || '')); return m ? m[1].toLowerCase() : ''; };
const TIPOS = {
  pdf: 'PDF', doc: 'Word', docx: 'Word', docm: 'Word', odt: 'documento', rtf: 'documento', pages: 'Pages', txt: 'texto', md: 'texto',
  csv: 'planilha CSV', xls: 'planilha', xlsx: 'planilha', xlsm: 'planilha', ods: 'planilha', numbers: 'planilha',
  ppt: 'apresentação', pptx: 'apresentação', key: 'apresentação', odp: 'apresentação',
  jpg: 'imagem', jpeg: 'imagem', png: 'imagem', heic: 'imagem', gif: 'imagem', webp: 'imagem', tif: 'imagem', tiff: 'imagem', bmp: 'imagem', svg: 'imagem',
  mp4: 'vídeo', mov: 'vídeo', avi: 'vídeo', mkv: 'vídeo', m4v: 'vídeo', mp3: 'áudio', m4a: 'áudio', wav: 'áudio', ogg: 'áudio', opus: 'áudio', aac: 'áudio',
  zip: 'compactado', rar: 'compactado', '7z': 'compactado', paper: 'Dropbox Paper', gdoc: 'Google Docs', gsheet: 'Google Sheets', gslides: 'Google Slides',
  eml: 'e-mail', xml: 'XML', json: 'JSON', html: 'HTML',
};
export const tipoPorNome = (nome) => TIPOS[extensao(nome)] || (extensao(nome) ? extensao(nome).toUpperCase() : 'arquivo');
// get_thumbnail só converte jpg, jpeg, png, tiff, tif, gif, webp, ppm e bmp (spec); HEIC fica de fora.
export const ehImagemMiniatura = (nome) => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff', 'bmp', 'ppm'].includes(extensao(nome));
// get_preview gera PDF para estes (spec); planilhas viram HTML e por isso vão no original.
export const temPreviewPdf = (nome) => ['doc', 'docx', 'docm', 'odt', 'rtf', 'ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'ppsm', 'odp', 'ai', 'eps', 'gdoc', 'gslides'].includes(extensao(nome));
// file_categories do Dropbox por "tipo" que o modelo pede.
export const CATEGORIAS = { pdf: ['pdf'], documento: ['document'], planilha: ['spreadsheet'], imagem: ['image'], apresentacao: ['presentation'], video: ['video'], audio: ['audio'], pasta: ['folder'] };
