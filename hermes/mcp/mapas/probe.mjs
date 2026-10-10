// probe.mjs — chama UMA ferramenta do servidor por stdio e imprime o resultado, o tamanho e o tempo.
// Uso: node probe.mjs <ferramenta> '<json de argumentos>'
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const [, , ferramenta, argsJson = '{}'] = process.argv;
const dir = dirname(fileURLToPath(import.meta.url));
const srv = spawn(process.execPath, [join(dir, 'server.mjs')], { stdio: ['pipe', 'pipe', 'pipe'] });
let buf = ''; const resps = []; const err = [];
srv.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) resps.push(JSON.parse(l)); } });
srv.stderr.on('data', (d) => err.push(String(d)));
const envia = (m) => srv.stdin.write(JSON.stringify(m) + '\n');
const espera = (id, ms = 40000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { const r = resps.find((x) => x.id === id); if (r) { clearInterval(iv); res(r); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout')); } }, 20); });
envia({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'probe', version: '0' } } });
await espera(1); envia({ jsonrpc: '2.0', method: 'notifications/initialized' });
if (ferramenta === 'list') {
  envia({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  const l = await espera(2); let tot = 0;
  for (const t of l.result.tools) { const s = JSON.stringify({ name: t.name, description: t.description, inputSchema: t.inputSchema }); tot += s.length; console.log(`${t.name.padEnd(18)} ${String(s.length).padStart(5)} caracteres (descricao ${t.description.length}, schema ${JSON.stringify(t.inputSchema).length})`); }
  console.log(`TOTAL ${tot} caracteres ~ ${Math.round(tot / 4)} tokens em toda mensagem`);
} else {
  const t0 = Date.now();
  envia({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: ferramenta, arguments: JSON.parse(argsJson) } });
  const r = await espera(3);
  const texto = r.result?.content?.[0]?.text ?? JSON.stringify(r.error);
  console.log(`tempo ${Date.now() - t0} ms | isError ${r.result?.isError === true} | ${texto.length} caracteres ~ ${Math.round(texto.length / 4)} tokens`);
  console.log('---'); console.log(texto);
}
srv.kill();
console.log('--- stderr:', err.join('').trim().split('\n').filter((l) => !l.includes('pronto')).join(' | ').slice(0, 300));
