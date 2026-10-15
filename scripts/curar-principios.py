#!/usr/bin/env python3
"""Consolida regras por contexto da memória do Bruno em preferências gerais (curadoria aprovada pelo Felipe em 11/10/2026).
Apaga os documentos listados em "apagar" (DELETE /documents/{id}) e grava as entradas novas com document_id estável.
Uso: sudo python3 /opt/atlas/scripts/curar-principios.py /opt/atlas/curadoria/atlas-bruno-principios-2026-10-11.json
"""
import json, subprocess, sys, time
d = json.load(open(sys.argv[1], encoding="utf-8"))
bank = d["bank_id"]; base = f"http://hindsight:8888/v1/default/banks/{bank}"
def api(method, path, body=None, timeout=120):
    cmd = ["docker", "exec", "-i", "atlas-hermes", "curl", "-s", "-m", str(timeout), "-X", method, base + path, "-H", "Content-Type: application/json"]
    if body is not None: cmd += ["-d", "@-"]
    r = subprocess.run(cmd, input=json.dumps(body).encode() if body is not None else None, capture_output=True)
    txt = r.stdout.decode(errors="replace")
    try: return json.loads(txt)
    except Exception: return {"_raw": txt[:300], "_rc": r.returncode}
def conta():
    b = api("GET", ""); docs = api("GET", "/documents?limit=500")
    n = len(docs.get("items") or docs.get("documents") or docs.get("data") or []) if isinstance(docs, dict) else "?"
    return (b.get("fact_count") if isinstance(b, dict) else "?"), n
print("antes: fatos, documentos =", conta())
for cid in d["apagar"]:
    r = api("DELETE", f"/documents/curadoria-2026-10-10-{cid}")
    print(f"  apagar {cid}: {str(r)[:90]}")
t0 = time.time()
for e in d["entries"]:
    item = {"content": e["texto"], "context": d["context"], "timestamp": f"{e['data']}T12:00:00-04:00",
            "document_id": f"curadoria-2026-10-11-{e['id']}", "update_mode": "replace", "tags": d.get("tags", []),
            "metadata": {"source": "curadoria-principios", "curado_por": "Felipe", "curado_em": "2026-10-11", "id": e["id"]}}
    r = api("POST", "/memories", {"items": [item], "async": True}, timeout=240)
    print(f"  gravar {e['id']} ({len(e['texto'])} chars): " + ("ok" if (r.get("success") or r.get("operation_id")) else f"FALHOU {str(r)[:160]}"))
for i in range(60):
    ops = api("GET", "/operations?limit=200")
    items = (ops.get("items") or ops.get("operations") or ops.get("data") or []) if isinstance(ops, dict) else []
    pend = [o for o in items if str(o.get("status", "")).lower() in ("pending", "running", "processing", "queued")]
    if not pend: break
    if i % 6 == 0: print(f"  operacoes pendentes: {len(pend)} ({round(time.time()-t0)} s)")
    time.sleep(10)
print("depois: fatos, documentos =", conta(), f"({round(time.time()-t0)} s)")
for q in ["voo com escala troca de aeronave", "mandar mensagem na íntegra pelo WhatsApp", "alertas padrão da agenda", "garagem do hotel"]:
    r = api("POST", "/memories/recall", {"query": q, "budget": "mid", "types": ["observation", "world", "experience"]})
    res = r.get("results", []) if isinstance(r, dict) else []
    print(f"  recall '{q}': {len(res)} | 1º: {res[0]['text'][:110] if res else '(nada)'}")
