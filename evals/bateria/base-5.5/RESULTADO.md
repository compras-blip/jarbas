# Linha de base — prompt de 11/10 (12 regras), GPT-5.5, pela CLI do Hermes (11/10/2026 01:39–01:47 UTC)

Mesmo agente, prompt, memória e 16 ferramentas do Telegram; sessão nova por tarefa; respostas completas em `B*.txt`, tempos em `tempos.tsv`.

| # | Nota | Tempo | API | Tokens máx. | Ferramentas | O que decidiu a nota |
|---|---|---|---|---|---|---|
| B1 | 0,5 | 45 s | 3 | 17,2 mil | mapas ×5 | Horário de amanhã 12h30 conferido em 4 churrascarias, com nota, preço e link. Mas nenhuma é perto da Bodytech (Dom Pedro, Alvorada, Adrianópolis, Flores) e ele não disse isso. |
| B2 | 0,5 | 30 s | 2 | 15,4 mil | mapas ×1 | "Não: fecha o dia todo na segunda", certo e verificado. Não propôs alternativa aberta na segunda. |
| B3 | 1 | 46 s | 4 | 21,5 mil | mapas ×1, web ×3 | Abriu o site oficial, comparou com o Google, disse o que cada fonte diz (site: seg a sáb 10h30–23h; Google: domingo fechado). |
| B4 | 0,5 | 89 s | 4 | 30,5 mil | memória ×2, mapas ×6, web ×4 | Usou a memória (psicodrama, preferências, módulos pendentes), conferiu horário de 6 lugares nas datas certas, propôs em vez de só perguntar. Mas sem preço nem link nas opções, Terraço Itália é "muito caro" e italiano, e nada disso foi dito. |
| B5 | 0,5 | 65 s | 3 | 55,0 mil | web ×9 | Honesto: "não consegui confirmar preço final comprável". Mas citou faixa de preço de agregador sem data e sem link; 9 buscas na web encheram o contexto (55 mil tokens). Sem navegador, era o teto possível. |
| B6 | 1 | 66 s | 6 | 38,3 mil | WhatsApp ×16 | Achou o grupo e o Williams, leu a semana, abriu 8 mensagens inteiras (áudios transcritos e imagens), separou fatos de decisões. Números e horários batem com o arquivo (conferido: resumo financeiro de 09/10 e códigos de falha do caminhão às 22h33). |
| B7 | 1 | 34 s | 2 | 18,1 mil | memória ×1, sessões ×1 | Pendência mais importante (audiência LATAM, 16º JEC, Dra. Pâmella), o que falta, por que vem antes, próximo passo. Tudo da memória. |
| B8 | 1 | 40 s | 5 | 17,9 mil | WhatsApp ×3 + envio | Enviou direto o texto exato e reportou "aceito pela API; entrega não verificada". 2 chamadas a mais que o necessário. |
| B9 | 0,5 | 26 s | 2 | 16,2 mil | web ×1 | Respondeu por trecho de busca (Hoteis.com, R$ 90/dia) e afirmou que "o site do hotel confirma" sem abrir o site. Separou as fontes, mas não foi à origem. |
| B10 | 1 | 38 s | 3 | 15,8 mil | cron ×1 | Lembrete criado para quinta 15/10 às 9h de Manaus (13:00Z), conferido no `jobs.json`. |

**Total: 7,5 de 10.** 34 chamadas à API, 8 min de parede, pico de 55 mil tokens (B5). Cache da Nous entre 37% e 98%.

**O que a linha de base mostra:** o agente verifica horário (mapas) e lê o que está nas ferramentas com fidelidade (B3, B6, B7, B10). Perde ponto sempre no mesmo lugar: entrega o que achou sem conferir contra o pedido e as preferências (distância em B1, preço e cozinha em B4, alternativa em B2) e, sem ferramenta de origem, fica no agregador (B5, B9). É a dor dos áudios do Bruno, medida.
