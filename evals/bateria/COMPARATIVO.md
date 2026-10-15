# Bateria do Bruno — comparativo das 4 rodadas (11/10/2026, uma rodada por célula)

| Tarefa | 5.5 + 12 regras | 5.5 + princípios | 6.1 Sol + 12 regras | **6.1 Sol + princípios** | Gemini 3.8 Flash + princípios |
|---|---|---|---|---|---|
| B1 Almoço perto da Bodytech | 0,5 | 1 | 1 | 1 | 1 |
| B2 Flor de Lis na segunda | 0,5 | 0,5 | 0,5 | 0,5 | 0,5 |
| B3 Site oficial vs Google | 1 | 0,5 | 0,5 | 1 | 1 |
| B4 Viagem a SP | 0,5 | 0,5 | 0,5 | **1** | 0,5 |
| B5 Passagem | 0,5 | 0 | 1 | **1** | 1 |
| B6 Williams / MAO Trucks | 1 | 1 | 1 | 1 | 1 |
| B7 Pendências | 1 | 1 | 1 | 1 | 1 |
| B8 Envio direto | 1 | 1 | 1 | 1 | 0,5 |
| B9 Garagem do hotel | 0,5 | 0,5 | 1 | **1** | 0 |
| B10 Lembrete | 1 | 1 | 0,5 | 0,5 | 0,5 |
| **Total** | **7,5** | **7,0** | **8,0** | **9,0** | **7,0** |
| Chamadas à API | 34 | 38 | 51 | 52 | 51 |
| Tempo total | 8,0 min | 7,7 min | 10,4 min | 9,4 min | 7,2 min |
| Custo | 0 | 0 | 0 | 0 | US$ 0,59 |

Leitura (atualizada com a 5ª rodada): com o mesmo modelo (6.1 Sol), princípios 9,0 contra 12 regras 8,0: a diferença veio de B3 (com princípios foi ao site oficial; com regras parou no Google) e B4 (com princípios disse que as opções fogem do preço). Com o 5.5 os prompts empataram. Prompt pesa menos que modelo e ferramenta, e os princípios não perdem para as regras em nenhum modelo, custando 24% menos. Com o mesmo prompt, o 6.1 Sol foi o único que acertou as três tarefas que são a dor dos áudios (B4 preferências ditas, B5 sem preço de vitrine, B9 fonte de origem). Paga com 37% mais chamadas e 1,4 min a mais. O Gemini é rápido e barato, mas inventou um preço (B9) e não criou o lembrete (B10). Uma rodada por célula: diferenças de 0,5 são ruído; a de 2 pontos do 6.1 Sol não.

## Repetições: 6.1 Sol + princípios, 3 rodadas (11/10/2026)

| Tarefa | R1 02:08 UTC (sem navegador, sem skill) | R2 16:27 UTC | R3 16:38 UTC | Média |
|---|---|---|---|---|
| B1 Almoço perto da Bodytech | 1 | 1 | 1 | 1,00 |
| B2 Flor de Lis na segunda | 0,5 | 0,5 | 0,5 | 0,50 |
| B3 Site oficial vs Google | 1 | 1 | 1 | 1,00 |
| B4 Viagem a SP | 1 | 1 | 1 | 1,00 |
| B5 Passagem | 1 (sem preço, honesto) | 0,5 (preço sem fechar o total) | 1 (R$ 4.655 fechado) | 0,83 |
| B6 Williams / MAO Trucks | 1 | 1 | 1 | 1,00 |
| B7 Pendências | 1 | 1 | 1 | 1,00 |
| B8 Envio direto | 1 | 1 | 1 (n8n barrou duplicata; leu certo) | 1,00 |
| B9 Garagem do hotel | 1 | 1 | 0,5 (trecho de busca) | 0,83 |
| B10 Lembrete | 0,5 | 0,5 | 0,5 | 0,50 |
| **Total** | **9,0** | **8,5** | **8,5** | **8,67** |
| Chamadas à API | 52 | 69 | 57 | 59 |
| Tempo total | 9,4 min | 10,5 min | 9,5 min | 9,8 min |
| Pico de tokens | 42 mil | 49,5 mil | 48,5 mil | |

**Leitura das 3 rodadas.** Não foi sorte: 9,0 / 8,5 / 8,5, e 7 das 10 tarefas deram nota 1 nas 3 rodadas. A variação está em 3 tarefas e tem causa conhecida:
- **B2 (0,5 × 3) e B10 (0,5 × 3) são estáveis e previsíveis.** B2: diz "não" verificado e não traz alternativa, apesar do princípio "levante antes de perguntar". B10: o 0,5 vem das duplicatas que só existem por causa das rodadas de teste; em uso real não haveria lembrete igual. Mas o hábito de apagar ou pausar sem contar é real e repetiu 3 vezes.
- **B5 e B9 oscilam com a fonte.** B5 com navegador e skill: 0,5 ou 1 conforme o modelo fecha ou não o total da combinação (2 de 3 fecharam). B9: 1 quando abre o site do hotel, 0,5 quando a extração falha e ele aceita o trecho da busca (1 de 3).
- **Custo estável:** 52 a 69 chamadas, 9,4 a 10,5 min por rodada de 10 tarefas, custo zero no plano. B6 é o pico (48–50 mil tokens) porque lê 6 páginas de conversa quando a skill pede até 3: candidato a ajuste barato.
- **Comparação justa com as outras células:** só a R1 roda no mesmo ambiente das outras 4 (sem navegador). Mesmo assim o 6.1 Sol + princípios é a única célula acima de 8,0, e com 3 rodadas a média 8,67 fica acima do melhor das demais (8,0, 1 rodada).

## Haiku 5.5 (Anthropic direto) × GPT-6.1 Sol (Nous), 14/10/2026

Mesmos 36 pedidos (B1–B10, A1–A9, E1–E9, D1–D8), mesmo prompt e ferramentas. Detalhe em `haiku-5.5-leitura-1/RESULTADO.md`.

| | GPT-6.1 Sol | Haiku 5.5 |
|---|---|---|
| Nota (36) | 33 na rodada, 34 após correções de ferramenta | 34 |
| Tempo por teste | 54 s | 38 s |
| Custo da bateria | 0 (plano do ChatGPT pela Nous) | US$ 0,12 |
| Melhor em | triagem profunda de e-mail (E1, E9) | alternativas e honestidade (B2, B9), velocidade, menos chamadas |

Decisão pendente do Felipe: manter o GPT-6.1 Sol como padrão e usar o Haiku 5.5 como reserva no lugar do Gemini 3.8 Flash, ou trocar o padrão.

### Rodada 2 do Haiku (15/10/2026): prompt v3 + esforço medium

34 de 36, igual à rodada 1 (v2, low). Ganhou A8 e B10, perdeu B6 e E3. Ponto fraco estável: triagem de e-mail rasa (E1, E9 nas duas rodadas e em `high`). Detalhe em `haiku-5.5-prompt3-medium/RESULTADO.md`; esforço alto isolado em `haiku-5.5-esforco-alto/`.

### Haiku 5.5 com a triagem em código (15/10/2026)

Bloco de e-mail E1–E9 + E11–E13: 12 de 12 (E1 e E9 saíram de 0,5 para 1 com 1 chamada). Detalhe em `haiku-5.5-email-triagem/RESULTADO.md`. A profundidade passou do modelo para a ferramenta (`email_triagem`, prévia na busca, fim do corte de 1.800 caracteres).
