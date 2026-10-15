# Fase 1 — Agenda do Google (desenho, 13/10/2026)

Baseado na documentação oficial baixada em `docs-google-calendar/` (23 páginas da API v3, lidas em 13/10) e nos dois testes reais feitos com a skill do Hermes (A1 45 s, A2 64 s, `evals/bateria/fase1-agenda-2/RESULTADO.md`).

## 1. O que a leitura da documentação muda

| O que a API dá | Como entra no Atlas |
|---|---|
| Alertas por evento: `reminders.useDefault=false` + até 5 `overrides` (`popup` ou `email`, 0 a 40.320 min) | Preferência E do Bruno vira **padrão de código**: todo compromisso criado pelo Atlas sai com popup 60 e 30 min, sem o modelo lembrar de pedir |
| Fuso: `start.timeZone`/`end.timeZone` com nome IANA, ou deslocamento no `dateTime` | Tudo em `America/Manaus`, salvo viagem (o modelo passa o fuso do lugar onde ele estará, preferência E) |
| Link de reunião: `conferenceData.createRequest` + `conferenceDataVersion=1`, criação assíncrona (`status.statusCode` pending → success) | `online: true` cria o Google Meet na hora; o servidor espera o link ficar pronto (1 reconsulta) e devolve a URL |
| Convidados: `attendees[].email` + `sendUpdates=all` para avisar por e-mail | Convite sai só quando o Bruno confirmou (princípio 7); e-mail do convidado vem dele ou da memória |
| Disponibilidade: `freebusy.query` devolve faixas ocupadas | **Conflito é checado por código antes de criar**: se há choque, a ferramenta não cria e devolve o que choca, para o modelo perguntar |
| Listar: `events.list` com `singleEvents=true`, `orderBy=startTime`, `timeMin/timeMax`, `timeZone`, `q` para busca por texto | Uma chamada por pergunta ("o que tenho amanhã", "quando é a consulta do dentista") |
| Alterar: `events.patch` (3 unidades de cota, irrelevante para 1 usuário); arrays substituem o anterior | `agenda_mudar` só manda os campos que mudam; convidados são reenviados inteiros |
| Cancelar: `events.delete` com `sendUpdates` | Avisa convidados por e-mail quando o Bruno mandar |
| Erros: 401 (reautorizar), 403/429 (recuo exponencial), 404, 409 (id duplicado), 410 (já apagado), 412 (etag) | Mensagens em português por código de erro; 1 repetição com espera em 403/429/500 |
| Cotas: 600 por minuto por usuário, 1 milhão por dia por projeto, sem custo (cobrança acima da cota só "mais tarde em 2026") | Zero custo para 1 usuário. Trava de 300 chamadas por dia no servidor, como no mapas |
| `quickAdd` (texto livre → evento) | Não usar: o Google interpreta em inglês e sem fuso; a data o modelo já converte |
| Eventos recorrentes: `recurrence` com RRULE; instâncias via `events.instances`; alterar 1 instância = exceção | Fase 1 cria recorrência simples ("toda segunda às 7h") com RRULE; alterar série inteira vs 1 ocorrência fica explícito no parâmetro |
| Dia inteiro: `start.date`/`end.date` (fim exclusivo) | `dia_inteiro: true`; o servidor põe o fim no dia seguinte |

## 2. O servidor MCP oficial do Google (visto na documentação)

O Google tem um servidor MCP hospedado para o Calendar (`https://calendarmcp.googleapis.com/mcp/v1`), com `create_event`, `update_event`, `delete_event`, `get_event`, `list_events`, `search_events`, `suggest_time`, `respond_to_event`, `list_calendars`. Páginas em `docs-google-calendar/30-…` a `35-…`.

