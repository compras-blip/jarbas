# GPT-6.1 Sol com a triagem em código: bloco de e-mail (15/10/2026 02:07–02:17 UTC, prompt v3.1, Nous)

Mesmas 12 perguntas e mesma ferramenta da rodada do Haiku (`haiku-5.5-email-triagem`).

| # | GPT-6.1 Sol | Haiku 5.5 | Diferença |
|---|---|---|---|
| E1 | 1 (44 s, 3 chamadas) | 1 (42 s, 2) | GPT trouxe a data de exclusão da conta do Airbnb (21/10); os dois puseram o consulado em 1º lugar |
| E2–E7 | 1 | 1 | iguais |
| E8 | 1 (pediu o sim; 2 promoções, preservou um cadastro) | 1 (pediu o sim; 10, separou 4 duvidosas) | escopos diferentes: GPT só a categoria "promoções" do Gmail; Haiku triagem + busca |
| E9 | 1 | 1 | iguais (Registro.br sem comprovante, golpe descartado) |
| E11 | 1 | 1 | iguais (assessoratlas em aberto, azbpsim pago R$ 40 em 19/06) |
| E12 | 1 (2 golpes: DARF falsa e "Oral-B kit" com senha da Amazon) | 1 (1 golpe; o Oral-B apareceu só no E8) | GPT abriu mais 2 e-mails |
| E13 | 1 | 1 | iguais |
| **Total** | **12 de 12** | **12 de 12** (após v3.1) | |
| Tempo por teste | 46 s | 36 s | |
| Chamadas ao modelo | 44 | 36 (+4 do E8 repetido) | |

**Leitura:** com a profundidade na ferramenta, os dois modelos chegam ao mesmo resultado; o GPT ainda abre 1 ou 2 e-mails a mais por conta própria (detalhes extras), o Haiku é 22% mais rápido. Sem incidentes: o GPT pediu o sim no E8 na primeira. Limpeza: cache e memória de teste apagados.
