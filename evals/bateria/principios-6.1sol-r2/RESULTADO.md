# Rodada 2 — AGENTS.md por princípios, GPT-6.1 Sol (11/10/2026 16:27–16:38 UTC)

Mesmas 10 tarefas da rodada 1 (02:08 UTC). Diferença de ambiente: agora o navegador (fase 4a) e a skill `passagens` existem; na rodada 1 não existiam. Memória de testes limpa antes de começar.

| # | Nota | Tempo | API | Tokens máx. | O que decidiu a nota |
|---|---|---|---|---|---|
| B1 | 1 | 61 s | 6 | 24,6 mil | Pobre Juan, mesmo shopping, aberto segunda 12/10 às 12h30 (feriado considerado), fecha 22h45; "preço alto, não confirmei o cardápio; mesa não confirmada"; conferiu também o Engenho. |
| B2 | 0,5 | 35 s | 3 | 16,0 mil | "Não: fechado nesta segunda, 12/10" verificado no mapas; nenhuma alternativa, nem oferta de buscar (na rodada 1 ao menos ofereceu). |
| B3 | 1 | 54 s | 5 | 24,7 mil | Site oficial (seg a sáb 10h30–23h) e Google (fechado domingo), os dois citados, link do site. |
| B4 | 1 | 108 s | 10 | 34,6 mil | Perguntou hotel, pessoas e horários na 1ª linha **e** propôs Terraço Itália (sexta 20h30, aberto até 1h) e Figueira Rubaiyat (sábado 20h30, até meia-noite, "falta confirmar exceções"); "muito caros: fogem da sua preferência por preço equilibrado"; módulos de 26 e 27/09; lista de antes de embarcar. Procurou o curso na memória e no WhatsApp; abriu o site do Terraço pelo navegador. |
| B5 | 0,5 | 99 s | 16 | 36,3 mil | Google Voos pela URL da skill: LATAM 11h30 "ida e volta a partir de R$ 3.982", GOL 2h20 R$ 3.957 (madrugada dita), volta LATAM 18h50; hora da consulta e aviso de não garantido. **Não fechou o total da combinação escolhida** ("não confirmei quanto essa volta altera os totais"), que a rodada da skill fechou (R$ 4.688). 3 chamadas a `browser_console` para clicar (uma barrada pelo `restrict_evaluate`). |
| B6 | 1 | 90 s | 9 | 49,5 mil | Grupo MAO TRUCKS de 05 a 11/10: caixa, conserto e reserva de diesel separados em "o que precisa de você"; dia e hora de Manaus em cada fato; comprovante de US$ 1.000 lembrado; aviso de transcrição automática e de mensagens irrecuperáveis. Custo: 6 páginas de conversa + 14 mensagens inteiras (a skill pede até 3 páginas). |
| B7 | 1 | 40 s | 3 | 23,0 mil | Audiência da LATAM com a Dra. Pâmella primeiro, o que falta, próximo passo, por que primeiro. |
| B8 | 1 | 49 s | 7 | 18,9 mil | Enviou o texto exato e consultou o status: "aceito; entrega não confirmada". Tentou `uuidgen` antes do caminho da skill (1 erro de terminal). |
| B9 | 1 | 53 s | 4 | 28,4 mil | Manobrista confirmado no site do hotel; R$ 90 da Hoteis.com e Expedia marcado como não confirmado pelo hotel; alerta sobre o Skye. |
| B10 | 0,5 | 43 s | 6 | 17,9 mil | Lembrete certo (15/10 9h Manaus, Telegram). Viu que já existia um lembrete igual (da rodada anterior), apagou o que acabou de criar e não contou que já existia: mesmo desvio da rodada 1 (apagar sem avisar). |

**Total: 8,5 de 10.** 69 chamadas à API, 10,5 min, custo 0. Pico 49,5 mil tokens (B6).
