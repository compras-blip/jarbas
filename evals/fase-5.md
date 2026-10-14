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

Rodada 1 em 14/10/2026: `bateria/fase5-dropbox-1/RESULTADO.md` (8 de 8 após correção do formato de data em D7, repetido em `fase5-dropbox-1b`). Fase 5b (escrita) pendente de desenho.
