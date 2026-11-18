// Gera o pacote CRIPTOGRAFADO com os dados históricos e os PDFs originais das igrejas
// (relatorios/dados/). O repositório é público: só vai para lá o conteúdo cifrado
// (AES-256-GCM, chave derivada da senha por PBKDF2-SHA256).
// No modo demonstração, entrar como "admin" (Presbitério) com essa senha abre o pacote.
// Uso: IPB_SENHA_PACOTE='...' node ferramentas/gerar-pacote.js <dados-historicos.js> <pasta-dos-pdfs>
// A pasta de PDFs deve ter re_<id-do-relatório>.pdf e nomes.json ({id: nome original}).
const fs = require('fs'), path = require('path');
const { webcrypto: crypto } = require('crypto');
const [, , histFile, pdfDir] = process.argv;
const senha = process.env.IPB_SENHA_PACOTE;
if (!senha || !histFile || !pdfDir) { console.error('Uso: IPB_SENHA_PACOTE=... node gerar-pacote.js dados-historicos.js pasta-pdfs'); process.exit(1); }
global.window = {};
require(path.resolve(histFile));
const H = window.IPB_HISTORICO;
const ITER = 250000;
const b64 = u => Buffer.from(u).toString('base64');
(async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const out = path.join(__dirname, '../relatorios/dados');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'anexos'), { recursive: true });
  const nomes = JSON.parse(fs.readFileSync(path.join(pdfDir, 'nomes.json'), 'utf8'));
  for (const r of H.relatorios) {
    const f = path.join(pdfDir, r.id + '.pdf');
    if (!fs.existsSync(f)) continue;
    const buf = fs.readFileSync(f);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf));
    const arq = 'dados/anexos/' + crypto.randomUUID() + '.bin';
    fs.writeFileSync(path.join(__dirname, '../relatorios', arq), Buffer.concat([Buffer.from(iv), Buffer.from(ct)]));
    r.anexos = [{ id: 'an_original', nome: nomes[r.id] || (r.documento + '.pdf'), tipo: 'application/pdf', tamanho: buf.length, em: r.enviadoEm, porNome: 'Importação', origem: 'pacote', arquivo: arq, original: true }];
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(H)));
  fs.writeFileSync(path.join(out, 'pacote.json'), JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
  console.log('relatórios', H.relatorios.length, 'com PDF', H.relatorios.filter(r => r.anexos).length);
})();
