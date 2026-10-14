# Fase 5 — Dropbox do Bruno (só leitura) — desenho, 14/10/2026

Baseado na documentação baixada em `docs-dropbox/` (7 guias: OAuth e escopos, tipos de autenticação, acesso a arquivos, erros e limites, detectar mudanças, guia do desenvolvedor, começando) e na especificação oficial da API (`docs-dropbox/stone/`, 67 rotas de arquivos), lidas em 14/10.

## 1. O que a leitura da documentação define

| O que a API dá | Como entra no Atlas |
|---|---|
| OAuth 2 com **escopos escolhidos no App Console** (aba Permissions) e **acesso "Full Dropbox"** ou só pasta do app | App "Atlas" com acesso Full Dropbox e 3 escopos de leitura: `account_info.read`, `files.metadata.read`, `files.content.read`. Nada de escrita, compartilhamento ou apagar |
| Token de acesso é **curto (4 h)**; acesso em segundo plano exige **refresh token**, obtido com `token_access_type=offline` na URL de autorização | O servidor guarda só o refresh token em `/opt/data/dropbox_token.json` (600) e renova o acesso em memória, como no Google |
| Fluxo de código **sem redirect**: o código aparece na tela do dropbox.com para copiar e colar | Igual ao Google: eu gero o link, o Bruno (ou o Felipe na conta dele) aprova, copia o código e cola no servidor; a troca usa app key + app secret, que o Felipe digita num arquivo do servidor (`/opt/data/dropbox_app.json`, modo 600, como o `google_client_secret.json`) |
| Botão "Generate" no App Console dá um token da própria conta, mas **curto e sem refresh** | Não serve para o Atlas; só para teste rápido |
| `files/search:2` (+ `search/continue:2`): busca por nome e, para contas pagas, conteúdo; opções `path`, `max_results` (≤ 1.000), `order_by` (relevância ou data), `file_status`, `filename_only`, `file_extensions`, `file_categories` (pdf, document, spreadsheet, image…); até 10.000 resultados, índice com pequeno atraso | `arquivo_buscar`: 1 chamada com filtros por pasta, tipo e ordem por data |
| `files/list_folder` (+ `continue`, cursor; `recursive`; `limit` ≤ 2.000; `include_deleted`) | `arquivo_listar`: pastas e arquivos com nome, tamanho, data de modificação, caminho |
| `files/get_metadata` (nome, caminho, `id:` estável, `rev`, `size`, `server_modified`, `content_hash`, `is_downloadable`, `export_info`) e `files/list_revisions` (até 100) | `arquivo_info`: ficha do arquivo e histórico de versões (quando e quem mudou) |
| `files/download` (conteúdo, via `content.dropboxapi.com` com `Dropbox-API-Arg`) e **`files/export`** para o que não baixa (Paper, Google Docs/Sheets, Office online) | `arquivo_ler`: baixa (ou exporta) para `/opt/data/cache/anexos/`, limite 25 MB, e devolve o caminho; o modelo lê PDF, imagem, texto, docx e xlsx com as ferramentas que já tem |
| `files/get_temporary_link`: URL direta de download válida por 4 h, só leitura | `arquivo_link`: link temporário mais o endereço do arquivo no site do Dropbox (`https://www.dropbox.com/home/<pasta>?preview=<nome>`), que abre no app do Bruno sem expirar. Link compartilhável (`sharing/create_shared_link_with_settings`) exige escopo de escrita: fora desta fase |
| `files/get_thumbnail:2` (jpeg/png/webp, tamanhos até 2048) e `files/get_preview` (PDF de docx/pptx, HTML de xlsx/csv) | Imagem grande: miniatura de 1024 px em vez do original. Office: `get_preview` entrega PDF, que o modelo lê |
| `users/get_space_usage` e `users/get_current_account` | `arquivo_espaco`: usado/total e a conta ligada (prova de que é a do Bruno) |
| Erros: 400 (pedido), 401 (token: reautorizar), 403 (plano/limite), **409 com `error_summary` por prefixo** (`path/not_found`, `path/not_file`…), **429 com `Retry-After`**, 500 | Mapeados para português por prefixo; 429 espera o `Retry-After`; 1 repetição com recuo em 500/429 |
| Caminhos: `/Pasta/arquivo.pdf` (legível), `id:…` (estável mesmo se mover), `rev:…` (versão) | O modelo recebe caminho e `id`; para mudar/reler usa o `id` |
| Arquivos não baixáveis (`is_downloadable: false`) têm `export_info.export_options` | `arquivo_ler` escolhe o formato automaticamente (pdf quando houver) |
| Custo: sem cobrança por chamada; limites de taxa por app | Trava de 1.000 chamadas por dia no servidor |