O `create_event` dele é completo: `overrideReminders`, `attendees`, `addGoogleMeetUrl`, `timeZone`, `location`, `recurrenceData`, `allDay` (página `32-mcp-create_event.md`). Por que não agora:
1. **Developer Preview**: exige inscrição no programa de prévia do Google Workspace; não é produção e pode mudar.
2. Autenticação: `Authorization: Bearer <token de acesso>`, e o token de acesso do Google dura 1 hora. O Hermes liga MCP por HTTP só com cabeçalho fixo; precisaria de um proxy nosso que renova o token a cada hora, ou seja, código nosso do mesmo jeito.
3. Saída em inglês e em bruto (JSON do evento), sem fuso de Manaus aplicado, sem alertas por padrão, sem checagem de conflito antes de criar: tudo isso voltaria para o prompt.

Fica como opção quando sair da prévia. O desenho abaixo é compatível: mesmas operações, nomes nossos.

## 3. Servidor `agenda` (Node, stdio, mesmo molde do `mapas`)

Lê `/opt/data/google_token.json` (o mesmo token já autorizado pela conta do Bruno; `googleapis` renova o acesso com o `refresh_token` em memória). Escopo já concedido: `calendar` (total). Nada de novo para autorizar.

**`agenda_listar`** — "o que tenho amanhã / na sexta / esta semana", "quando é X"
- Entrada: `de` e `ate` (datas `AAAA-MM-DD`, no fuso do Bruno; `ate` inclusivo; padrão hoje), opcional `texto` (busca `q`), `fuso` (padrão America/Manaus), `agenda` (padrão `primary`).
- Faz: 1 `events.list` (`singleEvents`, `orderBy=startTime`, máx. 50).
- Devolve, por evento: dia da semana e data, hora início–fim no fuso (ou "dia inteiro"), título, local, convidados (nome ou e-mail, resposta: aceitou/recusou/pendente), link do Meet se houver, alertas, e o `id` para mudar/cancelar. Fecha com "fonte: Google Agenda, consultado agora". Vazio: "nenhum compromisso em …".

**`agenda_livre`** — "estou livre sexta às 15h?", "que horas tenho buraco na quinta?"
- Entrada: `de`, `ate` (data e hora), `duracao_min` opcional.
- Faz: 1 `freebusy.query`. Devolve as faixas ocupadas (com o título, cruzando com `events.list` da mesma janela) e os buracos ≥ duração.

**`agenda_criar`** — "marca X na quinta às 15h"
- Entrada: `titulo`, `inicio` (`AAAA-MM-DDTHH:MM`), `fim` ou `duracao_min` (padrão 60), `fuso` (padrão Manaus), `dia_inteiro`, `local` (endereço completo), `descricao`, `convidados[]` (e-mails), `online` (cria Meet), `alertas_min[]` (padrão `[60, 30]`), `recorrencia` (RRULE pronta, ex. `FREQ=WEEKLY;BYDAY=MO`), `avisar_convidados` (padrão true), **`ignorar_conflito`** (padrão false).
- Faz: `freebusy.query` na janela; se houver choque e `ignorar_conflito=false`, **não cria** e devolve "CONFLITO: 15h–16h já tem 'Reunião Y'". Senão `events.insert` (`conferenceDataVersion=1` quando online, `sendUpdates=all` quando há convidados). Se Meet ficou `pending`, 1 `events.get` após 1,5 s.
- Devolve: "CRIADO: quinta 16/10, 15h–16h (Manaus), 'X', em <local>, com <convidados>, Meet <link>, alertas 60 e 30 min, link do Google Agenda", mais o `id`.

**`agenda_mudar`** — "muda para 16h", "põe o endereço", "adiciona o Williams"
- Entrada: `id`, e só os campos que mudam (`inicio`, `fim`, `titulo`, `local`, `descricao`, `convidados[]`, `online`, `alertas_min[]`, `fuso`), `serie` (`esta` | `toda`, para recorrentes), `ignorar_conflito`.
- Faz: `events.get` + (conflito se mudou hora) + `events.patch` com `sendUpdates=all`. Devolve "ALTERADO: …" com o antes e o depois do que mudou.

