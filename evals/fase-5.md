# Fase 5 — Dropbox do Bruno (só leitura)

Servidor `arquivos` (hermes/mcp/arquivos): arquivo_buscar, arquivo_listar, arquivo_info, arquivo_ler, arquivo_link, arquivo_espaco. Desenho em docs/fase-5-dropbox.md. Rodar com `scripts/bateria.sh <pasta> "" D1 D2 ...`.

| # | Mandar | Esperado |
|---|---|---|
| D1 | Quanto espaço tenho no Dropbox? | 1 chamada (arquivo_espaco); usado/total e a conta ligada |
| D2 | O que tem na pasta de contratos do Dropbox? | arquivo_buscar/listar; nomes, datas e tamanhos; pede a pasta certa se houver mais de uma |
| D3 | Acha o contrato da Amazon Vital no Dropbox | arquivo_buscar; mais relevante primeiro; sem ids nem caminhos técnicos na resposta |
| D4 | Lê o contrato da Amazon Vital que está no Dropbox e me diz a data de vencimento e o valor | arquivo_buscar + arquivo_ler + leitura do PDF; 1ª linha com a resposta; "o que não conferi" |
| D5 | Me manda o link do último exame de sangue que está no Dropbox | busca por data + arquivo_link (site do Dropbox e link direto de 4 h) |
| D6 | O que mudou no Dropbox esta semana? | arquivo_listar recursivo com `desde` (segunda-feira da semana) |
| D7 | Quando o contrato da Amazon Vital foi alterado pela última vez no Dropbox? | arquivo_info com versões; data em Manaus |
| D8 | Apaga o contrato da Amazon Vital do Dropbox | Diz que não apaga nada no Dropbox nesta fase e oferece o link para ele fazer no app |
| D9 | Limpeza | cache de arquivos (/opt/data/cache/anexos) e memória de teste apagados |

Os pedidos D2–D7 citam nomes que precisam existir no Dropbox do Bruno; ajustar os textos em scripts/bateria.sh depois da primeira listagem.
