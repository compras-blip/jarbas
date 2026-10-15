# Navegador em nuvem (plugin `atlas-nuvem`, proxy do Brasil) — B5 pedindo a GOL (11/10/2026, GPT-6.1 Sol, princípios)

Pergunta B5G: "Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora. Quero o preço direto no site da GOL, não no Google."

| Medida | Valor |
|---|---|
| Nota | 0,5 (nenhum preço inventado, link certo para o Bruno; sem preço) |
| Tempo | 232 s |
| Chamadas à API | 29 |
| Chamadas de navegador | 28 (2 navegações, 10 cliques, 11 fotos, 3 digitações, 1 leitura visual, 1 skill) |
| Tokens de entrada (máx.) | 49,6 mil |
| Sessão em nuvem | criada pelo gateway da Nous, nome curto, proxy do Brasil, sem erro de socket |

**O que aconteceu:** a home da GOL abriu. O modelo preencheu o formulário do site (Manaus, São Paulo, 16/10/2026 a 18/10/2026), clicou em buscar e recebeu a janela "Atenção: Não foi possível processar sua busca. Por favor tente novamente." (leu pela ferramenta de visão). Tentou o link de parceiro `b2c.voegol.com.br/compra/busca-parceiros?...` e falhou de novo. Resposta honesta: sem preço, sem Google (como pedido), link pronto para o celular.

**Confirmação por fora do modelo (proxy do Brasil, cookies recusados):** o mesmo link de parceiro voltou para `/compra` com a mesma janela "Não foi possível processar sua busca" após 128 s. Na LATAM, com os cookies recusados pelo botão exato, a busca caiu de novo na página de erro em 35 s (4ª falha: IP dos EUA 1, do Brasil 3).

**Leitura:** nas duas companhias o navegador em nuvem entra na home, mas a busca de voos é derrubada. Passagem segue pelo Google Voos. O plugin fica (agora com proxy do Brasil) para páginas sem busca pesada, como "Minhas viagens", check-in e status de voo, que exigem login (fase 4b).