## 2. Servidor `arquivos` (Node, stdio, mesmo molde de `agenda` e `email`)

**`arquivo_buscar`** — "acha o contrato da Amazon Vital", "exames de 2026", "fotos da viagem"
- Entrada: `texto`, opcionais `pasta` (ex. `/Documentos`), `tipo` (`pdf` | `documento` | `planilha` | `imagem` | `apresentacao` | `video` | `audio`), `so_nome` (só no nome), `ordem` (`relevancia` padrão | `recente`), `quantos` (padrão 15, máx. 50).
- Faz: `search:2` (+ 1 `continue` se precisar). Devolve: nome, pasta, tamanho, data de modificação (Manaus), tipo, e o `id`.

**`arquivo_listar`** — "o que tem na pasta Contratos?", "o que mudou esta semana?"
- Entrada: `pasta` (padrão raiz), `recursivo` (padrão false), `desde` (data: só modificados a partir dela), `quantos` (padrão 30, máx. 200).
- Faz: `list_folder` (+ `continue`); ordena por data quando `desde` é dado. Devolve pastas primeiro, depois arquivos.

**`arquivo_info`** — "quando esse contrato foi alterado?", "quem mexeu?"
- Entrada: `caminho_ou_id`, `versoes` (padrão false).
- Faz: `get_metadata` (+ `list_revisions` 10). Devolve ficha e versões (data, tamanho, `rev`).

**`arquivo_ler`** — "lê o contrato e me diz a data de vencimento", "o que diz o exame?"
- Entrada: `caminho_ou_id`, `pagina`? (não; o modelo lê o arquivo inteiro com a ferramenta de PDF).
- Faz: `get_metadata`; se baixável, `download`; senão `export` (pdf quando disponível); Office (docx/xlsx/pptx) baixa o original (o modelo tem leitor de docx e xlsx); imagem acima de 2 MB vai pela miniatura 1024 px. Grava em `/opt/data/cache/anexos/<id>-<nome>` (7 dias), limite 25 MB. Devolve caminho, tipo, tamanho, data de modificação.

**`arquivo_link`** — "me manda o link do exame", "quero abrir o contrato no celular"
- Entrada: `caminho_ou_id`.
- Faz: `get_metadata` + `get_temporary_link`. Devolve o link do site do Dropbox (abre no app dele, não expira) e o link direto de download (4 h), com nome e tamanho.

**`arquivo_espaco`** — "quanto espaço tenho no Dropbox?"
- Faz: `get_space_usage` + `get_current_account`. Devolve usado/total e o e-mail da conta ligada.

Travas: zod; só rotas de leitura (nada de upload, mover, apagar, compartilhar); caminhos validados (`/`, `id:`, `rev:`); respostas até 1.800 caracteres; segredos (app key, secret, tokens) nunca em log ou resposta; 1.000 chamadas por dia.

## 3. Preferência F em código e no prompt

- **Código:** `arquivo_ler` entrega o arquivo pronto para leitura; `arquivo_buscar` com `tipo` evita listar lixo.
- **Prompt (1 linha em Ferramentas):** "Dropbox dele: `mcp__arquivos__*` (buscar, listar, info, ler, link, espaço). Documento relevante vem lido e interpretado com impacto e próximo passo; link para o celular é o do site do Dropbox."

## 4. Autorização (uma vez)

1. **Felipe, no App Console** (dropbox.com/developers/apps, logado na conta do Bruno ou na dele): "Create app" → API: Scoped access → Access: **Full Dropbox** → Name: `Atlas`. Aba **Permissions**: marcar `account_info.read`, `files.metadata.read`, `files.content.read` → Submit. Aba **Settings**: anotar **App key** e **App secret**.
2. **Felipe digita no servidor** (comando com `read -rs`, nada na tela nem no chat): grava `/opt/data/dropbox_app.json` com `app_key` e `app_secret` (600, uid 10000). Mesmo molde do `google_client_secret.json`; o `.env.hermes` não muda.
3. **Eu gero o link** de autorização (`response_type=code`, `token_access_type=offline`, sem redirect). O Bruno abre, logado na conta dele, aprova, copia o código mostrado na tela.
4. **Código colado no servidor** (mesmo comando do Google); eu troco por refresh token e gravo `/opt/data/dropbox_token.json`. Teste: `arquivo_espaco` mostra a conta.

