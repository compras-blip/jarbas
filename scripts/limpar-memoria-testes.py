#!/usr/bin/env python3
"""Remove da memória do Bruno (Hindsight) os documentos gravados automaticamente por SESSÕES DE TESTE
(ids de sessão do Hermes, formato AAAAMMDD_HHMMSS_xxxx), deixando a curadoria (ids curadoria-*) intacta.
Uso: sudo python3 /opt/atlas/scripts/limpar-memoria-testes.py --listar            (só mostra)
     sudo python3 /opt/atlas/scripts/limpar-memoria-testes.py --apagar [--desde 2026-10-10T00:00]
Motivo (11/10/2026): o teste da fase 3, da fase 6 e a bateria do Bruno gravaram 62 documentos como se fossem fatos do Bruno
("Bruno solicitou passagem 16–18/10", "Atlas enviou teste"), e eles já apareciam nas respostas.
"""
import json, re, subprocess, sys
base = "http://hindsight:8888/v1/default/banks/atlas-1890418170"
def api(method, path):
    r = subprocess.run(["docker", "exec", "-i", "atlas-hermes", "curl", "-s", "-m", "60", "-X", method, base + path], capture_output=True)
    try: return json.loads(r.stdout.decode(errors="replace"))
    except Exception: return {"_raw": r.stdout.decode(errors="replace")[:200]}
desde = "2026-10-09T00:00"
if "--desde" in sys.argv: desde = sys.argv[sys.argv.index("--desde") + 1]
docs = api("GET", "/documents?limit=500")
items = docs.get("items") or docs.get("documents") or docs.get("data") or []
alvo = [d for d in items if re.match(r"^\d{8}_\d{6}_", str(d.get("id", ""))) and str(d.get("created_at", ""))[:16] >= desde]
print(f"documentos no banco: {len(items)} | de sessões de teste desde {desde}: {len(alvo)} | fatos ligados: {sum(int(d.get('memory_unit_count') or 0) for d in alvo)}")
for d in alvo[:8]: print("  ", d["id"], "|", str(d.get("created_at"))[:16], "| fatos", d.get("memory_unit_count"))
if len(alvo) > 8: print("   ...")
if "--apagar" in sys.argv:
    ok = 0
    for d in alvo:
        r = api("DELETE", f"/documents/{d['id']}")
        ok += 1 if isinstance(r, dict) and r.get("success") else 0
    print(f"apagados: {ok}/{len(alvo)}")
    docs = api("GET", "/documents?limit=500"); items = docs.get("items") or docs.get("documents") or docs.get("data") or []
    print("documentos no banco agora:", len(items), "| curadoria:", sum(1 for d in items if str(d.get('id','')).startswith('curadoria-')))
