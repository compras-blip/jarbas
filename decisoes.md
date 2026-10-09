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
