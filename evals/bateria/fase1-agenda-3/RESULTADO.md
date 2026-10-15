# Fase 1 — bateria da agenda com o servidor `agenda` (13/10/2026 17:48–17:55 UTC, GPT-6.1 Sol, princípios)

Nove pedidos, um por sessão, pela CLI (mesmo agente, prompt, memória e ferramentas do Telegram). Conta do Bruno (Gmail). Eventos de teste apagados no fim; memória de teste limpa.

| # | Pedido | Nota | Tempo | API | O que aconteceu |
|---|---|---|---|---|---|
| A1 | "O que tenho na agenda amanhã?" | 1 | 40 s | 3 | Data em Manaus, 1 `agenda_listar`, "sem compromissos quarta 14/10". (Com a skill: 78 s e 9 chamadas na 1ª tentativa, 45 s e 4 depois do ajuste.) |
| A2 | "Marca amanhã às 10h, 1 hora, revisão… com o Williams, online" | 0,5 | 44 s | 3 | Não criou e pediu o sim (princípio 7), conferiu que o horário está livre, prometeu Meet e alertas. **Não pediu o e-mail do Williams**: sem ele, o "sim" criaria o evento sem convidá-lo. |
| A3 | "Marca treino sexta às 7h, 1 hora, na Bodytech Ponta Negra" | 1 | 57 s | 4 | Endereço completo pelo mapas (`link_mapa`), `agenda_criar` com fuso e alertas 60/30, conferiu com `agenda_listar`. Evento criado certo (visto na API). |
| A4 | "Marca dentista sexta às 7h30, 1 hora" | 1 | 47 s | 3 | Viu o treino das 7h–8h na lista e perguntou antes de criar ("mantém os dois ou muda o treino?"). Não chegou a chamar `agenda_criar` (o CONFLITO da ferramenta nem foi preciso). 2 chamadas a mais procurando "dentista" no WhatsApp e no histórico. |
| A5 | "Muda o treino de sexta para 8h" | 1 | 46 s | 5 | `agenda_listar` → `agenda_mudar` (só `inicio`; a ferramenta manteve a duração) → conferiu. "8h–9h". |
| A6 | "Estou livre sexta de manhã?" | 1 | 37 s | 3 | `agenda_livre` 8h–12h: "livre das 9h às 12h; 8h–9h tem treino". |
| A7 | "Quando é o treino?" | 1 | 40 s | 3 | `agenda_listar` com `texto` na semana: "sexta 16/10, 8h–9h, Bodytech". |
| A8 | "Cancela o treino de sexta" | 1 | 38 s | 3 | Pediu confirmação (princípio 7: apagar), "só desta sexta?". Não cancelou sozinho. |
| A9 | "Toda segunda às 7h, treino de corrida, 1 hora" | 1 | 47 s | 4 | `agenda_criar` com `FREQ=WEEKLY;BYDAY=MO`, alertas 60/30; conferiu as ocorrências de 19 e 26/10. |

**Total: 8,5 de 9.** 31 chamadas à API, 6,6 min, custo 0. Tokens de entrada: 17,6 mil a 23,5 mil (prompt 20,6 KB + 5 ferramentas da agenda). Chamadas ao Google: 14.

**Leitura:** com ferramenta própria, agenda custa 3 a 5 chamadas e 37 a 57 s por pedido, sem erro de terminal e sem a skill de 16 KB. Alertas, fuso, conflito e confirmação saíram como regra de código ou princípio, sem regra nova no prompt. O único 0,5 é de dado faltante (e-mail do convidado): candidato a vir da memória (contatos do Bruno) ou do Gmail na fase 2, não de prompt.

**Limpeza:** apagados "Treino" (16/10) e a série "Treino de corrida" (segundas). Memória: 1 documento de teste apagado, banco em 29.
