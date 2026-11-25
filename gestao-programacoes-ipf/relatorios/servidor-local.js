/**
 * Servidor local (modo demonstração).
 * Implementa no navegador a mesma API da função ipb_api do Supabase
 * (supabase/relatorios.sql), guardando os dados no localStorage.
 * As regras de permissão são as mesmas; quem manda de verdade é o servidor
 * quando o sistema está conectado ao Supabase.
 */
(function () {
  const KEY = 'ipb-relatorios-db-v1';
  const SALT = 'ipb::';
  const SESSION_DAYS = 7;
  const MAX_FAILS = 5;
  const ROLES = ['admin', 'editor', 'analista', 'leitor'];
  const IGREJA_CAMPOS = ['nome', 'sigla', 'tipo', 'igrejaMae', 'endereco', 'bairro', 'cidade', 'uf', 'cep', 'telefone', 'email', 'site', 'cnpj', 'dataOrg', 'secretario', 'pastor', 'presbiterio', 'sinodo', 'ativo'];
  // campos da comissão: os de sempre e os da reunião do concílio (grupo, modelo de parecer, ordem, base legal, título do relatório)
  const COMISSAO_CAMPOS = ['nome', 'tipo', 'ano', 'grupo', 'modelo', 'ordem', 'base', 'titulo'];
  const ATA_STATUS = ['Enviada', 'Em análise', 'Analisada'];
  const DECISOES = { 'Aprovar': 'Aprovado', 'Aprovar com ressalvas': 'Aprovado com ressalvas', 'Devolver para correção': 'Devolvido' };

  const enc = new TextEncoder();
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function uid(p) { return (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function now() { return new Date().toISOString(); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function fail(msg, code) { const e = new Error(msg); e.code = code || 'ERRO'; throw e; }
  function norm(s) { return String(s || '').trim().toLowerCase(); }

  /* ---------------- anexos (IndexedDB) e pacote cifrado ---------------- */
  function idb() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('ipb-anexos', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('f');
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  }
  async function idbOp(modo, fn) {
    const d = await idb();
    return new Promise((res, rej) => { const tx = d.transaction('f', modo); const r = fn(tx.objectStore('f')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); });
  }
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = u => { let s = ''; u.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  async function pacoteInfo() { try { const r = await fetch('dados/pacote.json', { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch (e) { return null; } }
  async function chavePacote(senha, p) {
    const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(p.salt), iterations: p.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function abrirPacote(senha) {
    const p = await pacoteInfo();
    if (!p) return false;
    let key, H;
    try {
      key = await chavePacote(senha, p);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(p.iv) }, key, b64d(p.ct));
      H = JSON.parse(new TextDecoder().decode(pt));
    } catch (e) { return false; }
    const temRel = id => db.relatorios.some(r => r.igrejaId === id);
    db.igrejas = db.igrejas.filter(i => temRel(i.id) || db.usuarios.some(u => u.igrejaId === i.id) || !H.igrejas.some(h => h.nome === i.nome));
    H.igrejas.forEach(i => { const ex = db.igrejas.find(x => x.id === i.id); if (ex) Object.assign(ex, i); else db.igrejas.push(i); });
    H.relatorios.forEach(h => {
      if (db.relatorios.some(r => r.id === h.id)) return;
      const m = db.modelos.find(x => x.id === h.modeloId) || (window.IPB_MODELOS_PADRAO || []).find(x => x.id === h.modeloId);
      db.relatorios.push(Object.assign(h, { modelo: snapshot(m), criadoPor: null, criadoPorNome: 'Importação', createdAt: h.enviadoEm, updatedAt: h.enviadoEm, analise: novaAnalise() }));
    });
    db.pacote = { chave: b64e(new Uint8Array(await crypto.subtle.exportKey('raw', key))), em: now() };
    return true;
  }
  async function lerPacoteArquivo(arq) {
    if (!db.pacote) fail('Os dados do Presbitério ainda não foram abertos neste navegador. Entre como admin com a senha dos dados.');
    const key = await crypto.subtle.importKey('raw', b64d(db.pacote.chave), 'AES-GCM', false, ['decrypt']);
    const r = await fetch(arq);
    if (!r.ok) fail('Arquivo original não encontrado.');
    const buf = new Uint8Array(await r.arrayBuffer());
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12)));
  }

  let db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sem armazenamento */ } }

  async function seed() {
    const t = now();
    db = { igrejas: [], usuarios: [], modelos: [], comissoes: [], relatorios: [], atas: [], reuniao: [], sessoes: [], log: [] };
    const H = window.IPB_HISTORICO || { igrejas: [], relatorios: [] };
    db.igrejas = clone(H.igrejas);
    if (!db.igrejas.length) db.igrejas = [{ id: 'ig_filadelfia', nome: 'Igreja Presbiteriana Filadélfia', sigla: 'IPF', tipo: 'Igreja', cidade: 'Parnamirim', uf: 'RN', presbiterio: 'Presbitério Litorâneo do Rio Grande do Norte (PLRN)', sinodo: 'Sínodo do Rio Grande do Norte (SRN)', ativo: true }];
    const u = (id, nome, username, igrejaId, role, senha, cargo) => ({ id, nome, username, igrejaId, role, ativo: true, email: '', cargo: cargo || '', createdAt: t, senha });
    const users = [
      u('us_admin', 'Administrador', 'admin', null, 'admin', 'admin123', 'Administrador do sistema'),
      u('us_relator', 'Relator (exemplo)', 'relator', null, 'analista', 'relator123', 'Relator da comissão'),
      u('us_membro', 'Membro da comissão (exemplo)', 'membro', null, 'analista', 'membro123', 'Membro da comissão'),
      u('us_secret', 'Secretário do Conselho (exemplo)', 'secretario', 'ig_filadelfia', 'editor', 'secretario123', 'Secretário do Conselho'),
      u('us_leitor', 'Leitor (exemplo)', 'leitor', 'ig_filadelfia', 'leitor', 'leitor123', '')
    ];
    for (const x of users) { x.senhaHash = await sha256(SALT + x.senha); delete x.senha; x.falhas = 0; x.bloqueadoAte = null; }
    db.usuarios = users;
    db.modelos = clone(window.IPB_MODELOS_PADRAO || []).map(m => Object.assign(m, { ativo: true, versao: 1, updatedAt: t }));
    const ano = new Date().getFullYear();
    db.comissoes = [{
      id: 'co_exame', nome: 'Comissão de Exame de Relatórios ' + ano, tipo: 'Exame de relatórios', ano,
      membros: [
        { userId: 'us_relator', nome: 'Relator (exemplo)', funcao: 'Relator' },
        { userId: 'us_membro', nome: 'Membro da comissão (exemplo)', funcao: 'Membro' }
      ], ativa: true
    }];
    db.relatorios = H.relatorios.map(h => {
      const m = db.modelos.find(x => x.id === h.modeloId);
      return Object.assign(clone(h), {
        modelo: snapshot(m), criadoPor: null, criadoPorNome: 'Importação', createdAt: h.enviadoEm, updatedAt: h.enviadoEm,
        analise: novaAnalise()
      });
    });
    log(null, 'sistema', 'Banco criado com ' + db.igrejas.length + ' igrejas e ' + db.relatorios.length + ' relatórios importados', '', '');
    save();
  }

  function snapshot(m) { return { nome: m.nome, categoria: m.categoria, versao: m.versao || 1, secoes: clone(m.secoes), verificacoes: clone(m.verificacoes || []), continuidade: clone(m.continuidade || []) }; }
  function novaAnalise() { return { comissaoId: null, comissaoNome: '', membros: [], pareceres: [], ia: null, final: null, assinaturas: [] }; }
  function pubUser(x) { const { senhaHash, falhas, bloqueadoAte, ...rest } = x; return rest; }
  function log(user, acao, detalhes, entidade, entidadeId) {
    db.log.unshift({ id: uid('lg_'), em: now(), usuarioId: user ? user.id : null, usuario: user ? user.nome : 'Sistema', acao, entidade: entidade || '', entidadeId: entidadeId || '', detalhes: detalhes || '' });
    if (db.log.length > 2000) db.log.length = 2000;
  }

  /* ---------------- permissões (iguais às do SQL) ---------------- */
  const isAdmin = u => u.role === 'admin';
  const veIgreja = (u, igrejaId) => isAdmin(u) || !u.igrejaId || u.igrejaId === igrejaId;
  const podeEditarDados = (u, r) => veIgreja(u, r.igrejaId) && (isAdmin(u) || u.role === 'editor') && ['Rascunho', 'Devolvido'].includes(r.status);
  const podeAnalisar = (u, r) => veIgreja(u, r.igrejaId) && (isAdmin(u) || u.role === 'analista') && ['Enviado', 'Em análise'].includes(r.status);

  function session(token) {
    const s = db.sessoes.find(x => x.token === token && x.expira > Date.now());
    if (!s) fail('Sessão expirada. Entre novamente.', 'AUTH');
    const u = db.usuarios.find(x => x.id === s.usuarioId && x.ativo);
    if (!u) fail('Usuário inativo.', 'AUTH');
    return u;
  }
  function getRel(u, id) {
    const r = db.relatorios.find(x => x.id === id);
    if (!r || !veIgreja(u, r.igrejaId)) fail('Relatório não encontrado.', 'NOTFOUND');
    return r;
  }
  async function conteudoHash(r) { return sha256(stable({ dados: r.dados || {}, final: r.analise.final || null })); }

  /* ---------------- ações ---------------- */
  const A = {};

  A.publico = async () => ({ igrejas: db.igrejas.filter(i => i.ativo).map(i => ({ id: i.id, nome: i.nome, sigla: i.sigla })), modo: 'local', pacoteAberto: !!db.pacote, pacoteFechado: !db.pacote && !!(await pacoteInfo()) });

  A.login = async ({ igrejaId, username, senha }) => {
    let aberto = 0;
    if (!igrejaId && norm(username) === 'admin' && !db.pacote && senha && await abrirPacote(senha)) {
      const ad = db.usuarios.find(x => x.id === 'us_admin') || db.usuarios.find(x => x.role === 'admin' && !x.igrejaId);
      if (ad) { ad.senhaHash = await sha256(SALT + senha); ad.ativo = true; ad.falhas = 0; ad.bloqueadoAte = null; }
      aberto = db.relatorios.filter(r => (r.anexos || []).some(a => a.origem === 'pacote')).length;
      log(ad, 'sistema', 'Dados do Presbitério abertos: ' + db.igrejas.length + ' igrejas e ' + db.relatorios.length + ' relatórios', '', '');
      save();
    }
    const u = db.usuarios.find(x => norm(x.username) === norm(username) && (x.igrejaId || '') === (igrejaId || ''));
    if (!u || !u.ativo) fail('Usuário, igreja ou senha incorretos.', 'LOGIN');
    if (u.bloqueadoAte && u.bloqueadoAte > Date.now()) fail('Muitas tentativas. Aguarde 5 minutos.', 'LOCKED');
    if (u.senhaHash !== await sha256(SALT + (senha || ''))) {
      u.falhas = (u.falhas || 0) + 1;
      if (u.falhas >= MAX_FAILS) { u.bloqueadoAte = Date.now() + 5 * 60000; u.falhas = 0; }
      log(u, 'login_falhou', 'Senha incorreta', 'usuario', u.id); save();
      fail('Usuário, igreja ou senha incorretos.', 'LOGIN');
    }
    u.falhas = 0; u.bloqueadoAte = null;
    const token = uid('tk_') + uid();
    db.sessoes = db.sessoes.filter(s => s.expira > Date.now());
    db.sessoes.push({ token, usuarioId: u.id, expira: Date.now() + SESSION_DAYS * 86400000 });
    log(u, 'login', '', 'usuario', u.id); save();
    return { token, usuario: pubUser(u), pacoteAberto: aberto || undefined };
  };

  A.logout = ({ token }) => { db.sessoes = db.sessoes.filter(s => s.token !== token); save(); return {}; };

  A.dados = ({ token }) => {
    const u = session(token);
    const rels = db.relatorios.filter(r => veIgreja(u, r.igrejaId));
    return {
      usuario: pubUser(u),
      igrejas: clone(db.igrejas),
      usuarios: isAdmin(u) ? db.usuarios.map(pubUser) : db.usuarios.filter(x => x.ativo).map(x => ({ id: x.id, nome: x.nome, igrejaId: x.igrejaId, role: x.role, cargo: x.cargo })),
      modelos: clone(db.modelos),
      comissoes: clone(db.comissoes),
      relatorios: clone(rels),
      atas: (db.atas || []).filter(x => veIgreja(u, x.igrejaId)).map(resumoAta),
      reuniao: clone(db.reuniao || []),
      log: isAdmin(u) ? clone(db.log.slice(0, 500)) : []
    };
  };

  A.senha = async ({ token, atual, nova }) => {
    const u = session(token);
    if (u.senhaHash !== await sha256(SALT + (atual || ''))) fail('Senha atual incorreta.');
    if (!nova || nova.length < 6) fail('A nova senha precisa ter pelo menos 6 caracteres.');
    u.senhaHash = await sha256(SALT + nova);
    log(u, 'senha', 'Trocou a própria senha', 'usuario', u.id); save();
    return {};
  };

  A.salvar = async ({ token, entidade, item }) => {
    const u = session(token);
    item = clone(item || {});
    if (entidade === 'relatorio') return salvarRelatorio(u, item);
    if (!isAdmin(u)) fail('Apenas o administrador pode fazer isso.', 'FORBIDDEN');
    if (entidade === 'igreja') {
      if (!item.nome) fail('Informe o nome da igreja.');
      const ex = db.igrejas.find(x => x.id === item.id);
      const rec = Object.assign(ex || { id: uid('ig_'), ativo: true }, pick(item, IGREJA_CAMPOS));
      if (!ex) db.igrejas.push(rec);
      log(u, ex ? 'editar' : 'criar', rec.nome, 'igreja', rec.id); save();
      return { item: clone(rec) };
    }
    if (entidade === 'usuario') {
      if (!item.nome || !item.username) fail('Informe nome e usuário.');
      if (!ROLES.includes(item.role)) fail('Perfil inválido.');
      const igrejaId = item.igrejaId || null;
      const dup = db.usuarios.find(x => x.id !== item.id && norm(x.username) === norm(item.username) && (x.igrejaId || '') === (igrejaId || ''));
      if (dup) fail('Já existe esse usuário nessa igreja.');
      const ex = db.usuarios.find(x => x.id === item.id);
      if (ex && ex.id === u.id && (item.role !== 'admin' || item.ativo === false)) fail('Você não pode tirar o seu próprio acesso de administrador.');
      if (!ex && (!item.senha || item.senha.length < 6)) fail('Defina uma senha com pelo menos 6 caracteres.');
      const rec = Object.assign(ex || { id: uid('us_'), createdAt: now(), falhas: 0, bloqueadoAte: null }, pick(item, ['nome', 'username', 'role', 'email', 'cargo']), { igrejaId, ativo: item.ativo !== false });
      if (item.senha) { if (item.senha.length < 6) fail('A senha precisa ter pelo menos 6 caracteres.'); rec.senhaHash = await sha256(SALT + item.senha); }
      if (!ex) db.usuarios.push(rec);
      if (rec.ativo === false) db.sessoes = db.sessoes.filter(s => s.usuarioId !== rec.id);
      log(u, ex ? 'editar' : 'criar', rec.nome + ' (' + rec.role + ')' + (item.senha && ex ? ' · senha redefinida' : ''), 'usuario', rec.id); save();
      return { item: pubUser(rec) };
    }
    if (entidade === 'modelo') {
      if (!item.nome) fail('Informe o nome do modelo.');
      if (!Array.isArray(item.secoes)) fail('Modelo sem seções.');
      const ex = db.modelos.find(x => x.id === item.id);
      const rec = Object.assign(ex || { id: item.id || uid('mo_'), versao: 0 }, pick(item, ['nome', 'categoria', 'descricao', 'secoes', 'verificacoes']), { ativo: item.ativo !== false, updatedAt: now() });
      rec.versao = (rec.versao || 0) + 1;
      if (!ex) db.modelos.push(rec);
      log(u, ex ? 'editar' : 'criar', rec.nome + ' · versão ' + rec.versao, 'modelo', rec.id); save();
      return { item: clone(rec) };
    }
    if (entidade === 'comissao') {
      if (!item.nome) fail('Informe o nome da comissão.');
      const membros = (item.membros || []).filter(m => m && (m.nome || m.userId)).map(m => {
        const us = m.userId ? db.usuarios.find(x => x.id === m.userId) : null;
        return { userId: us ? us.id : null, nome: us ? us.nome : String(m.nome), funcao: m.funcao || 'Membro' };
      });
      const ex = db.comissoes.find(x => x.id === item.id);
      const rec = Object.assign(ex || { id: uid('co_') }, pick(item, COMISSAO_CAMPOS), { membros, ativa: item.ativa !== false });
      if (!ex) db.comissoes.push(rec);
      log(u, ex ? 'editar' : 'criar', rec.nome, 'comissao', rec.id); save();
      return { item: clone(rec) };
    }
    fail('Entidade desconhecida.');
  };

  function pick(o, keys) { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; }

  function salvarRelatorio(u, item) {
    const ex = item.id ? db.relatorios.find(x => x.id === item.id) : null;
    if (ex) {
      if (!veIgreja(u, ex.igrejaId)) fail('Relatório não encontrado.', 'NOTFOUND');
      if (!podeEditarDados(u, ex)) fail('Este relatório não pode ser editado por você agora.', 'FORBIDDEN');
      ex.dados = item.dados || {};
      if (item.titulo) ex.titulo = String(item.titulo);
      if (item.documento !== undefined) ex.documento = String(item.documento || '');
      if (item.atualizarModelo) {
        const m = db.modelos.find(x => x.id === ex.modeloId);
        if (m) ex.modelo = snapshot(m);
      }
      ex.updatedAt = now();
      ex.historico.push({ em: ex.updatedAt, por: u.nome, acao: 'Dados editados' });
      log(u, 'editar', ex.titulo, 'relatorio', ex.id); save();
      return { item: clone(ex) };
    }
    if (!(isAdmin(u) || u.role === 'editor')) fail('Seu perfil não pode criar relatórios.', 'FORBIDDEN');
    const igrejaId = isAdmin(u) || !u.igrejaId ? item.igrejaId : u.igrejaId;
    if (!igrejaId || !db.igrejas.find(i => i.id === igrejaId)) fail('Escolha a igreja.');
    const m = db.modelos.find(x => x.id === item.modeloId && x.ativo !== false);
    if (!m) fail('Escolha um modelo de relatório.');
    const ano = parseInt(item.ano, 10);
    if (!(ano > 1900 && ano < 2200)) fail('Ano inválido.');
    const t = now();
    const r = {
      id: uid('re_'), modeloId: m.id, igrejaId, ano, documento: item.documento || '', titulo: item.titulo || (m.nome + ' ' + ano), status: 'Rascunho',
      dados: item.dados || {}, modelo: snapshot(m), criadoPor: u.id, criadoPorNome: u.nome, createdAt: t, updatedAt: t, enviadoEm: null,
      analise: novaAnalise(), historico: [{ em: t, por: u.nome, acao: 'Relatório criado' }]
    };
    db.relatorios.push(r);
    log(u, 'criar', r.titulo, 'relatorio', r.id); save();
    return { item: clone(r) };
  }

  A.excluir = ({ token, entidade, id }) => {
    const u = session(token);
    if (entidade === 'relatorio') {
      const r = getRel(u, id);
      if (!(isAdmin(u) || (u.role === 'editor' && r.status === 'Rascunho'))) fail('Você não pode excluir este relatório.', 'FORBIDDEN');
      db.relatorios = db.relatorios.filter(x => x.id !== id);
      log(u, 'excluir', r.titulo, 'relatorio', id); save();
      return {};
    }
    if (!isAdmin(u)) fail('Apenas o administrador pode fazer isso.', 'FORBIDDEN');
    const map = { igreja: 'igrejas', modelo: 'modelos', comissao: 'comissoes', usuario: 'usuarios' };
    const col = map[entidade];
    if (!col) fail('Entidade desconhecida.');
    if (entidade === 'usuario' && id === u.id) fail('Você não pode excluir o seu próprio usuário.');
    if (entidade === 'igreja' && db.relatorios.some(r => r.igrejaId === id)) fail('Esta igreja tem relatórios. Desative-a em vez de excluir.');
    if (entidade === 'igreja' && db.usuarios.some(x => x.igrejaId === id)) fail('Esta igreja tem usuários. Desative-a em vez de excluir.');
    if (entidade === 'igreja' && (db.atas || []).some(x => x.igrejaId === id)) fail('Esta igreja tem atas enviadas. Desative-a em vez de excluir.');
    const ex = db[col].find(x => x.id === id);
    if (!ex) fail('Registro não encontrado.', 'NOTFOUND');
    db[col] = db[col].filter(x => x.id !== id);
    if (entidade === 'usuario') db.sessoes = db.sessoes.filter(s => s.usuarioId !== id);
    log(u, 'excluir', ex.nome || id, entidade, id); save();
    return {};
  };

  A.relatorio = async ({ token, id, op, ...p }) => {
    const u = session(token);
    const r = getRel(u, id);
    const a = r.analise;
    const t = now();
    let acao = '';
    switch (op) {
      case 'enviar':
        if (!podeEditarDados(u, r)) fail('Este relatório não pode ser enviado por você agora.', 'FORBIDDEN');
        a.final = null; a.assinaturas = [];
        r.status = a.comissaoId ? 'Em análise' : 'Enviado';
        r.enviadoEm = t; acao = 'Enviado para análise';
        break;
      case 'atribuir': {
        if (!podeAnalisar(u, r)) fail('Você não pode analisar este relatório.', 'FORBIDDEN');
        const c = db.comissoes.find(x => x.id === p.comissaoId);
        if (!c) fail('Escolha a comissão.');
        a.comissaoId = c.id; a.comissaoNome = c.nome; a.membros = clone(c.membros); a.assinaturas = [];
        r.status = 'Em análise'; acao = 'Encaminhado à ' + c.nome;
        break;
      }
      case 'parecer': {
        if (!podeAnalisar(u, r)) fail('Você não pode analisar este relatório.', 'FORBIDDEN');
        const texto = String(p.texto || '').trim();
        if (!texto) fail('Escreva a análise.');
        const ex = p.parecerId ? a.pareceres.find(x => x.id === p.parecerId) : null;
        if (ex) {
          if (ex.autorId !== u.id && !isAdmin(u)) fail('Só o autor pode alterar esta análise.', 'FORBIDDEN');
          ex.texto = texto; ex.recomendacao = p.recomendacao || ''; ex.editadoEm = t;
        } else {
          a.pareceres.push({ id: uid('pa_'), autorId: u.id, autorNome: u.nome, autorCargo: u.cargo || '', texto, recomendacao: p.recomendacao || '', em: t });
        }
        if (r.status === 'Enviado') r.status = 'Em análise';
        acao = 'Análise registrada por ' + u.nome;
        break;
      }
      case 'excluir_parecer': {
        const ex = a.pareceres.find(x => x.id === p.parecerId);
        if (!ex) fail('Análise não encontrada.');
        if (ex.autorId !== u.id && !isAdmin(u)) fail('Só o autor pode excluir esta análise.', 'FORBIDDEN');
        a.pareceres = a.pareceres.filter(x => x.id !== p.parecerId);
        acao = 'Análise excluída';
        break;
      }
      case 'ia':
        if (!podeAnalisar(u, r)) fail('Você não pode analisar este relatório.', 'FORBIDDEN');
        if (!p.texto) fail('Proposta vazia.');
        a.ia = { texto: String(p.texto), modelo: p.modelo || '', em: t, porNome: u.nome };
        acao = 'Proposta de análise gerada' + (p.modelo ? ' (' + p.modelo + ')' : '');
        break;
      case 'final': {
        if (!podeAnalisar(u, r)) fail('Você não pode analisar este relatório.', 'FORBIDDEN');
        if (!a.comissaoId) fail('Encaminhe o relatório a uma comissão antes do parecer final.');
        if (!DECISOES[p.decisao]) fail('Escolha a decisão do parecer.');
        const relator = a.membros.find(x => /relator/i.test(x.funcao || '') && x.userId);
        if (relator && relator.userId !== u.id && !isAdmin(u)) fail('O texto final do parecer é do relator da comissão (' + relator.nome + ').', 'FORBIDDEN');
        const texto = String(p.texto || '').trim();
        if (!texto) fail('Escreva o parecer da comissão.');
        const mudou = !a.final || a.final.texto !== texto || a.final.decisao !== p.decisao;
        a.final = { texto, decisao: p.decisao, porId: u.id, porNome: u.nome, em: t };
        if (mudou && a.assinaturas.length) { a.assinaturas = []; acao = 'Parecer final alterado (assinaturas anteriores anuladas)'; }
        else acao = 'Parecer final registrado';
        break;
      }
      case 'assinar': {
        if (r.status !== 'Em análise' || !a.final) fail('Não há parecer final para assinar.');
        const idx = parseInt(p.membroIdx, 10);
        const m = a.membros[idx];
        if (!m) fail('Membro da comissão não encontrado.');
        if (a.assinaturas.some(s => s.membroIdx === idx)) fail('Este membro já assinou.');
        let tipo;
        if (m.userId && m.userId === u.id) {
          if (u.senhaHash !== await sha256(SALT + (p.senha || ''))) fail('Senha incorreta. A assinatura não foi registrada.');
          tipo = 'Eletrônica (login e senha)';
        } else if (p.presencial && (isAdmin(u) || (u.role === 'analista' && a.membros.some(x => x.userId === u.id)))) {
          if (!p.desenho) fail('Colha a assinatura desenhada do membro.');
          if (u.senhaHash !== await sha256(SALT + (p.senha || ''))) fail('Confirme com a sua senha para registrar a assinatura presencial.');
          tipo = 'Presencial, colhida por ' + u.nome;
        } else fail('Só o próprio membro pode assinar.', 'FORBIDDEN');
        const ch = await conteudoHash(r);
        const hash = await sha256([r.id, m.nome, m.funcao, t, ch].join('|'));
        const codigo = hash.slice(0, 12).toUpperCase().replace(/(.{4})(?=.)/g, '$1-');
        a.assinaturas.push({ membroIdx: idx, nome: m.nome, funcao: m.funcao, userId: m.userId || null, em: t, tipo, desenho: p.desenho || null, conteudoHash: ch, hash, codigo });
        acao = 'Assinado por ' + m.nome + ' (' + codigo + ')';
        break;
      }
      case 'concluir': {
        if (!podeAnalisar(u, r) || r.status !== 'Em análise') fail('Você não pode concluir este relatório.', 'FORBIDDEN');
        if (!a.final) fail('Falta o parecer final.');
        const falta = a.membros.filter((m, i) => !a.assinaturas.some(s => s.membroIdx === i));
        if (!a.membros.length || falta.length) fail('Faltam assinaturas: ' + falta.map(m => m.nome).join(', '));
        r.status = DECISOES[a.final.decisao];
        acao = 'Análise concluída: ' + r.status;
        break;
      }
      case 'reabrir':
        if (!isAdmin(u)) fail('Apenas o administrador pode reabrir.', 'FORBIDDEN');
        r.status = 'Rascunho'; a.final = null; a.assinaturas = [];
        acao = 'Reaberto pelo administrador';
        break;
      default: fail('Operação desconhecida.');
    }
    r.updatedAt = t;
    r.historico.push({ em: t, por: u.nome, acao });
    log(u, op, r.titulo + ' · ' + acao, 'relatorio', r.id); save();
    return { item: clone(r) };
  };

  /* ---------------- anexos do relatório ---------------- */
  A.anexo = async ({ token, op, relatorioId, anexoId, nome, dados, original }) => {
    const u = session(token);
    const r = getRel(u, relatorioId);
    r.anexos = r.anexos || [];
    if (op === 'abrir') {
      const an = r.anexos.find(x => x.id === anexoId);
      if (!an) fail('Anexo não encontrado.', 'NOTFOUND');
      let bytes;
      if (an.origem === 'pacote') bytes = await lerPacoteArquivo(an.arquivo);
      else { const v = await idbOp('readonly', st => st.get(an.id)); if (!v) fail('O arquivo não está neste navegador.'); return { blob: v, nome: an.nome, tipo: an.tipo }; }
      return { blob: new Blob([bytes], { type: an.tipo }), nome: an.nome, tipo: an.tipo };
    }
    const t = now();
    let acao;
    if (op === 'salvar') {
      if (!(isAdmin(u) || u.role === 'editor')) fail('Seu perfil não pode anexar arquivos.', 'FORBIDDEN');
      const m = /^data:([\w/.+-]+);base64,/.exec(dados || '');
      if (!m) fail('Arquivo inválido.');
      if (!/^(application\/pdf|image\/)/.test(m[1])) fail('Anexe um PDF ou uma imagem.');
      const bytes = b64d(dados.slice(m[0].length));
      if (bytes.length > 15e6) fail('O arquivo passa de 15 MB.');
      const id = uid('an_');
      await idbOp('readwrite', st => st.put(new Blob([bytes], { type: m[1] }), id));
      r.anexos.push({ id, nome: String(nome || 'arquivo'), tipo: m[1], tamanho: bytes.length, em: t, porId: u.id, porNome: u.nome, origem: 'local', original: !!original });
      acao = 'Arquivo anexado: ' + nome;
    } else if (op === 'excluir') {
      const an = r.anexos.find(x => x.id === anexoId);
      if (!an) fail('Anexo não encontrado.', 'NOTFOUND');
      if (!(isAdmin(u) || (an.porId && an.porId === u.id))) fail('Só quem anexou ou o administrador pode excluir.', 'FORBIDDEN');
      r.anexos = r.anexos.filter(x => x.id !== anexoId);
      if (an.origem === 'local') await idbOp('readwrite', st => st.delete(an.id)).catch(() => {});
      acao = 'Anexo excluído: ' + an.nome;
    } else fail('Operação desconhecida.');
    r.updatedAt = t;
    r.historico.push({ em: t, por: u.nome, acao });
    log(u, 'anexo', r.titulo + ' · ' + acao, 'relatorio', r.id); save();
    return { item: clone(r) };
  };

  /* ---------------- exame de atas ---------------- */
  function resumoAta(x) { const { paginas, ...r } = x; return Object.assign(clone(r), { nPaginas: (paginas || []).length }); }
  function getAta(u, id) {
    const x = (db.atas || []).find(a => a.id === id);
    if (!x || !veIgreja(u, x.igrejaId)) fail('Ata não encontrada.', 'NOTFOUND');
    return x;
  }
  const podeAnalisarAta = (u, x) => veIgreja(u, x.igrejaId) && (isAdmin(u) || u.role === 'analista');

  A.quem = ({ token }) => ({ usuario: pubUser(session(token)) });

  A.ata = async ({ token, op, id, ...p }) => {
    const u = session(token);
    db.atas = db.atas || [];
    const t = now();
    if (op === 'abrir') return { item: clone(getAta(u, id)) };
    if (op === 'salvar') {
      const it = p.item || {};
      const ex = it.id ? getAta(u, it.id) : null;
      if (!(isAdmin(u) || u.role === 'editor' || u.role === 'analista')) fail('Seu perfil não pode enviar atas.', 'FORBIDDEN');
      const igrejaId = ex ? ex.igrejaId : (isAdmin(u) || !u.igrejaId ? it.igrejaId : u.igrejaId);
      if (!igrejaId || !db.igrejas.find(i => i.id === igrejaId)) fail('Escolha a igreja.');
      if (ex && ex.status === 'Analisada' && !isAdmin(u)) fail('Esta ata já foi analisada.', 'FORBIDDEN');
      const paginas = Array.isArray(it.paginas) ? it.paginas.filter(x => typeof x === 'string' && x.startsWith('data:image/')) : (ex ? ex.paginas : []);
      if (!paginas.length) fail('Anexe pelo menos uma imagem da ata.');
      if (paginas.length > 20) fail('Envie no máximo 20 páginas por exame.');
      const rec = Object.assign(ex || { id: uid('at_'), status: 'Enviada', ia: null, conferencia: {}, final: null, criadoPor: u.id, criadoPorNome: u.nome, createdAt: t, historico: [] },
        pick(it, ['livro', 'numeros', 'dataReuniao', 'tipoReuniao', 'formato', 'observacoes']), { igrejaId, paginas, updatedAt: t });
      if (ex) { rec.ia = null; rec.final = null; }
      rec.historico.push({ em: t, por: u.nome, acao: ex ? 'Imagens/dados da ata atualizados' : 'Ata enviada para exame (' + paginas.length + ' página(s))' });
      if (!ex) db.atas.push(rec);
      log(u, ex ? 'editar' : 'criar', 'Ata ' + (rec.numeros || '') + ' · livro ' + (rec.livro || ''), 'ata', rec.id); save();
      return { item: clone(rec) };
    }
    const x = getAta(u, id);
    let acao = '';
    if (op === 'excluir') {
      if (!(isAdmin(u) || (x.criadoPor === u.id && x.status === 'Enviada'))) fail('Você não pode excluir esta ata.', 'FORBIDDEN');
      db.atas = db.atas.filter(a => a.id !== id);
      log(u, 'excluir', 'Ata ' + (x.numeros || ''), 'ata', id); save();
      return {};
    }
    if (!podeAnalisarAta(u, x)) fail('Você não pode analisar esta ata.', 'FORBIDDEN');
    if (op === 'ia') {
      if (!p.resultado || !Array.isArray(p.resultado.itens)) fail('Resultado da IA inválido.');
      x.ia = { resultado: clone(p.resultado), modelo: p.modelo || '', em: t, porNome: u.nome };
      if (x.status === 'Enviada') x.status = 'Em análise';
      acao = 'Proposta de análise gerada pela IA';
    } else if (op === 'conferencia') {
      x.conferencia = clone(p.itens || {});
      if (x.status === 'Enviada') x.status = 'Em análise';
      acao = 'Conferência das regras atualizada';
    } else if (op === 'final') {
      const texto = String(p.texto || '').trim();
      if (!texto) fail('Escreva o parecer.');
      if (!['Conforme', 'Conforme com observações', 'Não conforme'].includes(p.conclusao)) fail('Escolha a conclusão.');
      x.final = { texto, conclusao: p.conclusao, porId: u.id, porNome: u.nome, em: t };
      x.status = 'Analisada';
      acao = 'Parecer do relator registrado: ' + p.conclusao;
    } else if (op === 'reabrir') {
      if (!isAdmin(u) && x.final && x.final.porId !== u.id) fail('Só o relator ou o administrador pode reabrir.', 'FORBIDDEN');
      x.status = 'Em análise'; acao = 'Exame reaberto';
    } else fail('Operação desconhecida.');
    x.updatedAt = t;
    x.historico.push({ em: t, por: u.nome, acao });
    log(u, 'ata_' + op, 'Ata ' + (x.numeros || '') + ' · ' + acao, 'ata', x.id); save();
    return { item: clone(x) };
  };

  /* ---------------- reunião do concílio: comissões, delegados, documentos, pareceres ---------------- */
  // Itens guardados em db.reuniao (no Supabase: tabela ipb_reuniao_itens). Tipos:
  // cfg (dados do presbitério), reuniao, delegado, documento, parecer, estatistica, financa.
  const R_TIPOS = ['cfg', 'reuniao', 'delegado', 'documento', 'parecer', 'estatistica', 'financa', 'ata', 'tesouraria'];
  const R_SECOES = ['executiva', 'tesouraria', 'institucional', 'concilios', 'correspondencia', 'outros'];
  const R_MIME = /^(application\/pdf|image\/(png|jpeg|webp|gif)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|application\/msword|application\/vnd\.ms-excel)$/;
  const P_STATUS = ['rascunho', 'concluido', 'aprovado', 'emendas', 'rejeitado'];
  const P_PLENARIO = ['aprovado', 'emendas', 'rejeitado'];
  const rItens = () => (db.reuniao = db.reuniao || []);
  const rGet = id => rItens().find(x => x.id === id);
  const rSemArquivo = x => clone(x);
  function delegadosDe(comissaoId, reuniaoId) { return rItens().filter(x => x.tipo === 'delegado' && x.comissaoId === comissaoId && x.reuniaoId === reuniaoId); }
  // quem pode escrever o parecer de uma comissão naquela reunião
  function podeParecer(u, comissaoId, reuniaoId) {
    if (isAdmin(u)) return true;
    if (u.role === 'leitor') return false;
    const ds = delegadosDe(comissaoId, reuniaoId);
    if (ds.some(d => d.userId === u.id)) return true;
    return u.role === 'analista' && !ds.some(d => d.userId);
  }
  // a tesouraria do presbitério é editada só pelo administrador e pelos usuários marcados como tesoureiro (cfg.tesoureiros)
  function ehTesoureiro(u) {
    if (isAdmin(u)) return true;
    const c = rGet('cfg');
    return !!(c && Array.isArray(c.tesoureiros) && c.tesoureiros.includes(u.id) && u.role !== 'leitor');
  }
  function souRelator(u, comissaoId, reuniaoId) {
    if (isAdmin(u)) return true;
    const ds = delegadosDe(comissaoId, reuniaoId);
    const rel = ds.find(d => d.funcao === 'Relator' && d.userId);
    return rel ? rel.userId === u.id : podeParecer(u, comissaoId, reuniaoId);
  }
  const R_CAMPOS = {
    cfg: ['nome', 'sigla', 'cidade', 'uf', 'sinodo', 'presidente', 'secretario', 'tesoureiro', 'tesoureiros', 'igrejas', 'reuniaoAtual', 'anos', 'tesouraria'],
    reuniao: ['tipoReuniao', 'numero', 'ano', 'dataInicio', 'dataFim', 'local', 'cidade', 'materia', 'codigo', 'nome', 'presidente', 'secretario', 'mesa', 'dataConvocacao', 'convocadaPor', 'pauta', 'legislatura', 'secretarias', 'tutores', 'representantes', 'campo'],
    delegado: ['reuniaoId', 'comissaoId', 'tratamento', 'nome', 'igreja', 'funcao', 'userId'],
    documento: ['reuniaoId', 'comissaoId', 'numero', 'titulo', 'tipoDoc', 'origem', 'resumo', 'arquivoNome', 'secao', 'pasta', 'ano', 'data', 'restrito'],
    parecer: ['reuniaoId', 'comissaoId', 'modelo', 'data', 'destino', 'cidade', 'docNumero', 'titulo', 'assunto', 'docsAnalisados', 'origens', 'documentoIds', 'campos', 'assinaturas'],
    estatistica: ['ano', 'igreja', 'valores', 'fonte'],
    financa: ['ano', 'valores', 'fonte'],
    ata: ['reuniaoId', 'numero', 'livro', 'folhas', 'data', 'horaInicio', 'horaFim', 'presentesMinistros', 'presentesPresbiteros', 'ausencias', 'devocional', 'expediente', 'registros', 'encerramento', 'incluirPareceres', 'situacao'],
    tesouraria: ['ano', 'grupo', 'ordem', 'nome', 'previstoAnual', 'mensal', 'restoAnterior', 'lancamentos', 'obs']
  };
  function rValidar(tipo, it) {
    if (tipo === 'reuniao' && !(it.ano > 1900 && it.numero > 0)) fail('Informe o número e o ano da reunião.');
    if (tipo === 'delegado') {
      if (!String(it.nome || '').trim() && !it.userId) fail('Informe o nome do membro.');
      if (!['Relator', 'Participante'].includes(it.funcao)) fail('A função deve ser Relator ou Participante.');
      if (!rGet(it.reuniaoId)) fail('Escolha a reunião.');
      if (!db.comissoes.find(c => c.id === it.comissaoId)) fail('Escolha a comissão.');
    }
    if (tipo === 'documento') {
      if (!String(it.titulo || '').trim()) fail('Informe o título do documento.');
      // documento do acervo: ou pertence a uma reunião, ou a uma seção do ano, ou aos permanentes (institucional)
      if (it.reuniaoId) { if (!rGet(it.reuniaoId)) fail('Escolha a reunião.'); }
      else if (!R_SECOES.includes(it.secao)) fail('Escolha a reunião ou a seção do acervo.');
      else if (it.secao !== 'institucional' && !(Number(it.ano) > 1900)) fail('Informe o ano do documento.');
    }
    if (tipo === 'tesouraria') {
      if (!(Number(it.ano) > 1900)) fail('Informe o ano.');
      if (!['pastores', 'igrejas', 'despesas'].includes(it.grupo)) fail('Escolha o grupo da conta.');
      if (!String(it.nome || '').trim()) fail('Informe o nome da conta.');
    }
    if (tipo === 'ata' && !rGet(it.reuniaoId)) fail('Escolha a reunião.');
    if (tipo === 'parecer') {
      if (!rGet(it.reuniaoId)) fail('Escolha a reunião.');
      if (!db.comissoes.find(c => c.id === it.comissaoId)) fail('Escolha a comissão.');
      if (!String(it.assunto || '').trim()) fail('Informe o assunto do parecer.');
    }
    if ((tipo === 'estatistica' || tipo === 'financa') && !(Number(it.ano) > 1900)) fail('Informe o ano.');
  }

  A.reuniao = async ({ token, op, tipo, item, id, nome, dados, itens, status, emendas }) => {
    const u = session(token);
    const t = now();
    if (op === 'arquivo') {
      const d = rGet(id);
      if (!d || d.tipo !== 'documento' || !d.arquivo) fail('Este documento não tem arquivo.', 'NOTFOUND');
      if (d.restrito === true && !isAdmin(u)) fail('Documento de acesso restrito à Mesa (dados pessoais).', 'FORBIDDEN');
      const v = await idbOp('readonly', st => st.get('rd_' + d.id));
      if (!v) fail('O PDF deste documento não está neste navegador. Envie o arquivo de novo.', 'NOTFOUND');
      return { blob: v, nome: d.arquivo.nome, tipo: d.arquivo.tipo };
    }
    if (op === 'enviar_arquivo') {
      if (!isAdmin(u)) fail('Apenas a Mesa (administrador) envia documentos.', 'FORBIDDEN');
      const d = rGet(id);
      if (!d || d.tipo !== 'documento') fail('Documento não encontrado.', 'NOTFOUND');
      const m = /^data:([\w/.+-]+);base64,/.exec(dados || '');
      if (!m || !R_MIME.test(m[1])) fail('Envie PDF, imagem, Word ou Excel.');
      const bytes = b64d(dados.slice(m[0].length));
      if (bytes.length > 15e6) fail('O arquivo passa de 15 MB.');
      await idbOp('readwrite', st => st.put(new Blob([bytes], { type: m[1] }), 'rd_' + d.id));
      let sha256 = '';
      try { sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join(''); } catch (e) { /* sem crypto.subtle */ }
      d.arquivo = { nome: String(nome || 'documento.pdf'), tipo: m[1], tamanho: bytes.length, em: t, por: u.nome, sha256 };
      d.updatedAt = t;
      log(u, 'documento', 'Arquivo do documento ' + (d.numero || '') + ' enviado', 'documento', d.id); save();
      return { item: rSemArquivo(d) };
    }
    if (op === 'importar') {
      if (!Array.isArray(itens)) fail('Arquivo inválido.');
      // o tesoureiro pode importar (copiar o ano) só itens da tesouraria
      if (!isAdmin(u) && !(ehTesoureiro(u) && itens.every(x => x && x.tipo === 'tesouraria'))) fail('Apenas o administrador importa dados.', 'FORBIDDEN');
      let n = 0;
      for (const x of itens) {
        if (!x || !R_TIPOS.includes(x.tipo) || !x.id) continue;
        const ex = rGet(x.id);
        const base = { id: String(x.id), tipo: x.tipo };
        const rec = Object.assign(ex || base, pick(x, R_CAMPOS[x.tipo]), { updatedAt: t });
        if (x.tipo === 'parecer') { rec.status = P_STATUS.includes(x.status) ? x.status : 'rascunho'; rec.emendas = x.emendas || ''; rec.historico = rec.historico || [{ em: t, por: u.nome, acao: 'Importado' }]; }
        if (x.tipo === 'documento') rec.arquivo = ex ? ex.arquivo || null : null; // o PDF é enviado depois, arquivo por arquivo
        if (!ex) rItens().push(rec);
        n++;
      }
      for (const c of (itens || []).filter(x => x && x.tipo === 'comissao' && x.id && x.nome)) {
        const ex = db.comissoes.find(y => y.id === c.id);
        const rec = Object.assign(ex || { id: c.id, membros: [], ativa: true }, pick(c, COMISSAO_CAMPOS));
        if (!ex) db.comissoes.push(rec);
        n++;
      }
      log(u, 'importar', n + ' itens da reunião importados', 'reuniao', ''); save();
      return { importados: n };
    }
    if (op === 'decidir') {
      if (!isAdmin(u)) fail('Só a Mesa registra a decisão do plenário.', 'FORBIDDEN');
      const p = rGet(id);
      if (!p || p.tipo !== 'parecer') fail('Parecer não encontrado.', 'NOTFOUND');
      if (!P_STATUS.includes(status)) fail('Situação inválida.');
      p.status = status; p.emendas = String(emendas || ''); p.updatedAt = t;
      p.historico = (p.historico || []).concat({ em: t, por: u.nome, acao: 'Plenário: ' + status });
      log(u, 'parecer', 'Decisão do plenário: ' + status, 'parecer', p.id); save();
      return { item: clone(p) };
    }
    if (op === 'excluir') {
      const x = rGet(id);
      if (!x) fail('Registro não encontrado.', 'NOTFOUND');
      const pode = isAdmin(u) || (x.tipo === 'tesouraria' && ehTesoureiro(u)) || (x.tipo === 'parecer' && x.status === 'rascunho' && x.criadoPor === u.id);
      if (!pode) fail('Você não pode excluir este registro.', 'FORBIDDEN');
      db.reuniao = rItens().filter(y => y.id !== id);
      if (x.tipo === 'reuniao') db.reuniao = db.reuniao.filter(y => y.reuniaoId !== id);
      if (x.tipo === 'documento') await idbOp('readwrite', st => st.delete('rd_' + id)).catch(() => {});
      log(u, 'excluir', x.tipo + ' ' + (x.nome || x.titulo || x.assunto || id), x.tipo, id); save();
      return {};
    }
    if (op !== 'salvar') fail('Operação desconhecida.');
    if (!R_TIPOS.includes(tipo)) fail('Tipo desconhecido.');
    const it = clone(item || {});
    if (tipo === 'cfg') it.id = 'cfg';
    const ex = it.id ? rGet(it.id) : null;
    if (ex && ex.tipo !== tipo) fail('Registro de outro tipo.');
    if (tipo === 'tesouraria') { if (!ehTesoureiro(u)) fail('Apenas o tesoureiro e o administrador editam a tesouraria.', 'FORBIDDEN'); }
    else if (tipo === 'cfg' && !isAdmin(u) && ehTesoureiro(u)) { for (const k of Object.keys(it)) if (k !== 'id' && k !== 'tesouraria') delete it[k]; } // o tesoureiro só muda o saldo anterior
    else if (tipo !== 'parecer' && !isAdmin(u)) fail('Apenas a Mesa (administrador) pode fazer isso.', 'FORBIDDEN');
    rValidar(tipo, Object.assign({}, ex || {}, it));
    let rec;
    if (tipo === 'parecer') {
      const alvo = Object.assign({}, ex || {}, it);
      if (!podeParecer(u, alvo.comissaoId, alvo.reuniaoId)) fail('Você não é membro desta comissão.', 'FORBIDDEN');
      if (ex && P_PLENARIO.includes(ex.status) && !isAdmin(u)) fail('O plenário já decidiu sobre este parecer.', 'FORBIDDEN');
      if (ex && (ex.comissaoId !== alvo.comissaoId || ex.reuniaoId !== alvo.reuniaoId) && !isAdmin(u)) fail('Não é possível mudar a comissão do parecer.', 'FORBIDDEN');
      let st = it.status === 'concluido' ? 'concluido' : 'rascunho';
      if (st === 'concluido' && !souRelator(u, alvo.comissaoId, alvo.reuniaoId)) fail('Só o relator da comissão conclui o parecer.', 'FORBIDDEN');
      rec = Object.assign(ex || { id: uid('pa_'), tipo, criadoPor: u.id, criadoPorNome: u.nome, createdAt: t, historico: [], emendas: '' }, pick(it, R_CAMPOS.parecer), { status: st, updatedAt: t, atualizadoPorNome: u.nome });
      rec.historico.push({ em: t, por: u.nome, acao: ex ? (st === 'concluido' ? 'Concluído e enviado ao plenário' : 'Editado') : 'Criado' });
    } else {
      rec = Object.assign(ex || { id: it.id && tipo === 'cfg' ? 'cfg' : uid({ reuniao: 'ru_', delegado: 'de_', documento: 'do_', estatistica: 'es_', financa: 'fi_', ata: 'ag_', tesouraria: 'te_' }[tipo] || 'x_'), tipo, createdAt: t }, pick(it, R_CAMPOS[tipo]), { updatedAt: t });
      if (tipo === 'delegado' && rec.userId) { const us = db.usuarios.find(x => x.id === rec.userId); if (!us) rec.userId = null; else if (!rec.nome) rec.nome = us.nome; }
      // um relator por comissão; no exame de atas, um por igreja (campo igreja)
      if (tipo === 'delegado' && rec.funcao === 'Relator') delegadosDe(rec.comissaoId, rec.reuniaoId).forEach(d => { if (d.id !== rec.id && d.funcao === 'Relator' && (d.igreja || '') === (rec.igreja || '')) d.funcao = 'Participante'; });
      if (tipo === 'documento') rec.arquivo = ex ? ex.arquivo || null : null;
    }
    if (!ex) rItens().push(rec);
    log(u, ex ? 'editar' : 'criar', tipo + ' ' + (rec.nome || rec.titulo || rec.assunto || rec.ano || rec.id), tipo, rec.id); save();
    return { item: clone(rec) };
  };

  A.verificar = async ({ codigo }) => {
    const c = String(codigo || '').trim().toUpperCase();
    for (const r of db.relatorios) {
      const s = (r.analise.assinaturas || []).find(x => x.codigo === c);
      if (s) {
        const ig = db.igrejas.find(i => i.id === r.igrejaId);
        const atual = await conteudoHash(r);
        return { encontrado: true, integro: atual === s.conteudoHash, assinatura: { nome: s.nome, funcao: s.funcao, em: s.em, tipo: s.tipo, codigo: s.codigo }, relatorio: { titulo: r.titulo, ano: r.ano, status: r.status, igreja: ig ? ig.nome : '', comissao: r.analise.comissaoNome } };
      }
    }
    return { encontrado: false };
  };

  async function call(req) {
    if (!load()) await seed();
    const fn = A[req && req.action];
    if (!fn) fail('Ação desconhecida.');
    return await fn(req);
  }

  window.IPB_LOCAL = {
    call,
    reset: async () => { db = null; try { localStorage.removeItem(KEY); } catch (e) {} await seed(); },
    exportar: () => { load(); return clone(db); },
    importar: (data) => { if (!data || !Array.isArray(data.relatorios)) fail('Arquivo inválido.'); db = data; save(); }
  };
})();
