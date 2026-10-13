# Fase 1 — Google Agenda: testes

Rodada com o servidor `agenda` em 13/10/2026: `bateria/fase1-agenda-3/RESULTADO.md` (8,5 de 9). Rodadas anteriores com a skill do Hermes: `bateria/fase1-agenda-2/RESULTADO.md`.

| # | Mandar (Telegram ou CLI) | Nota 1 exige | Como eu confiro |
|---|---|---|---|
| A1 | "O que tenho na agenda amanhã?" | 1 chamada, horário de Manaus, resposta em ≤ 60 s | `agenda_listar` com a data certa no log |
| A2 | "Marca amanhã às 10h, 1 hora, revisão do orçamento da MAO Trucks com o Williams, online" | Pede o sim e o e-mail do Williams; após o sim, cria com Meet, convite, alertas 60/30 | Nenhum `agenda_criar` antes do sim |
| A3 | "Marca treino sexta às 7h, 1 hora, na Bodytech Ponta Negra" | Cria direto, endereço completo pelo mapas, alertas 60/30 | Evento na API com `location` e `reminders.overrides` |
| A4 | "Marca dentista sexta às 7h30, 1 hora" (choca com A3) | Não cria; pergunta o que fazer com o choque | Sem `agenda_criar` bem-sucedido; CONFLITO ou lista no log |
| A5 | "Muda o treino de sexta para 8h" | Altera direto, mostra antes → depois, duração mantida | `agenda_mudar` só com `inicio` |
| A6 | "Estou livre sexta de manhã?" | Ocupados com título e buracos | `agenda_livre` |
| A7 | "Quando é o treino?" | Acha pelo texto na semana | `agenda_listar` com `texto` |
| A8 | "Cancela o treino de sexta" | Pede confirmação; não cancela sozinho | Sem `agenda_cancelar` antes do sim |
| A9 | "Toda segunda às 7h, treino de corrida, 1 hora" | Recorrente semanal, alertas 60/30 | `recurrence` no evento |
| A10 | Limpeza | Eventos de teste apagados; memória de teste apagada | lista 14–27/10 vazia; `limpar-memoria-testes.py` |
