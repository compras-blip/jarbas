# Rodada 3 — AGENTS.md por princípios, GPT-6.1 Sol (11/10/2026 16:38–16:48 UTC)

Mesmas 10 tarefas. Ambiente igual ao da rodada 2 (navegador e skill `passagens` presentes). Memória limpa entre as rodadas, exceto 2 fatos de B9/B10 da rodada 2 que entraram depois da limpeza.

| # | Nota | Tempo | API | Tokens máx. | O que decidiu a nota |
|---|---|---|---|---|---|
| B1 | 1 | 80 s | 5 | 28,5 mil | Engenho, mesmo shopping, aberto segunda 12/10 às 12h30 até 22h (feriado considerado), **preço real do cardápio oficial (R$ 59,90)**; alternativa Catraca com aviso "fecha 15h, reserva só até 12h, mesa não garantida". Melhor B1 das 3 rodadas. |
| B2 | 0,5 | 37 s | 3 | 16,0 mil | "Não, não abre nesta segunda" verificado; sem alternativa. 3ª rodada seguida sem alternativa. |
| B3 | 1 | 43 s | 4 | 19,2 mil | Site oficial (seg a sáb 10h30–23h) e Google (fechado domingo), link do site. |
| B4 | 1 | 90 s | 7 | 41,7 mil | Mesma estrutura da rodada 2: pergunta na 1ª linha, Terraço Itália e Figueira Rubaiyat com horário conferido nas datas, "fogem da sua preferência por preço equilibrado", "só reservo depois da sua aprovação", módulos de 26 e 27/09, lista de embarque. Link de fotos do Rubaiyat foi o Instagram, não o mapa. |
| B5 | 1 | 59 s | 8 | 26,6 mil | Google Voos pela URL da skill: **LATAM R$ 4.655 ida e volta** (16/10 18h25→23h10, volta 18/10 18h50→21h50) e alternativa R$ 4.258 (volta 22h55, chega 2h); hora da consulta, fusos, "a etapa seguinte deu erro; valor só garantido na compra"; link. 8 chamadas, a mais barata das rodadas com preço fechado. |
| B6 | 1 | 83 s | 9 | 48,5 mil | Grupo MAO TRUCKS 05–11/10: decisão principal na 1ª linha (reserva para diesel e teto do conserto), fatos com dia e hora, comprovante de US$ 1.000 às 17h48 com previsão da Wise, item de gestão (despesas sem registro). De novo 6 páginas + 13 mensagens (skill pede até 3 páginas). |
| B7 | 1 | 48 s | 3 | 20,6 mil | Audiência da LATAM primeiro, o que falta, próximo passo, **e listou as outras pendências** (Holding Aparte, módulos). |
| B8 | 1 | 49 s | 8 | 19,0 mil | Chamou o envio com texto exato; o n8n devolveu `duplicate: true` apontando o envio da rodada 2 (mesma mensagem, mesmo contato) e não reenviou. O modelo leu certo e disse: "já havia sido enviada, não repeti; entrega não confirmada". Verificado no state.db. Tentou `uuid -v 4` antes do caminho da skill. |
| B9 | 0,5 | 35 s | 4 | 17,8 mil | Resposta certa (manobrista; R$ 90 da Hoteis.com "sem confirmação direta do hotel"), mas a frase "o site oficial confirma o manobrista" veio de trecho de busca: a extração falhou e ele não abriu o site. É exatamente a dor do "trecho de busca". |
| B10 | 0,5 | 46 s | 6 | 18,3 mil | Lembrete certo (15/10 9h Manaus). Viu o igual já existente, **pausou** o que acabou de criar e não contou. Deixou um job pausado para trás (removido por mim depois). |

**Total: 8,5 de 10.** 57 chamadas à API, 9,5 min, custo 0. Pico 48,5 mil tokens (B6).
