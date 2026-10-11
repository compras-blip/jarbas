# Navegador em nuvem (plugin `atlas-nuvem`) — B5 pedindo a LATAM (11/10/2026 05:33 UTC, GPT-6.1 Sol, princípios)

Pergunta B5L: "Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora. Quero o preço direto no site da LATAM, não no Google."

| Medida | Valor |
|---|---|
| Nota | 0,5 (nenhum preço inventado, link certo para o Bruno; sem preço) |
| Tempo | 174 s |
| Chamadas à API | 22 |
| Chamadas de navegador | 20 (1 navegação, 9 cliques, 7 fotos, 2 digitações) |
| Tokens de entrada (máx.) | 47,5 mil |
| Sessão em nuvem | criada em 1 s pelo gateway da Nous, nome `an_7fcc6b57cd3b` (15 caracteres), sem erro de socket |

**O que aconteceu:** a home da LATAM abriu (3.076 caracteres de página). A página de resultados da busca (`/oferta-voos?origin=MAO&destination=GRU...`) não trouxe voos; o modelo tentou de novo preenchendo o formulário do site (Manaus → Guarulhos, datas) e falhou de novo. Resposta honesta: "não consegui confirmar um preço comprável agora", sem Google (como pedido), com a URL da busca pronta para o celular.

**Confirmação por fora do modelo (05:40 UTC), mesma URL de busca:**

| Proxy | IP de saída | Resultado |
|---|---|---|
| EUA (padrão do Hermes no modo Nous) | 174.105.85.82 | 13 s → página de erro da LATAM: "A busca está demorando mais que o normal. Tivemos um problema com os resultados." (código F.1a9eb911) |
| Brasil (`proxyCountryCode=br`, aceito pelo gateway) | 179.198.233.148 | 44 s → mesma página de erro (código F.6154a427) |

**Leitura:** o IP residencial passa a porta da Akamai (home abre), mas a busca de voos da LATAM tem uma segunda barreira que derruba o navegador automatizado, com IP dos EUA ou do Brasil. Para passagem, o caminho continua sendo o Google Voos (preço real em 83 s, prova anterior). O plugin fica instalado e habilitado, mas não selecionado: `browser.cloud_provider` volta para `local`. Para usar a nuvem, trocar para `atlas-nuvem` e reiniciar.
