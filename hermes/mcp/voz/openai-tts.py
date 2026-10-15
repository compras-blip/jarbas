#!/usr/bin/env python3
"""openai-tts.py — provedor de voz do Atlas: OpenAI gpt-4o-mini-tts pelo gateway de áudio da Nous (cobrado nos créditos
da Nous, sem chave da OpenAI), com a voz e o estilo que o Felipe escolheu ouvindo (15/10/2026: cedar, "animado").
Chamado pelo Hermes como provedor por comando (tts.providers.atlas, type: command):
    /opt/hermes/.venv/bin/python openai-tts.py --in texto.txt --out saida.ogg [--voice cedar] [--estilo animado] [--speed 1.0]
Precisa de HERMES_HOME (env_passthrough) para achar as credenciais da Nous. Antes de sintetizar, conserta em português o
que o limpador de fala do Hermes deixa estranho (R$ 59,90 -> "59,90 reais", 12h30 -> "12 e 30", 19/10 -> "19 de outubro");
texto acima de 4.000 caracteres sai em partes emendadas com o ffmpeg. Nada de segredo em log."""
import argparse, json, os, re, subprocess, sys, tempfile, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
MAX = 4000      # teto por pedido da OpenAI (4.096)
ALVO = 550      # tamanho de cada parte: a OpenAI pela Nous leva ~14 s por 1.500 caracteres; 3 partes em paralelo caem para ~6 s (medido 15/10)
ESTILOS = {
    "animado": "Fale em português do Brasil com energia e simpatia, como alguém contando uma boa notícia a um amigo, entonação viva, ritmo rápido mas claro.",
    "brasileiro": "Você é um brasileiro de Manaus falando com um amigo próximo. Sotaque brasileiro autêntico, voz quente e natural, com variação de entonação como numa conversa real, pausas curtas entre as frases, sem tom de locutor nem de robô.",
    "neutro": None,
}

def normalizar_pt(t: str) -> str:
    s = re.sub(r"https?://\S+", " ", str(t or ""))
    s = re.sub(r"\bR(\d[\d.]*(?:,\d{1,2})?)\s*dollars\b", r"\1 reais", s)   # estrago do limpador do Hermes
    s = re.sub(r"\bR\$\s?(\d[\d.]*(?:,\d{1,2})?)", r"\1 reais", s)
    s = re.sub(r"\bUS\$\s?(\d[\d.]*(?:,\d{1,2})?)", r"\1 dólares", s)
    s = re.sub(r"\b(\d[\d.]*(?:,\d{1,2})?)\s*US dollars\b", r"\1 dólares", s)
    s = re.sub(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", lambda m: f"{int(m[1])} de {MESES[int(m[2]) - 1]} de {m[3]}" if 1 <= int(m[2]) <= 12 else m[0], s)
    s = re.sub(r"\b(\d{1,2})/(\d{1,2})\b(?!/)", lambda m: f"{int(m[1])} de {MESES[int(m[2]) - 1]}" if 1 <= int(m[2]) <= 12 and 1 <= int(m[1]) <= 31 else m[0], s)
    s = re.sub(r"\b(\d{1,2})h(\d{2})\b", lambda m: f"{int(m[1])} horas" if m[2] == "00" else f"{int(m[1])} e {int(m[2])}", s)
    s = re.sub(r"\b(\d{1,2})h\b", lambda m: "1 hora" if int(m[1]) == 1 else f"{int(m[1])} horas", s)
    s = re.sub(r"\s*[•▪◦●]\s*", " ", s)
    s = re.sub(r"\s+([,.;:!?])", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()

def partes(s: str, maximo: int = MAX) -> list:
    out, resto = [], s
    while len(resto) > maximo:
        corte = resto.rfind(". ", 0, maximo)
        if corte < maximo * 0.5: corte = resto.rfind(" ", 0, maximo)
        if corte <= 0: corte = maximo
        out.append(resto[:corte + 1].strip()); resto = resto[corte + 1:].strip()
    if resto: out.append(resto)
    return out

def rota_nous():
    sys.path.insert(0, "/opt/hermes")
    from tools.managed_tool_gateway import resolve_managed_tool_gateway  # noqa: E402
    g = resolve_managed_tool_gateway("openai-audio")
    if g is None: raise RuntimeError("gateway openai-audio da Nous indisponível")
    return g.nous_user_token, g.gateway_origin.rstrip("/") + "/v1/audio/speech"

def sintetizar(texto, voice, estilo, speed, token, url):
    corpo = {"model": "gpt-4o-mini-tts", "voice": voice, "input": texto, "response_format": "opus", "speed": speed}
    if ESTILOS.get(estilo): corpo["instructions"] = ESTILOS[estilo]
    req = urllib.request.Request(url, data=json.dumps(corpo).encode(), headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=80) as r: return r.read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"OPENAI_HTTP_{e.code}: {e.read().decode(errors='replace')[:160]}") from None

def principal():
    ap = argparse.ArgumentParser(); ap.add_argument("--in", dest="entrada", required=True); ap.add_argument("--out", required=True)
    ap.add_argument("--voice", default="cedar"); ap.add_argument("--estilo", default="animado"); ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()
    speed = min(4.0, max(0.25, a.speed))
    texto = normalizar_pt(open(a.entrada, encoding="utf-8").read())
    if not texto: raise RuntimeError("texto vazio")
    token, url = rota_nous()
    ps = partes(texto, ALVO) if len(texto) > ALVO * 1.3 else [texto]
    with ThreadPoolExecutor(max_workers=4) as ex: bufs = list(ex.map(lambda p: sintetizar(p, a.voice, a.estilo, speed, token, url), ps))
    if len(bufs) == 1:
        open(a.out, "wb").write(bufs[0])
    else:
        with tempfile.TemporaryDirectory() as d:
            arquivos = []
            for i, b in enumerate(bufs):
                f = os.path.join(d, f"p{i}.ogg"); open(f, "wb").write(b); arquivos.append(f)
            lista = os.path.join(d, "lista.txt"); open(lista, "w").write("\n".join(f"file '{f}'" for f in arquivos))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-c:a", "libopus", "-b:a", "64k", a.out], check=True)
    print(f"[voz] openai/nous ok: {len(ps)} parte(s), {len(texto)} chars, voz {a.voice}, estilo {a.estilo}", file=sys.stderr)

if __name__ == "__main__":
    try: principal()
    except Exception as e:
        print(f"[voz] falhou: {e}", file=sys.stderr); sys.exit(1)
