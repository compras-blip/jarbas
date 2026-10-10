#!/usr/bin/env python3
"""Grava no Hindsight (banco do Bruno) as entradas curadas pelo Felipe.
Lê o JSON em /opt/atlas/curadoria/<arquivo>, manda cada entrada para a API do Hindsight
(pela rede interna do Docker, via o container atlas-hermes), com identificador estável
(document_id) para que rodar de novo substitua em vez de duplicar. Só grava; não apaga nada.
Uso: sudo python3 /opt/atlas/scripts/gravar-curadoria.py /opt/atlas/curadoria/atlas-bruno-entradas-2026-10-10.json [--sync]
"""
import json, subprocess, sys, time

arq = sys.argv[1]
sync = "--sync" in sys.argv
d = json.load(open(arq, encoding="utf-8"))
bank = d["bank_id"]
base = f"http://hindsight:8888/v1/default/banks/{bank}"

def api(method, path, body=None, timeout=120):
    cmd = ["docker", "exec", "-i", "atlas-hermes", "curl", "-s", "-m", str(timeout), "-X", method,
           base + path, "-H", "Content-Type: application/json"]
    if body is not None:
        cmd += ["-d", "@-"]
    r = subprocess.run(cmd, input=json.dumps(body).encode() if body is not None else None, capture_output=True)
    txt = r.stdout.decode(errors="replace")
    try:
        return json.loads(txt)
    except Exception:
        return {"_raw": txt[:300], "_rc": r.returncode}

ok = 0; fails = []
t0 = time.time()
for e in d["entries"]:
    item = {
        "content": e["texto"],
        "context": d["context"] + f" Data do registro original: {e['data']}.",
        "timestamp": f"{e['data']}T12:00:00-04:00",
        "document_id": f"curadoria-2026-10-10-{e['id']}",
        "update_mode": "replace",
        "tags": d.get("tags", []),
        "metadata": {"source": "zep-jarbas", "curado_por": "Felipe", "curado_em": "2026-10-10", "id": e["id"]},
    }
    r = api("POST", "/memories", {"items": [item], "async": not sync}, timeout=240)
    if r.get("success") or r.get("operation_id"):
        ok += 1
        print(f"  {e['id']} ok" + (f" (op {str(r.get('operation_id'))[:8]})" if r.get("operation_id") else ""))
    else:
        fails.append((e["id"], r))
        print(f"  {e['id']} FALHOU: {str(r)[:200]}")
print(f"enviadas: {ok}/{len(d['entries'])} em {round(time.time()-t0)} s; falhas: {len(fails)}")

# esperar o processamento em segundo plano
if not sync:
    for i in range(90):
        ops = api("GET", "/operations?limit=200")
        items = ops.get("items") if isinstance(ops, dict) else None
        if items is None and isinstance(ops, dict):
            items = ops.get("operations") or ops.get("data") or []
        pend = [o for o in (items or []) if str(o.get("status", "")).lower() in ("pending", "running", "processing", "queued")]
        if i % 6 == 0 or not pend:
            print(f"  operacoes pendentes: {len(pend)} ({round(time.time()-t0)} s)")
        if not pend:
            break
        time.sleep(10)

banks = api("GET", "")  # GET /banks/{bank}
print("banco:", {k: banks.get(k) for k in ("bank_id", "fact_count", "last_write_at")} if isinstance(banks, dict) else banks)
for q in ["qual o fuso horário do Bruno", "sócios da MAO Trucks", "alarmes padrão da agenda", "prioridades do Bruno", "e-mail da Yanna"]:
    r = api("POST", "/memories/recall", {"query": q, "budget": "mid", "types": ["observation", "world", "experience"]})
    res = r.get("results", []) if isinstance(r, dict) else []
    top = res[0]["text"][:140] if res else "(nada)"
    print(f"  recall '{q}': {len(res)} resultados | 1º: {top}")
