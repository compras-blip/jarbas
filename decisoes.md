# Registro de decisões do Atlas

Cada mudança no harness entra aqui com o motivo e, quando houver, o placar dos testes antes e depois.

## 08/10/2026

- **Base: Hermes Agent (Nous Research).** Pesquisa em fóruns e reviews mostrou que é a ferramenta com mais relatos reais de uso como assistente pessoal. O Agno foi considerado, mas não há relatos públicos dele nesse uso. O código do Hermes não é editado: tudo o que é do Atlas fica neste repositório (SOUL.md, config, skills e plugins).
- **Memória: Hindsight (Vectorize), rodando no próprio VPS.** Os dados pessoais do Bruno ficam no servidor dele. Só a extração de fatos chama um modelo externo.
- **Modelo: Nous Portal.** Um login cobre o modelo, a busca na web e, mais tarde, o navegador. O OpenRouter não tinha funcionado bem antes, e modelos fracos são a causa mais relatada de o Hermes "esquecer" como usar ferramentas.
- **Servidor: VPS KVM 8 da Hostinger**, em Docker, ao lado do OpenClaw, que continua no ar até o Atlas provar que dá conta.
- **E-mail e agenda: Google Workspace.** O Bruno vai migrar do iCloud. A Apple não oferece API para agentes, e o Google tem a skill pronta no Hermes.
- **Travas:** `approvals.mode: manual`, `skills.write_approval: true`, Telegram só para IDs autorizados e versão do Hermes fixada depois da instalação.
- **Fora da fase 0 de propósito:** navegador, delegação de subagentes e execução de código. Cada um entra quando uma fase precisar, com testes.

## 09/10/2026

- **Nome: Atlas.** O assistente passa a se chamar Atlas (SOUL, containers, banco de memória do Hindsight). O repositório continua `jarbas` no GitHub.
- **Modelo: ChatGPT (assinatura Pro do usuário), direto pelo Hermes** com o provedor `openai-codex`. Substitui a Nous Portal como modelo principal: a cota do plano sobra para um assessor, e fica uma dependência só (Atlas → OpenAI). Não há troca automática se a OpenAI cair; uma reserva entra depois. A Nous Portal fica só como chave do Hindsight. OpenRouter descartado porque já deu problema antes.
- **Busca na web desligada** até os testes 1, 5 e 9 passarem. Depois entra `brave-free`.

## 09/10/2026 (instalação no orbe-prod-01)

