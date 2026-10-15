#!/usr/bin/env node
// soniox-tts.mjs — provedor de voz do Atlas pela Soniox (tts-rt-v2), chamado pelo Hermes como provedor por comando
// (config: tts.providers.soniox, type: command). Uso:
//   node soniox-tts.mjs --in <texto.txt> --out <saida.ogg> [--voice Adrian] [--speed 1.0] [--lang pt]
// Lê SONIOX_API_KEY do ambiente (env_passthrough no config). Antes de sintetizar, conserta em português o que o
// limpador de fala do Hermes (feito para inglês) deixa estranho: "R$ 59,90" vira "R59,90 dollars" lá; aqui vira
// "59,90 reais". Horas "12h30" viram "12 e 30"; datas "19/10" viram "19 de outubro"; links saem. Texto acima de
// 4.800 caracteres é sintetizado em partes e emendado com o ffmpeg. Nada de segredo em log.
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

export const TTS_URL = 'https://tts-rt.soniox.com/tts';
const MAX = 4800;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function normalizarPt(t) {
  let s = String(t || '');
  s = s.replace(/https?:\/\/\S+/g, ' ');
  s = s.replace(/\bR(\d[\d.]*(?:,\d{1,2})?)\s*dollars\b/g, '$1 reais');       // estrago do Hermes: "R59,90 dollars"
  s = s.replace(/\bR\$\s?(\d[\d.]*(?:,\d{1,2})?)/g, '$1 reais');
  s = s.replace(/\bUS\$\s?(\d[\d.]*(?:,\d{1,2})?)/g, '$1 dólares');
  s = s.replace(/\b(\d[\d.]*(?:,\d{1,2})?)\s*US dollars\b/g, '$1 dólares');
  s = s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (m, d, mo, y) => (+mo >= 1 && +mo <= 12 ? `${+d} de ${MESES[+mo - 1]} de ${y}` : m));
  s = s.replace(/\b(\d{1,2})\/(\d{1,2})\b(?!\/)/g, (m, d, mo) => (+mo >= 1 && +mo <= 12 && +d >= 1 && +d <= 31 ? `${+d} de ${MESES[+mo - 1]}` : m));
  s = s.replace(/\b(\d{1,2})h(\d{2})\b/g, (m, h, mi) => (mi === '00' ? `${+h} horas` : `${+h} e ${+mi}`));
  s = s.replace(/\b(\d{1,2})h\b/g, (m, h) => (+h === 1 ? '1 hora' : `${+h} horas`));
  s = s.replace(/\s*[•▪◦●]\s*/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
  return s;
}

// Divide em partes de até MAX caracteres, cortando em fim de frase.
export function partes(s, max = MAX) {
  const out = []; let resto = s;
  while (resto.length > max) {
    let corte = resto.lastIndexOf('. ', max); if (corte < max * 0.5) corte = resto.lastIndexOf(' ', max); if (corte <= 0) corte = max;
    out.push(resto.slice(0, corte + 1).trim()); resto = resto.slice(corte + 1).trim();
  }
  if (resto) out.push(resto);
  return out;
}

async function sintetizar(texto, { voice, speed, lang, key }) {
  const r = await fetch(TTS_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'User-Agent': 'atlas-voz/1.0' },
    body: JSON.stringify({ model: 'tts-rt-v2', language: lang, voice, audio_format: 'opus', sample_rate: 48000, bitrate: 64000, speed, text: texto }), signal: AbortSignal.timeout(80000) });
  if (!r.ok) { const corpo = (await r.text().catch(() => '')).slice(0, 160); throw new Error(`SONIOX_HTTP_${r.status}${corpo ? `: ${corpo}` : ''}`); }
  return Buffer.from(await r.arrayBuffer());
}

async function principal() {
  const a = {}; const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i++; }
  const key = process.env.SONIOX_API_KEY || '';
  if (!key) throw new Error('SONIOX_API_KEY ausente no ambiente');
  if (!a.in || !a.out) throw new Error('uso: --in texto.txt --out saida.ogg');
  const voice = a.voice || 'Adrian', speed = Math.min(1.3, Math.max(0.7, Number(a.speed) || 1)), lang = a.lang || 'pt';
  const texto = normalizarPt(await readFile(a.in, 'utf8'));
  if (!texto) throw new Error('texto vazio');
  const ps = partes(texto);
  const bufs = []; for (const p of ps) bufs.push(await sintetizar(p, { voice, speed, lang, key }));
  if (bufs.length === 1) { await writeFile(a.out, bufs[0]); }
  else {
    const tmp = []; for (let i = 0; i < bufs.length; i++) { const f = `${a.out}.parte${i}.ogg`; await writeFile(f, bufs[i]); tmp.push(f); }
    const lista = `${a.out}.lista.txt`; await writeFile(lista, tmp.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    await promisify(execFile)('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', a.out]);
    for (const f of [...tmp, lista]) await unlink(f).catch(() => {});
  }
  console.error(`[voz] soniox ok: ${ps.length} parte(s), ${texto.length} chars, voz ${voice}, ${path.basename(a.out)}`);
}

if (process.argv[1] && path.basename(process.argv[1]) === 'soniox-tts.mjs') principal().catch((e) => { console.error(`[voz] falhou: ${e.message}`); process.exit(1); });
