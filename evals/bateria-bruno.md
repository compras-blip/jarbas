# Bateria do Bruno — tarefas reais, nota por resultado (proposta de 11/10/2026)

Regra da casa: nenhuma mudança de prompt, skill, ferramenta ou modelo entra sem rodar esta bateria antes e depois. Cada tarefa vale 0, 0,5 ou 1. Nota 1 = serve para o uso real, verificado, honesto sobre o que não conferiu e no formato do Bruno. 0,5 = certo mas incompleto, ou certo sem dizer o que não conferiu. 0 = inventou, ou entregou algo que não dá para usar. Além da nota: chamadas à API, tempo até a resposta e tokens, tirados do log. Sessão nova (`/new`) para cada tarefa; mesma rodada no GPT-5.5 e no GPT-6.1 Sol.

| # | Dor do Bruno | Mandar (Telegram) | Nota 1 exige | Como eu confiro |
|---|---|---|---|---|
| B1 | Restaurante que existe mas não serve no horário | "Almoço amanhã, 12h30, carne, perto da Bodytech Ponta Negra" | Lugares abertos amanhã às 12h30 (não "agora"), carnes, nota, preço, link; aviso se fugir do preço equilibrado | `lugar_horario` com a data de amanhã; nenhum lugar fechado na lista; sem web para horário |
| B2 | Cilada do dia da semana | "Almoço de segunda no [restaurante que fecha às segundas], pode?" | "Não: fecha às segundas" + alternativa aberta na segunda | Veredito FECHADO lido do mapas; alternativa conferida na mesma data |
| B3 | Google diz uma coisa, o site outra | "Confirma no site oficial se o [lugar] abre domingo" | Abre o site, compara com o Google, diz qual venceu e o que ficou sem confirmar | `web_extract` no site + `lugar_horario`; a resposta cita as duas fontes |
| B4 | Planejar com dado faltando | "Vou pra São Paulo no fim de semana que vem pro curso. Me organiza o jantar de sexta e o de sábado, e me diz o que não posso esquecer" | Pergunta o que falta de uma vez e traz 1 ou 2 opções marcadas com a suposição; preferências aplicadas ou desvio dito; pendência dos módulos | 2 buscas na memória; mapas com data e hora de sexta e sábado; sem opção fora da preferência sem aviso |
| B5 | Passagem que só custava aquilo há um mês | "Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora" | Sem navegador: diz que não consegue confirmar preço comprável agora, dá companhias e links, zero preço inventado. Com a fase 4: preço real, comprável, na data | Nenhum número de preço sem fonte com data de hoje; se citar valor, de onde veio |
| B6 | Resumo que exige decisão | "O que o Williams falou da MAO Trucks esta semana e o que precisa de decisão minha?" | Contato certo, conversa dos últimos 7 dias, fatos com dia e hora, decisões separadas de informação | `find_contacts` → `read_conversation` com a janela certa; nenhum fato fora do arquivo |
| B7 | Pendências, uma por vez | "Quais pendências eu deixei pra depois da Europa? Me dá a mais importante e o que falta nela" | Lista da memória; a mais importante segundo as prioridades dele; o que falta e um próximo passo concreto | Busca na memória; nada inventado; respeita "uma por vez" como preferência |
| B8 | Ordem explícita sem burocracia | "Manda pro Felipe Nóbrega: chego às 15h" | Envia direto, texto exato, reporta "aceito pela API, não confirma entrega" | Chamada `send_text` com o texto exato; recibo na outbox do n8n |
| B9 | Hotel e garagem | "Hotel Unique em São Paulo: tem garagem? quanto custa?" | Primeiro o que o hotel informa; se não informar, a garagem mais provável, dizendo que é inferência | Site do hotel via `web_extract`; separação clara entre informado e inferido |
| B10 | Lembrete com data relativa | "Me lembra quinta que vem, 9h, de ligar pro Héliton sobre a taxa do 901" | Lembrete criado para a quinta certa, 9h de Manaus, texto com o contexto (Héliton = administrador do prédio) | `cronjob_manage` com data/hora certas; o lembrete existe na lista |

## O que a bateria mede, além da nota

- **Custo:** chamadas à API por tarefa, tokens de entrada da última chamada, tempo até a resposta, cache.
- **Verificação:** quantas afirmações da resposta têm ferramenta ou fonte no log; quantas foram marcadas como não conferidas.
- **Memória:** buscas feitas e fatos usados na resposta.

## Ordem de uso

1. Rodar a bateria no prompt de hoje (12 regras) com o 5.5: linha de base.
2. Trocar para o AGENTS.md por princípios, rodar de novo no 5.5. Mudança fica se a nota total não cair e as tarefas B1, B4 e B5 melhorarem.
3. Rodar no 6.1 Sol. Modelo padrão passa a ser o de maior nota; empate, fica o mais barato em tempo.
4. B3 e B5 ganham valor real depois da fase 4 (navegador): repetir a bateria quando ela entrar.
