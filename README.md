# Atlas

Assessor pessoal do Bruno, construído sobre o [Hermes Agent](https://hermes-agent.nousresearch.com/docs/) com memória de longo prazo no [Hindsight](https://hindsight.vectorize.io).

Este repositório guarda **o harness do Atlas**: tudo o que define o que ele vê, o que pode fazer, como lembra e como verificamos se ele está acertando. O código do Hermes em si não é editado.

## Estrutura

```
hermes/SOUL.md              identidade, tom e regras de conduta
hermes/config.yaml          modelo, ferramentas, aprovações e memória
hermes/hindsight/config.json  como o Hermes conversa com o Hindsight
docker-compose.yml          Hermes + Hindsight no VPS
.env.*.example              nomes dos segredos (os valores ficam só no servidor)
scripts/deploy.sh           copia a configuração e sobe tudo
evals/                      testes de cada fase
decisoes.md                 registro de cada decisão do harness e o motivo
docs/                       passo a passo de instalação
```

## Fases

| Fase | Entrega | Status |
|---|---|---|
| 0 | Telegram + modelo + memória | [instalação](docs/fase-0-instalacao.md) |
| 1 | Google Agenda + lembretes | depois da migração do Bruno para o Workspace |
| 2 | Gmail (triagem, só leitura e marcadores) | |
| 3 | Mapas + web (restaurantes perto) | |
| 4 | Navegador + 1Password | |
| 5 | Dropbox (só leitura) | |
