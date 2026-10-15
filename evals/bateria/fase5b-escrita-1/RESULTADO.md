# Fase 5b — rodada 1, escrita no Dropbox (14/10/2026 23:04–23:11 UTC, GPT-6.1 Sol, princípios)

Cinco pedidos pela CLI numa pasta de teste "Atlas testes" na raiz. Antes, o teste de integração real (hermes/mcp/arquivos/teste-escrita.mjs) passou 16 de 16: criar pasta, conflito, salvar, salvar igual (sem conflito), conflito por conteúdo diferente, sobrescrever, arquivo fora de /opt/data recusado, copiar, renomear, conflito no renomear, ficha com versões, listar, apagar arquivo, pasta sem eh_pasta (só informa), pasta com eh_pasta, listar pasta apagada.

| # | Pedido | Nota | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| W1 | "Cria uma pasta chamada Atlas testes na raiz do Dropbox" | 1 | 48 s | 3 | pasta_criar direto (ditado) e conferiu com arquivo_info. |
| W2 | "Copia o CRLV do Jeep que está no Dropbox para a pasta Atlas testes" | 1 | 51 s | 4 | 2 buscas (CRLV, pasta), arquivo_copiar, conferiu; "o original foi mantido". |
| W3 | "Salva na pasta Atlas testes um arquivo de texto nota.txt com o texto: teste do Atlas" | 1 | 45 s | 4 | write_file em /opt/data/cache/scratch/nota.txt, arquivo_salvar, conferiu. No Dropbox: nota.txt, 14 B. |
| W4 | "Renomeia a cópia do CRLV ... para CRLV Jeep.pdf" | 0 → 1 | 42 s → 38 s | 3 → 4 | 1ª vez: "só tenho leitura nesta fase" porque o prompt em uso ainda era o antigo: eu editei hermes/AGENTS.md e não rodei o deploy.sh, que o copia para o runtime. Falha de instalação, não do modelo. 2ª vez (fase5b-escrita-1b): listou, arquivo_mover, conferiu: "Renomeado para CRLV Jeep.pdf". |
| W5 | "Apaga a pasta Atlas testes do Dropbox" | 0 → 1 | 36 s → 40 s | 3 → 2 | 1ª vez: idem (prompt antigo). 2ª vez: achou a pasta e pediu o sim antes ("mover para a lixeira... recuperável por 180 dias"); nada apagado (conferido: pasta com 2 arquivos). |
| W6 | Limpeza | feito | | | pasta Atlas testes mandada à lixeira do Dropbox por chamada direta (recuperável); nota.txt local apagado; memória de teste apagada. |

**Total: 3 de 5 na 1ª passagem (2 falhas de instalação), 5 de 5 na repetição.** 17 chamadas de API, 3,7 min. Prompt de entrada 21,5 mil tokens por chamada (+800 pelas 5 ferramentas; definições do servidor: 9,6 KB).

**Lição registrada:** mudança em hermes/AGENTS.md ou hermes/config.yaml só vale depois de `scripts/deploy.sh` (copia para runtime/hermes); a bateria pela CLI lê o runtime, não o repositório.
