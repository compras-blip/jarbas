# Haiku 5.5 pela API da Anthropic × GPT-6.1 Sol pela Nous (14/10/2026 23:32–23:56 UTC)

Mesmo prompt (AGENTS.md 7,0 KB), mesmas 40 ferramentas, mesma memória, mesmos 36 pedidos já rodados com o GPT-6.1 Sol: princípios B1–B10, agenda A1–A9, e-mail E1–E9, Dropbox D1–D8. Haiku chamado direto (`--provider anthropic -m claude-haiku-5-5`, chave `ANTHROPIC_API_KEY` no .env.hermes); 36 de 36 sessões rodaram no Haiku, 0 quedas para o reserva. Notas do GPT: as rodadas registradas (principios-6.1sol-r3, fase1-agenda-3, fase2-email-2, fase5-dropbox-1); entre parênteses, a nota após as correções de ferramenta feitas depois daquelas rodadas (o Haiku já rodou com as ferramentas corrigidas).

| Bloco | GPT-6.1 Sol | Haiku 5.5 | Diferenças |
|---|---|---|---|
| B princípios (10) | 8,5 | **9,5** | B2: Haiku trouxe 3 alternativas abertas na data (GPT: nenhuma em 3 rodadas). B9: "não confirmei no site oficial" (GPT afirmou confirmação que veio de trecho de busca). B10: 0,5 nos dois; Haiku leu "quinta que vem" como 22/10 (GPT 15/10), viu conflito e perguntou. |
| A agenda (9) | 8,5 | 8,5 | A2: Haiku 1 (criou com Meet e disse que o contato não tem e-mail; GPT 0,5). A8: Haiku 0,5 (pediu confirmação para cancelar o próprio treino; GPT cancelou direto). A9: viu sobreposição de 5 min com evento recorrente e perguntou. |
| E e-mail (9) | 8,5 (9) | 8 | E1: Haiku 0,5: triagem só por assunto e só na caixa de entrada, em 38 s; não viu o e-mail do consulado (13h50 UTC), que está só na etiqueta importada do iCloud; GPT leu 10 e-mails em 110 s e achou. E5: Haiku achou wjezini@hotmail.com e explicou os 2 cadastros (GPT 0,5 na rodada). E9: Haiku 0,5: achou o golpe da "Receita", mas não a cobrança real do Registro.br (R$ 40, 13/10) que o GPT achou. |
| D Dropbox (8) | 7,5 (8) | 8 | D6: 1 chamada e 42 s (GPT 3 chamadas, 71 s). D4: leu a apólice e trouxe parcelas, cartão e franquia. D7 com ano (GPT 0,5 na rodada por formato meu). D8: pediu o sim antes de apagar. |
| **Total (36)** | **33 (34)** | **34** | empate técnico |

| Medida | GPT-6.1 Sol | Haiku 5.5 |
|---|---|---|
| Tempo total dos 36 | 1.930 s (54 s por teste) | 1.396 s (38 s por teste) |
| Chamadas ao modelo | 169 | 108 |
| Tokens de entrada por chamada | 20,7 mil (conta da Nous) | 40,5 mil (conta da Anthropic, inclui o cache; 89% vindo do cache) |
| Custo da bateria | 0 (plano do ChatGPT) | US$ 0,12 (estimativa do próprio Hermes) |
| Custo projetado, 100 chamadas por dia | 0 | ≈ US$ 3,5 por mês |

**Onde o Haiku foi melhor:** alternativas e honestidade (B2, B9), velocidade (B4 55 s contra 90 s; B6 65 s contra 83 s), menos chamadas (D6, E1). **Onde foi pior:** profundidade na triagem do e-mail (E1 e E9: olhou menos e perdeu 2 itens reais) e cautela a mais (A8). Nenhuma invenção detectada nas 36 respostas.

**Efeitos colaterais limpos:** 2 eventos criados pela bateria cancelados (reunião 15/10 10h e treino 16/10 8h), cache de anexos apagado, 38 documentos de teste apagados da memória (banco com 29, só curadoria). B8 mandou "Chego às 15h" de verdade para o Felipe pelo WhatsApp (a Z-API não viu como duplicata porque o texto mudou de maiúscula).

**Lições:** `-m anthropic/...` sozinho vai para o provedor do config (Nous) e cai no reserva; é preciso `--provider anthropic` (a bateria ganhou `PROVEDOR=`). A Anthropic conta o cache dentro da entrada: o número alto não é custo.
