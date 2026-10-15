// autorizar.mjs — autorização única do Dropbox (fluxo de código, sem redirect, com refresh token).
//   node autorizar.mjs link    → imprime a URL para o Bruno aprovar (lê a app key de DROPBOX_APP_PATH)
//   node autorizar.mjs trocar  → lê o código colado (stdin), troca por refresh token e grava DROPBOX_TOKEN_PATH
//   node autorizar.mjs testar  → confirma a conta ligada (users/get_current_account)
// Nunca imprime chave, secret, código ou token.
import { lerApp, urlAutorizacao, trocarCodigo, rpc } from './dropbox.mjs';

const acao = process.argv[2];
try {
  if (acao === 'link') {
    const app = await lerApp();
    console.log(urlAutorizacao(app.app_key));
  } else if (acao === 'trocar') {
    let dados = ''; for await (const c of process.stdin) dados += c;
    const codigo = dados.trim().split(/\s+/).pop() || '';
    if (codigo.length < 10) { console.error('código vazio ou curto demais'); process.exit(2); }
    const r = await trocarCodigo(codigo);
    const conta = await rpc('users/get_current_account');
    console.log(`autorizado: ${conta.name?.display_name || '?'} <${conta.email || '?'}> · escopos: ${r.scope || '?'}`);
  } else if (acao === 'testar') {
    const conta = await rpc('users/get_current_account');
    console.log(`conta ligada: ${conta.name?.display_name || '?'} <${conta.email || '?'}>`);
  } else { console.error('uso: node autorizar.mjs link | trocar | testar'); process.exit(2); }
} catch (e) { console.error('falhou:', e?.code || e?.message || e, e?.detalhe || ''); process.exit(1); }
