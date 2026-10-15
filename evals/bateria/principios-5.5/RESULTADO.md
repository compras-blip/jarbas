# Etapa 2 — AGENTS.md por princípios, GPT-5.5, pela CLI (11/10/2026 01:52–02:00 UTC)

Mesma bateria, mesmo modelo, prompt do Telegram 20,2 KB (era 26,6 KB). Respostas em `B*.txt`, tempos em `tempos.tsv`. Entre parênteses, a linha de base (12 regras).

| # | Nota | Tempo | API | Tokens máx. | O que mudou |
|---|---|---|---|---|---|
| B1 | **1** (0,5) | 47 s | 3 | 17,4 mil | 3 buscas até achar carne **em Ponta Negra** (Pobre Juan no shopping, aBrazô); os longe vieram marcados ("mais longe", "Adrianópolis e muito caro"). Horário de amanhã 12h30 conferido em 5. |
| B2 | 0,5 (0,5) | 30 s | 2 | 13,8 mil | Igual: "fechado na segunda", verificado, sem alternativa. |
| B3 | 0,5 (1) | 36 s | 4 | 20,1 mil | Abriu o site oficial e respondeu por ele (seg a sáb 10h30–23h; "não lista domingo"). Não conferiu o Google para comparar, como da outra vez. |
| B4 | 0,5 (0,5) | 58 s | 4 | 20,0 mil | Melhor: diz "muito caro" nas duas opções e pergunta só o que falta (pessoas, hora). Pior: buscou os links do mapa e não os pôs na resposta; sexta italiano sem dizer que foge de carne/frutos do mar. |
| B5 | **0** (0,5) | 68 s | 5 | 43,0 mil | Regrediu: recomendou Azul "a partir de R$ 2.344 + R$ 2.655, total estimado R$ 4.999" tirado de página promocional ("tarifas vistas nas últimas 48 h"), com ressalva no fim. É exatamente a cilada da passagem dos áudios. Ainda tentou script no terminal (bloqueado). |
| B6 | 1 (1) | 74 s | 9 | 44,0 mil | Mais fundo (23 chamadas de WhatsApp, 12 mensagens inteiras): decisão na 1ª linha, motorista, deduções, "não é nada severo". Mais caro: 9 chamadas à API. |
| B7 | 1 (1) | 34 s | 2 | 20,3 mil | Igual. |
| B8 | 1 (1) | 35 s | 4 | 16,4 mil | Igual, 1 chamada a menos. |
| B9 | 0,5 (0,5) | 36 s | 3 | 20,4 mil | 4 buscas, sem abrir o site do hotel; não repetiu "o site confirma". |
| B10 | 1 (1) | 41 s | 2 | 14,2 mil | Igual, 1 chamada a menos. |

**Total: 7,0 de 10** (linha de base: 7,5). 38 chamadas à API (34), 7,7 min (8,0), prompt de entrada 13,5 mil tokens (15,1 mil).

**Leitura:** uma rodada de cada é pouco para decidir: B3 e B5 variam entre rodadas mesmo com o mesmo prompt. O sinal claro a favor dos princípios é B1 (proximidade e desvios ditos) e B4 (desvio de preço dito); o sinal claro contra é B5 (tomou preço de vitrine como recomendação). Pela regra combinada (nota não cai e B1, B4, B5 melhoram), **não passa ainda**. Proposta: repetir só as 5 tarefas que oscilaram (B1, B3, B4, B5, B9) mais 2 vezes em cada prompt antes de decidir.
