#!/usr/bin/env node
// Levantamento da memória do Jarbas (Zep) para curadoria antes de levar ao Atlas.
// SÓ LEITURA: usa o leitor do próprio plugin do OpenClaw (scanProfile) e escreve dois arquivos em
// /opt/atlas/curadoria/: zep-bruno-<data>.md (para o Felipe ler e marcar) e zep-bruno-<data>.json.
// A chave do Zep é lida de /etc/orbe/octopus.env (por isso roda com sudo) e nunca é impressa.
// Uso: sudo node /opt/atlas/scripts/levantar-zep.mjs
import fs from 'node:fs';
import path from 'node:path';

const PLUGIN = '/opt/openclaw-plugins/orbe-zep-memory-2.6.0-c62f1539d411/zep.js';
const ENV = '/etc/orbe/octopus.env';
const OUT_DIR = '/opt/atlas/curadoria';
const KIND = { ORBE_PREFERENCE: 'Preferência / regra', ORBE_DECISION: 'Decisão', ORBE_PERSON: 'Pessoa', ORBE_FACT: 'Fato' };
const ORDER = ['ORBE_PERSON', 'ORBE_PREFERENCE', 'ORBE_DECISION', 'ORBE_FACT'];

function readKey() {
  const txt = fs.readFileSync(ENV, 'utf8');
  const m = /^ORBE_ZEP_API_KEY=(.+)$/m.exec(txt);
  if (!m) throw new Error('ORBE_ZEP_API_KEY não encontrada em ' + ENV);
  return m[1].trim().replace(/^["']|["']$/g, '');
}

const { ZepMemory } = await import(PLUGIN);
const zep = new ZepMemory({ apiKey: readKey(), userId: 'bruno', threadId: 'jarvis-main', baseUrl: 'https://api.getzep.com/api/v2' },
  { logger: { info() {}, warn() {} } });

const t0 = Date.now();
const { items, pages, capped } = await zep.scanProfile();
const joined = ZepMemory.joinParts(items);
const byKind = new Map();
for (const r of joined) { const k = r.name; (byKind.get(k) ?? byKind.set(k, []).get(k)).push(r); }

const date = new Date().toISOString().slice(0, 10);
fs.mkdirSync(OUT_DIR, { recursive: true, mode: 0o750 });
const md = [];
md.push(`# Memória do Jarbas no Zep (usuário bruno) — levantamento de ${date}`);
md.push('');
md.push(`Registros atuais (confirmados pelo Bruno, gravados pelo Jarbas): **${joined.length}** (${items.length} partes, ${pages} páginas lidas${capped ? ', LEITURA CORTADA no limite de páginas' : ''}). Só leitura; nada foi alterado no Zep.`);
md.push('');
md.push('Como marcar: na frente de cada item escreva **L** (levar ao Atlas), **N** (não levar) ou **C** (levar corrigido, com o texto certo ao lado). Itens marcados "zep diz vencido" são os que o próprio Zep considera substituídos, mas o Jarbas ainda usa.');
md.push('');
let n = 0;
const rows = [];
for (const kind of ORDER) {
  const list = (byKind.get(kind) ?? []).sort((a, b) => (b.valid_at ?? '').localeCompare(a.valid_at ?? ''));
  if (!list.length) continue;
  md.push(`## ${KIND[kind] ?? kind} (${list.length})`);
  md.push('');
  for (const r of list) {
    n += 1;
    const data = r.valid_at ? String(r.valid_at).slice(0, 10) : 'sem data';
    const flag = r.zep_invalid ? ' *(zep diz vencido)*' : '';
    md.push(`${n}. [ ] **${r.target_name ?? '(sem chave)'}** — ${r.fact}${flag}  \n   _${data}_`);
    rows.push({ n, kind: KIND[kind] ?? kind, key: r.target_name, text: r.fact, valid_at: r.valid_at, zep_invalid: !!r.zep_invalid, path: r.path, paths: r.paths });
  }
  md.push('');
}
const outMd = path.join(OUT_DIR, `zep-bruno-${date}.md`);
const outJson = path.join(OUT_DIR, `zep-bruno-${date}.json`);
fs.writeFileSync(outMd, md.join('\n'), { mode: 0o640 });
fs.writeFileSync(outJson, JSON.stringify(rows, null, 2), { mode: 0o640 });
try { const { execSync } = await import('node:child_process'); execSync(`chown -R orbe-admin:orbe-admin ${OUT_DIR}`); } catch {}

const counts = ORDER.map(k => `${KIND[k]}: ${(byKind.get(k) ?? []).length}`).join(' | ');
console.log(`OK em ${Math.round((Date.now() - t0) / 1000)} s. ${joined.length} registros (${counts}). ${pages} páginas${capped ? ' (CORTADO)' : ''}.`);
console.log(`Arquivos: ${outMd} e ${outJson}`);
