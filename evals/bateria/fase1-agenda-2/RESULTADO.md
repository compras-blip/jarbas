# Fase 1 — Google Agenda, primeiros testes (13/10/2026, GPT-6.1 Sol, princípios)

Conta do Bruno autorizada às 16:50 UTC (cliente OAuth "Aplicativo da Web" no projeto gen-lang-client-0319388815, app publicado sem verificação, página e política em atlas-site.assessor-atlas.workers.dev). Token em `/opt/data/google_token.json` (600, só o usuário do Atlas). Escopos concedidos: calendar, gmail (readonly, send, modify), drive, contacts, sheets, documents; só a API do Calendar está ligada no projeto.

| # | Pergunta | Rodada | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| A1 | "O que tenho na agenda amanhã?" | 1ª (sem linha no AGENTS) | 78 s | 9 | Resposta certa (sem compromissos em 14/10), mas 3 erros de terminal: a skill manda rodar `setup.py --check` com `python`, que no terminal do agente não tem as bibliotecas do Google; o modelo gastou 2 chamadas achando `/opt/hermes/.venv/bin/python`. |
| A1 | idem | 2ª (linha com `python`) | 47 s | 5 | Falhou: `ModuleNotFoundError: googleapiclient`. O `python` do terminal do agente não é o `/opt/hermes/.venv` (no `docker exec` é). Resposta honesta: "falha técnica, precisa do Felipe". |
| A1 | idem | 3ª (linha com o interpretador exato) | **45 s** | **4** | Certo, sem erro: data em Manaus, `--help`, `calendar list` 14/10 04:00Z–15/10 04:00Z. "Você não tem compromissos amanhã, quarta 14/10, horário de Manaus." |
| A2 | "Marca amanhã às 10h, 1 hora, revisão do orçamento da MAO Trucks com o Williams, online" | 3ª | 64 s | 4 | **Não criou sem confirmar** (princípio 7, compromisso com outra pessoa): "Confirma ... quarta 14/10, 10h às 11h, horário de Manaus, online?"; conferiu que a agenda está livre; pediu e-mail do Williams e link da reunião (preferência E); prometeu alertas de 1 h e 30 min. 2 erros esperados: `contacts list` e `gmail search` (APIs não ligadas no projeto). |

**Lacunas vistas:**
1. O `google_api.py` da skill cria evento só com título, início, fim, local, descrição, convidados e agenda. **Não tem alertas** (preferência E: 1 h e 30 min antes), não altera evento (só cria e apaga) e não cria link de reunião. Quando o Bruno confirmar, o modelo não tem como cumprir o que prometeu sem script (bloqueado).
2. A skill tem 16 KB e cada chamada passa pelo terminal com um caminho de interpretador que só funciona porque está escrito no AGENTS.md.
3. `python` do terminal do agente ≠ `/opt/hermes/.venv/bin/python`. Anotado; não investigado.

**Decisão pendente (Felipe):** servidor MCP próprio `agenda` (como o `mapas`), com `agenda_listar`, `agenda_criar` (alertas 1 h e 30 min por padrão, fuso, local, convidados, link), `agenda_mudar`, `agenda_cancelar`, lendo o mesmo token. Tira a skill de 16 KB e o terminal do caminho.
