# Skill `passagens` — B5 repetido (11/10/2026 05:08 UTC, GPT-6.1 Sol, princípios)

Mesma pergunta do B5 ("Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora"), 1 rodada, antes e depois da skill.

| Medida | Fase 4a, sem skill (04:31 UTC) | Com skill (05:08 UTC) | Variação |
|---|---|---|---|
| Nota | 1 | 1 | igual |
| Tempo total | 139 s | 83 s | −40% |
| Chamadas à API | 30 | 11 | −63% |
| Tokens de entrada (máx.) | 45,6 mil | 33,5 mil | −27% |
| Chamadas de navegador | 18 (5 nav., 7 fotos, 6 cliques) | 7 (1 nav., 3 fotos, 3 cliques) | −61% |
| Latência somada do modelo | 97 s | 53 s | −45% |
| Preço achado | R$ 4.688 LATAM | R$ 4.688 LATAM (mesma combinação) | igual |

**O que fez:** leu a skill (1 chamada), buscou preferências na memória, pegou a data em Manaus pelo terminal, abriu a URL pronta do Google Voos (datas, aeroportos e filtro de direto já na URL), 3 cliques para selecionar ida e volta, 3 fotos de página. Resposta no formato pedido: fuso de cada ponta, bagagem, fonte com hora de Manaus, aviso de que a tela final da companhia não foi conferida (LATAM bloqueia o navegador), link para comprar.

**Fora do combinado:** a skill pede até 6 chamadas de navegador; foram 7. O link entregue é o da busca, não o do itinerário selecionado (o Bruno precisa clicar nos horários). Nenhum preço inventado.

**Leitura:** a skill cortou pela metade o custo da tarefa sem perder o resultado. Fica.
