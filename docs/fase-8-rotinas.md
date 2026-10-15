# Fase 8a — Rotinas prontas (15/10/2026)

Três rotinas do cron do Hermes (`hermes cron list`; cópia dos jobs em docs/rotinas-cron-jobs.json), entregues no Telegram. Enquanto o Felipe testa, vão para o chat dele (7245943550); ao liberar o Bruno, trocar o `--deliver` para o chat dele.

| Rotina | Quando (Manaus) | O que traz |
|---|---|---|
| Bom dia do Atlas | todo dia 7h | agenda de hoje (hora, endereço) e 1º de amanhã; e-mail desde ontem 18h pela triagem (cobranças sem comprovante, golpe, pessoal que pede resposta); WhatsApp 24 h esperando resposta (skill); lembretes do dia |
| Fim do dia do Atlas | todo dia 18h30 | o que ficou em aberto hoje (cobranças, WhatsApp 12 h); agenda de amanhã com hora de sair (mapas) |
| Semana do Atlas | segunda 7h | compromissos da semana; vencimentos em 7 dias sem comprovante; pendências da semana passada |

Regras das rotinas: informe, sem perguntas; até 700 caracteres (900 na semanal); 5 itens mais importantes e "faltam N". O cron do Hermes interpreta o horário no fuso HERMES_TIMEZONE (America/Manaus), não em UTC (conferido em 15/10: "0 11" caiu às 11h de Manaus). Limitação conhecida: o Hermes embrulha a entrega com cabeçalho "Cronjob Response" em inglês (ver decisoes, teste 6).

**Fase 8b (a desenhar):** quadro de pendências com estado (aberta, resolvida, quando), alimentado pelas rotinas: o que o Bruno resolve some no dia seguinte; "ontem você fechou N".
