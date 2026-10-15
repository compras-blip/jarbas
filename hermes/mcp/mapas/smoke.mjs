// Teste de fumaça do protocolo: sobe o servidor por stdio, faz initialize, lista as ferramentas e
// chama uma sem chave (tem que voltar isError com mensagem em português). Não chama o Google.
import { spawn } from 'node:child_process';
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, GOOGLE_PLACES_API_KEY: '' }, stdio: ['pipe', 'pipe', 'pipe'] });
let buf = ''; const respostas = [];
srv.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (l) respostas.push(JSON.parse(l)); } });
const stderr = []; srv.stderr.on('data', (d) => stderr.push(String(d)));
const envia = (m) => srv.stdin.write(JSON.stringify(m) + '\n');
const espera = (id, ms = 5000) => new Promise((res, rej) => { const t0 = Date.now(); const iv = setInterval(() => { const r = respostas.find((x) => x.id === id); if (r) { clearInterval(iv); res(r); } else if (Date.now() - t0 > ms) { clearInterval(iv); rej(new Error('timeout id ' + id)); } }, 20); });
envia({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } } });
const init = await espera(1);
console.log('initialize ->', init.result?.serverInfo, 'protocolo', init.result?.protocolVersion, 'tools cap:', JSON.stringify(init.result?.capabilities?.tools));
envia({ jsonrpc: '2.0', method: 'notifications/initialized' });
envia({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
const lista = await espera(2);
for (const t of lista.result.tools) console.log('ferramenta:', t.name, '| campos:', Object.keys(t.inputSchema?.properties || {}).join(','), '| descricao:', (t.description || '').length, 'chars');
envia({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'lugar_horario', arguments: { lugar: 'Parque Ibirapuera, São Paulo' } } });
const call = await espera(3);
console.log('tools/call sem chave -> isError:', call.result?.isError, '| texto:', call.result?.content?.[0]?.text);
envia({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'lugar_horario', arguments: { lugar: 'x' } } });
const inval = await espera(4);
console.log('tools/call com entrada invalida ->', inval.error ? 'erro de protocolo: ' + inval.error.message.slice(0, 80) : 'isError ' + inval.result?.isError);
srv.kill();
console.log('stderr do servidor:', stderr.join('').trim().split('\n').slice(0, 3).join(' | '));
