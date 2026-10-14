#!/usr/bin/env bash
# Roda a bateria do Bruno pela CLI do Hermes (mesmo agente, prompt, memoria e ferramentas do Telegram).
# Uso: bateria.sh <pasta-de-saida> [modelo] [B1 B2 ...]
set -uo pipefail
cd /opt/atlas
OUT="evals/bateria/$1"; MODELO="${2:-}"; shift; shift || true
mkdir -p "$OUT"
declare -A T=(
 [B1]="Almoço amanhã, 12h30, carne, perto da Bodytech Ponta Negra"
 [B2]="Almoço de segunda no Flor de Lis em Ponta Negra, pode?"
 [B3]="Confirma no site oficial se o Anntipastti em Manaus abre domingo"
 [B4]="Vou pra São Paulo no fim de semana que vem pro curso. Me organiza o jantar de sexta e o de sábado, e me diz o que não posso esquecer antes de viajar."
 [B5]="Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora"
 [B5L]="Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora. Quero o preço direto no site da LATAM, não no Google."
 [B5G]="Passagem Manaus–São Paulo, ida sexta 16/10 e volta domingo 18/10, direto, pra comprar agora. Quero o preço direto no site da GOL, não no Google."
 [B6]="O que o Williams falou da MAO Trucks esta semana e o que precisa de decisão minha?"
 [B7]="Quais pendências eu deixei pra depois da Europa? Me dá a mais importante e o que falta nela"
 [B8]="Manda pro Felipe Nóbrega: chego às 15h"
 [B9]="Hotel Unique em São Paulo: tem garagem? quanto custa?"
 [B10]="Me lembra quinta que vem, 9h, de ligar pro Héliton sobre a taxa do 901"
 [A1]="O que tenho na agenda amanhã?"
 [A2]="Marca amanhã às 10h, 1 hora, revisão do orçamento da MAO Trucks com o Williams, online"
 [A3]="Marca treino sexta às 7h, 1 hora, na Bodytech Ponta Negra"
 [A4]="Marca dentista sexta às 7h30, 1 hora"
 [A5]="Muda o treino de sexta para 8h"
 [A6]="Estou livre sexta de manhã?"
 [A7]="Quando é o treino?"
 [A8]="Cancela o treino de sexta"
 [A9]="Toda segunda às 7h, treino de corrida, 1 hora"
 [E1]="O que chegou de importante hoje no e-mail?"
 [E2]="Tem e-mail do Williams esta semana?"
 [E3]="Lê o último e-mail da Dra. Pâmella e me diz o que preciso fazer"
 [E4]="Quantos e-mails não lidos tenho?"
 [E5]="Qual o e-mail do Williams?"
 [E6]="Acha o último e-mail com PDF anexo, baixa o PDF e me diz o que é"
 [E7]="Marca como lidos os e-mails da Questor desta semana"
 [E8]="Manda pra lixeira as promoções desta semana"
 [E9]="Tem alguma cobrança em aberto esta semana no e-mail?"
 [E10]="Manda um e-mail para bpsimoes@icloud.com com o assunto Teste do Atlas e o texto: chego às 15h"
)
LISTA=("$@"); [ ${#LISTA[@]} -eq 0 ] && LISTA=(B1 B2 B3 B4 B5 B6 B7 B8 B9 B10)
for k in "${LISTA[@]}"; do
  msg="${T[$k]}"; ini=$(date -u +%s); iniTs=$(date -u +%H:%M:%S)
  if [ -n "$MODELO" ]; then
    sudo -n docker exec -u 10000 -w /opt/data -e HERMES_HOME=/opt/data atlas-hermes hermes chat -q "$msg" --oneshot -Q -m "$MODELO" </dev/null > "$OUT/$k.txt" 2>&1
  else
    sudo -n docker exec -u 10000 -w /opt/data -e HERMES_HOME=/opt/data atlas-hermes hermes chat -q "$msg" --oneshot -Q </dev/null > "$OUT/$k.txt" 2>&1
  fi
  fim=$(date -u +%s)
  printf "%s\t%s\t%s\t%s s\t%s\n" "$k" "$iniTs" "$(date -u +%H:%M:%S)" "$((fim-ini))" "$msg" >> "$OUT/tempos.tsv"
  echo "$k pronto em $((fim-ini)) s"
done
