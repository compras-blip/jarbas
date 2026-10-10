# Fase 3 — Lugares e horários pelo Google Maps (desenho, 10/10/2026)

Feito do zero para o Hermes. Nada do OpenClaw entra; só a chave da API do Google é reaproveitada.
Fontes lidas: documentação da Places API (New) do Google (Text Search, Nearby Search, Place Details, recurso Place, preços) e do Hermes (servidores MCP), especificação MCP 2025-06-18 e o SDK oficial.

## 1. O problema do Bruno

Em 04 e 05/10 o Jarbas indicou um restaurante fechado de vez e "almoço das 12h às 15h" num lugar que só abria à noite, porque respondia pelo trecho da busca na web. Hora de lugar não se chuta: tem que vir do Google Maps, com a conta "está aberto no dia D às H?" feita por código, e o modelo recebe o veredito pronto.

## 2. O que o Google oferece e o que vamos usar

| Chamada | Para quê | Custo (por 1.000) | Grátis por mês |
|---|---|---|---|
| Text Search, campos **Pro** (nome, endereço, coordenada, situação do negócio, link do Maps, fuso, tipo) | achar o lugar e listar candidatos | US$ 32 | 5.000 |
| Place Details, campos **Enterprise** (horário dos próximos 7 dias com feriados, horário regular, nota, nº de avaliações, preço, site, telefone) | horário e ficha de 1 lugar | US$ 20 | 1.000 |

Regra de ouro do Google: a conta é pelo campo mais caro pedido. Por isso **nunca** pedimos horário na busca (Text Search Enterprise custa US$ 35 por 1.000 e só 1.000 grátis); buscamos barato (Pro) e pedimos horário só dos escolhidos (Details). Para "aberto agora", a própria busca filtra (`openNow: true`) sem custo extra.

Conta para o Bruno: 10 pedidos por dia × (1 busca + até 5 fichas) = 300 buscas + 1.500 fichas por mês → busca dentro do grátis; fichas ~500 acima do grátis × US$ 0,02 = **~US$ 10/mês no pior caso**, zero em uso leve. Limite diário de 300 chamadas no servidor como trava.

## 3. As ferramentas (uma por ação)

Servidor MCP `mapas`, em Node (já existe na imagem do Hermes, v26), SDK oficial `@modelcontextprotocol/server` 2.3.1, transporte stdio. O Hermes expõe ao modelo como `mcp_mapas_<nome>`.

**`lugares_perto`** — "me acha X perto de Y"
- Entrada: `o_que` (ex.: "restaurante italiano"), `perto_de` (endereço, nome de lugar ou cidade), opcionais `aberto_agora` (sim/não), `quantos` (1 a 10, padrão 5), `nota_minima` (0 a 5).
- Faz: 1 busca Pro com `locationBias` no ponto de referência e `languageCode: pt-BR`; para os `quantos` primeiros, 1 ficha cada (horário, nota, preço, site).
- Devolve, por lugar: nome, endereço, categoria, nota e nº de avaliações, preço (€ a €€€€), **veredito de horário agora** ("ABERTO, fecha às 23h", "FECHADO: só abre às 19h30", "FECHADO DEFINITIVAMENTE"), link do Google Maps, site. Mais a linha "fonte: Google Maps, consultado agora, horário de <fuso do lugar>".

**`lugar_horario`** — "o X está aberto na quinta às 20h?"
- Entrada: `lugar` (nome, de preferência com cidade), opcionais `data` (AAAA-MM-DD; padrão hoje no fuso do lugar) e `hora` (HH:MM).
- Faz: 1 busca Pro para achar o lugar (confere nome e cidade: se o Google devolver outro lugar, diz "OUTRO LUGAR" em vez de usar o horário dele) + 1 ficha.
- Devolve: veredito calculado por código, faixas do dia ("12h às 15h e 19h às 23h", "aberto 24 horas", "fechado neste dia"), origem do horário ("próximos 7 dias, com feriados" ou "horário regular, sem feriados" quando a data passa de 7 dias), situação do negócio, e "NÃO CONFIRMADO" quando o Google não tem horário.

