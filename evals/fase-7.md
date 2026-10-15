# Fase 7 — Voz: testes pelo Telegram (Felipe)

| # | Mandar | Esperado |
|---|---|---|
| V1 | Áudio: "Atlas, o que tenho na agenda amanhã?" | Transcreve certo (nomes), responde com bolha de voz e, logo depois, o texto; a voz lê datas e horas de forma natural |
| V2 | Texto: "Quanto espaço tenho no Dropbox?" | Também vem com áudio + texto (o áudio vale para toda resposta, não só quando ele manda áudio) |
| V3 | Áudio citando nomes: "Marca almoço com o Williams Jezini na Anntipastti sexta às 12h30" | Nomes transcritos certos (vocabulário); resposta com áudio |
| V4 | Texto: "Me manda o link do CRLV do Jeep" | Na fala: "o link está aqui embaixo"; o link aparece no texto, não é lido letra por letra |
| V5 | `/voice off`, pergunta qualquer, `/voice tts` | Sem áudio no meio; volta a ter áudio depois |
| V6 | Áudio de 2 minutos | Transcreve inteiro (corte de silêncio automático acima de 12 s) |

Registrar: tempo até o áudio chegar, erros de transcrição (palavra por palavra), e se a voz escolhida agrada ao Bruno.
