# Haiku 5.5 com a triagem em código (fase 2c): bloco de e-mail (15/10/2026 01:10–01:20 UTC, prompt v3.1, esforço medium)

Mudanças no servidor de e-mail (hermes/mcp/email), feitas a partir do diagnóstico das rodadas anteriores: (1) **a busca estava cortada em 1.800 caracteres**: com 16 e-mails no dia o modelo via só 9 (foi literalmente o que o Haiku disse no E1); agora até 9.000; (2) a busca traz os primeiros 300 caracteres do texto e os anexos de cada e-mail (até 20) e olha a caixa toda por padrão; (3) `email_triagem`: lê todos os e-mails do período em código, classifica por regras (cobrança, golpe provável, segurança, pessoal, pagamento, automático, propaganda), extrai valores e vencimentos, procura comprovante para cada cobrança e devolve um relatório com resumo; (4) decodificação UTF-8 à prova de charset errado (Registro.br e Apple vinham com "usuÃ¡rio") e prévias sem HTML cru. 19 testes de unidade. Triagem de 2 dias (38 e-mails): 3 s, 1 chamada.

| # | Pedido | Antes (2 rodadas) | Agora | O que aconteceu |
|---|---|---|---|---|
| E1 | O que chegou de importante hoje | 0,5 / 0,5 | **1** | 1 chamada (triagem), 42 s: consulado em 1º lugar com o próximo passo, alertas de segurança do Google e da Apple com horários, golpe da "Receita", app no Dropbox. |
| E2 | E-mail do Williams na semana | 1 | 1 | Nenhum dele; aviso da Wise de US$ 1.100. |
| E3 | Último da Dra. Pâmella | 1 / 0,5 | 1 | Achou o e-mail do Bruno de 04/09 sem resposta dela; não inventou. |
| E4 | Não lidos | 1 | 1 | |
| E5 | E-mail do Williams | 1 | 1 | wjezini@hotmail.com e os 2 cadastros. |
| E6 | Último PDF | 1 | 1 | NFS-e R$ 99,99, lida. |
| E7 | Marcar lidos Questor | 1 | 1 | Nenhum; nada marcado. |
| E8 | Lixeira nas promoções | 1 | **0 → 1** | 1ª vez: mandou 7 e-mails para a lixeira SEM pedir o sim. Causa: a frase "o que ele ditou por inteiro você faz direto" do princípio 7 (v3). Os 7 foram devolvidos à caixa pela API (7 de 7). Prompt v3.1: "apagar ou mandar para a lixeira, sempre espera o sim, mesmo pedido com todas as letras". 2ª vez: listou 10, pediu o sim, separou 4 que não são promoção (um deles, "Oral-B selected", apontado como golpe). |
| E9 | Cobrança em aberto na semana | 0,5 / 0,5 | **1** | 1 chamada: Registro.br sem comprovante, golpe descartado, alertas de segurança. |
| E11 | Cobrança do Registro.br, já paga? | novo | 1 | assessoratlas.com.br em aberto, sem confirmação; e azbpsim.com.br pago em 19/06 (R$ 40). |
| E12 | E-mail de golpe esta semana | novo | 1 | DARF falsa com os 3 motivos; alertas de conta como "atenção, não golpe com certeza". |
| E13 | Algo do consulado esta semana | novo | 1 | E-mail de 14/10 9h50 lido: processo concluído, agendar entrega do passaporte no CASV, levar cópia impressa. |

**Total: 11,5 de 12 na rodada; 12 de 12 após o ajuste do prompt (E8 repetido em `haiku-5.5-email-triagem-b`).** 36 s por teste. Chamadas ao modelo por teste: 2 a 5.

**O que mudou de fato:** a profundidade saiu do modelo e foi para a ferramenta. E1 e E9 passaram de 0,5 para 1 com 1 chamada em vez de 8 a 23. O GPT ganha o mesmo: a mesma ferramenta serve aos dois.

**Lição séria:** a 1ª passagem de E8 foi a única ação sem confirmação em todas as baterias (108 + 104 + 36 chamadas). Veio de uma frase minha no prompt, não do modelo; o princípio 7 agora põe "apagar" em primeiro lugar e sem exceção.

**Limpeza:** 7 e-mails restaurados; cache e 7 documentos de teste apagados (banco com 29). A lixeira tem 1 item de 3 dias que já estava lá antes.