**`agenda_cancelar`** — "cancela a reunião de quinta"
- Entrada: `id`, `avisar_convidados` (padrão true), `serie` (`esta` | `toda`).
- Faz: `events.get` (para ecoar o que foi cancelado) + `events.delete`. 410 = já estava cancelado, diz isso.

Travas: zod nas entradas; datas sem fuso explícito são do fuso do Bruno; `fim` ≤ `inicio` é erro; máx. 5 alertas (regra do Google); 1 repetição em 403/429/500 com espera de 1 s; trava diária de 300 chamadas; respostas até ~1.500 caracteres; nada de token em log ou resposta; `id` exposto só para o modelo (o SOUL já proíbe mostrar identificador ao Bruno).

## 4. Mudanças no Atlas

- `hermes/mcp/agenda/`: `server.mjs`, `google.mjs` (cliente, token, renovação, erros), `tempo.mjs` (datas, fuso, formatação pt-BR), `package.json` (`@modelcontextprotocol/server`, `googleapis`, `zod`), testes da conta de datas e do conflito.
- `deploy.sh`: copia e `npm ci`, como o mapas.
- `hermes/config.yaml`: `mcp_servers.agenda` (stdio, `timeout: 20`); skill `google-workspace` volta para `skills.disabled` (16 KB, só para Gmail/Drive, fases 2 e 5 terão o próprio desenho).
- `AGENTS.md`, seção Ferramentas: a linha do `google_api.py` vira "**Agenda do Google:** `mcp__agenda__*`; compromisso com dia e hora vai na agenda, tarefa sem hora vai em lembrete; presencial pede endereço completo (ache pelo mapas antes de perguntar); criar, mudar ou cancelar com outras pessoas segue o princípio 7." (preferência E vira 1 linha + código).
- Custo no prompt: 5 ferramentas ≈ 2,5 KB de esquema por mensagem (o mapas com 4 custa 1,9 KB); a skill de 16 KB sai do índice.

## 5. Testes (`evals/fase-1.md`, pela CLI e pelo Telegram)

| # | Mandar | Esperado |
|---|---|---|
| A1 | "O que tenho na agenda amanhã?" | 1 chamada, resposta em ≤ 20 s, horários de Manaus |
| A2 | "Marca amanhã às 10h, 1 hora, revisão do orçamento da MAO Trucks com o Williams, online" | Pede confirmação com o e-mail do Williams; após "sim", cria com Meet, convite enviado, alertas 60/30 |
| A3 | "Almoço com a Yanna sexta 12h30 no Pobre Juan" | Presencial: endereço completo achado pelo mapas e posto no evento; alertas 60/30; sem convidado (sem e-mail) |
| A4 | "Marca dentista sexta 12h" (choca com A3) | Ferramenta devolve CONFLITO; Atlas não cria e pergunta |
| A5 | "Muda o almoço de sexta para 13h" | `agenda_mudar`, confirmação se houver convidado, "ALTERADO 12h30 → 13h" |
| A6 | "Estou livre quinta à tarde?" | `agenda_livre`, buracos listados |
| A7 | "Quando é a revisão com o Williams?" | `agenda_listar` com `texto` |
| A8 | "Cancela o dentista" | Confirmação (princípio 7), `agenda_cancelar`, eco do que foi cancelado |
| A9 | "Toda segunda às 7h, treino, 1 hora" | Recorrência semanal, alertas 60/30 |
| A10 | Medição | chamadas à API, tempo, tokens; limpeza dos eventos de teste e da memória no fim |

Todos os eventos de teste são apagados ao final (lista pelo `id` devolvido).

## 6. O que cada um faz

**Felipe:** aprovar o desenho; confirmar que a agenda do Bruno pode receber eventos de teste em 14 a 17/10 (apagados no mesmo dia).
**Eu:** servidor, testes de unidade (datas, fuso, conflito, dia inteiro, recorrência), instalação, bateria A1–A10, registro em `decisoes.md`, depois a bateria do Bruno inteira para conferir que nada regrediu.
