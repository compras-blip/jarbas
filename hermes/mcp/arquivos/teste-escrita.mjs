// Integração real: sobe o servidor por stdio dentro do container e exercita as ferramentas de escrita na pasta /Atlas testes.
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
await writeFile('/opt/data/cache/anexos/atlas-teste.txt', 'teste de escrita do Atlas em 14/10/2026\n');
const p = spawn('node', ['/opt/data/mcp/arquivos/server.mjs'], { env: { ...process.env, DROPBOX_APP_PATH: '/opt/data/dropbox_app.json', DROPBOX_TOKEN_PATH: '/opt/data/dropbox_token.json', ARQUIVOS_PASTA_CACHE: '/opt/data/cache/anexos' }, stdio: ['pipe', 'pipe', 'pipe'] });
const pend = new Map(); let buf = '';
p.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); if (!l.trim()) continue; const m = JSON.parse(l); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } } });
p.stderr.on('data', () => {});
let n = 0;
const pedir = (method, params) => new Promise((res) => { const id = ++n; pend.set(id, res); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
const chamar = async (name, args) => { const m = await pedir('tools/call', { name, arguments: args }); const t = m.result?.content?.[0]?.text || JSON.stringify(m.error); console.log(`${m.result?.isError ? 'ERRO ' : 'ok   '}${name} ${JSON.stringify(args)}\n      → ${t.replace(/\n/g, ' | ').slice(0, 230)}`); return t; };
await pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '0' } });
p.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
await chamar('pasta_criar', { caminho: '/Atlas testes' });
await chamar('pasta_criar', { caminho: '/Atlas testes' });                       // conflito esperado
await chamar('arquivo_salvar', { arquivo_local: '/opt/data/cache/anexos/atlas-teste.txt', pasta_destino: '/Atlas testes' });
await chamar('arquivo_salvar', { arquivo_local: '/opt/data/cache/anexos/atlas-teste.txt', pasta_destino: '/Atlas testes', nome: 'atlas-teste.txt' }); // conteúdo igual: sem conflito
await writeFile('/opt/data/cache/anexos/atlas-teste.txt', 'versão 2\n');
await chamar('arquivo_salvar', { arquivo_local: '/opt/data/cache/anexos/atlas-teste.txt', pasta_destino: '/Atlas testes' });   // conflito esperado (conteúdo diferente)
await chamar('arquivo_salvar', { arquivo_local: '/opt/data/cache/anexos/atlas-teste.txt', pasta_destino: '/Atlas testes', sobrescrever: true });
await chamar('arquivo_salvar', { arquivo_local: '/etc/hostname', pasta_destino: '/Atlas testes' });                            // fora da raiz: recusado
await chamar('arquivo_copiar', { de: '/Atlas testes/atlas-teste.txt', novo_nome: 'cópia Amazônia.txt' });
await chamar('arquivo_mover', { de: '/Atlas testes/cópia Amazônia.txt', novo_nome: 'renomeado.txt' });
await chamar('arquivo_mover', { de: '/Atlas testes/renomeado.txt', novo_nome: 'atlas-teste.txt' });                           // conflito esperado
await chamar('arquivo_info', { caminho_ou_id: '/Atlas testes/atlas-teste.txt', versoes: true });
await chamar('arquivo_listar', { pasta: '/Atlas testes' });
await chamar('arquivo_apagar', { caminho_ou_id: '/Atlas testes/renomeado.txt' });
await chamar('arquivo_apagar', { caminho_ou_id: '/Atlas testes' });                                                              // pasta sem eh_pasta: só informa
await chamar('arquivo_apagar', { caminho_ou_id: '/Atlas testes', eh_pasta: true });
await chamar('arquivo_listar', { pasta: '/Atlas testes' });                                                                       // não existe mais
p.kill();