- **Modelo: ChatGPT pela Nous Portal, não direto.** `model.provider: nous`, `model.default: openai/gpt-5.5`. O Felipe ligou o plano do ChatGPT na Nous ("Linked accounts"); na API da Nous esse modelo aparece com `billing_mode: subscription`, ou seja, cobrado no plano do ChatGPT e não nos créditos. Login no servidor: `hermes auth add nous` (código de dispositivo). O `openai-codex` direto foi descartado a pedido do Felipe. Riscos anotados: a cota é a mesma do app do ChatGPT; se a conexão ChatGPT↔Nous expirar, reconectar é manual no painel da Nous; a Nous não tenta de novo pelos créditos.
- **Reserva automática: `fallback_model` = `nous` / `google/gemini-3.8-flash`.** Hermes troca sozinho em erro de login/cobrança (401/402/403), limite (429), queda de conexão, resposta vazia ou recusa, e volta a tentar o principal na mensagem seguinte. Escolhido por ser barato (US$ 0,07/0,14 por milhão; cache medido pela Nous: 67% a partir da 3ª chamada) e provado no Jarbas (bateria 23/09: 21/24, 0 afirmações falsas). Não pode ser modelo da OpenAI, senão cai junto. Pendente: aviso no Telegram do Felipe quando a reserva entrar.
- **Hindsight com a chave da Nous usa a porta compatível com OpenAI**, não o modo `nous`: `HINDSIGHT_API_LLM_PROVIDER=openai`, `HINDSIGHT_API_LLM_BASE_URL=https://inference-api.nousresearch.com/v1`, `HINDSIGHT_API_LLM_MODEL=deepseek/deepseek-v4-flash`. O modo `nous` do Hindsight ignora a chave e exige o `auth.json` do Hermes (erro na 1ª subida).
- **Hindsight em português.** Padrões de fábrica eram só inglês (embeddings `bge-small-en`, reranker `ms-marco`, busca `english`). Trocado para `BAAI/bge-m3`, `BAAI/bge-reranker-v2-m3`, `portuguese`, `HINDSIGHT_API_LLM_OUTPUT_LANGUAGE=Portuguese`, com o volume de teste apagado (trocar embeddings depois de ter memórias perde os dados). Um banco por usuário (`atlas-{user}`).
- **Versão fixada:** `HERMES_VERSION=v0.21.6` no `.env` (tag oficial; `latest` era a build `rc.4-v0.21.6`, mesma versão).
- **Testes 1, 5 e 9: passaram** (ver evals/fase-0.md). Custo medido por pergunta simples: ~6 mil tokens por chamada, 90% em cache, zero créditos no plano do ChatGPT.
- **Pendências:** aviso de reserva no Telegram; missão de retenção do Hindsight (hoje vazia); testes 2, 3, 4, 6, 7, 8 e 10; busca na web (ainda desligada).
- **Missões do Hindsight ficam no `.env.hindsight`** (`HINDSIGHT_API_RETAIN_MISSION`, `_OBSERVATIONS_MISSION`, `_REFLECT_MISSION`, temperamento 2/2/4 como a documentação sugere para assistente pessoal; texto no `.env.hindsight.example`). O plugin 1.2.1 lê `bank_mission`/`bank_retain_mission` do config.json mas não envia ao Hindsight (conferido no código), então essas chaves saíram do config.json. No config.json ficaram os rótulos `Bruno`/`Atlas` (`retain_user_prefix`, `retain_assistant_prefix`, `retain_context`): os fatos passaram a sair como "Bruno treina na academia Bodytech..." em vez de "o usuário". A missão de retenção traz do prompt do Jarbas: regras permanentes (sempre, de agora em diante), conta paga não volta, só a fala do Bruno vira fato (não a resposta do assistente), onde ele está em viagem.
- **Cache dos modelos do Hindsight em volume** (`hindsight-models`): sem isso cada reinício baixava 3 GB de novo.
- **Teste da missão de retenção (09/10 18:03 UTC):** frase com pagamento, regra e fala de terceiro gerou: "Bruno pagou o condomínio de outubro de 2026 no valor de R$ 1.850" (data 09/10), "A partir de 2026-10-09, Bruno exige ser avisado um dia antes de qualquer prazo" e "O dentista do João é o Dr. Carlos" (fato sobre o João; o do Bruno segue Dr. Paulo). Observado: cada mensagem gera 2 gravações (ferramenta `hindsight_retain` chamada pelo agente + gravação automática), com fatos quase repetidos; opção futura: `memory_mode: context` para deixar só a automática.

## 10/10/2026

- **Testes 6, 7, 8 e 10 passaram** (ver evals/fase-0.md). Faltam 2 (conta não autorizada), 3 (áudio, exige transcrição) e 4 (busca na web, desligada).
- **Lembrete (teste 6):** chega, mas o Hermes embrulha a entrega do cron com cabeçalho "Cronjob Response: <nome> (job_id: ...)" e rodapé "To stop or manage this job..." em inglês (código em cron/scheduler_delivery.py). Pendente: ver se é configurável; senão, fica como limitação conhecida.
- **Observação da memória:** com o Felipe testando pela conta dele, alguns fatos saíram como "Felipe Nóbrega pagou..." e outros como "Bruno pagou..." (o rótulo é Bruno, mas o nome do Telegram vai junto). Com o Bruno na conta dele isso se resolve.
