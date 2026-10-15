#!/usr/bin/env bash
# Relatório semanal do Atlas (engenharia de contexto e uso de ferramentas).
# Lê o banco de sessões do Hermes (só leitura) e a memória Hindsight, monta um texto curto
# em português e manda para o Telegram do Felipe. Roda pelo cron toda segunda, 8h (horário do servidor).
# Uso: relatorio-semanal.sh           (manda no Telegram)
#      relatorio-semanal.sh --print   (só imprime, não manda)
#      relatorio-semanal.sh --dias 30 (janela em dias; padrão 7)
set -euo pipefail
cd "$(dirname "$0")/.."
DIAS=7; MODO=""
while [ $# -gt 0 ]; do case "$1" in --print) MODO=print;; --dias) DIAS="$2"; shift;; esac; shift; done
token=$(sed -nE 's/^TELEGRAM_BOT_TOKEN=//p' .env.hermes | tr -d '\r')
dest=$(sed -nE 's/^TELEGRAM_ALLOWED_USERS=//p' .env.hermes | tr -d '\r' | cut -d, -f1)
PRINCIPAL=$(awk '/^model:/{f=1;next} f&&/^  default:/{print $2;exit}' hermes/config.yaml)

texto=$(sudo -n python3 - "$DIAS" "$PRINCIPAL" <<'PY'
import sqlite3, sys, time, json
dias = int(sys.argv[1]); principal = sys.argv[2]
desde = time.time() - dias * 86400
c = sqlite3.connect("file:runtime/hermes/state.db?mode=ro", uri=True)
L = []
# conversas e mensagens
sess = c.execute("select count(distinct session_id) from messages where timestamp > ? and session_id not like 'cron_%'", (desde,)).fetchone()[0]
msgs = c.execute("select count(*) from messages where role='user' and timestamp > ? and session_id not like 'cron_%'", (desde,)).fetchone()[0]
L.append(f"Conversas novas: {sess} | mensagens do usuario: {msgs}")
# tokens por chamada (por modelo)
for model, calls, inp, cache, out in c.execute(
    "select model, sum(api_call_count), sum(input_tokens), sum(cache_read_tokens), sum(output_tokens) "
    "from session_model_usage where task='' and last_seen > ? group by model", (desde,)):
    calls = calls or 0; inp = inp or 0; cache = cache or 0
    por = round((inp + cache) / calls) if calls else 0
    pct = round(100 * cache / (inp + cache)) if (inp + cache) else 0
    tag = "principal" if model == principal else "RESERVA"
    L.append(f"Modelo {model} ({tag}): {calls} chamadas, ~{por} tokens por chamada, {pct}% em cache, {out or 0} de saida")
# ferramentas por pedido e skills abertas
tools = {}
skill_views = 0
for (tc,) in c.execute("select tool_calls from messages where tool_calls is not null and timestamp > ?", (desde,)):
    try:
        for t in json.loads(tc):
            n = t.get("function", {}).get("name") or "?"
            tools[n] = tools.get(n, 0) + 1
            if n == "skill_view": skill_views += 1
    except Exception:
        pass
total_tools = sum(tools.values())
L.append(f"Chamadas de ferramenta: {total_tools} ({round(total_tools / msgs, 1) if msgs else 0} por mensagem) | skills abertas: {skill_views}")
if tools:
    top = sorted(tools.items(), key=lambda x: -x[1])[:6]
    L.append("Mais usadas: " + ", ".join(f"{n} {v}" for n, v in top))
# compactacoes
comp = c.execute("select count(*) from messages where timestamp > ? and (content like '[CONTEXT COMPACTION%' or content like '[CONTEXT SUMMARY]%')", (desde,)).fetchone()[0]
L.append(f"Compactacoes de contexto: {comp}")
# prompt do sistema mais recente
p = c.execute("select length(prompt) from system_prompts order by rowid desc limit 1").fetchone()
L.append(f"Prompt do sistema atual: {p[0] if p else '?'} caracteres")
print("\n".join(L))
PY
)
# bancos de memoria via container do hermes (a porta 8888 so existe na rede interna)
mem=$(sudo -n docker exec atlas-hermes sh -c 'curl -s -m 10 http://hindsight:8888/v1/default/banks' 2>/dev/null \
  | python3 -c 'import sys,json; bs=json.load(sys.stdin).get("banks",[]); print("Memoria Hindsight: " + "; ".join("%s %s fatos" % (b["bank_id"], b.get("fact_count",0)) for b in bs))' 2>/dev/null || echo "Memoria Hindsight: indisponivel")
estado=$(sudo -n docker ps --format '{{.Names}} {{.Status}}' | grep atlas | sed 's/^atlas-//' | tr '\n' ';')
msg="Atlas, relatorio dos ultimos ${DIAS} dias ($(date -u +%d/%m/%Y) UTC)
${texto}
${mem}
Containers: ${estado}"
if [ "$MODO" = "print" ]; then echo "$msg"; exit 0; fi
curl -s -m 20 -o /dev/null -w "telegram HTTP %{http_code}\n" "https://api.telegram.org/bot${token}/sendMessage" \
  --data-urlencode "chat_id=${dest}" --data-urlencode "text=${msg}"
echo "$(date -u +%FT%TZ) relatorio enviado"