## 5. Mudanças no Atlas

- `hermes/mcp/arquivos/`: `server.mjs`, `dropbox.mjs` (token, renovação, RPC e content endpoints, erros), `caminhos.mjs` (validação, nomes seguros, link do site), testes.
- `config.yaml`: `mcp_servers.arquivos` (env `DROPBOX_APP_PATH`, `DROPBOX_TOKEN_PATH`, `ARQUIVOS_PASTA_CACHE`, `ARQUIVOS_LIMITE_DIARIO`, timeout 60 s); `deploy.sh`; `AGENTS.md` 1 linha. Autorização única por `autorizar.mjs` (link | trocar | testar), rodado dentro do container como uid 10000.
- Custo no prompt: 6 ferramentas ≈ 2,5 KB; previsto 21,1 → ~23,6 KB (teto 30).

## 6. Testes (`evals/fase-5.md`)

| # | Mandar | Esperado |
|---|---|---|
| D1 | "Quanto espaço tenho no Dropbox?" | 1 chamada; usado/total e a conta |
| D2 | "O que tem na pasta de contratos?" | Lista com nomes, datas, tamanhos; pede a pasta certa se houver mais de uma |
| D3 | "Acha o contrato da Amazon Vital" | Busca por nome/conteúdo, até 15 resultados, mais relevante primeiro |
| D4 | "Lê esse contrato e me diz a data de vencimento e o valor" | `arquivo_ler` + leitura do PDF; resposta com impacto e próximo passo; "o que não conferi" |
| D5 | "Me manda o link do último exame de sangue" | Busca ordenada por data + `arquivo_link` (site do Dropbox + direto 4 h) |
| D6 | "O que mudou no Dropbox esta semana?" | `arquivo_listar` recursivo com `desde` |
| D7 | "Quando esse arquivo foi alterado pela última vez?" | `arquivo_info` com versões |
| D8 | "Apaga esse arquivo" | Diz que não apaga nada no Dropbox nesta fase (não existe ferramenta); oferece o link para ele fazer |
| D9 | Limpeza | cache de arquivos e memória de teste apagados |

## 7. O que cada um faz

**Felipe:** criar o app no App Console (passo 4.1), digitar key e secret no servidor (4.2), aprovar o desenho; o Bruno (ou o Felipe na conta dele, se for a conta dele que tem os arquivos) aprova o link (4.3) e cola o código (4.4).
**Eu:** servidor, testes de unidade, instalação, bateria D1–D9, registro.

## 8. Fase 5b — escrita (pedido do Felipe em 14/10/2026: "o Bruno precisa editar, salvar arquivo, editar as pastas")

Escopo `files.content.write` concedido na 3ª autorização. Cinco ferramentas no mesmo servidor, todas pela spec Stone (`files/upload`, `files/copy_v2`, `files/move_v2`, `files/create_folder_v2`, `files/delete_v2`):

| Ferramenta | Faz | Trava em código |
|---|---|---|
| `arquivo_salvar` | envia arquivo do servidor (anexo, documento gerado ou editado) para uma pasta | só de /opt/data (realpath); 25 MB; `mode: add` (conflito se já existe) salvo `sobrescrever: true` (`overwrite`, versão nova no histórico) |
| `arquivo_copiar` | copia arquivo ou pasta para outra pasta e/ou com outro nome | `autorename: false`: nunca sobrescreve |
| `arquivo_mover` | move, renomeia ou os dois | idem; recusa quando nada muda |
| `pasta_criar` | cria pasta pelo caminho completo | conflito se já existe |
| `arquivo_apagar` | manda para a lixeira do Dropbox (`delete_v2`; recuperável 180 dias no Pro) | pasta exige `eh_pasta: true` e a ferramenta antes informa quantos itens há dentro; apagar definitivo não existe na API de conta pessoal e não está no código |

Comum a todas: teto de 100 gravações por dia (`ARQUIVOS_LIMITE_ESCRITAS`), nomes validados (sem barra, sem ponto ou espaço no fim, sem nomes que o Dropbox ignora), erros 409 por prefixo (`conflict`, `insufficient_space`, `no_write_permission`, `too_many_write_operations` com repetição, `too_many_files`...). Prompt: salvar, copiar e criar pasta ditados vão direto; mover e sobrescrever seguem o princípio 7; apagar sempre espera o sim. Editar documento = baixar, alterar com as ferramentas do Hermes, salvar de volta como versão nova. Fora: links compartilháveis (`sharing.write`), pedidos de arquivo, restaurar versão.
