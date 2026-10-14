// server.mjs — servidor MCP "arquivos": o Dropbox do Bruno para o Atlas, só leitura, em 6 ferramentas:
//   arquivo_buscar, arquivo_listar, arquivo_info, arquivo_ler, arquivo_link, arquivo_espaco.
// Regras em código: nenhuma rota de escrita (nada de enviar, mover, apagar, compartilhar); caminhos validados;
// arquivo até 25 MB (imagem grande vira miniatura; Paper e Google Docs são exportados); teto diário de chamadas;
// segredos nunca em log ou resposta. Feito para o Hermes Agent (mcp_servers em config.yaml) com o SDK oficial do MCP.
// Docs: docs-dropbox/ e a spec Stone (files.stone, users.stone). Desenho: docs/fase-5-dropbox.md.
import { mkdir, writeFile, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { rpc, conteudo, ErroDropbox, chamadasHoje, FONTE } from './dropbox.mjs';
import { FUSO_PADRAO, ErroTempo, lerData, localParaUtc, fmtDia, fmtHora } from './tempo.mjs';
import { ErroCaminho, validarCaminho, ehRaiz, pastaDe, nomeSeguro, linkSite, fmtTamanho, tipoPorNome, ehImagemMiniatura, temPreviewPdf, CATEGORIAS } from './caminhos.mjs';

const limiteDiario = Number(process.env.ARQUIVOS_LIMITE_DIARIO) || 1000;
const PASTA_CACHE = process.env.ARQUIVOS_PASTA_CACHE || '/opt/data/cache/anexos';
const MAX_BYTES = 25 * 1024 * 1024;
const LIMITE_TEXTO = 1800;
const LIMITE_LISTA = 3000;
const ZONA = FUSO_PADRAO;
const log = (...a) => console.error('[arquivos]', new Date().toISOString(), ...a);
const ok = (texto, max = LIMITE_TEXTO) => ({ content: [{ type: 'text', text: texto.length > max ? texto.slice(0, max - 15) + '\n[cortado]' : texto }] });
const falha = (texto) => ({ content: [{ type: 'text', text: texto }], isError: true });
const fim = (ferramenta, texto, extra = [], max) => { log(ferramenta, ...extra, `chamadas_hoje=${chamadasHoje()}`); return ok(texto, max); };
const limpa = (s) => String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

// Mensagens em português por prefixo do error_summary (409). Prefixo, nunca igualdade: o Dropbox acrescenta "..." aleatórios.
const POR_PREFIXO = [
  ['path/not_found', 'Arquivo ou pasta não encontrado nesse caminho: pode ter sido movido, renomeado ou apagado. Procure pelo nome com arquivo_buscar.'],
  ['path/not_file', 'Isso é uma pasta, não um arquivo. Use arquivo_listar.'],
  ['path/not_folder', 'Isso é um arquivo, não uma pasta. Use arquivo_info ou arquivo_ler.'],
  ['path/restricted_content', 'O Dropbox restringiu esse conteúdo (direitos autorais ou política da conta).'],
  ['path/malformed_path', 'Caminho mal formado para o Dropbox. Use "/Pasta/arquivo.ext" ou o id do arquivo.'],
  ['path/locked', 'Arquivo bloqueado para edição por outra pessoa; não deu para ler agora.'],
  ['path/unsupported_content_type', 'O Dropbox não dá acesso a esse tipo de conteúdo pela API.'],
  ['non_exportable', 'Esse arquivo não pode ser exportado pelo Dropbox.'],
  ['invalid_export_format', 'Formato de exportação não aceito para esse arquivo.'],
  ['unsupported_file', 'O Dropbox não gera leitura ou link para esse tipo de arquivo.'],
  ['unsupported_extension', 'O Dropbox não gera visualização para essa extensão; baixe o original sem como_pdf.'],
  ['unsupported_content', 'O Dropbox não conseguiu gerar visualização desse conteúdo; baixe o original sem como_pdf.'],
  ['unsupported_image', 'O Dropbox não gera miniatura dessa imagem (formato ou tamanho).'],
  ['conversion_error', 'O Dropbox não conseguiu converter a imagem para miniatura.'],
  ['email_not_verified', 'O link temporário exige e-mail verificado na conta do Dropbox. Diga que o Felipe cuida disso.'],
  ['not_allowed', 'O Dropbox não permite link para esse arquivo.'],
  ['in_progress', 'O Dropbox ainda está preparando a visualização; tente de novo em instantes.'],
  ['invalid_argument', 'O Dropbox rejeitou a busca (texto ou filtro inválido).'],
];
function mensagemErro(e) {
  const c = e?.code || '';
  if (c === 'APP_AUSENTE' || c === 'TOKEN_AUSENTE') return 'O Dropbox do Bruno ainda não está autorizado neste servidor. Diga que o Felipe cuida disso.';
  if (c === 'TOKEN_REVOGADO' || c === 'TOKEN_RENOVACAO_FALHOU' || c === 'DROPBOX_HTTP_401') return 'A autorização do Dropbox expirou ou foi revogada. Diga que o Felipe precisa autorizar de novo.';
  if (c === 'DROPBOX_LIMITE_DIARIO') return 'Limite diário de consultas ao Dropbox atingido. Diga que não dá para conferir hoje.';
  if (c === 'DROPBOX_HTTP_403') return `O Dropbox recusou a operação${e.mensagem ? ` (${e.mensagem})` : e.detalhe ? ` (${e.detalhe})` : ''}: plano ou permissão da conta.`;
  if (c === 'DROPBOX_409') { const m = POR_PREFIXO.find(([p]) => e.detalhe.startsWith(p) || e.detalhe.includes('/' + p)); return m ? m[1] : `O Dropbox devolveu um erro${e.mensagem ? ` (${e.mensagem})` : e.detalhe ? ` (${e.detalhe})` : ''}.`; }
  if (c === 'DROPBOX_HTTP_400') return `O Dropbox rejeitou o pedido${e.detalhe ? ` (${e.detalhe})` : ''}. Confira caminho, id e filtros.`;
  if (c === 'ARQUIVO_GRANDE') return `Arquivo acima de 25 MB${e.detalhe ? ` (${e.detalhe})` : ''}: não baixo; use arquivo_link para o Bruno abrir no app.`;
  if (c === 'NAO_E_ARQUIVO') return `${e.detalhe ? `"${e.detalhe}" é` : 'Isso é'} uma pasta ou a raiz, não um arquivo. Use arquivo_listar.`;
  if (c === 'RAIZ_SEM_FICHA') return 'A raiz do Dropbox não tem ficha; use arquivo_listar.';
  if (c === 'CAMINHO_INVALIDO') return `Caminho inválido (${e.detalhe}). Use "/Pasta/arquivo.ext" ou o id vindo de arquivo_buscar.`;
  if (c === 'DATA_INVALIDA') return `Data inválida (${e.detalhe}): use AAAA-MM-DD.`;
  if (e?.transitorio) return 'O Dropbox não respondeu agora. Tente de novo em instantes; se falhar, diga que não conseguiu confirmar.';
  return 'Falha ao acessar o Dropbox. Diga que não conseguiu confirmar.';
}
async function protegido(fn) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof ErroDropbox || e instanceof ErroTempo || e instanceof ErroCaminho) { log('erro', e.code, e.detalhe || ''); return falha(mensagemErro(e)); }
    log('erro inesperado', e?.message || e); return falha('Falha inesperada ao acessar o Dropbox. Diga que não conseguiu confirmar.');
  }
}
const dbx = (rota, arg) => rpc(rota, arg, { limiteDiario });
const baixar = (rota, arg) => conteudo(rota, arg, { limiteDiario, maxBytes: MAX_BYTES });

