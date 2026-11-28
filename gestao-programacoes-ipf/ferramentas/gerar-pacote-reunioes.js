#!/usr/bin/env node
/* Gera o pacote criptografado das reuniões do presbitério (reuniões, comissões, membros, acervo, tesouraria)
 * para o modo demonstração carregar sozinho quando o administrador entra com a senha dos dados.
 *
 *   IPB_SENHA_PACOTE='...' node ferramentas/gerar-pacote-reunioes.js <pacote-reunioes.json> <pasta-dos-pdfs>
 *
 * Saída: relatorios/dados/reunioes.json (itens, cifrados com AES-256-GCM e chave derivada da senha por PBKDF2-SHA256)
 * e relatorios/dados/reunioes/*.bin (cada PDF cifrado com uma chave aleatória que vai dentro do pacote).
 * Os nomes dos arquivos .bin são aleatórios, para não revelar o conteúdo. */
const fs = require('fs');
const path = require('path');
const { webcrypto: crypto } = require('crypto');

const ITER = 250000;
const b64 = u => Buffer.from(u).toString('base64');
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

(async () => {
  const [entrada, pastaPdfs] = process.argv.slice(2);
  const senha = process.env.IPB_SENHA_PACOTE;
  if (!entrada || !pastaPdfs || !senha) { console.error('Uso: IPB_SENHA_PACOTE=... node ferramentas/gerar-pacote-reunioes.js <pacote.json> <pasta-dos-pdfs>'); process.exit(1); }
  const pk = JSON.parse(fs.readFileSync(entrada, 'utf8'));
  const dir = path.join(__dirname, '../relatorios/dados');
  const dirArq = path.join(dir, 'reunioes');
  fs.mkdirSync(dirArq, { recursive: true });
  for (const f of fs.readdirSync(dirArq)) if (f.endsWith('.bin')) fs.unlinkSync(path.join(dirArq, f));

  // chave aleatória para os arquivos
  const chaveArq = crypto.getRandomValues(new Uint8Array(32));
  const kArq = await crypto.subtle.importKey('raw', chaveArq, 'AES-GCM', false, ['encrypt']);
  let n = 0, bytes = 0;
  for (const d of pk.itens.filter(x => x.tipo === 'documento' && x.arquivoNome)) {
    const f = path.join(pastaPdfs, d.arquivoNome);
    if (!fs.existsSync(f)) { console.warn('sem arquivo:', d.arquivoNome); continue; }
    const buf = fs.readFileSync(f);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kArq, buf));
    const nome = crypto.randomUUID() + '.bin';
    fs.writeFileSync(path.join(dirArq, nome), Buffer.concat([Buffer.from(iv), Buffer.from(ct)]));
    const hash = Buffer.from(await crypto.subtle.digest('SHA-256', buf)).toString('hex');
    const ext = (d.arquivoNome.split('.').pop() || 'pdf').toLowerCase();
    d.arquivo = { nome: d.arquivoNome, tipo: MIME[ext] || 'application/pdf', tamanho: buf.length, em: new Date().toISOString(), por: 'Pacote do presbitério', sha256: hash, pacote: 'dados/reunioes/' + nome };
    n++; bytes += buf.length;
  }
  const corpo = { itens: pk.itens, chaveArquivos: b64(chaveArq), descricao: pk.descricao || '' };
  // opcional: igrejas e relatórios de anos anteriores (formato do backup do Relatórios IPB)
  if (Array.isArray(pk.igrejas) && Array.isArray(pk.relatorios)) { corpo.igrejas = pk.igrejas; corpo.relatorios = pk.relatorios.map(r => Object.assign({}, r, { criadoPor: null, anexos: [] })); }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(corpo)));
  fs.writeFileSync(path.join(dir, 'reunioes.json'), JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
  console.log('itens', pk.itens.length, '· arquivos', n, '·', (bytes / 1048576).toFixed(1), 'MB');
})().catch(e => { console.error(e); process.exit(1); });
