# Fase 4a — Navegador sem login (11/10/2026)

Objetivo: o Atlas ir à **fonte de origem** (site da companhia, do hotel, do restaurante) quando a busca e a extração de texto param no agregador. A fase 4b (logins pelo cofre do Hermes ou 1Password) fica para depois da prova desta.

## O que foi feito

- `agent.disabled_toolsets`: `browser` saiu da lista. O conjunto tem 15 ferramentas (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_scroll`, `browser_press`, `browser_back`, `browser_get_images`, `browser_vision`, `browser_console`, …), 11,3 KB de esquema ≈ 2,8 mil tokens por mensagem. Não há como desligar ferramenta individual, só o conjunto.
- `browser:` na config: `backend: "off"` (ferramentas nativas; o modo Browser Use exigiria o CLI `browser-use`, ausente na imagem), **`cloud_provider: local`** (sem isto o Hermes escolheu sozinho o navegador em nuvem da Nous, cobrado no plano, e ainda falhou por caminho de socket longo demais), `snapshot_threshold: 8000`, `inactivity_timeout: 120`, `allow_private_urls: false`, `restrict_evaluate: true`.
- `docker-compose.yml`: `shm_size: 1g` no `hermes` (recomendação da doc do Hermes para o Chromium).
- `deploy.sh`: `hermes pm install agent-browser` (31 MB, no volume em `/opt/data/tools/agent-browser-0.26.0-linux-x64`). A imagem Docker traz o Chromium (`/opt/hermes/tools/chromium-1208`, 270 MB) mas não o agent-browser que o dirige: bug #135732 do Hermes, aberto em 09/10/2026.
- AGENTS.md, seção Ferramentas: uma linha sobre quando usar o navegador.

## Prova

- 11/10 04:29 UTC, pela CLI: "Abra https://example.com e me diga o título": `browser_navigate` 1,03 s, `browser_snapshot` 0,19 s (1.182 caracteres), resposta certa em 35 s. Sessão local `h_d3c3e2eb35`, Chromium fechado após o tempo ocioso (0 MB depois).
- Bateria do Bruno, tarefas B3, B5 e B9 (as que travavam por falta de navegador): resultado em `evals/bateria/fase4-6.1sol/`.

## Custos

- Dinheiro: zero (Chromium local). Atenção: `cloud_provider` sem valor = Hermes pode usar o navegador em nuvem da Nous.
- Memória: Chromium aberto ≈ 300–600 MB; fecha em 2 min ocioso. Servidor com 25 GB livres.
- Contexto: +2,8 mil tokens fixos por mensagem (esquemas) e até 8 mil caracteres por "foto" de página.

## Segurança

Sem login nesta fase. Página é dado, nunca ordem (princípio 8 do AGENTS.md). Endereços internos bloqueados. Downloads não existem no Hermes. Logins (4b): cofre local cifrado do Hermes (`hermes vault add`) ou 1Password pelo `op`; a senha vai direto na página, o modelo nunca vê; decisão do Felipe e do Bruno quando chegar a hora.