// ---- formatação ----
const quando = (iso) => { const ms = Date.parse(iso || ''); return Number.isFinite(ms) ? `${fmtDia(ZONA, ms)} ${fmtHora(ZONA, ms)}` : '?'; };
function linhaEntrada(m, { comPasta = true } = {}) {
  const p = m.path_display || m.path_lower || '';
  if (m['.tag'] === 'folder') return `• ${m.name}/ · pasta${comPasta ? ` · em ${pastaDe(p)}` : ''}${m.id ? ` · [id: ${m.id}]` : ''}`;
  if (m['.tag'] === 'deleted') return `• ${m.name} · apagado`;
  const partes = [m.name, tipoPorNome(m.name), fmtTamanho(m.size)];
  if (comPasta) partes.push(`em ${pastaDe(p)}`);
  partes.push(`modificado ${quando(m.server_modified)}`);
  if (m.is_downloadable === false) partes.push(`exportável${m.export_info?.export_as ? ` como ${m.export_info.export_as}` : ''}`);
  if (m.id) partes.push(`[id: ${m.id}]`);
  return '• ' + partes.join(' · ');
}
const PLANO = { basic: 'Basic (grátis)', pro: 'Plus/Professional', business: 'Business' };

const server = new McpServer({ name: 'arquivos', version: '1.0.0' });

