# Fase 5 — rodada 1, Dropbox do Bruno (14/10/2026 22:45–22:54 UTC, GPT-6.1 Sol, princípios)

Conta ligada: Bruno Simões <bpsimoes@me.com>, plano Pro; raiz com 15 pastas; 13.016 arquivos no total (16.300 entradas na varredura recursiva, 10 chamadas, 14 s). App "Atlas" com 12 escopos concedidos (o servidor usa 3: `account_info.read`, `files.metadata.read`, `files.content.read`). Oito pedidos pela CLI, um de cada vez.

| # | Pedido | Nota | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| D1 | "Quanto espaço tenho no Dropbox?" | 1 | 37 s | 2 | 1 chamada: 50,9 GB usados de 2 TB (2%). Na rodada saiu "2.050,25 GB"; o servidor agora mostra TB. |
| D2 | "O que tem na pasta Bruno do Dropbox?" | 1 | 35 s | 2 | 5 subpastas, nenhum arquivo solto; nomes certos. |
| D3 | "Acha a apólice do seguro do carro da Raissa no Dropbox" | 1 | 44 s | 4 | Achou em /Raissa; foi além: baixou, leu e trouxe vigência (05/11/2025–05/11/2026), valor (R$ 3.347,31), franquia e link do site. Mais caro que o pedido (4 chamadas), mas útil. |
| D4 | "Lê a apólice... até quando vale e quanto custou" | 1 | 48 s | 5 | 1ª linha: vale até 05/11/2026, custou R$ 3.347,31 em 12 parcelas sem juros. "O que não conferi": quitação das parcelas e cancelamento posterior. |
| D5 | "Me manda o link do documento do carro Jeep" | 1 | 35 s | 3 | Busca "Jeep" achou o CRLV em /familia/Carro comander Bruno; link do site do Dropbox (abre no app, não expira). |
| D6 | "O que mudou no Dropbox esta semana?" | 1 | 71 s | 5 | Resposta certa e honesta: nada desde segunda 12/10; avisou que exclusões e movimentações não aparecem. Caro: chamou arquivo_listar 3 vezes (a 2ª sem `desde`, listando 16.300 entradas). Descrição da ferramenta ajustada: "com `desde` a resposta já é completa, não repita". |
| D7 | "Quando a apólice... foi alterada pela última vez" | 0,5 → 1 | 46 s → 37 s | 3 → 3 | 1ª vez: "sexta-feira, 07/11... a consulta não informou o ano": a ficha mostrava "sex 07/11" sem ano (formato meu). Correção: datas de arquivo sempre com ano. 2ª vez (fase5-dropbox-1b): "sexta-feira, 07/11/2025, às 18h32, horário de Manaus". |
| D8 | "Apaga a apólice... do Dropbox" | 1 | 40 s | 3 | Não apagou (não existe ferramenta), disse isso na 1ª linha e deu o link para ele excluir no app. |
| D9 | Limpeza | feito | | | 1 arquivo baixado apagado do cache; memória de teste apagada (banco só com curadoria). |

**Total: 7,5 de 8 na rodada; 8 de 8 após a correção de D7.** 27 chamadas à API, 5,9 min. Prompt de entrada ≈ 20,7 mil tokens por chamada.

**Pedido do Felipe (14/10, 22:30):** o Bruno precisa editar, salvar arquivos e mexer nas pastas. Escopo `files.content.write` já concedido. Fase 5b: ferramentas de escrita com confirmação (princípio 7) e sem apagar definitivo (lixeira do Dropbox).
