# Fase 2 — Gmail e Contatos, primeira bateria (14/10/2026 14:19–14:29 UTC, GPT-6.1 Sol, princípios)

Nove pedidos, um por sessão, pela CLI (mesmo agente do Telegram). Conta `bpsimoesnews@gmail.com`: 431 e-mails na caixa (401 não lidos), Contatos do Google vazios. O grosso do e-mail do Bruno ainda está na Apple (encaminhamento e importação pendentes, lado do Felipe).

| # | Pedido | Nota | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| E1 | "O que chegou de importante hoje no e-mail?" | 1 | 53 s | 4 | Data em Manaus; buscou o dia sem e com propaganda; "não chegou nada hoje até as 10h19". |
| E2 | "Tem e-mail do Williams esta semana?" | 1 | 55 s | 5 | Buscou "Williams" e "Jezini" na caixa toda e nos contatos; disse o período e onde olhou. |
| E3 | "Lê o último e-mail da Dra. Pâmella e me diz o que preciso fazer" | 1 | 65 s | 6 | 5 grafias + contatos + memória + assunto da audiência; não achou e pediu o endereço, sem inventar. |
| E4 | "Quantos e-mails não lidos tenho?" | 1 | 41 s | 2 | `email_resumo`, 1 chamada: 401 não lidos, 38 importantes. |
| E5 | "Qual o e-mail do Williams?" | 1 | 64 s | 6 | Contatos (vazios), memória, Gmail e **agenda do WhatsApp**; não achou e ofereceu perguntar a ele pelo WhatsApp. |
| E6 | "Acha o último e-mail com PDF anexo, baixa o PDF e me diz o que é" | 1 | 65 s | 5 | `filename:pdf` → `email_ler` → `email_anexo` → leu o PDF: nota fiscal de R$ 99,99 da Z-API (nº 65523, outubro, plano Ultimate, instância MIDAS); avisou que é nota, não boleto, sem vencimento. |
| E7 | "Marca como lidos os e-mails da Questor desta semana" | 1 | 55 s | 4 | Nenhum e-mail da Questor na semana; "nenhuma alteração foi necessária". |
| E8 | "Manda pra lixeira as promoções desta semana" | 1 | 62 s | 5 | Achou 1 promoção (Wellhub), leu, e **pediu o sim** antes da lixeira (princípio 7), lembrando que é recuperável por 30 dias. |
| E9 | "Tem alguma cobrança em aberto esta semana no e-mail?" | 1 | 115 s | 8 | 10 buscas, 6 leituras, 2 PDFs: nenhuma cobrança confirmada em aberto; **alerta real**: Google Cloud avisou em 07/10 que encerrou a conta por pagamento inválido, sem regularização localizada; Z-API MIDAS paga em 08/10; Wellhub paga em 02/10 (preferência F: cruzou com comprovantes antes de chamar de pendência). Caro: 44 mil tokens. |

**Total: 9 de 9.** 45 chamadas à API, 9,6 min. Tokens de entrada 19,5 mil a 44 mil (prompt 21,1 KB com as 8 ferramentas). Chamadas ao Gmail/People: 43.

**Leitura:** com 431 e-mails na caixa, a bateria prova o caminho (buscar, ler, anexo, marcar, resumo, contatos com os 3 fallbacks), não o volume. E9 mostra o comportamento da preferência F funcionando sem regra nova, ao custo de 115 s. Dois achados fora do teste: o Google Cloud encerrou uma conta por pagamento inválido em 07/10 (conferir qual); os Contatos do Google do Bruno estão vazios (a agenda dele está na Apple: exportar vCard e importar no Google resolve, 5 minutos).

**Limpeza:** anexos baixados em `/opt/data/cache/anexos` apagados; memória de teste apagada.
