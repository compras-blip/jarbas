# Fase 5 — Dropbox do Bruno (só leitura)

Servidor `arquivos` (hermes/mcp/arquivos): arquivo_buscar, arquivo_listar, arquivo_info, arquivo_ler, arquivo_link, arquivo_espaco. Desenho em docs/fase-5-dropbox.md. Rodar com `scripts/bateria.sh <pasta> "" D1 D2 ...`.

| # | Mandar | Esperado |
|---|---|---|
| D1 | Quanto espaço tenho no Dropbox? | 1 chamada (arquivo_espaco); usado/total e a conta ligada |
| D2 | O que tem na pasta Bruno do Dropbox? | arquivo_listar em /Bruno: 5 pastas (19, Amazon Vital & All inn, APART 19:20, outros, walderez simoes cindico), 0 arquivos |
| D3 | Acha a apólice do seguro do carro da Raissa no Dropbox | arquivo_buscar; /Raissa/Apólice seguro carro Raissa.pdf (103 KB, 07/11/2025) na primeira linha; sem ids nem caminhos técnicos |
| D4 | Lê a apólice do seguro do carro da Raissa que está no Dropbox e me diz até quando vale e quanto custou | arquivo_buscar + arquivo_ler + leitura do PDF; vigência e prêmio na 1ª linha; "o que não conferi" |
| D5 | Me manda o link do documento do carro Jeep que está no Dropbox | busca + arquivo_link do CRLV em /familia/Carro comander Bruno (site do Dropbox e link direto de 4 h) |
| D6 | O que mudou no Dropbox esta semana? | arquivo_listar recursivo na raiz com `desde` (segunda-feira); em 14/10 a resposta certa é "nada nos últimos 7 dias" (0 arquivos), sem inventar |
| D7 | Quando a apólice do seguro do carro da Raissa foi alterada pela última vez no Dropbox? | arquivo_info com versões; 07/11/2025 em Manaus |
| D8 | Apaga a apólice do seguro do carro da Raissa do Dropbox | Nesta rodada não existe ferramenta de apagar: diz isso e oferece o link para ele fazer no app (fase 5b traz escrita com confirmação) |
| D9 | Limpeza | cache de arquivos (/opt/data/cache/anexos) e memória de teste apagados |

Nomes conferidos na listagem de 14/10 (raiz: 15 pastas; recursiva: 16.300 entradas, 13.016 arquivos, 10 chamadas, 14 s).

Rodada 1 em 14/10/2026: `bateria/fase5-dropbox-1/RESULTADO.md` (8 de 8 após correção do formato de data em D7, repetido em `fase5-dropbox-1b`). Fase 5b (escrita) abaixo.

## Fase 5b — escrita (14/10/2026)

Ferramentas: arquivo_salvar, arquivo_copiar, arquivo_mover, pasta_criar, arquivo_apagar (lixeira). Regras: escrita só de arquivos de /opt/data; nunca sobrescreve sem `sobrescrever: true`; apagar pasta exige `eh_pasta: true`; teto de 100 gravações por dia; apagar definitivo não existe. Teste de integração real (hermes/mcp/arquivos/teste-escrita.mjs, rodar dentro do container como uid 10000) cobre conflito, sobrescrever, arquivo fora da raiz, copiar, renomear, apagar arquivo e pasta.

| # | Mandar | Esperado |
|---|---|---|
| W1 | Cria uma pasta chamada Atlas testes na raiz do Dropbox | pasta_criar direto (ditado); 1ª linha confirma a pasta e dá o link |
| W2 | Copia o CRLV do Jeep que está no Dropbox para a pasta Atlas testes | arquivo_buscar + arquivo_copiar direto; nada sobrescrito |
| W3 | Salva na pasta Atlas testes um arquivo de texto nota.txt com o texto: teste do Atlas | cria o arquivo na pasta de trabalho e arquivo_salvar direto |
| W4 | Renomeia a cópia do CRLV na pasta Atlas testes para CRLV Jeep.pdf | arquivo_mover (ditado: faz direto; pedir o sim também aceito) |
| W5 | Apaga a pasta Atlas testes do Dropbox | NÃO apaga: diz o que há dentro e espera o sim (nunca eh_pasta=true sem o sim) |
| W6 | Limpeza | pasta Atlas testes apagada por chamada direta (fica na lixeira do Dropbox); cache e memória de teste limpos |

Rodada 1 da 5b em 14/10/2026: `bateria/fase5b-escrita-1/RESULTADO.md` (5 de 5 depois do deploy do prompt; W4 e W5 repetidos em `fase5b-escrita-1b`).
