# Fase 4a — bateria, tarefas que dependiam do navegador (11/10/2026 04:31–04:35 UTC, GPT-6.1 Sol, princípios)

| # | Nota | Antes (sem navegador) | Tempo | API | Tokens máx. | O que aconteceu |
|---|---|---|---|---|---|---|
| B3 | 1 | 1 / 0,5 | 44 s | 5 | 24,6 mil | Não precisou do navegador: extração do site oficial (seg a sáb 10h30–23h) e Google (fechado domingo), os dois citados. Seguiu a regra "navegador só quando a extração não basta". |
| B5 | **1** | 0 / 0,5 (nunca teve preço) | 139 s | **30** | 45,6 mil | LATAM e GOL bloquearam a consulta; foi ao Google Voos pelo navegador (5 navegações, 7 fotos de página, 6 cliques), filtrou só diretos nas datas e trouxe **preços reais do dia**: R$ 4.688 ida e volta (16/10 11h30 → 18/10 18h50) e LATAM a partir de R$ 3.965 com volta às 7h50; avisou que o preço mudou ao selecionar e que só a tela final da companhia garante; link pronto para comprar. Caro: 30 chamadas, 97 s de modelo. Uma chamada de `browser_console` foi bloqueada pelo `restrict_evaluate` (extração de valor de formulário), como desenhado. |
| B9 | 1 | 1 / 0,5 | 48 s | 4 | 21,5 mil | Sem navegador: site do hotel confirma o estacionamento, preço de R$ 90 vem da Expedia e Hoteis.com e foi marcado como não confirmado com o hotel; alerta sobre o Skye. |

**Leitura:** o navegador entregou o que faltava na passagem (preço real na data, comprável), ao custo de 30 chamadas à API numa tarefa. As duas outras foram resolvidas sem navegador, o que é o comportamento certo. Próximo ganho barato: um manual curto (skill) de passagens com a URL do Google Voos já montada com datas e filtro de direto, para pular os cliques.
