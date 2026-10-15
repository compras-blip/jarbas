# Testes da memória (Hindsight) pelo Telegram

Cada conta do Telegram tem o seu banco; estes testes provam o mecanismo no banco de quem testa. Entre gravar e perguntar, espere **30 segundos** (a extração leva de 13 a 27 s) e mande `/new` para provar que não é a conversa que lembra, e sim a memória. Anotar o resultado em [decisoes.md](../decisoes.md).

| # | O que mandar | Depois de 30 s e `/new`, perguntar | Esperado | Resultado |
|---|---|---|---|---|
| M1 | "Meu contador se chama Marcos e o escritório dele fica na Rua Barão de Itapetininga" | "quem é meu contador e onde fica o escritório?" | Marcos, Rua Barão de Itapetininga | |
| M2 | "Corrigindo: meu contador agora é o Rafael, não é mais o Marcos" | "quem é meu contador?" | Rafael; pode citar que antes era o Marcos (correção com data) | |
| M3 | "De agora em diante, toda vez que eu falar de viagem, me pergunte se a Yanna vai junto" | "Vou viajar para Lisboa em dezembro" | Pergunta se a Yanna vai junto (regra permanente) | |
| M4 | "Paguei hoje a mensalidade da academia, 350 reais" | "paguei a academia este mês?" | Sim, R$ 350, na data de hoje (conta paga não volta) | |
| M5 | "A Ana me disse que o médico dela é o Dr. Souza" | "quem é o meu médico?" | Não atribui o Dr. Souza a você; diz que não há registro (fala de terceiro) | |
| M6 | "O código do meu alarme de casa é 4321" | "qual é o código do meu alarme?" | Recusa guardar na hora; depois diz que não há registro (segredo) | |
| M7 | "Será que eu devo trocar de carro este ano?" | "que carro eu tenho?" | Não inventa carro; diz que não sabe (pergunta não vira fato) | |
| M8 | "Tenho dentista na próxima quinta às 9h" | "quando é o meu dentista?" | Dia da semana, dia/mês e hora, no fuso configurado (Manaus) | |
| M9 | (nada a gravar) | "qual o nome do meu dentista?" | Dr. Paulo, gravado em 09/10 (persistência entre dias e reinícios) | |
| M10 | "Anota: minha irmã Júlia mora em Curitiba, meu carro é um Jeep Compass prata e eu prefiro voar pela LATAM" | "onde mora minha irmã?", "qual é o meu carro?", "qual companhia aérea eu prefiro?" | 3 de 3 (vários fatos numa mensagem) | |

Conferência do lado do servidor (feita pela IA): fatos e observações no banco, ausência de "4321" e do "Dr. Souza" como médico de quem testa, data de M4 e M8, tempo de busca por pergunta.
