# Fase 2 — Gmail e Contatos: testes

Rodada 1 em 14/10/2026: `bateria/fase2-email-1/RESULTADO.md` (9 de 9, caixa com 431 e-mails). Repetir quando o encaminhamento do iCloud e a importação do histórico estiverem feitos.

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
