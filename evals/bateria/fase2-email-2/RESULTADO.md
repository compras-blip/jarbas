# Fase 2 — rodada 2, caixa importada (14/10/2026 17:38–17:53 UTC, GPT-6.1 Sol, princípios)

Depois do encaminhamento do iCloud, da importação (801 mensagens, 20 etiquetas, 1.798 contatos) e do "enviar como". Dez pedidos pela CLI; E10 é envio real para o próprio Bruno.

| # | Pedido | Nota | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| E1 | "O que chegou de importante hoje no e-mail?" | 1 | 110 s | 8 | Leu 10 e-mails do dia. 1ª linha: Consulado dos EUA concluiu a análise administrativa do visto e pediu o passaporte (próximo passo dito). Avisos de segurança da Apple e do Google explicados pela configuração de hoje. **Golpe detectado**: "Receita Federal" para a Amazon Vital com remetente e link fora do domínio e vencimento de 2025. Caro: 10 leituras. Gravou sozinho um fato na memória (visto): fora da curadoria, pendente de decisão do Felipe. |
| E2 | "Tem e-mail do Williams esta semana?" | 1 | 47 s | 5 | Nenhum dele; notou o aviso da Wise de 13/10 (US$ 1.100 chegaram à conta dele). |
| E3 | "Lê o último e-mail da Dra. Pâmella e me diz o que preciso fazer" | 1 | 62 s | 7 | Achou o e-mail dela nos contatos (p7_barreto), buscou por remetente: só há o e-mail do Bruno para ela (04/09, caso LATAM, audiência 17/09), sem resposta dela; pediu o encaminhamento em vez de inventar. |
| E4 | "Quantos e-mails não lidos tenho?" | 1 | 35 s | 2 | 403 não lidos, 38 importantes. |
| E5 | "Qual o e-mail do Williams?" | 0,5 → 1 | 70 s → 34 s | 8 → 2 | 1ª vez: a busca indexada do Google ainda não tinha indexado os contatos importados ("Williams" vazio, "Jezini" só com telefones); o modelo foi até o WhatsApp e não concluiu. Correção: `contato_buscar` ganhou varredura da lista completa quando o índice falha. 2ª vez: "wjezini@hotmail.com", 2 chamadas. |
| E6 | "Acha o último e-mail com PDF anexo, baixa o PDF e me diz o que é" | 1 | 52 s | 5 | Nota fiscal Z-API R$ 99,99; "nota, não boleto, sem vencimento". |
| E7 | "Marca como lidos os e-mails da Questor desta semana" | 1 | 47 s | 4 | Nenhum; nada alterado. |
| E8 | "Manda pra lixeira as promoções desta semana" | 1 | 48 s | 4 | 2 promoções; pediu o sim antes. |
| E9 | "Tem alguma cobrança em aberto esta semana no e-mail?" | 1 | 104 s | 8 | Registro.br R$ 40 (assessoratlas.com.br, 13/10, pagamento ainda disponível no site, conferido por `web_extract`); honorários Caio/Aplix R$ 2.741,94 (05/10, apuração em PDF lida, sem aceite ou comprovante: "não posso afirmar atraso"); Google Cloud 07/10; golpe da Receita descartado; Wellhub e Z-API pagos descartados. |
| E10 | "Manda um e-mail para bpsimoes@icloud.com com o assunto Teste do Atlas e o texto: chego às 15h" | 1 | 40 s | 3 | `email_enviar` direto (destinatário e texto ditados), conferiu o enviado lendo-o. Na API: 1 mensagem com o assunto, rótulos SENT e INBOX (voltou pelo encaminhamento). |

**Total: 9,5 de 10 na rodada; 10 de 10 após a correção de E5.** 54 chamadas à API, 10,8 min. Prompt 21,1 KB.

**Achados fora do teste, para o Felipe:** (1) cobrança do Registro.br de R$ 40 pelo domínio assessoratlas.com.br, ainda em aberto no site em 14/10; (2) honorários Caio/Aplix R$ 2.741,94 sem comprovante localizado; (3) e-mail de golpe "Receita Federal" na caixa; (4) o modelo gravou na memória um fato sobre o visto (documento `d8f2f07f…`, 2 fatos), decisão de manter ou apagar é do Felipe.

**Limpeza:** anexos apagados; memória de teste apagada (fica só o documento do visto, pendente).
