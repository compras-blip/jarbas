# Haiku 5.5, rodada 2: prompt v3 + esforço medium (15/10/2026 00:14–00:37 UTC)

Mesmos 36 pedidos da rodada 1 (`haiku-5.5-leitura-1`, prompt v2, esforço low). Mudanças: AGENTS.md v3 (8,5 KB) escrito a partir da documentação oficial baixada em docs-anthropic-haiku-5.5/ (textos recomendados: "vá até o fim, pare só para perguntar ou antes de passo arriscado", "as regras valem a conversa inteira", "seu treinamento parou antes de hoje", autoconferência de 3 itens; mais "quinta que vem = a mais próxima", "compromisso só dele cancela direto", "triagem de e-mail olha a caixa toda e abre os candidatos"); descrição de `onde` em email_buscar com a dica de "tudo"; `--reasoning medium` (padrão documentado; o config do Hermes está em low). Antes, 3 testes fracos (E1, E9, B10) repetidos em `high` com o prompt v2: nenhuma mudança.

| Bloco | Rodada 1 (v2, low) | Rodada 2 (v3, medium) | O que mudou |
|---|---|---|---|
| B princípios (10) | 9,5 | 9,5 | B10 subiu (leu "quinta que vem" como 15/10 e criou direto). B6 caiu: leu 2 conversas e pulou o grupo MAO TRUCKS, onde estão as decisões (0,5). |
| A agenda (9) | 8,5 | **9** | A8: cancelou o treino direto (regra nova). A2 igual (contato sem e-mail no índice). |
| E e-mail (9) | 8 | 7,5 | E1 0,5 nas duas: agora buscou em "tudo" e leu 2 e-mails, mas disse "vi só os 9 mais recentes" e não chegou ao consulado. E9 0,5 nas duas: viu o e-mail do Registro.br ("domínio cadastrado") e não abriu, apesar do assunto "Instruções de pagamento". E3 caiu: leu o e-mail da Dra. Thaís no lugar da Dra. Pâmella (avisou a dúvida) e chamou uma ferramenta inexistente (`mcp__contatos__noop`, recusada pelo Hermes, recuperou). |
| D Dropbox (8) | 8 | 8 | iguais; D4 trouxe até o telefone da corretora, da memória. |
| **Total (36)** | **34** | **34** | ganhou 2 (A8, B10), perdeu 2 (B6, E3) |

Tempo: 1.363 s (38 s por teste), igual à rodada 1. Chamadas: 104. Custo estimado da rodada: US$ 0,13.

**Conclusão:** o prompt v3 e o esforço `medium` não mexeram no total; a variação entre rodadas (B6, E3) é do mesmo tamanho do efeito do prompt. O ponto fraco do Haiku é estável: profundidade na triagem de e-mail (E1 e E9 nas duas rodadas, e também em `high`); ele lê 1 ou 2 e-mails onde o GPT leu 8 a 10. A causa de fundo dos dois erros é operacional: esses e-mails estão fora da caixa de entrada porque a importação do Gmail (30 dias) arquiva o que vem do iCloud. Ganhos do v3 que valem para qualquer modelo: data relativa, cancelar compromisso só dele, regras que valem a conversa inteira. O v3 fica.

**Efeitos colaterais limpos:** reminder 15/10 9h e reunião 15/10 10h cancelados; treino cancelado pelo próprio A8; cache e 38 documentos de teste apagados (banco com 29). B8 mandou "chego às 15h" ao Felipe de novo.