**`link_mapa`** — "manda o mapa do X"
- Entrada: `lugar`. Faz: 1 busca Pro. Devolve: nome, endereço e link do Google Maps (grátis até 5.000/mês).

Instruções que vão na descrição das próprias ferramentas (onde o modelo lê na hora de usar): o veredito é final, não refaça a conta; lugar fechado não é opção; "não confirmado" se diz na primeira linha; aberto não quer dizer mesa livre.

## 4. Travas e cuidados

- Validação de entrada (zod); `languageCode pt-BR`; `regionCode BR` só quando `perto_de` não indica outro país.
- Timeout de 8 s por chamada ao Google, 1 repetição só em erro passageiro (5xx/429), nunca em erro de chave ou faturamento.
- Cache de 5 min por consulta; limite diário de 300 chamadas (erro claro ao passar).
- Chave só por variável de ambiente (`GOOGLE_PLACES_API_KEY` no `.env.hermes`); nunca aparece em log ou resposta.
- Respostas curtas (até ~1.500 caracteres por chamada) para não inchar o contexto; nomes e endereços exatos, sem paráfrase.
- Erro de ferramenta volta como `isError` com frase em português ("o Google Maps não respondeu", "limite diário atingido").

## 5. Mudanças no Atlas

- `hermes/mcp/mapas/` no repositório: `server.mjs`, `google.mjs` (chamadas e máscaras de campos), `horario.mjs` (conta do veredito), `package.json` + `package-lock.json`, testes.
- `deploy.sh` copia para `runtime/hermes/mcp/mapas/` e instala dependências (`npm ci`), que ficam no volume.
- `hermes/config.yaml`: bloco `mcp_servers.mapas` (comando `node /opt/data/mcp/mapas/server.mjs`, `timeout: 20`).
- SOUL: 1 linha em "Honestidade": "Lugar, horário e endereço vêm da ferramenta de mapas; busca na web não serve para horário."
- `.env.hermes.example`: `GOOGLE_PLACES_API_KEY=`.

## 6. Testes (`evals/fase-3.md`, pelo Telegram)

| # | Mandar | Esperado |
|---|---|---|
| F3-1 | "O Parque Ibirapuera está aberto agora?" | Veredito do Google (aberto/fechado, até que horas), fonte citada, sem busca na web |
| F3-2 | "Restaurante italiano perto do Hotel Uptown Palace em Milão, aberto agora" | Até 5 opções com nota, preço, veredito e link; só abertos |
| F3-3 | "O Ristorante Imperialino em Milão abre hoje?" | FECHADO DEFINITIVAMENTE (foi o erro do Jarbas) |
| F3-4 | "Me manda o link do mapa da Bodytech Ponta Negra" | Link do Google Maps, endereço, mensagem só com o link para copiar |
| F3-5 | "O Bem Brasil em Milão abre segunda ao meio-dia?" | FECHADO ao meio-dia; só abre à noite (o outro erro do Jarbas) |
| F3-6 | "Que horas abre o Mercado Municipal de Manaus daqui a 10 dias?" | Horário regular com aviso de que feriados não entram além de 7 dias |
| F3-7 | "Horário do Restaurante Fulano Inexistente 123" | "Não confirmado: não achei no Google Maps", sem inventar |
| F3-8 | Medição | ≤ 2 s por chamada ao Google; nº de chamadas por pedido no log; nenhuma busca na web em F3-1 a F3-5 |

## 7. O que cada um faz

**Felipe:** copiar a chave do Google para o `.env.hermes` (comando pronto, sem mostrar o valor) e aprovar este desenho.
**Eu:** escrever o servidor e os testes de unidade da conta de horário (feriado, virada de meia-noite, 24 horas, fuso), instalar, ligar no Hermes, rodar a bateria, medir tempo e custo, registrar em `decisoes.md`.