server.registerTool('arquivo_buscar', {
  title: 'Buscar arquivos no Dropbox',
  description: 'Procura no Dropbox do Bruno por nome e conteúdo (palavra, parte do nome, assunto), com filtro por pasta e tipo, mais relevantes primeiro ou mais recentes primeiro. '
    + 'Devolve por item: nome, tipo, tamanho, pasta, data de modificação em Manaus e o id para ler, ver ficha ou pegar link (não mostre ids nem caminhos técnicos ao Bruno). '
    + 'Serve para "acha o contrato da Amazon Vital", "exames de 2026", "o último boleto". Arquivo recém-colocado pode levar alguns minutos para entrar no índice: se não achar, use arquivo_listar na pasta provável.',
  inputSchema: {
    texto: z.string().min(1).max(200).describe('Palavras para buscar (nome e conteúdo).'),
    pasta: z.string().max(500).optional().describe('Limita a uma pasta, ex. "/Documentos". Padrão: todo o Dropbox.'),
    tipo: z.enum(['pdf', 'documento', 'planilha', 'imagem', 'apresentacao', 'video', 'audio', 'pasta']).optional(),
    so_nome: z.boolean().optional().describe('true busca só no nome do arquivo.'),
    ordem: z.enum(['relevancia', 'recente']).optional().describe('Padrão "relevancia"; "recente" = modificados por último primeiro.'),
    quantos: z.number().int().min(1).max(50).optional().describe('Padrão 15.'),
  },
  annotations: { readOnlyHint: true },
}, async ({ texto, pasta, tipo, so_nome = false, ordem = 'relevancia', quantos = 15 }) => protegido(async () => {
  const q = limpa(texto);
  const options = { max_results: quantos, order_by: ordem === 'recente' ? 'last_modified_time' : 'relevance', file_status: 'active', filename_only: so_nome };
  const p = pasta !== undefined ? validarCaminho(pasta) : '';
  if (!ehRaiz(p)) options.path = p;
  if (tipo) options.file_categories = CATEGORIAS[tipo];
  const r = await dbx('files/search_v2', { query: q, options });
  const vistos = new Set(); const itens = [];
  for (const m of r.matches || []) { const md = m.metadata?.metadata || m.metadata; const k = md?.id || md?.path_lower; if (!md || !k || vistos.has(k)) continue; vistos.add(k); itens.push(md); }
  const onde = `${ehRaiz(p) ? 'todo o Dropbox' : `a pasta ${p}`}${tipo ? `, tipo ${tipo}` : ''}`;
  if (!itens.length) return fim('arquivo_buscar', `Nenhum arquivo com "${q}" em ${onde}${so_nome ? ' (só no nome)' : ''}. O índice do Dropbox demora alguns minutos para arquivos novos: se o Bruno acabou de colocar, use arquivo_listar na pasta. Fonte: ${FONTE}.`, [`q=${q}`, 'n=0']);
  const cab = `${itens.length} resultado${itens.length > 1 ? 's' : ''}${r.has_more ? ' (há mais)' : ''} para "${q}" em ${onde}, ${ordem === 'recente' ? 'mais recentes' : 'mais relevantes'} primeiro, horário de ${ZONA}. Fonte: ${FONTE}.`;
  return fim('arquivo_buscar', [cab, ...itens.map((m) => linhaEntrada(m))].join('\n'), [`q=${q}`, `n=${itens.length}`], 4000);
}));

