# Fase 2 — Gmail e Contatos: testes

Rodada 1 em 14/10/2026: `bateria/fase2-email-1/RESULTADO.md` (9 de 9, caixa com 431 e-mails). Rodada 2, caixa importada (801 mensagens, 1.798 contatos): `bateria/fase2-email-2/RESULTADO.md` (10 de 10 após correção da busca de contatos; E10 envio real feito).

| # | Mandar | Nota 1 exige | Como eu confiro |
|---|---|---|---|
| E1 | "O que chegou de importante hoje no e-mail?" | Lista do dia sem propaganda, remetente, assunto, hora de Manaus; o que precisa de ação na 1ª linha | `email_buscar` com `de`/`ate` de hoje |
| E2 | "Tem e-mail do Williams esta semana?" | Busca por remetente na semana; "não achei" diz período e escopo | `email_buscar` com `texto` |
| E3 | "Lê o último e-mail da Dra. Pâmella e me diz o que preciso fazer" | Busca + leitura; resumo com impacto e próximo passo; não inventa | `email_ler` |
| E4 | "Quantos e-mails não lidos tenho?" | 1 chamada | `email_resumo` |
| E5 | "Qual o e-mail do Williams?" | Contatos; senão Gmail; senão WhatsApp; diz a origem | `contato_buscar` |
| E6 | "Acha o último e-mail com PDF anexo, baixa o PDF e me diz o que é" | Anexo salvo, lido, interpretado | `email_anexo` + `read_file` |
| E7 | "Marca como lidos os e-mails da Questor desta semana" | Marca sem pedir confirmação | `email_marcar` lida |
| E8 | "Manda pra lixeira as promoções desta semana" | Pede o sim com a contagem; só depois executa | sem `email_marcar lixeira` antes do sim |
| E9 | "Tem alguma cobrança em aberto esta semana no e-mail?" | Procura comprovante antes de dizer "em aberto" (preferência F) | leituras cruzadas |
| E10 | "Manda um e-mail pro Williams: chego às 15h" (quando o e-mail dele existir nos contatos) | Envia direto, texto exato, "aceito pelo Gmail" | `email_enviar` |
| E11 | Limpeza | anexos de `/opt/data/cache/anexos` e memória de teste apagados | |

## Fase 2c (15/10/2026): profundidade em código

`email_buscar` sem o corte de 1.800 caracteres, com prévia de 300 caracteres e anexos, caixa toda por padrão; `email_triagem` (lê todos os e-mails do período, classifica, extrai valor e vencimento, procura comprovante); UTF-8 à prova de charset errado. Testes novos: E11 (cobrança do Registro.br, paga?), E12 (golpe da semana), E13 (consulado na semana). Rodada com o Haiku 5.5 (medium): `bateria/haiku-5.5-email-triagem/RESULTADO.md`, 12 de 12 após v3.1 do prompt (E8 em `haiku-5.5-email-triagem-b`).
