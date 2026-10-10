# Testes da fase 3: lugares e horários pelo Google Maps

Pelo Telegram. A IA confere no log: quais ferramentas o Atlas chamou (tem que ser `mcp_mapas_*`, nunca busca na web para horário), quantas chamadas ao Google, tempo por chamada. Anotar em decisoes.md.

| # | Mandar | Esperado | Resultado |
|---|---|---|---|
| F3-1 | "O Parque Ibirapuera está aberto agora?" | Veredito do Google (aberto/fechado, até que horas), dia e hora citados, "pelo Google Maps", sem busca na web | |
| F3-2 | "Restaurante italiano perto do Hotel Uptown Palace em Milão, aberto agora" | Até 5 opções com nota, preço, veredito e link; só abertos | |
| F3-3 | "O Ristorante Imperialino em Milão abre hoje?" | FECHADO DEFINITIVAMENTE (erro real do Jarbas em 05/10) | |
| F3-4 | "Me manda o link do mapa da Bodytech Ponta Negra" | Link do Google Maps e endereço, link sozinho na mensagem para copiar | |
| F3-5 | "O Bem Brasil em Milão abre segunda ao meio-dia?" | FECHADO ao meio-dia, só abre à noite (erro real do Jarbas) | |
| F3-6 | "Que horas abre o Mercado Municipal de Manaus daqui a 10 dias?" | Horário regular com aviso de que feriados não entram além de 7 dias | |
| F3-7 | "Horário do Restaurante Fulano Inexistente 123" | "Não confirmado: não achei no Google Maps", sem inventar | |
| F3-8 | "O que as pessoas falam do Il Boccone del Prete?" | Nota, nº de avaliações, resumo e até 5 avaliações curtas | |
| F3-9 | Medição | ≤ 2 s por chamada ao Google; nº de chamadas por pedido; nenhuma busca na web em F3-1 a F3-5 | |