server.registerTool('arquivo_listar', {
  title: 'Listar pasta do Dropbox',
  description: 'Lista o que há numa pasta do Dropbox do Bruno (pastas primeiro, depois arquivos) com nome, tipo, tamanho e data de modificação em Manaus. '
    + 'Com `desde`, mostra só arquivos modificados a partir daquele dia, mais recentes primeiro ("o que mudou esta semana?"). `recursivo` entra nas subpastas (bom com `desde` ou numa pasta específica; na raiz inteira pode ser grande). '
    + 'Serve para "o que tem na pasta de contratos?", "o que mudou no Dropbox esta semana?".',
  inputSchema: {
    pasta: z.string().max(500).optional().describe('Caminho da pasta, ex. "/Contratos". Padrão: raiz do Dropbox.'),
    recursivo: z.boolean().optional(),
    desde: z.string().optional().describe('AAAA-MM-DD: só modificados a partir desse dia (fuso do Bruno).'),
    ordem: z.enum(['nome', 'recente']).optional().describe('Padrão "nome"; "recente" ordena por modificação. Com `desde` é sempre "recente".'),
    quantos: z.number().int().min(1).max(200).optional().describe('Padrão 30.'),
  },
  annotations: { readOnlyHint: true },
}, async ({ pasta, recursivo = false, desde, ordem = 'nome', quantos = 30 }) => protegido(async () => {
  const p = pasta !== undefined ? validarCaminho(pasta) : '';
  const desdeMs = desde ? localParaUtc(ZONA, lerData(desde)) : null;
  const entradas = []; let chamadas = 0;
  let r = await dbx('files/list_folder', { path: p, recursive: recursivo, include_deleted: false, include_non_downloadable_files: true, limit: 2000 }); chamadas++;
  entradas.push(...(r.entries || []));
  while (r.has_more && entradas.length < LIMITE_LISTA && chamadas < 5) { r = await dbx('files/list_folder/continue', { cursor: r.cursor }); chamadas++; entradas.push(...(r.entries || [])); }
  const parcial = Boolean(r.has_more);
  let pastas = entradas.filter((m) => m['.tag'] === 'folder');
  let arquivos = entradas.filter((m) => m['.tag'] === 'file');
  if (desdeMs !== null) { arquivos = arquivos.filter((m) => Date.parse(m.server_modified) >= desdeMs); pastas = []; }
  const porNome = (a, b) => a.name.localeCompare(b.name, 'pt');
  const porData = (a, b) => Date.parse(b.server_modified) - Date.parse(a.server_modified);
  arquivos.sort(desdeMs !== null || ordem === 'recente' ? porData : porNome); pastas.sort(porNome);
  const nomePasta = ehRaiz(p) ? 'raiz do Dropbox' : p;
  const total = pastas.length + arquivos.length;
  if (!total) return fim('arquivo_listar', `${desdeMs !== null ? `Nenhum arquivo modificado desde ${fmtDia(ZONA, desdeMs)}` : 'Nada'} em ${nomePasta}${recursivo ? ' (incluindo subpastas)' : ''}${parcial ? ' (lista parcial: pasta muito grande)' : ''}. Fonte: ${FONTE}.`, [`pasta=${p}`, 'n=0']);
  const mostrar = [...pastas, ...arquivos].slice(0, quantos);
  const cab = `${nomePasta}${recursivo ? ' (com subpastas)' : ''}${desdeMs !== null ? `, modificados desde ${fmtDia(ZONA, desdeMs)}` : ''}: ${pastas.length} pasta${pastas.length !== 1 ? 's' : ''} e ${arquivos.length} arquivo${arquivos.length !== 1 ? 's' : ''}${parcial ? ' (lista parcial: pasta muito grande)' : ''}${mostrar.length < total ? `, mostrando ${mostrar.length}` : ''}. Horário de ${ZONA}. Fonte: ${FONTE}.`;
  return fim('arquivo_listar', [cab, ...mostrar.map((m) => linhaEntrada(m, { comPasta: recursivo }))].join('\n'), [`pasta=${p}`, `n=${total}`, `chamadas=${chamadas}`], 6000);
}));

