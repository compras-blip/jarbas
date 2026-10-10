#!/usr/bin/env bash
# Vigia da reserva do Atlas. Roda pelo cron a cada 10 min (como orbe-admin).
# Avisa no Telegram do Felipe quando: (1) um container do Atlas não está rodando;
# (2) o Atlas usou o modelo de RESERVA (fallback_model) em vez do principal, sinal de que
#     o ChatGPT pela Nous falhou (cota, conexão expirada, OpenAI fora).
# Não guarda segredo: lê o token do bot e o ID do .env.hermes na hora de rodar.
# Uso: vigia-reserva.sh            (normal, pelo cron)
#      vigia-reserva.sh --teste    (só manda "vigia instalado")
#      vigia-reserva.sh --simular  (trata o principal como reserva, para testar o caminho inteiro)
set -euo pipefail
cd "$(dirname "$0")/.."
DIR=vigia; mkdir -p "$DIR"
ESTADO="$DIR/ultimo-aviso.epoch"
MODO="${1:-}"
PRINCIPAL=$(awk '/^model:/{f=1;next} f&&/^  default:/{print $2;exit}' hermes/config.yaml)
token=$(sed -nE 's/^TELEGRAM_BOT_TOKEN=//p' .env.hermes | tr -d '\r')
dest=$(sed -nE 's/^TELEGRAM_ALLOWED_USERS=//p' .env.hermes | tr -d '\r' | cut -d, -f1)
avisar() {
  curl -s -m 20 -o /dev/null -w "telegram HTTP %{http_code}\n" \
    "https://api.telegram.org/bot${token}/sendMessage" \
    --data-urlencode "chat_id=${dest}" --data-urlencode "text=$1"
}
if [ "$MODO" = "--teste" ]; then
  avisar "Atlas: vigia da reserva instalado e funcionando ($(date -u +%H:%M) UTC). Principal: ${PRINCIPAL}."
  exit 0
fi
# 0) aquecimento da memoria: uma busca pequena a cada rodada mantem os modelos do Hindsight na RAM
#    (10/10: depois de 5 h parado, a 1a busca levou 20 s so para carregar o modelo de embeddings).
sudo -n docker exec atlas-hermes sh -c 'curl -s -m 60 -o /dev/null -X POST http://hindsight:8888/v1/default/banks/atlas-1890418170/memories/recall -H "Content-Type: application/json" -d "{\"query\":\"aquecimento\",\"budget\":\"low\"}"' >/dev/null 2>&1 || true
# 1) containers no ar?
for c in atlas-hermes atlas-hindsight; do
  st=$(sudo -n docker inspect "$c" --format '{{.State.Status}}' 2>/dev/null || echo ausente)
  if [ "$st" != running ]; then
    avisar "Atlas: o container ${c} está '${st}'. Olhe o servidor (sudo docker compose -f /opt/atlas/docker-compose.yml ps)."
    echo "$(date -u +%FT%TZ) container ${c}: ${st}"
  fi
done
# 2) uso da reserva desde o último aviso
desde=$(cat "$ESTADO" 2>/dev/null || echo 0)
res=$(sudo -n python3 - "$desde" "$PRINCIPAL" "$MODO" <<'PY'
import sqlite3, sys
desde = float(sys.argv[1]); principal = sys.argv[2]; modo = sys.argv[3]
c = sqlite3.connect("file:runtime/hermes/state.db?mode=ro", uri=True)
cond = "model = ?" if modo == "--simular" else "model != ?"
r = c.execute(
    f"select max(last_seen), group_concat(distinct model), sum(api_call_count) "
    f"from session_model_usage where {cond} and last_seen > ? and task = ''",
    (principal, desde)).fetchone()
if r and r[2]:
    print(f"{float(r[0])!r}|{r[1]}|{r[2]}")  # hora exata, com decimais: arredondar fazia o mesmo aviso repetir a cada 10 min (10/10)
PY
)
if [ -n "$res" ]; then
  ultimo=${res%%|*}; resto=${res#*|}; modelo=${resto%%|*}; chamadas=${resto#*|}
  pref=""; [ "$MODO" = "--simular" ] && pref="[SIMULAÇÃO] "
  avisar "${pref}Atlas: caiu para a RESERVA (${modelo}): ${chamadas} chamadas desde o último aviso. O ChatGPT pela Nous falhou. Reconecte em portal.nousresearch.com → Account settings → Linked accounts → Reconnect ChatGPT."
  [ "$MODO" = "--simular" ] || echo "$ultimo" > "$ESTADO"
  echo "$(date -u +%FT%TZ) aviso: ${modelo} ${chamadas} chamadas"
else
  echo "$(date -u +%FT%TZ) ok (sem uso da reserva)"
fi
