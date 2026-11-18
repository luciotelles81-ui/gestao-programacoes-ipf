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

  let db = null;
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { db = null; }
    return db;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* sem armazenamento */ } }

  async function seed() {
    const t = now();
    db = { igrejas: [], usuarios: [], modelos: [], comissoes: [], relatorios: [], atas: [], sessoes: [], log: [] };
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

  A.publico = () => ({ igrejas: db.igrejas.filter(i => i.ativo).map(i => ({ id: i.id, nome: i.nome, sigla: i.sigla })), modo: 'local' });

  A.login = async ({ igrejaId, username, senha }) => {
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
    return { token, usuario: pubUser(u) };
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
      const rec = Object.assign(ex || { id: uid('co_') }, pick(item, ['nome', 'tipo', 'ano']), { membros, ativa: item.ativa !== false });
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