server.registerTool('arquivo_info', {
  title: 'Ficha do arquivo',
  description: 'Ficha de um arquivo ou pasta do Dropbox pelo caminho ("/Contratos/x.pdf") ou id: nome, pasta, tipo, tamanho, quando foi modificado (em Manaus), se está em pasta compartilhada ou bloqueado, e o link para abrir no app do Dropbox. '
    + 'Com `versoes`, traz até 10 versões anteriores (data e tamanho). Serve para "quando esse contrato foi alterado?".',
  inputSchema: { caminho_ou_id: z.string().min(1).max(1000), versoes: z.boolean().optional() },
  annotations: { readOnlyHint: true },
}, async ({ caminho_ou_id, versoes = false }) => protegido(async () => {
  const p = validarCaminho(caminho_ou_id);
  if (ehRaiz(p)) throw new ErroCaminho('RAIZ_SEM_FICHA');
  const m = await dbx('files/get_metadata', { path: p, include_media_info: false });
  const cam = m.path_display || m.path_lower || p;
  const linhas = [];
  if (m['.tag'] === 'folder') {
    linhas.push(`Pasta: ${m.name}`, `Caminho: ${cam}`);
    if (m.sharing_info) linhas.push(`Compartilhada${m.sharing_info.read_only ? ', só leitura para o Bruno' : ''}`);
    linhas.push(`Abrir no Dropbox: ${linkSite(m)}`, `[id: ${m.id}]`);
    return fim('arquivo_info', linhas.join('\n'), [`path=${p}`]);
  }
  if (m['.tag'] === 'deleted') return fim('arquivo_info', `${m.name} foi apagado do Dropbox (${cam}). Só o Bruno pode restaurar, pelo site do Dropbox.`, [`path=${p}`]);
  linhas.push(`Arquivo: ${m.name} (${tipoPorNome(m.name)}, ${fmtTamanho(m.size)})`, `Pasta: ${pastaDe(cam)}`,
    `Modificado no Dropbox: ${quando(m.server_modified)}${m.client_modified && m.client_modified !== m.server_modified ? ` (no aparelho: ${quando(m.client_modified)})` : ''}`);
  if (m.is_downloadable === false) linhas.push(`Não baixável; exportação como ${m.export_info?.export_as || '?'}${m.export_info?.export_options?.length ? ` (opções: ${m.export_info.export_options.join(', ')})` : ''}`);
  if (m.sharing_info) linhas.push(`Em pasta compartilhada${m.sharing_info.read_only ? ', só leitura para o Bruno' : ''}`);
  if (m.file_lock_info) linhas.push(`Bloqueado para edição${m.file_lock_info.lockholder_name ? ` por ${m.file_lock_info.lockholder_name}` : ''}${m.file_lock_info.is_lockholder ? ' (pelo próprio Bruno)' : ''}`);
  linhas.push(`Abrir no Dropbox: ${linkSite(m)}`, `[id: ${m.id}]`);
  if (versoes) {
    const v = await dbx('files/list_revisions', { path: m.id, mode: 'id', limit: 10 });
    const vs = v.entries || [];
    linhas.push(`Versões (${vs.length}${v.has_more ? '+' : ''}):`, ...vs.map((e, i) => `• ${quando(e.server_modified)} · ${fmtTamanho(e.size)}${i === 0 ? ' (atual)' : ''}`));
  }
  return fim('arquivo_info', linhas.join('\n'), [`path=${p}`]);
}));

server.registerTool('arquivo_ler', {
  title: 'Baixar arquivo para ler',
  description: 'Baixa um arquivo do Dropbox do Bruno (caminho ou id) para a pasta de dados do servidor e devolve o caminho local, para você ler com as ferramentas de PDF, imagem e texto que já tem. Até 25 MB. '
    + 'Imagem acima de 2 MB vem como miniatura de 1024 px; Paper e Google Docs vêm exportados (PDF quando houver); Word e PowerPoint podem vir como PDF com `como_pdf`. '
    + 'Depois de ler, responda com o conteúdo interpretado: impacto, datas, valores e próximo passo.',
  inputSchema: { caminho_ou_id: z.string().min(1).max(1000), como_pdf: z.boolean().optional().describe('true converte Word/PowerPoint/RTF em PDF antes de baixar.') },
  annotations: { readOnlyHint: true },
}, async ({ caminho_ou_id, como_pdf = false }) => protegido(async () => {
  const p = validarCaminho(caminho_ou_id);
  if (ehRaiz(p)) throw new ErroCaminho('NAO_E_ARQUIVO');
  const m = await dbx('files/get_metadata', { path: p });
  if (m['.tag'] !== 'file') throw new ErroCaminho('NAO_E_ARQUIVO', m.name);
  let res, modo, nome = m.name;
  if (m.is_downloadable === false) {
    const opcoes = m.export_info?.export_options || [];
    const arg = { path: m.id }; if (opcoes.includes('pdf')) arg.export_format = 'pdf';
    res = await baixar('files/export', arg); modo = `exportado${arg.export_format ? ' como PDF' : ''}`;
    nome = res.meta?.export_metadata?.name || `${m.name}.${arg.export_format || m.export_info?.export_as || 'bin'}`;
  } else if (como_pdf && temPreviewPdf(m.name)) {
    res = await baixar('files/get_preview', { path: m.id }); modo = 'convertido em PDF'; nome = m.name.replace(/\.[^.]+$/, '') + '.pdf';
  } else if (ehImagemMiniatura(m.name) && Number(m.size) > 2 * 1024 * 1024) {
    res = await baixar('files/get_thumbnail_v2', { resource: { '.tag': 'path', path: m.id }, format: 'jpeg', size: 'w1024h768', mode: 'bestfit' });
    modo = `miniatura de 1024 px (original ${fmtTamanho(m.size)})`; nome = m.name.replace(/\.[^.]+$/, '') + '-1024.jpg';
  } else {
    if (Number(m.size) > MAX_BYTES) throw new ErroDropbox('ARQUIVO_GRANDE', false, fmtTamanho(m.size));
    res = await baixar('files/download', { path: m.id }); modo = 'original';
  }
  await mkdir(PASTA_CACHE, { recursive: true });
  try { for (const f of await readdir(PASTA_CACHE)) { const fp = path.join(PASTA_CACHE, f); const s = await stat(fp); if (s.isFile() && Date.now() - s.mtimeMs > 7 * 86400000) await unlink(fp); } } catch { /* limpeza é melhor esforço */ }
  const destino = path.join(PASTA_CACHE, `${m.id.replace(/^id:/, '').slice(0, 10)}-${nomeSeguro(nome)}`);
  await writeFile(destino, res.bytes);
  return fim('arquivo_ler', `Arquivo salvo: ${destino} (${tipoPorNome(nome)}, ${fmtTamanho(res.bytes.length)}, ${modo}; modificado no Dropbox em ${quando(m.server_modified)}). Leia-o com a ferramenta de leitura de PDF/imagem/texto e responda com o conteúdo interpretado.`, [`path=${p}`, `bytes=${res.bytes.length}`, modo]);
}));

