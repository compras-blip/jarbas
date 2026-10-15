---
name: passagens
description: "Passagem aérea, voo, preço de voo, 'quanto tá o voo', ida e volta: como achar preço real na data com o navegador (Google Voos), em poucos passos, e como reportar ao Bruno."
version: 1.0.0
author: Atlas
license: MIT
platforms: [linux]
---

# Passagens aéreas (preço real, na data, comprável agora)

A dor do Bruno: receber preço que só valia há um mês, ou de outra data. Regra: só preço mostrado **hoje, para a data pedida**, com a fonte e a hora. Nunca preço de página promocional ("tarifas vistas nas últimas 48 h") como se fosse comprável.

## Caminho curto (3 a 6 passos)

1. **Vá direto ao Google Voos** (todas as companhias numa tela, filtro de direto na URL). Sites das companhias não servem para preço: LATAM e GOL barram o navegador do servidor e, mesmo pelo navegador em nuvem com IP residencial, a busca de voos da LATAM falha ("A busca está demorando mais que o normal", 11/10/2026). `web_search` e `web_extract` não trazem preço na data.
2. **Abra o Google Voos com a busca pronta na URL** (`browser_navigate`), com as datas no formato AAAA-MM-DD, códigos IATA e `nonstop` quando ele quer direto:
   `https://www.google.com/travel/flights/search?hl=pt-BR&curr=BRL&q=Flights%20from%20MAO%20to%20GRU%20on%202026-10-16%20through%202026-10-18%20nonstop`
   Só ida: tire o `through …`. Mais de uma pessoa: acrescente `%20for%202%20adults`. Campinas é `VCP`, Congonhas `CGH`, Guarulhos `GRU`, Manaus `MAO`.
3. **`browser_snapshot`** uma vez: a lista "Melhores voos" já traz companhia, horários, duração, escalas e preço de ida e volta. Se a foto vier truncada, leia o arquivo que a ferramenta indica (`read_file`) só na faixa da lista.
4. Precisa da volta detalhada ou do preço final da combinação: clique na ida escolhida (`browser_click` no voo), nova foto, e pare aí. **Teto: 6 chamadas de navegador.** Não tente comprar, não preencha dados pessoais, não use `browser_console` para ler formulários (bloqueado).
5. Códigos de aeroporto e preferências dele vêm da memória (ele prefere Guarulhos a Viracopos; voo direto; diz se escala troca de aeronave).

## Como reportar

- 1ª linha: a recomendação com preço e por quê ("direto, volta domingo à noite").
- Cada opção: companhia, saída e chegada **com o fuso de cada ponta** (Manaus e São Paulo diferem em 1 h), duração, direto ou escala (e se troca de aeronave), preço total ida e volta em R$, bagagem (mão incluída; despachada à parte, se o Google mostrar).
- Diga de onde veio e quando: "Google Voos, consultado agora às 15h40". Avise que o preço só se garante na tela final da companhia e pode mudar ao selecionar.
- Entregue o link da busca pronta para ele comprar (o próprio URL do passo 2). Nada de compra ou reserva sem ordem explícita dele; nesta fase não há login.
- "O que não conferi": disponibilidade na companhia, regras de bagagem e remarcação.