server.registerTool('arquivo_link', {
  title: 'Link do arquivo',
  description: 'Devolve dois links de um arquivo do Dropbox do Bruno: o do site do Dropbox (abre no app dele, não expira, pede login na conta dele) e um link direto de download válido por 4 horas. Para pasta, só o link do site. '
    + 'Serve para "me manda o link do exame", "quero abrir o contrato no celular". Não cria link público compartilhável (não existe nesta fase).',
  inputSchema: { caminho_ou_id: z.string().min(1).max(1000) },
  annotations: { readOnlyHint: true },
}, async ({ caminho_ou_id }) => protegido(async () => {
  const p = validarCaminho(caminho_ou_id);
  if (ehRaiz(p)) return fim('arquivo_link', 'Raiz do Dropbox: https://www.dropbox.com/home', ['raiz']);
  const m = await dbx('files/get_metadata', { path: p });
  if (m['.tag'] === 'folder') return fim('arquivo_link', `Pasta ${m.name} (${m.path_display || p}): abrir no Dropbox ${linkSite(m)}`, [`path=${p}`]);
  if (m['.tag'] !== 'file') throw new ErroCaminho('NAO_E_ARQUIVO', m.name);
  const t = await dbx('files/get_temporary_link', { path: m.id });
  return fim('arquivo_link', [`${m.name} (${tipoPorNome(m.name)}, ${fmtTamanho(m.size)}, modificado ${quando(m.server_modified)})`, `Abrir no app/site do Dropbox (não expira): ${linkSite(m)}`, `Download direto (vale 4 horas, para quem tiver o link): ${t.link}`].join('\n'), [`path=${p}`]);
}));

server.registerTool('arquivo_espaco', {
  title: 'Espaço e conta do Dropbox',
  description: 'Mostra a conta do Dropbox ligada ao Atlas (nome e e-mail) e o espaço usado e total. Serve para "quanto espaço tenho no Dropbox?" e para confirmar que é a conta do Bruno.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => protegido(async () => {
  const [conta, uso] = await Promise.all([dbx('users/get_current_account'), dbx('users/get_space_usage')]);
  const aloc = uso.allocation || {};
  const total = Number(aloc.allocated) || 0; const usado = Number(aloc['.tag'] === 'team' ? aloc.used : uso.used) || 0;
  const pct = total ? Math.round((usado / total) * 100) : 0;
  const plano = PLANO[conta.account_type?.['.tag']] || conta.account_type?.['.tag'] || '?';
  return fim('arquivo_espaco', `Conta: ${conta.name?.display_name || '?'} <${conta.email || '?'}>${conta.email_verified === false ? ' (e-mail não verificado)' : ''}, plano ${plano}. Espaço: ${fmtTamanho(usado)} de ${fmtTamanho(total)} (${pct}%), livre ${fmtTamanho(Math.max(total - usado, 0))}. Fonte: ${FONTE}.`, [`usado=${usado}`, `total=${total}`]);
}));

const transport = new StdioServerTransport();
await server.connect(transport);
log('pronto', `limite_diario=${limiteDiario}`, `cache=${PASTA_CACHE}`, `fuso=${ZONA}`);
