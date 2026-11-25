/* Relatórios IPB · aplicação (sem dependências externas) */
(function () {
  'use strict';
  const CFG = window.IPB_CONFIG || {};
  const SERVER = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const TOKEN_KEY = 'ipb-relatorios-token';
  const THEME_KEY = 'ipb-relatorios-tema';
  const ROLE_NOMES = { admin: 'Administrador', editor: 'Editor (preenche relatórios)', analista: 'Analista (comissão)', leitor: 'Somente leitura' };
  const DECISOES = ['Aprovar', 'Aprovar com ressalvas', 'Devolver para correção'];
  const STATUS = ['Rascunho', 'Enviado', 'Em análise', 'Aprovado', 'Aprovado com ressalvas', 'Devolvido'];

  const LAYOUT_KEY = 'ipb-relatorios-layout';
  const S = { token: null, user: null, d: null, publico: null, edit: null, tab: 'form', ataEdit: null, filtroIgreja: '', filtros: {}, layout: 'folha', ind: { modo: 'igreja' } };
  const CELULAR = () => matchMedia('(max-width: 700px)').matches;
  try { S.layout = localStorage.getItem(LAYOUT_KEY) || (CELULAR() ? 'lista' : 'folha'); } catch (e) { S.layout = CELULAR() ? 'lista' : 'folha'; }
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const root = () => document.getElementById('root');

  /* ======================= utilidades ======================= */
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = v => 'R$ ' + nf2.format(Number(v) || 0);
  const moneyK = v => { v = Number(v) || 0; return Math.abs(v) >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi' : Math.abs(v) >= 1e3 ? 'R$ ' + nf0.format(v / 1e3) + ' mil' : money(v); };
  const num = v => nf0.format(Number(v) || 0);
  const pct = v => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '–');
  function dt(iso, comHora) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('pt-BR') + (comHora ? ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  }
  const badge = st => `<span class="badge st-${esc(String(st).replace(/ /g, '-'))}">${esc(st)}</span>`;
  function toast(msg, err) {
    const t = document.createElement('div');
    t.className = 'toast' + (err ? ' err' : '');
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), err ? 6000 : 3500);
  }
  const igreja = id => (S.d && S.d.igrejas.find(i => i.id === id)) || null;
  const igNome = id => { const i = igreja(id); return i ? i.nome : 'Presbitério (todas as igrejas)'; };
  const isAdmin = () => S.user && S.user.role === 'admin';
  const isPresb = () => S.user && !S.user.igrejaId;
  const podeEditar = r => (isAdmin() || S.user.role === 'editor') && ['Rascunho', 'Devolvido'].includes(r.status);
  const podeAnalisar = r => (isAdmin() || S.user.role === 'analista') && ['Enviado', 'Em análise'].includes(r.status);
  const modelo = id => S.d.modelos.find(m => m.id === id);

  /* ======================= API ======================= */
  async function api(req) {
    if (S.token && !req.token) req.token = S.token;
    if (!SERVER) {
      try { return await window.IPB_LOCAL.call(req); } catch (e) { if (e.code === 'AUTH' && req.action !== 'logout' && S.user) sair(true); throw e; }
    }
    const r = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/ipb_api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey },
      body: JSON.stringify({ req })
    });
    let j = null;
    try { j = await r.json(); } catch (e) { /* vazio */ }
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || 'Falha de comunicação com o servidor (' + r.status + ').');
    if (j && j.erro) { const e = new Error(j.erro); e.code = j.code; if (j.code === 'AUTH' && req.action !== 'logout' && S.user) sair(true); throw e; }
    return j;
  }
  async function ia(body) {
    if (!SERVER) throw new Error('A análise pela IA precisa do sistema conectado ao servidor (Supabase).');
    const r = await fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/functions/v1/ipb-analise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey },
      body: JSON.stringify(Object.assign({ token: S.token }, body))
    });
    let j = null;
    try { j = await r.json(); } catch (e) { /* vazio */ }
    if (!r.ok || !j || j.erro) throw new Error((j && j.erro) || 'A IA não respondeu (' + r.status + ').');
    return j;
  }
  async function recarregar() { S.d = await api({ action: 'dados' }); S.user = S.d.usuario; }
  async function acao(fn, okMsg) {
    try { const r = await fn(); if (okMsg) toast(okMsg); return r; } catch (e) { toast(e.message || String(e), true); return null; }
  }

  /* ======================= fórmulas ======================= */
  const FUNCS = {
    abs: Math.abs, min: Math.min, max: Math.max, round: (v, d) => { const p = Math.pow(10, d || 0); return Math.round(v * p) / p; },
    sum: (arr, de, ate) => { if (!Array.isArray(arr)) return Number(arr) || 0; const a = de == null ? 0 : de; const b = ate == null ? arr.length - 1 : ate; let s = 0; for (let i = a; i <= b && i < arr.length; i++) s += Number(arr[i]) || 0; return s; }
  };
  const compiled = {};
  function compile(expr) {
    if (compiled[expr]) return compiled[expr];
    const toks = String(expr).match(/'[^']*'|\d+(?:\.\d+)?|[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?|&&|\|\||==|!=|>=|<=|[-+*/()<>!,?:%]/g) || [];
    let js = '';
    toks.forEach((t, i) => {
      if (/^[A-Za-z_]/.test(t)) {
        if (toks[i + 1] === '(' && FUNCS[t]) js += 'F.' + t;
        else if (t.includes('.')) { const [a, b] = t.split('.'); js += 'T(' + JSON.stringify(a) + ',' + JSON.stringify(b) + ')'; }
        else if (t === 'true' || t === 'false') js += t;
        else js += 'V(' + JSON.stringify(t) + ')';
      } else js += ' ' + t + ' ';
    });
    let fn;
    try { fn = new Function('V', 'T', 'F', 'return (' + (js || '0') + ');'); } catch (e) { fn = () => NaN; }
    compiled[expr] = fn;
    return fn;
  }
  // Contexto de avaliação de um relatório (dados + definição do modelo)
  function ctx(mod, dados) {
    const defs = {};
    (mod.secoes || []).forEach(s => (s.campos || []).forEach(c => { defs[c.id] = c; }));
    const cache = {};
    const busy = {};
    function V(id) {
      if (id in cache) return cache[id];
      const c = defs[id];
      let v = dados ? dados[id] : undefined;
      if (c && c.tipo === 'calc') {
        if (busy[id]) return 0;
        busy[id] = true;
        try { v = Number(compile(c.formula)(V, T, FUNCS)); } catch (e) { v = NaN; }
        busy[id] = false;
        if (!isFinite(v)) v = 0;
        v = Math.round(v * 100) / 100;
      } else if (c && ['number', 'money'].includes(c.tipo)) v = Number(v) || 0;
      else if (c && c.tipo === 'checks') v = Array.isArray(v) ? v.length : 0;
      else if (v == null) v = c ? '' : 0;
      cache[id] = v;
      return v;
    }
    function T(tab, col) {
      const c = defs[tab];
      const rows = (dados && Array.isArray(dados[tab])) ? dados[tab] : [];
      const cd = c && (c.colunas || []).find(x => x.id === col);
      const n = c && c.linhas ? c.linhas.length : rows.length;
      const out = [];
      for (let i = 0; i < n; i++) out.push(cel(c, rows[i] || {}, cd));
      return out;
    }
    return { V, T, defs, eval: expr => { try { return compile(expr)(V, T, FUNCS); } catch (e) { return NaN; } } };
  }
  function cel(tabDef, row, cd) {
    if (!cd) return 0;
    if (cd.tipo === 'calc') {
      const RV = id => Number(id === cd.id ? 0 : (tabDef.colunas.find(x => x.id === id) || {}).tipo === 'calc' ? cel(tabDef, row, tabDef.colunas.find(x => x.id === id)) : row[id]) || 0;
      try { const v = compile(cd.formula)(RV, () => [], FUNCS); return isFinite(v) ? v : 0; } catch (e) { return 0; }
    }
    if (['number', 'money'].includes(cd.tipo)) return Number(row[cd.id]) || 0;
    return row[cd.id] == null ? '' : row[cd.id];
  }
  function fmtCampo(c, v) {
    if (c.tipo === 'money' || c.formato === 'money') return money(v);
    if (c.tipo === 'number' || c.tipo === 'calc') return num(v);
    if (c.tipo === 'yesno') return v === 'sim' ? 'Sim' : v === 'nao' ? 'Não' : '–';
    if (c.tipo === 'checks') return Array.isArray(v) && v.length ? v.join(', ') : '–';
    if (c.tipo === 'date') return dt(v);
    return v || '–';
  }

  /* ======================= verificações ======================= */
  function anterior(r) {
    return S.d.relatorios.filter(x => x.igrejaId === r.igrejaId && x.modeloId === r.modeloId && x.ano === r.ano - 1 && x.id !== r.id)[0] || null;
  }
  function verificar(r) {
    const mod = r.modelo || modelo(r.modeloId);
    const C = ctx(mod, r.dados || {});
    const out = [];
    (mod.secoes || []).forEach(s => (s.campos || []).forEach(c => {
      if (!c.obrigatorio) return;
      const v = (r.dados || {})[c.id];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) out.push({ nivel: 'erro', msg: 'Campo obrigatório não preenchido: ' + c.label });
    }));
    (mod.verificacoes || []).forEach(v => { if (C.eval(v.se) === true) out.push({ nivel: v.nivel || 'alerta', msg: v.msg }); });
    const ant = anterior(r);
    if (ant && (mod.continuidade || []).length) {
      const CA = ctx(ant.modelo || mod, ant.dados || {});
      mod.continuidade.forEach(k => {
        const a = Number(C.eval(k.atual)), b = Number(CA.eval(k.anterior));
        if (isFinite(a) && isFinite(b) && Math.abs(a - b) > 0.009) {
          const fm = /saldo|fin_/.test(k.atual) ? money : num;
          out.push({ nivel: 'alerta', msg: k.msg + ' Informado agora: ' + fm(a) + '; no relatório de ' + ant.ano + ': ' + fm(b) + '.' });
        }
      });
    }
    return out;
  }
  function comparacao(r) {
    const mod = r.modelo || modelo(r.modeloId);
    const ant = anterior(r);
    const C = ctx(mod, r.dados || {});
    const CA = ant ? ctx(ant.modelo || mod, ant.dados || {}) : null;
    const rows = [];
    (mod.secoes || []).forEach(s => (s.campos || []).forEach(c => {
      if (!c.indicador) return;
      const a = Number(C.V(c.id)), b = CA ? Number(CA.V(c.id)) : null;
      rows.push({ c, atual: a, anterior: b, varia: b ? (a - b) / Math.abs(b) : null });
    }));
    return { ant, rows };
  }
  function alertasHTML(list) {
    if (!list.length) return '<div class="alert ok">✓ Nenhuma inconsistência encontrada nas verificações automáticas.</div>';
    const er = list.filter(x => x.nivel === 'erro'), al = list.filter(x => x.nivel !== 'erro');
    return (er.length ? `<div class="alert err"><div><b>${er.length} problema(s)</b><ul>${er.map(x => '<li>' + esc(x.msg) + '</li>').join('')}</ul></div></div>` : '') +
      (al.length ? `<div class="alert warn"><div><b>${al.length} ponto(s) de atenção</b><ul>${al.map(x => '<li>' + esc(x.msg) + '</li>').join('')}</ul></div></div>` : '');
  }

  /* ======================= tema e rotas ======================= */
  function aplicarTema() {
    let t = null;
    try { t = localStorage.getItem(THEME_KEY); } catch (e) { /* sem armazenamento */ }
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  }
  function trocarTema() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    try { localStorage.setItem(THEME_KEY, dark ? 'light' : 'dark'); } catch (e) { /* sem armazenamento */ }
    aplicarTema();
  }
  function rota() { const h = location.hash.replace(/^#\/?/, ''); const [p, ...rest] = h.split('/'); return { p: p || 'painel', a: rest.map(decodeURIComponent) }; }
  function ir(h) { if (location.hash === '#/' + h) render(); else location.hash = '#/' + h; }
  window.addEventListener('hashchange', () => render());

  /* ======================= login ======================= */
  function sair(expirou) {
    if (S.token && !expirou) api({ action: 'logout' }).catch(() => {});
    S.token = null; S.user = null; S.d = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* sem armazenamento */ }
    if (expirou) toast('Sua sessão terminou. Entre novamente.', true);
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    render();
  }
  function telaPrimeiroAcesso() {
    root().innerHTML = `<div class="login-form" style="min-height:100vh"><div class="card"><h2>Primeiro acesso</h2>
      <p class="muted small" style="margin:4px 0 0">O sistema ainda não tem usuários. Crie o administrador do Presbitério. Ele cadastra os demais usuários e as comissões.</p>
      <form id="fPA"><div class="field"><label>Nome completo</label><input type="text" id="paN" required></div>
      <div class="field"><label>Usuário</label><input type="text" id="paU" value="admin" required autocomplete="username"></div>
      <div class="field"><label>Senha (mínimo 8 caracteres)</label><input type="password" id="paS" required autocomplete="new-password"></div>
      <button class="btn primary">Criar administrador</button></form></div></div>`;
    $('#fPA').onsubmit = async e => {
      e.preventDefault();
      if (await acao(() => api({ action: 'primeiro_admin', nome: $('#paN').value.trim(), username: $('#paU').value.trim(), senha: $('#paS').value }), 'Administrador criado. Entre com o usuário e a senha.')) { S.publico = null; render(); }
    };
  }
  function telaLogin() {
    if (S.publico && S.publico.primeiroAcesso) return telaPrimeiroAcesso();
    const igs = (S.publico && S.publico.igrejas) || [];
    root().innerHTML = `
      <div class="login">
        <div class="login-hero">
          <div class="brand" style="padding:0">${logo(48)}<div><b>Relatórios IPB</b><span>Presbitério Litorâneo do RN</span></div></div>
          <div>
            <h1>Relatórios das igrejas, do preenchimento ao parecer da comissão.</h1>
            <p>Formulários oficiais, histórico dos anos anteriores, exame de atas pelo Manual Presbiteriano e assinatura eletrônica dos membros da comissão.</p>
            <ul>
              <li>Cada igreja entra com seu próprio usuário</li>
              <li>A IA propõe uma análise inicial; o texto final é do relator</li>
              <li>Pareceres assinados com código de verificação</li>
            </ul>
          </div>
          <div class="foot small" style="color:var(--side-muted)">Igreja Presbiteriana do Brasil</div>
        </div>
        <div class="login-form">
          <div class="card">
            <h2>Entrar</h2>
            <p class="muted small" style="margin:4px 0 0">Escolha a igreja e informe seu usuário e senha.</p>
            <form id="fLogin">
              <div class="field"><label for="lIg">Igreja</label>
                <select id="lIg"><option value="">Presbitério (comissões e administração)</option>${igs.map(i => `<option value="${esc(i.id)}">${esc(i.nome)}</option>`).join('')}</select></div>
              <div class="field"><label for="lUs">Usuário</label><input id="lUs" type="text" autocomplete="username" required></div>
              <div class="field"><label for="lPw">Senha</label><input id="lPw" type="password" autocomplete="current-password" required></div>
              <button class="btn primary" type="submit">Entrar</button>
            </form>
            <p class="small" style="margin-top:14px"><a href="#/verificar">Verificar uma assinatura</a></p>
            ${SERVER ? '' : S.publico && (S.publico.pacoteFechado || S.publico.reunioesFechadas) ? `<div class="alert info" style="margin-top:14px"><div><b>Dados do Presbitério</b><br>Para carregar os relatórios de 2023 a 2025 com os PDFs originais e as reuniões do presbitério (acervo, membros das comissões e tesouraria), deixe "Presbitério" na igreja, use o usuário <code>admin</code> e a <b>senha dos dados</b> que você recebeu. Isso só é preciso uma vez neste navegador.</div></div>
              <div class="demo"><b>Modo demonstração</b> (dados só neste navegador). Para só testar, sem os dados reais: <code>admin</code>/<code>admin123</code>.</div>`
              : `<div class="demo"><b>Modo demonstração</b> (dados só neste navegador). Presbitério: ${S.publico && S.publico.pacoteAberto ? '<code>admin</code> com a senha dos dados' : '<code>admin</code>/<code>admin123</code>'}, <code>relator</code>/<code>relator123</code>, <code>membro</code>/<code>membro123</code>. Igreja Filadélfia: <code>secretario</code>/<code>secretario123</code>.</div>`}
          </div>
        </div>
      </div>`;
    $('#fLogin').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#fLogin button'); btn.disabled = true;
      const r = await acao(() => api({ action: 'login', igrejaId: $('#lIg').value || null, username: $('#lUs').value.trim(), senha: $('#lPw').value.trim() }));
      btn.disabled = false;
      if (!r) return;
      if (r.pacoteAberto) toast('Dados do Presbitério carregados: ' + r.pacoteAberto + ' relatórios com os originais anexados.');
      if (r.reunioesAbertas) setTimeout(() => toast('Reuniões, acervo, membros das comissões e tesouraria carregados (' + r.reunioesAbertas + ' itens).'), r.pacoteAberto ? 3500 : 0);
      S.publico = null;
      S.token = r.token;
      try { localStorage.setItem(TOKEN_KEY, r.token); } catch (err) { /* sem armazenamento */ }
      await acao(recarregar);
      render();
    };
  }
  function logo(sz, cor) {
    // logotipo oficial da IPB (img/); se a imagem não carregar, fica o símbolo desenhado
    if (cor !== false) return `<img class="logo-ipb" src="img/${cor ? 'logo-ipb.png' : 'logo-ipb-branco.png'}" alt="Igreja Presbiteriana do Brasil" style="height:${sz}px;width:auto" onerror="this.style.display='none'">`;
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#fff"/><path d="M24 9c-6 7-11 11-11 18a11 11 0 0 0 22 0c0-7-5-11-11-18z" fill="#2c5234"/><path d="M24 21v15M18 28h12" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>`;
  }

  /* ======================= app no celular ======================= */
  let pedidoInstalar = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; });
  const jaInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  async function instalarApp() {
    if (pedidoInstalar) { pedidoInstalar.prompt(); const r = await pedidoInstalar.userChoice.catch(() => null); pedidoInstalar = null; if (r && r.outcome === 'accepted') toast('Aplicativo instalado na tela inicial.'); return; }
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const m = modal('Instalar no celular', ios
      ? '<ol style="margin:0;padding-left:20px;line-height:1.7"><li>Abra este endereço no <b>Safari</b>.</li><li>Toque no botão <b>Compartilhar</b> (quadrado com seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li></ol>'
      : '<ol style="margin:0;padding-left:20px;line-height:1.7"><li>Abra este endereço no <b>Chrome</b> do celular.</li><li>Toque no menu <b>⋮</b> no canto superior.</li><li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li></ol>',
      '<button class="btn primary" data-x>Entendi</button>');
    $('[data-x]', m.el).onclick = m.fechar;
  }

  /* ======================= layout ======================= */
  function contagens() {
    const rel = S.d.relatorios;
    const analisar = rel.filter(r => ['Enviado', 'Em análise'].includes(r.status)).length;
    const devolvidos = rel.filter(r => r.status === 'Devolvido').length;
    const atas = (S.d.atas || []).filter(a => a.status !== 'Analisada').length;
    return { analisar, devolvidos, atas };
  }
  function shell(pagina, html) {
    const c = contagens();
    const u = S.user;
    const nav = (h, label, ic, n) => `<a href="#/${h}" class="${pagina === h.split('/')[0] || (h === 'admin/comissoes' && pagina === 'admin-comissoes') ? 'active' : ''}">${ic} ${label}${n ? `<span class="count">${n}</span>` : ''}</a>`;
    root().innerHTML = `
      <div class="topbar no-print"><button id="mnu" aria-label="Abrir menu">☰</button><b>Relatórios IPB</b></div>
      <div class="app">
        <aside class="side" id="side">
          <div class="brand">${logo(34)}<div><b>Relatórios IPB</b><span>${esc(u.igrejaId ? (igreja(u.igrejaId) || {}).sigla || '' : 'Presbitério')}</span></div></div>
          <nav class="nav">
            ${nav('painel', 'Painel', '▦')}
            ${nav('indicadores', 'Indicadores', '↗')}
            ${nav('relatorios', 'Relatórios', '▤', u.role === 'analista' || isAdmin() ? c.analisar : c.devolvidos)}
            ${nav('atas', 'Exame de atas', '✎', u.role === 'analista' || isAdmin() ? c.atas : 0)}
            ${nav('verificar', 'Verificar assinatura', '✓')}
            <div class="nav-label">Reunião do concílio</div>
            ${nav('reuniao', 'Reunião', '⚖')}${nav('reunioes', 'Reuniões e convocações', '◷')}${nav('mesa', 'Mesa e secretarias', '♜')}${nav('ata-geral', 'Ata da reunião', '✎')}${nav('comissoes', 'Comissões', '⚑', window.IPB_REUNIAO ? window.IPB_REUNIAO.pendentes() : 0)}
            ${nav('acervo', 'Acervo de documentos', '▣')}${nav('tesouraria', 'Tesouraria do presbitério', '$')}${nav('documentos', 'Documentos da reunião', '▤')}${nav('delegados', 'Membros das comissões', '☺')}${nav('historico', 'Gráficos do presbitério', '◔')}
            ${isAdmin() ? `<div class="nav-label">Administração</div>
              ${nav('admin/igrejas', 'Igrejas', '⌂')}${nav('admin/usuarios', 'Usuários e acessos', '☺')}
              ${nav('admin/modelos', 'Modelos de relatório', '☰')}${nav('admin/comissoes', 'Comissões', '⚑')}${nav('admin/registro', 'Registro de ações', '≡')}` : ''}
          </nav>
          <div class="side-foot">
            <div class="who"><b>${esc(u.nome)}</b><span>${esc(ROLE_NOMES[u.role] || u.role)} · ${esc(u.igrejaId ? igNome(u.igrejaId) : 'Presbitério')}</span></div>
            <div class="row">
              <button class="side-btn" id="bConta">Minha senha</button>
              <button class="side-btn" id="bTema">Tema</button>
              <button class="side-btn" id="bSair">Sair</button>
            </div>
            ${jaInstalado() ? '' : '<button class="side-btn" id="bInstalar" style="margin-top:8px;width:100%">Instalar no celular</button>'}
            <div style="margin-top:10px"><span class="mode-pill ${SERVER ? 'on' : ''}">${SERVER ? 'Conectado ao servidor' : 'Modo demonstração'}</span></div>
          </div>
        </aside>
        <main class="main" id="main">${html}</main>
      </div>
      <nav class="bottom-nav no-print" aria-label="Navegação principal">
        ${[['painel', 'Painel', '▦', 0], ['indicadores', 'Indicadores', '↗', 0], ['relatorios', 'Relatórios', '▤', u.role === 'analista' || isAdmin() ? c.analisar : c.devolvidos], ['atas', 'Atas', '✎', u.role === 'analista' || isAdmin() ? c.atas : 0]]
          .map(([h, l, ic, n]) => `<a href="#/${h}" class="${pagina === h ? 'on' : ''}" ${pagina === h ? 'aria-current="page"' : ''}><span class="i">${ic}</span>${l}${n ? `<span class="count">${n}</span>` : ''}</a>`).join('')}
        <button type="button" id="bMais"><span class="i">☰</span>Mais</button>
      </nav>`;
    $('#mnu').onclick = () => $('#side').classList.toggle('open');
    $('#bMais').onclick = () => $('#side').classList.toggle('open');
    if ($('#bInstalar')) $('#bInstalar').onclick = instalarApp;
    $('#bSair').onclick = () => sair();
    $('#bTema').onclick = trocarTema;
    $('#bConta').onclick = modalSenha;
    $$('#side a').forEach(a => a.addEventListener('click', () => $('#side').classList.remove('open')));
  }
  function head(titulo, sub, acoes) {
    return `<div class="page-head"><div><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="actions no-print">${acoes || ''}</div></div>`;
  }

  /* ======================= modal ======================= */
  function modal(titulo, corpo, botoes, wide) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${titulo}</h2><button class="x" aria-label="Fechar">×</button></div><div class="modal-body">${corpo}</div><div class="modal-foot">${botoes || ''}</div></div>`;
    document.body.appendChild(ov);
    const fechar = () => ov.remove();
    $('.x', ov).onclick = fechar;
    ov.addEventListener('mousedown', e => { if (e.target === ov) fechar(); });
    const f = $('input,select,textarea', ov); if (f) setTimeout(() => f.focus(), 30);
    return { el: ov, fechar };
  }
  function modalSenha() {
    const m = modal('Trocar minha senha', `
      <div class="field"><label>Senha atual</label><input type="password" id="pA"></div>
      <div class="field"><label>Nova senha (mínimo 6 caracteres)</label><input type="password" id="pN"></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="pOk">Salvar</button>');
    $('[data-x]', m.el).onclick = m.fechar;
    $('#pOk', m.el).onclick = async () => { if (await acao(() => api({ action: 'senha', atual: $('#pA', m.el).value, nova: $('#pN', m.el).value }), 'Senha alterada.')) m.fechar(); };
  }
  function confirmar(msg, okLabel) {
    return new Promise(res => {
      const m = modal('Confirmar', `<p style="margin:0">${msg}</p>`, `<button class="btn" data-n>Cancelar</button><button class="btn primary" data-s>${okLabel || 'Confirmar'}</button>`);
      $('[data-n]', m.el).onclick = () => { m.fechar(); res(false); };
      $('[data-s]', m.el).onclick = () => { m.fechar(); res(true); };
    });
  }

  /* ======================= gráficos (SVG) ======================= */
  let tipEl = null;
  function tip(e, html) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tip'; document.body.appendChild(tipEl); }
    if (!html) { tipEl.style.display = 'none'; return; }
    tipEl.innerHTML = html; tipEl.style.display = 'block';
    const x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8);
    tipEl.style.left = x + 'px'; tipEl.style.top = (e.clientY + 14) + 'px';
  }
  function ligarTips(el) {
    $$('[data-tip]', el).forEach(n => {
      n.addEventListener('mousemove', e => tip(e, n.getAttribute('data-tip')));
      n.addEventListener('mouseleave', () => tip(null, null));
    });
  }
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  /* barras verticais agrupadas: cats=['2024','2025'], series=[{nome, cor, vals:[]}] */
  function barras(cats, series, fmt, opts) {
    opts = opts || {};
    const W = 640, H = opts.h || 240, L = 64, R = 12, T = 14, B = 34;
    const max = niceMax(Math.max(1, ...series.flatMap(s => s.vals.map(v => Number(v) || 0))));
    const gw = (W - L - R) / cats.length;
    const bw = Math.min(46, (gw - 16) / series.length - 2);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = T + (H - T - B) * (1 - i / 4);
      g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--border)" stroke-width="1"/><text x="${L - 8}" y="${y + 4}" text-anchor="end">${esc(fmt(max * i / 4, true))}</text>`;
    }
    cats.forEach((c, i) => {
      const x0 = L + gw * i + (gw - (bw + 2) * series.length) / 2;
      series.forEach((s, j) => {
        const v = Number(s.vals[i]) || 0;
        const h = (H - T - B) * v / max;
        const x = x0 + j * (bw + 2), y = H - B - h;
        const r = Math.min(4, h);
        g += `<path d="M${x},${H - B} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - B} Z" fill="${s.cor}"/>`;
        g += `<rect x="${x - 1}" y="${T}" width="${bw + 2}" height="${H - T - B}" fill="transparent" data-tip="${esc('<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + esc(fmt(v)))}"/>`;
      });
      g += `<text x="${L + gw * i + gw / 2}" y="${H - 12}" text-anchor="middle">${esc(c)}</text>`;
    });
    g += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="var(--border-strong)"/>`;
    const leg = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</div>` : '';
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || '')}">${g}</svg>${leg}</div>`;
  }
  /* barras horizontais (uma série) */
  function hbarras(itens, fmt, cor) {
    const max = Math.max(1, ...itens.map(i => Math.abs(i.v)));
    return itens.map(i => `<div class="bar-row" data-tip="${esc('<b>' + esc(i.nome) + '</b><br>' + esc(fmt(i.v)) + (i.extra ? '<br>' + esc(i.extra) : ''))}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(i.nome)}</span><div class="bar"><i style="width:${Math.max(0, i.v) / max * 100}%;background:${i.cor || cor};border-radius:0 4px 4px 0"></i></div><span class="num small" style="text-align:right">${esc(fmt(i.v, true))}</span></div>`).join('');
  }

  /* ======================= painel ======================= */
  function indicadoresAno(igId) {
    // por ano: totais a partir dos relatórios estatísticos e do Conselho
    const rels = S.d.relatorios.filter(r => !igId || r.igrejaId === igId);
    const anos = {};
    rels.forEach(r => {
      if (r.status === 'Rascunho') return;
      const a = anos[r.ano] = anos[r.ano] || { ano: r.ano, com: 0, nc: 0, rec: 0, desp: 0, diz: 0, dizSC: 0, alunos: 0, prof: 0, igrejasEst: 0, igrejasCon: 0, cons: [] };
      const C = ctx(r.modelo || modelo(r.modeloId), r.dados || {});
      if (r.modeloId === 'estatistico') {
        a.igrejasEst++;
        a.com += C.V('com_atual'); a.nc += C.V('nc_atual'); a.rec += C.V('fin_rec_total'); a.desp += C.V('fin_desp_total');
        a.diz += C.V('fin_dizimos'); a.dizSC += C.V('fin_dizimo_sc'); a.alunos += C.V('est_alunos'); a.prof += C.V('com_profissoes');
      } else if (r.modeloId === 'conselho') { a.igrejasCon++; a.cons.push(r.dados || {}); }
    });
    return Object.values(anos).sort((x, y) => x.ano - y.ano);
  }
  function telaPainel() {
    const igs = S.d.igrejas.filter(i => i.ativo !== false);
    const unica = S.user.igrejaId || null;
    const igId = unica || S.filtroIgreja || '';
    const anos = indicadoresAno(igId);
    const ult = anos[anos.length - 1] || {}, pen = anos[anos.length - 2] || null;
    const delta = (a, b, fmt) => b ? `<div class="d ${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${fmt(Math.abs(a - b))} desde ${pen.ano}</div>` : '';
    const c = contagens();
    const C1 = 'var(--c1)', C2 = 'var(--c2)';
    const maxEst = Math.max(0, ...anos.map(a => a.igrejasEst));
    const anosEst = anos.filter(a => a.igrejasEst && a.igrejasEst >= maxEst / 2);
    const anosFora = anos.filter(a => a.igrejasEst && a.igrejasEst < maxEst / 2);

    // por igreja, último ano com estatística
    const anoRef = anosEst.length ? anosEst[anosEst.length - 1].ano : null;
    const porIgreja = igs.filter(i => !igId || i.id === igId).map(i => {
      const e = S.d.relatorios.find(r => r.igrejaId === i.id && r.modeloId === 'estatistico' && r.ano === anoRef);
      const e0 = S.d.relatorios.find(r => r.igrejaId === i.id && r.modeloId === 'estatistico' && r.ano === anoRef - 1);
      const C = e ? ctx(e.modelo, e.dados) : null, C0 = e0 ? ctx(e0.modelo, e0.dados) : null;
      const pend = S.d.relatorios.filter(r => r.igrejaId === i.id && r.ano === anoRef).reduce((n, r) => n + verificar(r).filter(x => x.nivel === 'erro').length, 0);
      return { i, e, com: C ? C.V('com_atual') : null, com0: C0 ? C0.V('com_atual') : null, rec: C ? C.V('fin_rec_total') : null, desp: C ? C.V('fin_desp_total') : null,
        diz: C ? C.V('fin_dizimos') : 0, sc: C ? C.V('fin_dizimo_sc') : 0, alunos: C ? C.V('est_alunos') : null, prof: C ? C.V('com_profissoes') : 0, pend };
    });

    // Conformidade do Relatório do Conselho (último ano)
    const anoCon = anos.filter(a => a.igrejasCon).slice(-1)[0];
    const itensCon = [['dizimo_sc', 'Enviou o dízimo ao SC'], ['rois_atualizados', 'Róis atualizados'], ['exame_balancetes', 'Exame dos balancetes'], ['imoveis_doc', 'Imóveis documentados'],
      ['previdencia', 'Previdência do pastor'], ['plan_estrategico', 'Planejamento estratégico'], ['seguro', 'Seguro patrimonial'], ['alvara', 'Alvará'], ['avcb', 'Licença dos Bombeiros']];
    const conf = anoCon ? itensCon.map(([k, l]) => {
      const sim = anoCon.cons.filter(d => d[k] === 'sim').length;
      return { nome: l, v: anoCon.cons.length ? sim / anoCon.cons.length : 0, extra: sim + ' de ' + anoCon.cons.length + ' relatórios' };
    }) : [];

    const html = head('Painel', esc(unica ? igNome(unica) : 'Presbitério Litorâneo do RN · ' + igs.length + ' igrejas e congregações'),
      unica ? '' : `<select id="fIg" aria-label="Filtrar igreja" style="min-width:240px"><option value="">Todas as igrejas</option>${igs.map(i => `<option value="${esc(i.id)}" ${i.id === igId ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select>`) + `
      <div class="kpis">
        <div class="kpi"><div class="l">Membros comungantes ${ult.igrejasEst ? '(' + ult.ano + ')' : ''}</div><div class="v">${num(ult.com)}</div>${delta(ult.com, pen && pen.com, num)}</div>
        <div class="kpi"><div class="l">Não comungantes</div><div class="v">${num(ult.nc)}</div>${delta(ult.nc, pen && pen.nc, num)}</div>
        <div class="kpi"><div class="l">Receita do ano</div><div class="v">${moneyK(ult.rec)}</div>${delta(ult.rec, pen && pen.rec, moneyK)}</div>
        <div class="kpi"><div class="l">Dízimo ao Supremo Concílio</div><div class="v">${moneyK(ult.dizSC)}</div><div class="d muted">${ult.diz ? pct(ult.dizSC / ult.diz) + ' dos dízimos' : ''}</div></div>
        <a class="kpi" href="#/relatorios/analisar"><div class="l">Relatórios aguardando análise</div><div class="v">${c.analisar}</div><div class="d muted">${c.devolvidos} devolvido(s)</div></a>
        <a class="kpi" href="#/atas"><div class="l">Atas a examinar</div><div class="v">${c.atas}</div></a>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-head"><h2>Membros por ano</h2><span class="muted small">comungantes e não comungantes</span></div>
          ${anosEst.length ? barras(anosEst.map(a => String(a.ano)), [{ nome: 'Comungantes', cor: C1, vals: anosEst.map(a => a.com) }, { nome: 'Não comungantes', cor: C2, vals: anosEst.map(a => a.nc) }], (v) => num(v), { label: 'Membros por ano' }) : '<div class="list-empty">Sem relatórios estatísticos.</div>'}
          <p class="small muted">Igrejas com formulário de estatística: ${anosEst.map(a => a.ano + ': ' + a.igrejasEst).join(' · ')}.${anosFora.length ? ' Fora do gráfico por terem poucos relatórios: ' + anosFora.map(a => a.ano + ' (' + a.igrejasEst + ')').join(', ') + '.' : ''}</p>
        </div>
        <div class="card"><div class="card-head"><h2>Receitas e despesas</h2><span class="muted small">movimento financeiro realizado</span></div>
          ${anosEst.length ? barras(anosEst.map(a => String(a.ano)), [{ nome: 'Receitas', cor: C1, vals: anosEst.map(a => a.rec) }, { nome: 'Despesas', cor: C2, vals: anosEst.map(a => a.desp) }], (v, ax) => ax ? moneyK(v) : money(v), { label: 'Receitas e despesas por ano' }) : '<div class="list-empty">Sem dados financeiros.</div>'}
        </div>
      </div>
      ${anoRef ? `<div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-head"><h2>Comungantes por igreja</h2><span class="muted small">${anoRef}</span></div>${hbarras(porIgreja.filter(p => p.com != null).sort((a, b) => b.com - a.com).map(p => ({ nome: p.i.sigla || p.i.nome, v: p.com, extra: p.i.nome + (p.com0 != null ? ' · ' + (anoRef - 1) + ': ' + num(p.com0) : '') })), v => num(v), C1)}</div>
        <div class="card"><div class="card-head"><h2>Novos membros por profissão de fé</h2><span class="muted small">${anoRef}</span></div>${hbarras(porIgreja.filter(p => p.e).sort((a, b) => b.prof - a.prof).map(p => ({ nome: p.i.sigla || p.i.nome, v: p.prof, extra: p.i.nome })), v => num(v), C1)}</div>
      </div>` : ''}
      ${conf.length ? `<div class="card" style="margin-top:16px"><div class="card-head"><h2>Relatório do Conselho: situação das igrejas</h2><span class="muted small">${anoCon.ano} · % dos relatórios que responderam "Sim"</span></div>${hbarras(conf, (v) => pct(v), C1)}</div>` : ''}
      <div class="card" style="margin-top:16px"><div class="card-head"><h2>Igrejas em ${anoRef || '–'}</h2><button class="btn sm ghost no-print" id="bCsv">Baixar planilha (CSV)</button></div>
        <div class="tbl-wrap"><table><thead><tr><th>Igreja</th><th class="num">Comungantes</th><th class="num">Variação</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Dízimo SC</th><th class="num">Alunos ED</th><th class="num">Problemas</th></tr></thead><tbody>
        ${porIgreja.map(p => `<tr class="${p.e ? 'click' : ''}" ${p.e ? `data-go="relatorio/${esc(p.e.id)}"` : ''}><td>${esc(p.i.nome)}${p.i.tipo && p.i.tipo !== 'Igreja' ? ` <span class="tag gray">${esc(p.i.tipo)}</span>` : ''}</td>
          <td class="num">${p.com == null ? '–' : num(p.com)}</td>
          <td class="num">${p.com != null && p.com0 != null ? `<span class="${p.com >= p.com0 ? 'up' : 'down'}">${p.com >= p.com0 ? '+' : ''}${num(p.com - p.com0)}</span>` : '–'}</td>
          <td class="num">${p.rec == null ? '–' : money(p.rec)}</td><td class="num">${p.desp == null ? '–' : money(p.desp)}</td>
          <td class="num">${p.e ? (p.sc ? money(p.sc) + ' <span class="muted small">(' + pct(p.diz ? p.sc / p.diz : 0) + ')</span>' : '<span class="down">não repassou</span>') : '–'}</td>
          <td class="num">${p.alunos == null ? '–' : num(p.alunos)}</td>
          <td class="num">${p.pend ? `<span class="down">${p.pend}</span>` : (p.e ? '0' : '–')}</td></tr>`).join('')}
        </tbody></table></div>
        <p class="small muted">Linhas sem dados: a igreja não enviou o formulário de estatística de ${anoRef || ''} (congregações enviam só o relatório do Conselho).</p>
      </div>`;
    shell('painel', html);
    const sel = $('#fIg'); if (sel) sel.onchange = () => { S.filtroIgreja = sel.value; render(); };
    $$('[data-go]').forEach(tr => tr.onclick = () => ir(tr.getAttribute('data-go')));
    ligarTips($('#main'));
    $('#bCsv').onclick = () => {
      const linhas = [['Igreja', 'Comungantes', 'Comungantes ano anterior', 'Receitas', 'Despesas', 'Dízimos', 'Dízimo SC', 'Alunos ED', 'Profissões de fé']]
        .concat(porIgreja.map(p => [p.i.nome, p.com, p.com0, p.rec, p.desp, p.diz, p.sc, p.alunos, p.prof]));
      baixar('igrejas-' + anoRef + '.csv', '﻿' + linhas.map(l => l.map(v => v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n'), 'text/csv');
    };
  }
  /* ======================= indicadores ======================= */
  const SIMNAO = ['dizimo_sc', 'rois_atualizados', 'exame_balancetes', 'imoveis_doc', 'previdencia', 'plan_estrategico', 'seguro', 'alvara', 'avcb'];
  const IND = [
    // [id, nome, grupo, formato, fonte, cálculo, maior é melhor?]
    ['com', 'Membros comungantes', 'Membros', 'num', 'est', C => C.V('com_atual')],
    ['nc', 'Não comungantes', 'Membros', 'num', 'est', C => C.V('nc_atual')],
    ['rol', 'Rol total', 'Membros', 'num', 'est', C => C.V('rol_atual')],
    ['cresc', 'Crescimento de comungantes', 'Membros', 'pct', 'est', C => { const a = C.V('com_ant_m') + C.V('com_ant_f'); return a ? (C.V('com_atual') - a) / a : null; }],
    ['prof', 'Profissões de fé', 'Membros', 'num', 'est', C => C.V('com_profissoes')],
    ['adm', 'Admissões de comungantes', 'Membros', 'num', 'est', C => C.eval('sum(com_adm.t)')],
    ['dem', 'Demissões de comungantes', 'Membros', 'num', 'est', C => C.eval('sum(com_dem.t)')],
    ['bat', 'Batismos de não comungantes', 'Membros', 'num', 'est', C => C.eval('sum(nc_adm.t, 0, 0)')],
    ['pastores', 'Pastores', 'Liderança e ensino', 'num', 'est', C => C.V('lid_pastores')],
    ['presb', 'Presbíteros', 'Liderança e ensino', 'num', 'est', C => C.V('lid_presbiteros')],
    ['diac', 'Diáconos', 'Liderança e ensino', 'num', 'est', C => C.V('lid_diaconos')],
    ['alunos', 'Alunos da Escola Dominical', 'Liderança e ensino', 'num', 'est', C => C.V('est_alunos')],
    ['alunosPct', 'Alunos da ED por membro do rol', 'Liderança e ensino', 'pct', 'est', C => C.V('rol_atual') ? C.V('est_alunos') / C.V('rol_atual') : null],
    ['congs', 'Congregações e pontos de pregação', 'Liderança e ensino', 'num', 'est', C => C.V('est_congregacoes') + C.V('est_pontos')],
    ['rec', 'Receita do ano', 'Finanças', 'money', 'est', C => C.V('fin_rec_total')],
    ['desp', 'Despesa do ano', 'Finanças', 'money', 'est', C => C.V('fin_desp_total')],
    ['res', 'Resultado do ano (receita − despesa)', 'Finanças', 'money', 'est', C => C.V('fin_rec_total') - C.V('fin_desp_total')],
    ['saldo', 'Saldo para o ano seguinte', 'Finanças', 'money', 'est', C => C.V('fin_saldo_seguinte')],
    ['diz', 'Dízimos recebidos', 'Finanças', 'money', 'est', C => C.V('fin_dizimos')],
    ['percap', 'Dízimo por comungante', 'Finanças', 'money', 'est', C => C.V('com_atual') ? C.V('fin_dizimos') / C.V('com_atual') : null],
    ['dizsc', 'Dízimo ao Supremo Concílio', 'Finanças', 'money', 'est', C => C.V('fin_dizimo_sc')],
    ['dizscPct', 'Dízimo ao SC sobre os dízimos (esperado 10%)', 'Finanças', 'pct', 'est', C => C.V('fin_dizimos') ? C.V('fin_dizimo_sc') / C.V('fin_dizimos') : null],
    ['miss', 'Missões e evangelismo', 'Finanças', 'money', 'est', C => C.V('fin_missoes') + C.V('fin_evangelismo')],
    ['missPct', 'Missões e evangelismo sobre a despesa', 'Finanças', 'pct', 'est', C => C.V('fin_desp_total') ? (C.V('fin_missoes') + C.V('fin_evangelismo')) / C.V('fin_desp_total') : null],
    ['social', 'Ação social', 'Finanças', 'money', 'est', C => C.V('fin_acao_social')],
    ['reun', 'Reuniões do Conselho ou da Mesa', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('reun_conselho') + C.V('reun_mesa')],
    ['ceias', 'Celebrações da Santa Ceia', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('ceia_grupos') + C.V('ceia_individuos')],
    ['evang', 'Atividades evangelísticas', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('ativ_evang')],
    ['textos', 'Textos distribuídos', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('biblias') + C.V('nt') + C.V('folhetos') + C.V('outras_lit')],
    ['visitas', 'Visitas de oficiais e departamentos', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('visitas_oficiais') + C.V('visitas_outros')],
    ['atos', 'Atos beneficentes', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('atos_jd') + C.V('atos_outros')],
    ['discip', 'Discipulados realizados', 'Atividades (Relatório do Conselho)', 'num', 'con', C => C.V('discipulados')],
    ['conf', 'Itens de organização em dia', 'Atividades (Relatório do Conselho)', 'pct', 'con', (C, d) => SIMNAO.filter(k => d[k] === 'sim').length / SIMNAO.length]
  ].map(([id, nome, grupo, fmt, fonte, fn]) => ({ id, nome, grupo, fmt, fonte, fn }));
  const fmtInd = (v, f, curto) => v == null || !isFinite(v) ? '–' : f === 'money' ? (curto ? moneyK(v) : money(v)) : f === 'pct' ? pct(v) : num(v);
  function matrizInd() {
    // M[igrejaId][ano][indicador] = valor (null quando não há o formulário)
    const M = {};
    const anos = new Set();
    S.d.relatorios.forEach(r => {
      if (r.status === 'Rascunho' || !['estatistico', 'conselho'].includes(r.modeloId)) return;
      const fonte = r.modeloId === 'estatistico' ? 'est' : 'con';
      const C = ctx(r.modelo || modelo(r.modeloId), r.dados || {});
      const o = ((M[r.igrejaId] = M[r.igrejaId] || {})[r.ano] = M[r.igrejaId][r.ano] || {});
      anos.add(r.ano);
      IND.forEach(i => { if (i.fonte === fonte) { let v; try { v = i.fn(C, r.dados || {}); } catch (e) { v = null; } o[i.id] = v == null || !isFinite(v) ? null : Math.round(v * 10000) / 10000; o['_' + fonte] = r.id; } });
    });
    return { M, anos: [...anos].sort() };
  }
  function miniBarras(anos, vals, f) {
    const W = 260, H = 112, T = 18, B = 20, L = 6, R = 6;
    const nums = vals.map(v => v == null ? null : Number(v));
    const max = Math.max(0, ...nums.filter(v => v != null)), min = Math.min(0, ...nums.filter(v => v != null));
    const span = (max - min) || 1;
    const gw = (W - L - R) / anos.length, bw = Math.min(40, gw - 14);
    const y0 = T + (H - T - B) * max / span;
    let g = `<line x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}" stroke="var(--border-strong)"/>`;
    anos.forEach((a, i) => {
      const cx = L + gw * i + gw / 2, v = nums[i];
      g += `<text x="${cx}" y="${H - 5}" text-anchor="middle">${a}</text>`;
      if (v == null) { g += `<text x="${cx}" y="${y0 - 4}" text-anchor="middle" fill="var(--text-3)">sem dado</text>`; return; }
      const h = Math.max(1, (H - T - B) * Math.abs(v) / span), y = v >= 0 ? y0 - h : y0;
      const ult = i === anos.length - 1 || nums.slice(i + 1).every(x => x == null);
      g += `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="3" fill="var(--c1)" opacity="${ult ? 1 : 0.55}" data-tip="${esc('<b>' + a + '</b><br>' + esc(fmtInd(v, f)))}"/>`;
      g += `<text x="${cx}" y="${v >= 0 ? y - 4 : y + h + 12}" text-anchor="middle" style="font-weight:600;fill:var(--text)">${esc(fmtInd(v, f, true))}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg></div>`;
  }
  function variacao(a, b, f) {
    if (a == null || b == null) return '–';
    const d = a - b;
    if (f === 'pct') return `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${(d * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p.</span>`;
    const p = b ? d / Math.abs(b) : null;
    return `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '+' : ''}${esc(fmtInd(d, f, true))}${p != null ? ' (' + (p >= 0 ? '+' : '') + pct(p) + ')' : ''}</span>`;
  }
  function csvInd(nome, linhas) {
    baixar(nome, '﻿' + linhas.map(l => l.map(v => v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\n'), 'text/csv');
  }
  function telaIndicadores() {
    const { M, anos } = matrizInd();
    const igs = S.d.igrejas.filter(i => M[i.id]);
    const presb = isPresb();
    const modo = presb ? S.ind.modo : 'igreja';
    const grupos = [...new Set(IND.map(i => i.grupo))];
    const seg = presb ? `<div class="seg" role="group" aria-label="Tipo de comparação"><button data-modo="igreja" class="${modo === 'igreja' ? 'on' : ''}">Evolução de uma igreja</button><button data-modo="comparar" class="${modo === 'comparar' ? 'on' : ''}">Comparar igrejas</button></div>` : '';
    let html = '';
    if (!igs.length) {
      shell('indicadores', head('Indicadores', 'Evolução e comparação dos relatórios.') + '<div class="card list-empty">Ainda não há relatórios de estatística ou do Conselho enviados.</div>');
      return;
    }
    if (modo === 'igreja') {
      const igId = S.user.igrejaId || (M[S.ind.igreja] ? S.ind.igreja : igs[0].id);
      const D = M[igId] || {};
      const anosIg = anos.filter(a => D[a]);
      const ult = anosIg[anosIg.length - 1], pen = anosIg[anosIg.length - 2];
      // média do Presbitério no último ano (igrejas com dado)
      const media = id => { const v = igs.map(i => M[i.id][ult] && M[i.id][ult][id]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
      const cards = grupos.map(g => {
        const its = IND.filter(i => i.grupo === g && anosIg.some(a => D[a][i.id] != null));
        if (!its.length) return '';
        return `<div class="card"><div class="card-head"><h2>${esc(g)}</h2><span class="small muted">${its[0].fonte === 'est' ? 'formulário de estatística' : 'Relatório do Conselho'}</span></div><div class="ind-grid">${its.map(i => {
          const vals = anosIg.map(a => D[a][i.id] == null ? null : D[a][i.id]);
          const ua = [...anosIg].reverse().find(a => D[a][i.id] != null);
          const pa = anosIg.filter(a => a < ua).reverse().find(a => D[a][i.id] != null);
          return `<div class="ind-card"><h4>${esc(i.nome)}</h4><div class="small muted">${ua}: <b style="color:var(--text);font-size:15px">${esc(fmtInd(D[ua][i.id], i.fmt))}</b>${pa ? ' · ' + variacao(D[ua][i.id], D[pa][i.id], i.fmt) + ' desde ' + pa : ''}</div>${miniBarras(anosIg, vals, i.fmt)}</div>`;
        }).join('')}</div></div>`;
      }).join('');
      const linhas = IND.filter(i => anosIg.some(a => D[a][i.id] != null));
      html = head('Indicadores', 'Evolução dos relatórios de uma igreja ao longo dos anos.', seg) + `
        <div class="card"><div class="filters" style="margin:0">${S.user.igrejaId ? `<div><b>${esc(igNome(igId))}</b></div>` : `<div class="field" style="min-width:300px"><label for="iIg">Igreja</label><select id="iIg">${igs.map(i => `<option value="${esc(i.id)}" ${i.id === igId ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></div>`}
          <p class="small muted" style="margin:0;align-self:end">Relatórios: ${anosIg.map(a => a + ' (' + [D[a]._est ? 'estatística' : '', D[a]._con ? 'Conselho' : ''].filter(Boolean).join(' e ') + ')').join(' · ')}</p></div></div>
        ${cards}
        <div class="card"><div class="card-head"><h2>Tabela de indicadores</h2><button class="btn sm ghost no-print" id="bCsvI">Baixar planilha (CSV)</button></div>
          <div class="tbl-wrap"><table><thead><tr><th>Indicador</th>${anosIg.map(a => `<th class="num">${a}</th>`).join('')}<th class="num">Variação${pen ? ' ' + pen + '→' + ult : ''}</th>${presb ? `<th class="num">Média do Presbitério ${ult}</th>` : ''}</tr></thead><tbody>
          ${grupos.map(g => { const ls = linhas.filter(i => i.grupo === g); return ls.length ? `<tr class="tot"><td colspan="${anosIg.length + (presb ? 3 : 2)}"><b>${esc(g)}</b></td></tr>` + ls.map(i => `<tr><td>${esc(i.nome)}</td>${anosIg.map(a => `<td class="num">${esc(fmtInd(D[a][i.id], i.fmt))}</td>`).join('')}<td class="num">${pen ? variacao(D[ult][i.id], D[pen][i.id], i.fmt) : '–'}</td>${presb ? `<td class="num muted">${esc(fmtInd(media(i.id), i.fmt))}</td>` : ''}</tr>`).join('') : ''; }).join('')}
          </tbody></table></div></div>`;
      shell('indicadores', html);
      const sel = $('#iIg'); if (sel) sel.onchange = () => { S.ind.igreja = sel.value; telaIndicadores(); };
      $('#bCsvI').onclick = () => csvInd('indicadores-' + (igreja(igId) || {}).sigla + '.csv', [['Indicador'].concat(anosIg)].concat(linhas.map(i => [i.nome].concat(anosIg.map(a => D[a][i.id])))));
    } else {
      const ind = IND.find(i => i.id === S.ind.indicador) || IND[0];
      const anosInd = anos.filter(a => igs.filter(i => M[i.id][a] && M[i.id][a][ind.id] != null).length);
      const contagem = a => igs.filter(i => M[i.id][a] && M[i.id][a][ind.id] != null).length;
      const melhorAno = anosInd.slice().reverse().find(a => contagem(a) >= Math.max(...anosInd.map(contagem)) / 2);
      const ano = anosInd.includes(Number(S.ind.ano)) ? Number(S.ind.ano) : melhorAno;
      const val = (ig, a) => M[ig.id][a] ? M[ig.id][a][ind.id] : null;
      const rank = igs.filter(i => val(i, ano) != null).map(i => ({ i, v: val(i, ano), p: val(i, ano - 1) })).sort((a, b) => b.v - a.v);
      const vs = rank.map(x => x.v);
      const tot = ind.fmt === 'pct' ? null : vs.reduce((a, b) => a + b, 0);
      const med = vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null;
      const maxAbs = Math.max(1e-9, ...igs.flatMap(i => anosInd.map(a => Math.abs(val(i, a) || 0))));
      html = head('Indicadores', 'Compare um indicador entre as igrejas do Presbitério.', seg) + `
        <div class="card"><div class="filters" style="margin:0">
          <div class="field" style="min-width:320px"><label for="iInd">Indicador</label><select id="iInd">${grupos.map(g => `<optgroup label="${esc(g)}">${IND.filter(i => i.grupo === g).map(i => `<option value="${i.id}" ${i.id === ind.id ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</optgroup>`).join('')}</select></div>
          <div class="field"><label for="iAno">Ano</label><select id="iAno">${anosInd.map(a => `<option ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        </div></div>
        <div class="kpis">
          <div class="kpi"><div class="l">Igrejas com dado em ${ano}</div><div class="v">${rank.length}</div></div>
          ${tot != null ? `<div class="kpi"><div class="l">Total do Presbitério</div><div class="v">${esc(fmtInd(tot, ind.fmt, true))}</div></div>` : ''}
          <div class="kpi"><div class="l">Média por igreja</div><div class="v">${esc(fmtInd(med, ind.fmt, true))}</div></div>
          ${rank.length ? `<div class="kpi"><div class="l">Maior valor</div><div class="v" style="font-size:18px">${esc(rank[0].i.sigla || rank[0].i.nome)}</div><div class="d muted">${esc(fmtInd(rank[0].v, ind.fmt))}</div></div>` : ''}
        </div>
        <div class="grid g2">
          <div class="card"><div class="card-head"><h2>${esc(ind.nome)}</h2><span class="muted small">${ano} · da maior para a menor</span></div>
            ${rank.length ? hbarras(rank.map(x => ({ nome: x.i.sigla || x.i.nome, v: x.v, extra: x.i.nome + (x.p != null ? ' · ' + (ano - 1) + ': ' + fmtInd(x.p, ind.fmt) : '') })), (v, c) => fmtInd(v, ind.fmt, c), 'var(--c1)') : '<div class="list-empty">Sem dados neste ano.</div>'}
            ${ind.id === 'dizscPct' ? '<p class="small muted">Referência: o dízimo ao Supremo Concílio é 10% dos dízimos.</p>' : ''}</div>
          <div class="card"><div class="card-head"><h2>Total ou média do Presbitério por ano</h2><span class="muted small">${ind.fmt === 'pct' ? 'média das igrejas' : 'soma das igrejas com dado'}</span></div>
            ${barras(anosInd.map(String), [{ nome: ind.nome, cor: 'var(--c1)', vals: anosInd.map(a => { const v = igs.map(i => val(i, a)).filter(x => x != null); return ind.fmt === 'pct' ? (v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0) : v.reduce((x, y) => x + y, 0); }) }], (v, ax) => fmtInd(v, ind.fmt, ax), { label: ind.nome, h: 220 })}
            <p class="small muted">Igrejas com dado: ${anosInd.map(a => a + ': ' + contagem(a)).join(' · ')}. Anos com poucas igrejas não são comparáveis com os demais.</p></div>
        </div>
        <div class="card"><div class="card-head"><h2>Igrejas × anos</h2><button class="btn sm ghost no-print" id="bCsvI">Baixar planilha (CSV)</button></div>
          <div class="tbl-wrap"><table class="heat"><thead><tr><th>Igreja</th>${anosInd.map(a => `<th class="num">${a}</th>`).join('')}<th class="num">Variação ${ano - 1}→${ano}</th></tr></thead><tbody>
          ${igs.map(i => `<tr class="click" data-ig="${esc(i.id)}"><td>${esc(i.nome)}</td>${anosInd.map(a => { const v = val(i, a); return `<td class="num" style="${v != null && v > 0 ? `background:color-mix(in srgb, var(--c1) ${Math.round(Math.abs(v) / maxAbs * 32)}%, transparent)` : ''}">${esc(fmtInd(v, ind.fmt))}</td>`; }).join('')}<td class="num">${variacao(val(i, ano), val(i, ano - 1), ind.fmt)}</td></tr>`).join('')}
          </tbody></table></div><p class="small muted">Clique numa igreja para ver a evolução de todos os indicadores dela.</p></div>`;
      shell('indicadores', html);
      $('#iInd').onchange = e => { S.ind.indicador = e.target.value; telaIndicadores(); };
      $('#iAno').onchange = e => { S.ind.ano = e.target.value; telaIndicadores(); };
      $$('[data-ig]').forEach(tr => tr.onclick = () => { S.ind.igreja = tr.getAttribute('data-ig'); S.ind.modo = 'igreja'; telaIndicadores(); scrollTo(0, 0); });
      $('#bCsvI').onclick = () => csvInd('comparacao-' + ind.id + '.csv', [['Igreja'].concat(anosInd)].concat(igs.map(i => [i.nome].concat(anosInd.map(a => val(i, a))))));
    }
    $$('[data-modo]').forEach(b => b.onclick = () => { S.ind.modo = b.getAttribute('data-modo'); telaIndicadores(); });
    ligarTips($('#main'));
  }

  function baixar(nome, conteudo, tipo) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ======================= lista de relatórios ======================= */
  function telaRelatorios(arg) {
    const f = S.filtros;
    if (arg === 'analisar') { f.status = 'pendentes'; }
    const igs = S.d.igrejas;
    const anos = [...new Set(S.d.relatorios.map(r => r.ano))].sort((a, b) => b - a);
    const lista = S.d.relatorios.filter(r =>
      (!f.igreja || r.igrejaId === f.igreja) && (!f.ano || r.ano === Number(f.ano)) && (!f.modelo || r.modeloId === f.modelo) &&
      (!f.status || (f.status === 'pendentes' ? ['Enviado', 'Em análise'].includes(r.status) : r.status === f.status)) &&
      (!f.q || (r.titulo + ' ' + igNome(r.igrejaId)).toLowerCase().includes(f.q.toLowerCase()))
    ).sort((a, b) => b.ano - a.ano || igNome(a.igrejaId).localeCompare(igNome(b.igrejaId)) || a.modeloId.localeCompare(b.modeloId));
    const podeCriar = isAdmin() || S.user.role === 'editor';
    shell('relatorios', head('Relatórios', 'Formulários enviados pelas igrejas e o andamento da análise.', podeCriar ? '<button class="btn primary" id="bNovo">+ Novo relatório</button>' : '') + `
      <div class="card">
        <div class="filters">
          <div class="field"><label>Buscar</label><input type="search" id="fq" value="${esc(f.q || '')}" placeholder="Título ou igreja"></div>
          ${isPresb() ? `<div class="field"><label>Igreja</label><select id="fig"><option value="">Todas</option>${igs.map(i => `<option value="${esc(i.id)}" ${f.igreja === i.id ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></div>` : ''}
          <div class="field"><label>Ano</label><select id="fano"><option value="">Todos</option>${anos.map(a => `<option ${String(f.ano) === String(a) ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
          <div class="field"><label>Modelo</label><select id="fmod"><option value="">Todos</option>${S.d.modelos.map(m => `<option value="${esc(m.id)}" ${f.modelo === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select></div>
          <div class="field"><label>Situação</label><select id="fst"><option value="">Todas</option><option value="pendentes" ${f.status === 'pendentes' ? 'selected' : ''}>Aguardando análise</option>${STATUS.map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>Ano</th><th>Relatório</th><th>Igreja</th><th>Situação</th><th class="num">Verificações</th><th>Atualizado</th></tr></thead><tbody>
          ${lista.map(r => { const v = verificar(r); const e = v.filter(x => x.nivel === 'erro').length; return `<tr class="click" data-go="relatorio/${esc(r.id)}"><td>${r.ano}</td><td>${esc(r.titulo)}</td><td>${esc(igNome(r.igrejaId))}</td><td>${badge(r.status)}</td><td class="num">${e ? `<span class="down">${e} problema(s)</span>` : v.length ? `<span class="muted">${v.length} atenção</span>` : '<span class="up">ok</span>'}</td><td class="small muted">${dt(r.updatedAt)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="list-empty">Nenhum relatório encontrado.</td></tr>'}
        </tbody></table></div>
        <p class="small muted">${lista.length} relatório(s).</p>
      </div>`);
    const upd = (id, k) => { const el = $(id); if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => { f[k] = el.value; const pos = el.selectionStart; render(); const n = $(id); if (n) { n.focus(); if (n.setSelectionRange && pos != null) n.setSelectionRange(pos, pos); } }); };
    upd('#fq', 'q'); upd('#fig', 'igreja'); upd('#fano', 'ano'); upd('#fmod', 'modelo'); upd('#fst', 'status');
    $$('[data-go]').forEach(tr => tr.onclick = () => ir(tr.getAttribute('data-go')));
    if ($('#bNovo')) $('#bNovo').onclick = modalNovo;
  }
  function modalNovo() {
    const igs = S.d.igrejas.filter(i => i.ativo !== false && (isPresb() || i.id === S.user.igrejaId));
    const m = modal('Novo relatório', `
      ${igs.length > 1 ? `<div class="field"><label>Igreja</label><select id="nIg">${igs.map(i => `<option value="${esc(i.id)}">${esc(i.nome)}</option>`).join('')}</select></div>` : `<input type="hidden" id="nIg" value="${esc(igs[0] ? igs[0].id : '')}">`}
      <div class="field"><label>Modelo</label><select id="nMod">${S.d.modelos.filter(x => x.ativo !== false).map(x => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join('')}</select></div>
      <div class="grid g2"><div class="field"><label>Ano de referência</label><input type="number" id="nAno" value="${new Date().getFullYear()}"></div>
      <div class="field"><label>Nº do documento (opcional)</label><input type="text" id="nDoc" placeholder="Ex.: Doc.30/2026"></div></div>
      <div class="field"><label for="nArq">Relatório feito à mão ou impresso (opcional)</label><input type="file" id="nArq" accept="application/pdf,image/*"><span class="help">PDF ou foto do relatório original. Fica anexado para conferir com o que for digitado.</span></div>
      <p class="small muted" style="margin:0">Os dados de identificação vêm do cadastro da igreja. Quando houver relatório do ano anterior, os totais do fim do ano passado entram como ponto de partida.</p>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="nOk">Criar</button>');
    $('[data-x]', m.el).onclick = m.fechar;
    $('#nOk', m.el).onclick = async () => {
      const igrejaId = $('#nIg', m.el).value, modeloId = $('#nMod', m.el).value, ano = Number($('#nAno', m.el).value);
      const mod = modelo(modeloId), ig = igreja(igrejaId) || {};
      const dados = {};
      (mod.secoes || []).forEach(s => (s.campos || []).forEach(c => { if (c.origem && c.origem.startsWith('igreja.')) dados[c.id] = ig[c.origem.slice(7)] || ''; }));
      // ponto de partida a partir do ano anterior
      const ant = S.d.relatorios.find(r => r.igrejaId === igrejaId && r.modeloId === modeloId && r.ano === ano - 1);
      if (ant && modeloId === 'estatistico') {
        const C = ctx(ant.modelo, ant.dados);
        Object.assign(dados, { com_ant_m: C.V('com_atual_m'), com_ant_f: C.V('com_atual_f'), nc_ant_m: C.V('nc_atual_m'), nc_ant_f: C.V('nc_atual_f'), fin_saldo_ant: C.V('fin_saldo_seguinte'), est_alunos_ant: C.V('est_alunos') });
      }
      const r = await acao(() => api({ action: 'salvar', entidade: 'relatorio', item: { igrejaId, modeloId, ano, documento: $('#nDoc', m.el).value.trim(), titulo: mod.nome + ' ' + ano + ($('#nDoc', m.el).value.trim() ? ' · ' + $('#nDoc', m.el).value.trim() : ''), dados } }), 'Relatório criado.');
      if (!r) return;
      const arq = $('#nArq', m.el).files[0];
      if (arq) await acao(() => anexarArquivo(r.item.id, arq, true), 'Relatório original anexado.');
      m.fechar(); await recarregar(); S.tab = 'form'; ir('relatorio/' + r.item.id);
    };
  }

  /* ======================= formulário ======================= */
  function campoHTML(c, dados, ro, C) {
    const v = dados[c.id];
    const id = 'f_' + c.id;
    const lbl = `<label for="${id}">${esc(c.label)}${c.obrigatorio ? ' <span class="req">*</span>' : ''}</label>`;
    const help = c.ajuda ? `<span class="help">${esc(c.ajuda)}</span>` : '';
    let inp = '';
    switch (c.tipo) {
      case 'textarea': inp = `<textarea id="${id}" data-f="${esc(c.id)}" ${ro ? 'disabled' : ''}>${esc(v || '')}</textarea>`; break;
      case 'number': case 'money': inp = `<input type="number" id="${id}" data-f="${esc(c.id)}" step="${c.tipo === 'money' ? '0.01' : '1'}" value="${v == null || v === '' ? '' : esc(v)}" ${ro ? 'disabled' : ''} inputmode="decimal">`; break;
      case 'date': inp = `<input type="date" id="${id}" data-f="${esc(c.id)}" value="${esc(v || '')}" ${ro ? 'disabled' : ''}>`; break;
      case 'select': inp = `<select id="${id}" data-f="${esc(c.id)}" ${ro ? 'disabled' : ''}><option value=""></option>${(c.opcoes || []).map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`; break;
      case 'yesno': inp = `<div class="yesno" role="group" aria-label="${esc(c.label)}"><button type="button" data-yn="${esc(c.id)}" data-v="sim" class="${v === 'sim' ? 'on' : ''}" ${ro ? 'disabled' : ''}>Sim</button><button type="button" data-yn="${esc(c.id)}" data-v="nao" class="${v === 'nao' ? 'on no' : ''}" ${ro ? 'disabled' : ''}>Não</button></div>`; break;
      case 'checks': inp = `<div class="checks">${(c.opcoes || []).map(o => `<label><input type="checkbox" data-ck="${esc(c.id)}" value="${esc(o)}" ${Array.isArray(v) && v.includes(o) ? 'checked' : ''} ${ro ? 'disabled' : ''}> ${esc(o)}</label>`).join('')}</div>`; break;
      case 'calc': inp = `<div class="calc" data-calc="${esc(c.id)}">${esc(fmtCampo(c, C.V(c.id)))}</div>`; break;
      case 'table': return `<div class="field full">${lbl}${tabelaHTML(c, dados, ro)}${help}</div>`;
      default: inp = `<input type="text" id="${id}" data-f="${esc(c.id)}" value="${esc(v || '')}" ${ro ? 'disabled' : ''}>`;
    }
    const wide = c.tipo === 'textarea' || c.tipo === 'checks' || (c.label || '').length > 60;
    return `<div class="field ${wide ? 'full' : ''}">${lbl}${inp}${help}</div>`;
  }
  function tabelaHTML(c, dados, ro) {
    const rows = Array.isArray(dados[c.id]) ? dados[c.id] : [];
    const fixas = Array.isArray(c.linhas) && c.linhas.length;
    const n = fixas ? c.linhas.length : rows.length;
    const cols = c.colunas || [];
    let body = '';
    for (let i = 0; i < n; i++) {
      const row = rows[i] || {};
      body += `<tr>${fixas ? `<td><b class="small">${esc(c.linhas[i])}</b></td>` : ''}${cols.map(cd => {
        if (cd.tipo === 'calc') return `<td class="num"><b data-tc="${esc(c.id)}|${i}|${esc(cd.id)}">${num(cel(c, row, cd))}</b></td>`;
        const val = row[cd.id];
        if (cd.tipo === 'yesno') return `<td><select data-t="${esc(c.id)}" data-r="${i}" data-c="${esc(cd.id)}" ${ro ? 'disabled' : ''}><option value=""></option><option value="sim" ${val === 'sim' ? 'selected' : ''}>Sim</option><option value="nao" ${val === 'nao' ? 'selected' : ''}>Não</option></select></td>`;
        const t = ['number', 'money'].includes(cd.tipo) ? 'number' : cd.tipo === 'date' ? 'date' : 'text';
        return `<td><input type="${t}" ${t === 'number' ? `step="${cd.tipo === 'money' ? '0.01' : '1'}" style="max-width:110px"` : ''} data-t="${esc(c.id)}" data-r="${i}" data-c="${esc(cd.id)}" value="${val == null ? '' : esc(val)}" aria-label="${esc((fixas ? c.linhas[i] + ' · ' : '') + cd.label)}" ${ro ? 'disabled' : ''}></td>`;
      }).join('')}${!fixas && !ro ? `<td><button type="button" class="btn ghost sm" data-del="${esc(c.id)}|${i}" aria-label="Remover linha">×</button></td>` : ''}</tr>`;
    }
    const totais = cols.some(cd => ['number', 'money', 'calc'].includes(cd.tipo)) && n > 1
      ? `<tr class="tot">${fixas ? '<td><b class="small">Total</b></td>' : ''}${cols.map(cd => ['number', 'money', 'calc'].includes(cd.tipo) ? `<td class="num"><b data-tt="${esc(c.id)}|${esc(cd.id)}">${cd.tipo === 'money' ? money(somaCol(c, rows, cd)) : num(somaCol(c, rows, cd))}</b></td>` : '<td></td>').join('')}${!fixas && !ro ? '<td></td>' : ''}</tr>` : '';
    return `<div class="tbl-wrap inner-tbl"><table><thead><tr>${fixas ? '<th></th>' : ''}${cols.map(cd => `<th class="${['number', 'money', 'calc'].includes(cd.tipo) ? 'num' : ''}">${esc(cd.label)}</th>`).join('')}${!fixas && !ro ? '<th></th>' : ''}</tr></thead><tbody>${body}${totais}</tbody></table></div>${!fixas && !ro ? `<div><button type="button" class="btn sm" data-add="${esc(c.id)}" style="margin-top:6px">+ Adicionar linha</button></div>` : ''}`;
  }
  function somaCol(c, rows, cd) { const n = c.linhas ? c.linhas.length : rows.length; let s = 0; for (let i = 0; i < n; i++) s += Number(cel(c, rows[i] || {}, cd)) || 0; return s; }
  const usaFolha = r => S.layout === 'folha' && window.IPB_FOLHA && window.IPB_FOLHA.disponivel(r);
  function formHTML(r, ro) {
    const mod = r.modelo;
    const C = ctx(mod, r.dados);
    if (usaFolha(r)) return `<div class="folha-wrap">${window.IPB_FOLHA.render(r, ro, C, igreja(r.igrejaId) || {})}</div>`;
    return (mod.secoes || []).map(s => `<h3 class="section-title">${esc(s.titulo)}</h3><div class="grid g3">${(s.campos || []).map(c => campoHTML(c, r.dados, ro, C)).join('')}</div>`).join('');
  }
  function atualizarCalcs(r) {
    const C = ctx(r.modelo, r.dados);
    $$('[data-calc]').forEach(el => { const c = C.defs[el.getAttribute('data-calc')]; if (c) el.textContent = fmtCampo(c, C.V(c.id)); });
    $$('[data-tc]').forEach(el => { const [t, i, col] = el.getAttribute('data-tc').split('|'); const c = C.defs[t]; el.textContent = num(cel(c, (r.dados[t] || [])[i] || {}, c.colunas.find(x => x.id === col))); });
    $$('[data-tt]').forEach(el => { const [t, col] = el.getAttribute('data-tt').split('|'); const c = C.defs[t]; const cd = c.colunas.find(x => x.id === col); const v = somaCol(c, r.dados[t] || [], cd); el.textContent = cd.tipo === 'money' ? money(v) : num(v); });
    $$('[data-expr]').forEach(el => { el.textContent = window.IPB_FOLHA_FMT(C.eval(el.getAttribute('data-expr')), el.getAttribute('data-fmt')); });
    const box = $('#verifs'); if (box) box.innerHTML = alertasHTML(verificar(r));
  }
  function ligarForm(r) {
    const d = r.dados;
    const mark = () => { S.edit.sujo = true; const b = $('#bSalvar'); if (b) b.textContent = 'Salvar alterações'; };
    let tmr = null;
    const recalc = () => { clearTimeout(tmr); tmr = setTimeout(() => atualizarCalcs(r), 120); };
    $$('[data-f]').forEach(el => el.addEventListener('input', () => {
      const fid = el.getAttribute('data-f');
      const c = ctx(r.modelo, d).defs[fid] || { tipo: el.type === 'number' ? 'number' : 'text' };
      d[fid] = ['number', 'money'].includes(c.tipo) ? (el.value === '' ? '' : Number(el.value)) : el.value;
      mark(); recalc();
    }));
    $$('[data-yn]').forEach(b => b.onclick = () => {
      const id = b.getAttribute('data-yn'); d[id] = d[id] === b.getAttribute('data-v') ? '' : b.getAttribute('data-v');
      $$('[data-yn]').filter(x => x.getAttribute('data-yn') === id).forEach(x => { x.classList.toggle('on', d[id] === x.getAttribute('data-v')); x.classList.toggle('no', d[id] === 'nao' && x.getAttribute('data-v') === 'nao'); });
      mark(); recalc();
    });
    $$('[data-ck]').forEach(el => el.onchange = () => { const id = el.getAttribute('data-ck'); d[id] = $$(`[data-ck="${id}"]`).filter(x => x.checked).map(x => x.value); mark(); recalc(); });
    $$('[data-t]').forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
      const t = el.getAttribute('data-t'), i = Number(el.getAttribute('data-r')), col = el.getAttribute('data-c');
      d[t] = Array.isArray(d[t]) ? d[t] : [];
      while (d[t].length <= i) d[t].push({});
      d[t][i][col] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      mark(); recalc();
    }));
    $$('[data-add]').forEach(b => b.onclick = () => { const t = b.getAttribute('data-add'); d[t] = Array.isArray(d[t]) ? d[t] : []; d[t].push({}); mark(); telaRelatorio(r.id, true); });
    $$('[data-del]').forEach(b => b.onclick = () => { const [t, i] = b.getAttribute('data-del').split('|'); d[t].splice(Number(i), 1); mark(); telaRelatorio(r.id, true); });
  }

  /* ======================= relatório: tela ======================= */
  function telaRelatorio(id, manter) {
    const base = S.d.relatorios.find(x => x.id === id);
    if (!base) { shell('relatorios', head('Relatório não encontrado') + '<div class="card list-empty">Este relatório não existe ou você não tem acesso a ele.</div>'); return; }
    if (S.edit && S.edit.id !== id) S.tab = 'form';
    if (!manter || !S.edit || S.edit.id !== id) S.edit = { id, r: JSON.parse(JSON.stringify(base)), sujo: false };
    const r = S.edit.r;
    if (!r.modelo) r.modelo = modelo(r.modeloId);
    const ro = !podeEditar(r);
    const v = verificar(r);
    const a = r.analise || {};
    const nAnx = (r.anexos || []).length;
    const tabs = [['form', 'Formulário'], ['anexos', 'Original e anexos' + (nAnx ? ' (' + nAnx + ')' : '')], ['analise', 'Análise da comissão' + (a.final ? ' ✓' : '')], ['hist', 'Histórico']];
    const temFolha = window.IPB_FOLHA && window.IPB_FOLHA.disponivel(r);
    const acoes = [];
    if (!ro) acoes.push(`<button class="btn primary" id="bSalvar">${S.edit.sujo ? 'Salvar alterações' : 'Salvar'}</button><button class="btn" id="bEnviar">Enviar para análise</button>`);
    if (temFolha) acoes.push('<button class="btn" id="bPrintF" title="Imprime só o formulário, no layout do relatório físico (A4)">Imprimir formulário</button>');
    acoes.push(`<button class="btn" id="bPrint">${temFolha ? 'Imprimir com parecer' : 'Imprimir / PDF'}</button>`);
    if (isAdmin() || (S.user.role === 'editor' && r.status === 'Rascunho')) acoes.push('<button class="btn danger" id="bExcluir">Excluir</button>');
    if (isAdmin() && !['Rascunho'].includes(r.status)) acoes.push('<button class="btn ghost" id="bReabrir">Reabrir</button>');
    const ig = igreja(r.igrejaId) || {};
    shell('relatorios', `
      <div class="print-only"><h2>${esc(r.modelo.nome)}</h2><p>${esc(ig.nome || '')} · ${esc(ig.presbiterio || '')} · Ano ${r.ano}${r.documento ? ' · ' + esc(r.documento) : ''}</p></div>
      ${head(esc(r.titulo), `${esc(igNome(r.igrejaId))} · ano ${r.ano} · ${badge(r.status)}${r.assinaturaOriginal ? ' · <span class="small">documento original assinado: ' + esc(r.assinaturaOriginal) + '</span>' : ''}`, acoes.join(''))}
      <div class="tabs no-print" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="tab-pane ${S.tab === 'form' ? '' : 'hidden'}" id="tForm">
        <div class="card no-print" style="margin-bottom:16px"><div class="card-head" style="margin-bottom:8px"><h3>Verificações automáticas</h3><span class="small muted">regras do modelo e comparação com ${anterior(r) ? 'o relatório de ' + (r.ano - 1) : 'o ano anterior (não encontrado)'}</span></div><div id="verifs">${alertasHTML(v)}</div></div>
        <div class="card">${temFolha ? `<div class="card-head no-print" style="margin-bottom:10px"><span class="small muted">${usaFolha(r) ? 'Layout do formulário impresso (CSM-IPB). As células amarelas são para preencher; os totais são calculados.' : 'Formulário em lista, campo a campo.'}</span><div class="layout-sw" role="group" aria-label="Layout do formulário"><button data-lay="folha" class="${usaFolha(r) ? 'on' : ''}">Como no papel</button><button data-lay="lista" class="${usaFolha(r) ? '' : 'on'}">Em lista</button></div></div>` : ''}${r.status === 'Devolvido' && a.final ? `<div class="alert err" style="margin-bottom:12px"><div><b>Devolvido pela comissão para correção.</b><div style="white-space:pre-wrap">${esc(a.final.texto)}</div></div></div>` : ''}${formHTML(r, ro)}</div>
      </div>
      <div class="tab-pane no-print ${S.tab === 'anexos' ? '' : 'hidden'}" id="tAnexos">${anexosHTML(r)}</div>
      <div class="tab-pane ${S.tab === 'analise' ? '' : 'hidden'}" id="tAnalise">${analiseHTML(r, v)}</div>
      <div class="tab-pane ${S.tab === 'hist' ? '' : 'hidden'}" id="tHist"><div class="card"><div class="timeline">${(r.historico || []).slice().reverse().map(h => `<div><span>${dt(h.em, true)}</span><span><b>${esc(h.por)}</b> · ${esc(h.acao)}</span></div>`).join('') || '<p class="muted">Sem histórico.</p>'}</div></div></div>`);
    $$('[data-tab]').forEach(b => b.onclick = () => { S.tab = b.getAttribute('data-tab'); telaRelatorio(id, true); });
    if (!ro) ligarForm(r);
    ligarAnalise(r);
    ligarAnexos(r);
    $$('[data-lay]').forEach(b => b.onclick = () => { S.layout = b.getAttribute('data-lay'); try { localStorage.setItem(LAYOUT_KEY, S.layout); } catch (e) { /* sem armazenamento */ } telaRelatorio(id, true); });
    if ($('#bPrintF')) $('#bPrintF').onclick = () => {
      const antes = S.layout;
      S.layout = 'folha'; telaRelatorio(id, true);
      document.body.classList.add('print-folha');
      const fim = () => { document.body.classList.remove('print-folha'); window.removeEventListener('afterprint', fim); if (antes !== 'folha') { S.layout = antes; telaRelatorio(id, true); } };
      window.addEventListener('afterprint', fim);
      setTimeout(() => print(), 60);
    };
    $('#bPrint').onclick = () => { $$('.tab-pane:not(#tAnexos)').forEach(p => p.classList.remove('hidden')); setTimeout(() => { print(); telaRelatorio(id, true); }, 50); };
    if ($('#bSalvar')) $('#bSalvar').onclick = async () => {
      const x = await acao(() => api({ action: 'salvar', entidade: 'relatorio', item: { id: r.id, dados: r.dados } }), 'Relatório salvo.');
      if (x) { await recarregar(); S.edit = null; telaRelatorio(id); }
    };
    if ($('#bEnviar')) $('#bEnviar').onclick = async () => {
      const er = verificar(r).filter(x => x.nivel === 'erro');
      if (er.length && !(await confirmar(`Há ${er.length} problema(s) apontado(s) nas verificações automáticas. Enviar mesmo assim? A comissão verá esses apontamentos.`, 'Enviar mesmo assim'))) return;
      if (S.edit.sujo && !(await acao(() => api({ action: 'salvar', entidade: 'relatorio', item: { id: r.id, dados: r.dados } })))) return;
      if (await acao(() => api({ action: 'relatorio', id: r.id, op: 'enviar' }), 'Relatório enviado para análise.')) { await recarregar(); S.edit = null; telaRelatorio(id); }
    };
    if ($('#bExcluir')) $('#bExcluir').onclick = async () => {
      if (!(await confirmar('Excluir este relatório? Isso não pode ser desfeito.', 'Excluir'))) return;
      if (await acao(() => api({ action: 'excluir', entidade: 'relatorio', id: r.id }), 'Relatório excluído.')) { await recarregar(); S.edit = null; ir('relatorios'); }
    };
    if ($('#bReabrir')) $('#bReabrir').onclick = async () => {
      if (!(await confirmar('Reabrir o relatório como rascunho? O parecer final e as assinaturas serão anulados.', 'Reabrir'))) return;
      if (await acao(() => api({ action: 'relatorio', id: r.id, op: 'reabrir' }), 'Relatório reaberto.')) { await recarregar(); S.edit = null; telaRelatorio(id); }
    };
  }

  /* ======================= original e anexos ======================= */
  const tamanho = b => b >= 1e6 ? (b / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
  const podeAnexar = () => isAdmin() || S.user.role === 'editor';
  const blobCache = {};
  async function abrirAnexo(r, an) {
    const k = r.id + '|' + an.id;
    if (blobCache[k]) return blobCache[k];
    const x = await api({ action: 'anexo', op: 'abrir', relatorioId: r.id, anexoId: an.id });
    const blob = x.blob || await (await fetch(x.dados)).blob();
    blobCache[k] = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: an.tipo }));
    return blobCache[k];
  }
  function lerArquivo(file) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('Não foi possível ler o arquivo.')); fr.readAsDataURL(file); });
  }
  async function anexarArquivo(relId, file, original) {
    if (!file) return null;
    if (!/^(application\/pdf|image\/)/.test(file.type)) throw new Error('Anexe um PDF ou uma imagem (JPG, PNG).');
    if (file.size > 15e6) throw new Error('O arquivo passa de 15 MB.');
    return api({ action: 'anexo', op: 'salvar', relatorioId: relId, nome: file.name, tipo: file.type, original: !!original, dados: await lerArquivo(file) });
  }
  function anexosHTML(r) {
    const lista = (r.anexos || []).slice().sort((a, b) => (b.original ? 1 : 0) - (a.original ? 1 : 0));
    return `<div class="card"><div class="card-head"><h2>Relatório original e anexos</h2><span class="small muted">PDF ou imagem do relatório feito à mão ou impresso, para conferir com o que foi digitado</span></div>
      ${lista.map(an => {
        const pdf = an.tipo === 'application/pdf';
        const podeExcluir = isAdmin() || (an.porId && an.porId === S.user.id);
        return `<div class="anx"><span class="ic">${pdf ? 'PDF' : 'IMG'}</span><div class="grow"><b>${esc(an.nome)}</b>${an.original ? ' <span class="tag">relatório original</span>' : ''}<div class="small muted">${tamanho(an.tamanho || 0)} · ${an.origem === 'pacote' ? 'importado do arquivo enviado pelo Presbitério' : 'anexado por ' + esc(an.porNome || '') + ' em ' + dt(an.em, true)}</div></div>
          <div class="actions"><button class="btn sm primary" data-cmp="${esc(an.id)}">Comparar com o formulário</button><button class="btn sm" data-abr="${esc(an.id)}">Abrir</button>${podeExcluir ? `<button class="btn sm ghost" data-axc="${esc(an.id)}">Excluir</button>` : ''}</div></div>`;
      }).join('') || '<p class="muted" style="margin:0">Nenhum arquivo anexado a este relatório.</p>'}
      ${podeAnexar() ? `<div class="filters" style="margin:14px 0 0"><div class="field" style="min-width:280px"><label for="axF">Anexar PDF ou imagem (até 15 MB)</label><input type="file" id="axF" accept="application/pdf,image/*"></div><button class="btn" id="bAnexar">Anexar</button></div>` : ''}
    </div>
    <div id="cmpBox"></div>`;
  }
  function ligarAnexos(r) {
    const achar = id => (r.anexos || []).find(x => x.id === id);
    $$('[data-abr]').forEach(b => b.onclick = async () => {
      const an = achar(b.getAttribute('data-abr'));
      const w = window.open('', '_blank');
      const url = await acao(() => abrirAnexo(r, an));
      if (!url) { if (w) w.close(); return; }
      if (w) w.location.href = url; else location.href = url;
    });
    $$('[data-cmp]').forEach(b => b.onclick = async () => {
      const an = achar(b.getAttribute('data-cmp'));
      const box = $('#cmpBox');
      box.innerHTML = '<div class="card"><p class="muted" style="margin:0">Abrindo o arquivo…</p></div>';
      const url = await acao(() => abrirAnexo(r, an));
      if (!url) { box.innerHTML = ''; return; }
      const C = ctx(r.modelo, r.dados);
      const dir = window.IPB_FOLHA && window.IPB_FOLHA.disponivel(r) ? `<div class="folha-wrap">${window.IPB_FOLHA.render(r, true, C, igreja(r.igrejaId) || {})}</div>` : formHTML(r, true);
      box.innerHTML = `<div class="card"><div class="card-head"><h2>Original × digitado</h2><span class="small muted">à esquerda o arquivo, à direita o que está no sistema</span></div>
        <div class="comparar"><div>${an.tipo === 'application/pdf' ? `<iframe src="${esc(url)}#view=FitH" title="${esc(an.nome)}"></iframe>` : `<img class="pdf-img" src="${esc(url)}" alt="${esc(an.nome)}">`}<p class="small" style="margin:6px 0 0"><a href="${esc(url)}" target="_blank" rel="noopener">Abrir o arquivo em outra aba</a></p></div><div class="lado">${dir}</div></div></div>`;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $$('[data-axc]').forEach(b => b.onclick = async () => {
      const an = achar(b.getAttribute('data-axc'));
      if (!(await confirmar('Excluir o anexo "' + esc(an.nome) + '"?', 'Excluir'))) return;
      if (await acao(() => api({ action: 'anexo', op: 'excluir', relatorioId: r.id, anexoId: an.id }), 'Anexo excluído.')) { await recarregar(); S.edit = null; S.tab = 'anexos'; telaRelatorio(r.id); }
    });
    if ($('#bAnexar')) $('#bAnexar').onclick = async () => {
      const f = $('#axF').files[0];
      if (!f) return toast('Escolha um arquivo.', true);
      const btn = $('#bAnexar'); btn.disabled = true; btn.textContent = 'Enviando…';
      const ok = await acao(() => anexarArquivo(r.id, f), 'Arquivo anexado.');
      btn.disabled = false; btn.textContent = 'Anexar';
      if (ok) {
        const sujo = S.edit && S.edit.sujo ? S.edit.r.dados : null;
        await recarregar(); S.tab = 'anexos';
        if (sujo) { S.edit.r.anexos = (S.d.relatorios.find(x => x.id === r.id) || {}).anexos; telaRelatorio(r.id, true); } else { S.edit = null; telaRelatorio(r.id); }
      }
    };
  }

  /* ======================= análise da comissão ======================= */
  function relatorDe(a) { return (a.membros || []).find(m => /relator/i.test(m.funcao || '')) || null; }
  function analiseHTML(r, verifs) {
    const a = r.analise || {};
    const pode = podeAnalisar(r);
    const comp = comparacao(r);
    const relator = relatorDe(a);
    const souRelator = relator && relator.userId === S.user.id;
    const podeFinal = pode && (!relator || !relator.userId || souRelator || isAdmin());
    const assinou = i => (a.assinaturas || []).find(s => s.membroIdx === i);
    const comissoes = S.d.comissoes.filter(c => c.ativa !== false);
    let h = '';
    if (r.status === 'Rascunho') h += '<div class="alert info" style="margin-bottom:16px">Este relatório ainda não foi enviado pela igreja. A análise começa depois do envio.</div>';

    h += `<div class="card"><div class="card-head"><h2>1. Comissão responsável</h2>${a.comissaoNome ? `<span class="tag">${esc(a.comissaoNome)}</span>` : ''}</div>
      ${a.membros && a.membros.length ? `<div class="tbl-wrap"><table><thead><tr><th>Membro</th><th>Função</th><th>Assinatura</th></tr></thead><tbody>${a.membros.map((m, i) => `<tr><td>${esc(m.nome)}</td><td>${esc(m.funcao)}</td><td>${assinou(i) ? '<span class="up">✓ assinado</span>' : '<span class="muted">pendente</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Nenhuma comissão designada.</p>'}
      ${pode ? `<div class="filters no-print" style="margin:12px 0 0"><div class="field" style="min-width:280px"><label>Encaminhar à comissão</label><select id="aCom"><option value="">Escolha…</option>${comissoes.map(c => `<option value="${esc(c.id)}" ${a.comissaoId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div><button class="btn" id="bAtrib">${a.comissaoId ? 'Trocar comissão' : 'Encaminhar'}</button></div>${a.comissaoId ? '<p class="small muted" style="margin:6px 0 0">Trocar a comissão anula as assinaturas já colhidas.</p>' : ''}` : ''}
    </div>`;

    h += `<div class="card"><div class="card-head"><h2>2. Verificações e comparação com o ano anterior</h2></div>${alertasHTML(verifs)}
      ${comp.rows.length ? `<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Indicador</th><th class="num">${comp.ant ? comp.ant.ano : 'Ano anterior'}</th><th class="num">${r.ano}</th><th class="num">Variação</th></tr></thead><tbody>${comp.rows.map(x => `<tr><td>${esc(x.c.label)}</td><td class="num">${x.anterior == null ? '–' : esc(fmtCampo(x.c, x.anterior))}</td><td class="num">${esc(fmtCampo(x.c, x.atual))}</td><td class="num">${x.varia == null ? '–' : `<span class="${x.varia >= 0 ? 'up' : 'down'}">${x.varia >= 0 ? '+' : ''}${pct(x.varia)}</span>`}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>`;

    h += `<div class="card"><div class="card-head"><h2>3. Proposta inicial de análise</h2><span class="small muted">gerada pela IA a partir do relatório, das verificações e do histórico</span></div>
      ${a.ia ? `<div class="ia-box"><div class="small muted" style="margin-bottom:8px">Proposta gerada em ${dt(a.ia.em, true)} por solicitação de ${esc(a.ia.porNome || '')}${a.ia.modelo ? ' · ' + esc(a.ia.modelo) : ''}. É apenas um ponto de partida: o texto final é do relator.</div><div class="txt" id="iaTxt">${esc(a.ia.texto)}</div></div>` : '<p class="muted" style="margin:0 0 8px">Nenhuma proposta gerada ainda.</p>'}
      ${pode ? `<div class="actions no-print" style="margin-top:10px"><button class="btn" id="bIA">${a.ia ? 'Gerar nova proposta' : 'Gerar proposta de análise'}</button>${a.ia && podeFinal ? '<button class="btn primary" id="bUsarIA">Usar como base do parecer final</button>' : ''}</div>${SERVER ? '' : '<p class="small muted">No modo demonstração a proposta é montada pelas verificações automáticas. Com o servidor conectado, a proposta é escrita pela IA.</p>'}` : ''}
    </div>`;

    h += `<div class="card"><div class="card-head"><h2>4. Análises dos membros</h2></div>
      ${(a.pareceres || []).map(p => `<div class="parecer"><div class="meta"><span><b>${esc(p.autorNome)}</b>${p.autorCargo ? ' · ' + esc(p.autorCargo) : ''}${p.recomendacao ? ' · recomenda: <b>' + esc(p.recomendacao) + '</b>' : ''}</span><span>${dt(p.editadoEm || p.em, true)}${(p.autorId === S.user.id || isAdmin()) && pode ? ` · <a href="javascript:void 0" data-edp="${esc(p.id)}">editar</a> · <a href="javascript:void 0" data-exp="${esc(p.id)}">excluir</a>` : ''}</span></div><div class="txt">${esc(p.texto)}</div></div>`).join('') || '<p class="muted" style="margin:0">Nenhuma análise registrada.</p>'}
      ${pode ? `<div class="grid no-print" style="margin-top:12px"><input type="hidden" id="pId"><div class="field"><label for="pTxt">Minha análise</label><textarea id="pTxt" placeholder="Escreva sua análise do relatório…"></textarea></div><div class="filters" style="margin:0"><div class="field"><label>Recomendação</label><select id="pRec"><option value="">(sem recomendação)</option>${DECISOES.map(d => `<option>${d}</option>`).join('')}</select></div><button class="btn" id="bParecer">Registrar análise</button></div></div>` : ''}
    </div>`;

    h += `<div class="card"><div class="card-head"><h2>5. Parecer final do relator</h2>${relator ? `<span class="small muted">Relator: <b>${esc(relator.nome)}</b></span>` : ''}</div>
      ${a.final ? `<div class="parecer"><div class="meta"><span>Decisão: <b>${esc(a.final.decisao)}</b></span><span>${esc(a.final.porNome)} · ${dt(a.final.em, true)}</span></div><div class="txt">${esc(a.final.texto)}</div></div>` : ''}
      ${podeFinal ? `<div class="grid no-print" style="margin-top:12px"><div class="field"><label for="fTxt">Texto final do parecer</label><textarea id="fTxt" style="min-height:220px" placeholder="O relator escreve aqui o parecer da comissão. Use a proposta da IA como base, se quiser, e ajuste livremente.">${esc(a.final ? a.final.texto : '')}</textarea><span class="help">Este é o texto oficial que os membros vão assinar. ${a.assinaturas && a.assinaturas.length ? 'Alterar o texto ou a decisão anula as assinaturas já colhidas.' : ''}</span></div>
        <div class="filters" style="margin:0"><div class="field"><label>Decisão</label><select id="fDec"><option value="">Escolha…</option>${DECISOES.map(d => `<option ${a.final && a.final.decisao === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div><button class="btn primary" id="bFinal">Salvar parecer final</button></div></div>`
        : pode && relator ? `<p class="small muted">Somente o relator (${esc(relator.nome)}) escreve o texto final.</p>` : (!a.final ? '<p class="muted" style="margin:0">Ainda não há parecer final.</p>' : '')}
    </div>`;

    h += `<div class="card"><div class="card-head"><h2>6. Assinaturas da comissão</h2><span class="small muted">assinatura eletrônica simples (Lei 14.063/2020): senha pessoal ou assinatura colhida na presença de um membro</span></div>
      ${(a.membros || []).map((m, i) => {
        const s = assinou(i);
        const self = m.userId && m.userId === S.user.id;
        const podeColher = (isAdmin() || (S.user.role === 'analista' && (a.membros || []).some(x => x.userId === S.user.id)));
        return `<div class="sig"><div class="grow"><b>${esc(m.nome)}</b> <span class="muted small">· ${esc(m.funcao)}</span>${s ? `<div class="small">Assinado em ${dt(s.em, true)} · ${esc(s.tipo)}<br>Código de verificação: <span class="code">${esc(s.codigo)}</span></div>` : ''}</div>
          ${s && s.desenho ? `<img src="${esc(s.desenho)}" alt="Assinatura de ${esc(m.nome)}">` : ''}
          ${!s && a.final && r.status === 'Em análise' ? `<div class="actions no-print">${self ? `<button class="btn primary sm" data-sig="${i}">Assinar</button>` : ''}${!self && podeColher ? `<button class="btn sm" data-sigp="${i}">Colher assinatura presencial</button>` : ''}</div>` : ''}</div>`;
      }).join('') || '<p class="muted" style="margin:0">Designe a comissão para colher as assinaturas.</p>'}
      ${pode && a.final && (a.membros || []).length && (a.assinaturas || []).length === a.membros.length ? `<div class="actions no-print" style="margin-top:12px"><button class="btn primary" id="bConcluir">Concluir análise: ${esc(a.final.decisao)}</button></div>` : ''}
    </div>`;
    return h;
  }
  function propostaLocal(r, verifs) {
    const comp = comparacao(r);
    const ig = igNome(r.igrejaId);
    const er = verifs.filter(x => x.nivel === 'erro'), al = verifs.filter(x => x.nivel !== 'erro');
    let t = `PROPOSTA INICIAL DE ANÁLISE\n${r.modelo.nome} · ${ig} · ano ${r.ano}\n\n`;
    t += '1. Situação geral\n';
    t += er.length ? `O relatório apresenta ${er.length} ponto(s) que precisam de correção ou esclarecimento e ${al.length} ponto(s) de atenção.\n` : al.length ? `O relatório está completo e não há erros de preenchimento, com ${al.length} ponto(s) de atenção.\n` : 'O relatório está completo e consistente nas verificações automáticas.\n';
    if (comp.rows.length && comp.ant) {
      t += `\n2. Comparação com ${comp.ant.ano}\n`;
      comp.rows.filter(x => x.anterior != null).forEach(x => { t += `- ${x.c.label}: ${fmtCampo(x.c, x.anterior)} → ${fmtCampo(x.c, x.atual)}${x.varia != null ? ' (' + (x.varia >= 0 ? '+' : '') + pct(x.varia) + ')' : ''}\n`; });
    }
    if (er.length) { t += '\n3. Pontos que precisam de correção\n'; er.forEach(x => { t += '- ' + x.msg + '\n'; }); }
    if (al.length) { t += `\n${er.length ? 4 : 3}. Pontos de atenção\n`; al.forEach(x => { t += '- ' + x.msg + '\n'; }); }
    t += `\nRecomendação sugerida: ${er.length ? 'Aprovar com ressalvas, solicitando à igreja as correções apontadas (ou devolver para correção, a critério da comissão).' : al.length ? 'Aprovar com ressalvas, registrando os pontos de atenção.' : 'Aprovar.'}\n`;
    t += '\n(Proposta montada automaticamente pelas verificações do sistema. O relator deve revisar, completar e ajustar o texto.)';
    return t;
  }
  function ligarAnalise(r) {
    const op = async (o, p, msg) => { if (await acao(() => api(Object.assign({ action: 'relatorio', id: r.id, op: o }, p)), msg)) { await recarregar(); S.edit = null; S.tab = 'analise'; telaRelatorio(r.id); } };
    if ($('#bAtrib')) $('#bAtrib').onclick = () => { const v = $('#aCom').value; if (!v) return toast('Escolha a comissão.', true); op('atribuir', { comissaoId: v }, 'Relatório encaminhado à comissão.'); };
    if ($('#bIA')) $('#bIA').onclick = async () => {
      const b = $('#bIA'); b.disabled = true; b.textContent = 'Gerando proposta…';
      const verifs = verificar(r);
      let texto, mod = '';
      try {
        if (SERVER) {
          const comp = comparacao(r);
          const res = await ia({ tipo: 'relatorio', relatorioId: r.id, contexto: {
            igreja: igreja(r.igrejaId), ano: r.ano, modelo: r.modelo.nome, campos: camposLegiveis(r),
            verificacoes: verifs, comparacao: comp.rows.map(x => ({ indicador: x.c.label, anterior: x.anterior, atual: x.atual })),
            anoAnterior: comp.ant ? comp.ant.ano : null, analisesMembros: (r.analise.pareceres || []).map(p => ({ autor: p.autorNome, texto: p.texto, recomendacao: p.recomendacao }))
          } });
          texto = res.texto; mod = res.modelo || '';
        } else texto = propostaLocal(r, verifs);
      } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Gerar proposta de análise'; return; }
      op('ia', { texto, modelo: mod || (SERVER ? '' : 'verificações automáticas') }, 'Proposta gerada. Revise antes de usar.');
    };
    if ($('#bUsarIA')) $('#bUsarIA').onclick = () => {
      const t = $('#fTxt');
      if (t.value.trim() && !confirm('Substituir o texto que já está no parecer final pela proposta?')) return;
      t.value = r.analise.ia.texto; t.focus(); t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('Proposta copiada para o parecer. Ajuste o texto e salve.');
    };
    if ($('#bParecer')) $('#bParecer').onclick = () => op('parecer', { texto: $('#pTxt').value, recomendacao: $('#pRec').value, parecerId: $('#pId').value || undefined }, 'Análise registrada.');
    $$('[data-edp]').forEach(l => l.onclick = () => { const p = r.analise.pareceres.find(x => x.id === l.getAttribute('data-edp')); $('#pId').value = p.id; $('#pTxt').value = p.texto; $('#pRec').value = p.recomendacao || ''; $('#pTxt').focus(); });
    $$('[data-exp]').forEach(l => l.onclick = async () => { if (await confirmar('Excluir esta análise?', 'Excluir')) op('excluir_parecer', { parecerId: l.getAttribute('data-exp') }, 'Análise excluída.'); });
    if ($('#bFinal')) $('#bFinal').onclick = () => op('final', { texto: $('#fTxt').value, decisao: $('#fDec').value }, 'Parecer final salvo.');
    $$('[data-sig]').forEach(b => b.onclick = () => {
      const i = Number(b.getAttribute('data-sig'));
      const m = modal('Assinar o parecer', `<p style="margin:0">Você vai assinar eletronicamente o parecer final (<b>${esc(r.analise.final.decisao)}</b>) como <b>${esc(r.analise.membros[i].funcao)}</b>. Confirme com a sua senha.</p><div class="field"><label>Senha</label><input type="password" id="sPw" autocomplete="current-password"></div>`,
        '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="sOk">Assinar</button>');
      $('[data-x]', m.el).onclick = m.fechar;
      $('#sOk', m.el).onclick = async () => { m.fechar(); await op('assinar', { membroIdx: i, senha: $('#sPw', m.el).value }, 'Assinatura registrada.'); };
    });
    $$('[data-sigp]').forEach(b => b.onclick = () => {
      const i = Number(b.getAttribute('data-sigp'));
      const mb = r.analise.membros[i];
      const m = modal('Assinatura presencial', `<p style="margin:0"><b>${esc(mb.nome)}</b> (${esc(mb.funcao)}) assina abaixo, na sua presença. Depois confirme com a <b>sua</b> senha para registrar.</p><canvas class="sig-pad" id="pad" width="800" height="240"></canvas><div><button class="btn sm" id="padLimpa" type="button">Limpar</button></div><div class="field"><label>Sua senha (${esc(S.user.nome)})</label><input type="password" id="sPw"></div>`,
        '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="sOk">Registrar assinatura</button>');
      const pad = assinaturaPad($('#pad', m.el));
      $('#padLimpa', m.el).onclick = pad.limpar;
      $('[data-x]', m.el).onclick = m.fechar;
      $('#sOk', m.el).onclick = async () => { if (pad.vazio()) return toast('Colha a assinatura no quadro.', true); m.fechar(); await op('assinar', { membroIdx: i, presencial: true, desenho: pad.png(), senha: $('#sPw', m.el).value }, 'Assinatura registrada.'); };
    });
    if ($('#bConcluir')) $('#bConcluir').onclick = async () => { if (await confirmar('Concluir a análise com a decisão "' + esc(r.analise.final.decisao) + '"?', 'Concluir')) op('concluir', {}, 'Análise concluída.'); };
  }
  function camposLegiveis(r) {
    const C = ctx(r.modelo, r.dados);
    const out = [];
    (r.modelo.secoes || []).forEach(s => (s.campos || []).forEach(c => {
      if (/^id_/.test(c.id)) return;
      if (c.tipo === 'table') {
        const rows = (r.dados[c.id] || []);
        const n = c.linhas ? c.linhas.length : rows.length;
        for (let i = 0; i < n; i++) out.push({ secao: s.titulo, campo: c.label + ' · ' + (c.linhas ? c.linhas[i] : 'linha ' + (i + 1)), valor: c.colunas.map(cd => cd.label + ': ' + cel(c, rows[i] || {}, cd)).join('; ') });
      } else out.push({ secao: s.titulo, campo: c.label, valor: fmtCampo(c, c.tipo === 'calc' ? C.V(c.id) : r.dados[c.id]) });
    }));
    return out;
  }
  function assinaturaPad(cv) {
    const g = cv.getContext('2d');
    let desenhando = false, vazio = true;
    g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = '#0a1f5c';
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
    cv.addEventListener('pointerdown', e => { desenhando = true; vazio = false; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); g.beginPath(); g.moveTo(x, y); });
    cv.addEventListener('pointermove', e => { if (!desenhando) return; const [x, y] = pos(e); g.lineTo(x, y); g.stroke(); });
    cv.addEventListener('pointerup', () => { desenhando = false; });
    return { limpar: () => { g.clearRect(0, 0, cv.width, cv.height); vazio = true; }, vazio: () => vazio, png: () => cv.toDataURL('image/png') };
  }

  /* ======================= exame de atas ======================= */
  const SIT = { conforme: 'Conforme', nao_conforme: 'Não conforme', nao_verificavel: 'Não verificável', nao_se_aplica: 'Não se aplica' };
  function regrasPara(ata) {
    const conselho = /conselho/i.test(ata.tipoReuniao || 'Conselho');
    return (window.IPB_REGRAS_ATAS || []).filter(g => g.aplica === 'todas' || g.aplica === 'livro' || (g.aplica === 'conselho' && conselho) || g.aplica === (ata.formato || 'digital'));
  }
  function telaAtas() {
    const atas = (S.d.atas || []).slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    const podeEnviar = isAdmin() || S.user.role === 'editor' || S.user.role === 'analista';
    shell('atas', head('Exame de atas', 'Anexe as imagens das atas. A IA confere cada página com o Regulamento para Confecção de Atas e a Constituição da IPB, e o relator escreve o parecer final.', podeEnviar ? '<button class="btn primary" id="bNovaAta">+ Enviar atas para exame</button>' : '') + `
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Igreja</th><th>Reunião</th><th>Livro / atas</th><th class="num">Páginas</th><th>Situação</th><th>Resultado</th><th>Atualizado</th></tr></thead><tbody>
      ${atas.map(a => `<tr class="click" data-go="ata/${esc(a.id)}"><td>${esc(igNome(a.igrejaId))}</td><td>${esc(a.tipoReuniao || '')}${a.dataReuniao ? ' · ' + dt(a.dataReuniao) : ''}</td><td>${esc(a.livro ? 'Livro ' + a.livro : '')}${a.numeros ? ' · ' + esc(a.numeros) : ''}</td><td class="num">${a.nPaginas || 0}</td><td>${badge(a.status)}</td><td>${a.final ? esc(a.final.conclusao) : a.ia ? '<span class="muted">proposta da IA pronta</span>' : '–'}</td><td class="small muted">${dt(a.updatedAt)}</td></tr>`).join('') || '<tr><td colspan="7" class="list-empty">Nenhuma ata enviada para exame.</td></tr>'}
      </tbody></table></div></div>
      <div class="card"><h3>Como funciona</h3><ol class="small" style="margin:8px 0 0;padding-left:18px">
        <li>A igreja (ou a comissão) fotografa ou digitaliza as páginas das atas e envia aqui.</li>
        <li>A IA lê as imagens e confere ${(window.IPB_REGRAS_ATAS || []).length} regras do Manual Presbiteriano, marcando cada uma como conforme, não conforme ou não verificável, com a evidência encontrada.</li>
        <li>O relator revisa a conferência, ajusta o que for preciso e escreve o parecer final, que é o texto oficial do exame.</li></ol></div>`);
    $$('[data-go]').forEach(tr => tr.onclick = () => ir(tr.getAttribute('data-go')));
    if ($('#bNovaAta')) $('#bNovaAta').onclick = () => modalAta(null);
  }
  async function reduzirImagem(file) {
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não consegui abrir a imagem ' + file.name + '. Use JPG ou PNG.')); i.src = url; });
    const max = 1800;
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.82);
  }
  function modalAta(ata) {
    const igs = S.d.igrejas.filter(i => i.ativo !== false && (isPresb() || i.id === S.user.igrejaId));
    let paginas = ata ? (ata.paginas || []).slice() : [];
    const m = modal(ata ? 'Editar dados da ata' : 'Enviar atas para exame', `
      ${!ata && igs.length > 1 ? `<div class="field"><label>Igreja</label><select id="aIg">${igs.map(i => `<option value="${esc(i.id)}">${esc(i.nome)}</option>`).join('')}</select></div>` : ''}
      <div class="grid g2">
        <div class="field"><label>Reunião</label><select id="aTipo">${['Conselho', 'Assembleia Geral', 'Mesa Administrativa', 'Junta Diaconal'].map(x => `<option ${ata && ata.tipoReuniao === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="field"><label>Livro</label><select id="aFmt"><option value="digital" ${ata && ata.formato === 'digital' ? 'selected' : ''}>Digital (impresso)</option><option value="manuscrito" ${ata && ata.formato === 'manuscrito' ? 'selected' : ''}>Manuscrito</option></select></div>
        <div class="field"><label>Nº do livro</label><input type="text" id="aLivro" value="${esc(ata ? ata.livro || '' : '')}"></div>
        <div class="field"><label>Ata(s)</label><input type="text" id="aNum" placeholder="Ex.: Ata 245 ou Atas 240 a 252" value="${esc(ata ? ata.numeros || '' : '')}"></div>
        <div class="field"><label>Data da reunião (se for uma só)</label><input type="date" id="aData" value="${esc(ata ? ata.dataReuniao || '' : '')}"></div>
      </div>
      <div class="field"><label>Imagens das páginas (JPG ou PNG, até 20)</label><input type="file" id="aImgs" accept="image/*" multiple><span class="help">Fotografe cada página inteira, de frente e com boa luz. As imagens são reduzidas antes do envio.</span></div>
      <div class="thumbs" id="aThumbs"></div>
      <div class="field"><label>Observações (opcional)</label><textarea id="aObs">${esc(ata ? ata.observacoes || '' : '')}</textarea></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="aOk">Enviar</button>', true);
    const thumbs = () => {
      $('#aThumbs', m.el).innerHTML = paginas.map((p, i) => `<figure><img src="${p}" alt="Página ${i + 1}"><figcaption>Pág. ${i + 1} <button type="button" class="btn ghost sm" data-rm="${i}" aria-label="Remover página ${i + 1}">×</button></figcaption></figure>`).join('');
      $$('[data-rm]', m.el).forEach(b => b.onclick = () => { paginas.splice(Number(b.getAttribute('data-rm')), 1); thumbs(); });
    };
    thumbs();
    $('#aImgs', m.el).onchange = async e => {
      const files = Array.from(e.target.files || []);
      for (const f of files) { if (paginas.length >= 20) { toast('Máximo de 20 páginas.', true); break; } try { paginas.push(await reduzirImagem(f)); } catch (err) { toast(err.message, true); } }
      e.target.value = ''; thumbs();
    };
    $('[data-x]', m.el).onclick = m.fechar;
    $('#aOk', m.el).onclick = async () => {
      const item = { id: ata ? ata.id : undefined, igrejaId: ata ? ata.igrejaId : ($('#aIg', m.el) ? $('#aIg', m.el).value : (igs[0] || {}).id), tipoReuniao: $('#aTipo', m.el).value, formato: $('#aFmt', m.el).value,
        livro: $('#aLivro', m.el).value.trim(), numeros: $('#aNum', m.el).value.trim(), dataReuniao: $('#aData', m.el).value, observacoes: $('#aObs', m.el).value, paginas };
      const b = $('#aOk', m.el); b.disabled = true; b.textContent = 'Enviando…';
      const r = await acao(() => api({ action: 'ata', op: 'salvar', item }), ata ? 'Ata atualizada.' : 'Atas enviadas para exame.');
      b.disabled = false; b.textContent = 'Enviar';
      if (!r) return;
      m.fechar(); await recarregar(); S.ataEdit = null; ir('ata/' + r.item.id);
    };
  }
  async function telaAta(id) {
    if (!S.ataEdit || S.ataEdit.id !== id) {
      shell('atas', '<div class="card list-empty">Abrindo…</div>');
      const r = await acao(() => api({ action: 'ata', op: 'abrir', id }));
      if (!r) { shell('atas', head('Ata não encontrada') + '<div class="card list-empty">Esta ata não existe ou você não tem acesso a ela.</div>'); return; }
      S.ataEdit = { id, a: r.item, conf: JSON.parse(JSON.stringify(r.item.conferencia || {})), pag: 0 };
    }
    const E = S.ataEdit, a = E.a;
    const pode = (isAdmin() || S.user.role === 'analista') && a.status !== 'Analisada';
    const regras = regrasPara(a);
    const iaIt = {};
    ((a.ia && a.ia.resultado && a.ia.resultado.itens) || []).forEach(x => { iaIt[x.regraId] = x; });
    const sitDe = rid => (E.conf[rid] && E.conf[rid].situacao) || (iaIt[rid] && iaIt[rid].situacao) || '';
    const cont = { conforme: 0, nao_conforme: 0, nao_verificavel: 0 };
    regras.forEach(g => { const s = sitDe(g.id); if (cont[s] != null) cont[s]++; });
    const grupos = [...new Set(regras.map(g => g.grupo))];
    const editarMeta = (isAdmin() || a.criadoPor === S.user.id) && a.status !== 'Analisada';
    shell('atas', head(`Exame de atas · ${esc(igNome(a.igrejaId))}`, `${esc(a.tipoReuniao || '')} · livro ${a.formato === 'manuscrito' ? 'manuscrito' : 'digital'}${a.livro ? ' nº ' + esc(a.livro) : ''}${a.numeros ? ' · ' + esc(a.numeros) : ''}${a.dataReuniao ? ' · ' + dt(a.dataReuniao) : ''} · ${badge(a.status)}`,
      `${editarMeta ? '<button class="btn" id="bEdAta">Editar / trocar imagens</button>' : ''}<button class="btn" id="bPrintAta">Imprimir / PDF</button>${isAdmin() || (a.criadoPor === S.user.id && a.status === 'Enviada') ? '<button class="btn danger" id="bExAta">Excluir</button>' : ''}${a.status === 'Analisada' && (isAdmin() || (a.final && a.final.porId === S.user.id)) ? '<button class="btn ghost" id="bReAta">Reabrir</button>' : ''}`) + `
      <div class="ata-grid">
        <div class="card ata-view no-print">
          <div class="card-head"><h3>Página ${E.pag + 1} de ${(a.paginas || []).length}</h3><div class="actions"><button class="btn sm" id="pgAnt" ${E.pag ? '' : 'disabled'}>‹ Anterior</button><button class="btn sm" id="pgProx" ${E.pag < (a.paginas || []).length - 1 ? '' : 'disabled'}>Próxima ›</button></div></div>
          <a href="${a.paginas[E.pag]}" target="_blank" rel="noopener"><img src="${a.paginas[E.pag]}" alt="Página ${E.pag + 1} da ata"></a>
          <div class="thumbs small-th">${(a.paginas || []).map((p, i) => `<button type="button" data-pg="${i}" class="${i === E.pag ? 'on' : ''}"><img src="${p}" alt="Página ${i + 1}"></button>`).join('')}</div>
          ${a.observacoes ? `<p class="small muted">${esc(a.observacoes)}</p>` : ''}
        </div>
        <div>
          <div class="card"><div class="card-head"><h2>Proposta da IA</h2>${pode && SERVER ? `<button class="btn ${a.ia ? '' : 'primary'}" id="bIAata">${a.ia ? 'Analisar novamente' : 'Analisar com IA'}</button>` : ''}</div>
            ${a.ia ? `<div class="ia-box"><div class="small muted" style="margin-bottom:6px">Gerada em ${dt(a.ia.em, true)}${a.ia.modelo ? ' · ' + esc(a.ia.modelo) : ''}. Proposta inicial: o relator confere e decide.</div><div class="txt">${esc(a.ia.resultado.resumo || '')}</div>${(a.ia.resultado.transcricao_resumida ? `<details style="margin-top:8px"><summary class="small">O que a IA leu nas imagens</summary><div class="small" style="white-space:pre-wrap;margin-top:6px">${esc(a.ia.resultado.transcricao_resumida)}</div></details>` : '')}</div>`
              : `<p class="muted" style="margin:0">${SERVER ? 'Clique em "Analisar com IA" para a conferência automática das páginas.' : 'A leitura das imagens pela IA precisa do sistema conectado ao servidor. No modo demonstração, faça a conferência manual abaixo.'}</p>`}
          </div>
          <div class="card"><div class="card-head"><h2>Conferência com o Manual Presbiteriano</h2><span class="small"><span class="sit sit-conforme">${cont.conforme} conformes</span> <span class="sit sit-nao_conforme">${cont.nao_conforme} não conformes</span> <span class="sit sit-nao_verificavel">${cont.nao_verificavel} não verificáveis</span></span></div>
            ${grupos.map(gr => `<h3 class="section-title">${esc(gr)}</h3>${regras.filter(g => g.grupo === gr).map(g => {
              const s = sitDe(g.id), ii = iaIt[g.id], obs = (E.conf[g.id] && E.conf[g.id].obs) || '';
              return `<div class="regra"><div class="regra-txt"><div>${esc(g.texto)}</div><div class="small muted">${esc(g.artigo)}</div>${ii && (ii.evidencia || ii.observacao) ? `<div class="small ia-ev">IA${ii.pagina ? ' (pág. ' + esc(ii.pagina) + ')' : ''}: ${esc(ii.evidencia || '')}${ii.observacao ? ' · ' + esc(ii.observacao) : ''}</div>` : ''}${pode ? `<input type="text" class="small" data-obs="${g.id}" placeholder="Observação do relator" value="${esc(obs)}">` : obs ? `<div class="small"><b>Relator:</b> ${esc(obs)}</div>` : ''}</div>
                <div>${pode ? `<select data-sit="${g.id}" class="sit-sel sit-${esc(s)}" aria-label="Situação"><option value="">–</option>${Object.entries(SIT).map(([k, l]) => `<option value="${k}" ${s === k ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<span class="sit sit-${esc(s)}">${esc(SIT[s] || '–')}</span>`}${ii && E.conf[g.id] && E.conf[g.id].situacao && E.conf[g.id].situacao !== ii.situacao ? '<div class="small muted">ajustado pelo relator</div>' : ''}</div></div>`;
            }).join('')}`).join('')}
            ${pode ? '<div class="actions" style="margin-top:12px"><button class="btn" id="bConf">Salvar conferência</button></div>' : ''}
          </div>
          <div class="card"><div class="card-head"><h2>Parecer do relator</h2>${a.final ? `<span class="small muted">${esc(a.final.porNome)} · ${dt(a.final.em, true)}</span>` : ''}</div>
            ${a.final && !pode ? `<div class="parecer"><div class="meta"><span>Conclusão: <b>${esc(a.final.conclusao)}</b></span></div><div class="txt">${esc(a.final.texto)}</div></div>` : ''}
            ${pode ? `<div class="grid"><div class="field"><label for="atTxt">Texto final (do relator)</label><textarea id="atTxt" style="min-height:200px" placeholder="Escreva o parecer do exame. Use a proposta como base, se quiser.">${esc(a.final ? a.final.texto : '')}</textarea></div>
              <div class="filters" style="margin:0"><div class="field"><label>Conclusão</label><select id="atConc"><option value="">Escolha…</option>${['Conforme', 'Conforme com observações', 'Não conforme'].map(x => `<option ${a.final && a.final.conclusao === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
              <button class="btn" id="bBaseAta">Montar texto a partir da conferência</button><button class="btn primary" id="bFinalAta">Salvar parecer</button></div></div>` : (!a.final ? '<p class="muted" style="margin:0">Ainda sem parecer.</p>' : '')}
          </div>
          <div class="card"><h3>Histórico</h3><div class="timeline">${(a.historico || []).slice().reverse().map(h => `<div><span>${dt(h.em, true)}</span><span><b>${esc(h.por)}</b> · ${esc(h.acao)}</span></div>`).join('')}</div></div>
        </div>
      </div>`);
    $$('[data-pg]').forEach(b => b.onclick = () => { E.pag = Number(b.getAttribute('data-pg')); telaAta(id); });
    if ($('#pgAnt')) $('#pgAnt').onclick = () => { E.pag--; telaAta(id); };
    if ($('#pgProx')) $('#pgProx').onclick = () => { E.pag++; telaAta(id); };
    $$('[data-sit]').forEach(s => s.onchange = () => { const k = s.getAttribute('data-sit'); E.conf[k] = Object.assign({}, E.conf[k], { situacao: s.value }); s.className = 'sit-sel sit-' + s.value; });
    $$('[data-obs]').forEach(s => s.oninput = () => { const k = s.getAttribute('data-obs'); E.conf[k] = Object.assign({ situacao: sitDe(k) }, E.conf[k], { obs: s.value }); });
    const fim = async (req, msg) => { const r = await acao(() => api(Object.assign({ action: 'ata', id }, req)), msg); if (r) { await recarregar(); S.ataEdit = r.item ? { id, a: r.item, conf: JSON.parse(JSON.stringify(r.item.conferencia || {})), pag: E.pag } : null; return r; } return null; };
    if ($('#bConf')) $('#bConf').onclick = async () => { if (await fim({ op: 'conferencia', itens: E.conf }, 'Conferência salva.')) telaAta(id); };
    if ($('#bIAata')) $('#bIAata').onclick = async () => {
      const b = $('#bIAata'); b.disabled = true; b.textContent = 'Lendo as páginas… (pode levar 1 a 2 minutos)';
      try {
        const res = await ia({ tipo: 'ata', ataId: id, regras: regras.map(g => ({ id: g.id, artigo: g.artigo, texto: g.texto })), meta: { igreja: igNome(a.igrejaId), tipoReuniao: a.tipoReuniao, formato: a.formato, livro: a.livro, numeros: a.numeros } });
        if (await fim({ op: 'ia', resultado: res.resultado, modelo: res.modelo || '' }, 'Análise da IA pronta. Confira cada item.')) { E.conf = {}; S.ataEdit.conf = JSON.parse(JSON.stringify(S.ataEdit.a.conferencia || {})); telaAta(id); }
      } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Analisar com IA'; }
    };
    if ($('#bBaseAta')) $('#bBaseAta').onclick = () => {
      const t = $('#atTxt');
      if (t.value.trim() && !confirm('Substituir o texto atual?')) return;
      const nc = regras.filter(g => sitDe(g.id) === 'nao_conforme'), nv = regras.filter(g => sitDe(g.id) === 'nao_verificavel');
      const obs = g => { const o = (E.conf[g.id] && E.conf[g.id].obs) || (iaIt[g.id] && (iaIt[g.id].observacao || iaIt[g.id].evidencia)) || ''; return o ? ' ' + o : ''; };
      let x = `Exame ${a.numeros ? 'da(s) ' + a.numeros : 'das atas'}${a.livro ? ' do livro nº ' + a.livro : ''} (${a.tipoReuniao}) da ${igNome(a.igrejaId)}, à luz do Regulamento para Confecção de Atas dos Concílios da IPB e da CI/IPB.\n\n`;
      x += a.ia && a.ia.resultado.resumo ? a.ia.resultado.resumo + '\n\n' : '';
      x += nc.length ? 'Pontos não conformes:\n' + nc.map(g => `- ${g.texto} (${g.artigo}).${obs(g)}`).join('\n') + '\n\n' : 'Não foram encontrados pontos em desacordo com o Regulamento nas páginas examinadas.\n\n';
      x += nv.length ? 'Itens que não puderam ser verificados pelas imagens:\n' + nv.map(g => `- ${g.texto}`).join('\n') + '\n\n' : '';
      x += 'Recomendação: ' + (nc.length ? 'que o Conselho observe os pontos acima nas próximas atas e, onde couber, lavre o competente auto de correção (art. 15).' : 'aprovar as atas examinadas.');
      t.value = x; t.focus();
      $('#atConc').value = nc.length ? (nc.length > 3 ? 'Não conforme' : 'Conforme com observações') : 'Conforme';
    };
    if ($('#bFinalAta')) $('#bFinalAta').onclick = async () => {
      await acao(() => api({ action: 'ata', id, op: 'conferencia', itens: E.conf }));
      if (await fim({ op: 'final', texto: $('#atTxt').value, conclusao: $('#atConc').value }, 'Parecer salvo.')) telaAta(id);
    };
    if ($('#bEdAta')) $('#bEdAta').onclick = () => modalAta(a);
    if ($('#bExAta')) $('#bExAta').onclick = async () => { if (await confirmar('Excluir estas atas e as imagens?', 'Excluir') && await fim({ op: 'excluir' }, 'Excluído.')) { S.ataEdit = null; ir('atas'); } };
    if ($('#bReAta')) $('#bReAta').onclick = async () => { if (await fim({ op: 'reabrir' }, 'Exame reaberto.')) telaAta(id); };
    $('#bPrintAta').onclick = () => print();
  }

  /* ======================= verificação pública ======================= */
  function telaVerificar(cod) {
    const html = head('Verificar assinatura', 'Confira se uma assinatura de parecer é autêntica e se o conteúdo assinado não foi alterado depois.') + `
      <div class="card" style="max-width:640px"><form id="fVer" class="filters" style="margin:0"><div class="field" style="flex:1"><label>Código de verificação</label><input type="text" id="vCod" class="code" placeholder="XXXX-XXXX-XXXX" value="${esc(cod || '')}"></div><button class="btn primary">Verificar</button></form><div id="vRes" style="margin-top:14px"></div></div>`;
    if (S.user) shell('verificar', html); else root().innerHTML = `<div class="main" style="max-width:760px;margin:0 auto">${html}<p><a href="#/">← Entrar no sistema</a></p></div>`;
    const go = async () => {
      const c = $('#vCod').value.trim(); if (!c) return;
      const r = await acao(() => api({ action: 'verificar', codigo: c }));
      if (!r) return;
      $('#vRes').innerHTML = !r.encontrado ? '<div class="alert err">Código não encontrado.</div>' :
        `<div class="alert ${r.integro ? 'ok' : 'err'}"><div><b>${r.integro ? '✓ Assinatura válida. O conteúdo não foi alterado desde a assinatura.' : '✗ A assinatura existe, mas o conteúdo do relatório ou do parecer foi alterado depois dela.'}</b>
        <div style="margin-top:6px">${esc(r.assinatura.nome)} (${esc(r.assinatura.funcao)}) assinou em ${dt(r.assinatura.em, true)} · ${esc(r.assinatura.tipo)}</div>
        <div>${esc(r.relatorio.titulo)} · ${esc(r.relatorio.igreja)} · ${esc(r.relatorio.comissao || '')} · situação: ${esc(r.relatorio.status)}</div></div></div>`;
    };
    $('#fVer').onsubmit = e => { e.preventDefault(); go(); };
    if (cod) go();
  }

  /* ======================= administração ======================= */
  function telaAdmin(sec) {
    if (!isAdmin()) { ir('painel'); return; }
    ({ igrejas: admIgrejas, usuarios: admUsuarios, modelos: admModelos, comissoes: admComissoes, registro: admRegistro }[sec] || admIgrejas)();
  }
  function admIgrejas() {
    const igs = S.d.igrejas;
    shell('admin', head('Igrejas', 'Cadastro das igrejas, congregações e congregações presbiteriais. Os dados de identificação dos relatórios vêm daqui.', '<button class="btn primary" id="bNI">+ Nova igreja</button>') + `
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Cidade</th><th>Secretário</th><th class="num">Relatórios</th><th>Situação</th></tr></thead><tbody>
      ${igs.map(i => `<tr class="click" data-ed="${esc(i.id)}"><td>${esc(i.nome)}${i.igrejaMae ? `<div class="small muted">de ${esc(igNome(i.igrejaMae))}</div>` : ''}</td><td>${esc(i.tipo || 'Igreja')}</td><td>${esc(i.cidade || '')}${i.uf ? '/' + esc(i.uf) : ''}</td><td>${esc(i.secretario || '')}</td><td class="num">${S.d.relatorios.filter(r => r.igrejaId === i.id).length}</td><td>${i.ativo === false ? '<span class="tag gray">inativa</span>' : '<span class="tag">ativa</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>`);
    const abrir = i => {
      i = i || { ativo: true, tipo: 'Igreja', presbiterio: (igs[0] || {}).presbiterio || '', sinodo: (igs[0] || {}).sinodo || '' };
      const F = [['nome', 'Nome', 'full'], ['sigla', 'Sigla'], ['tipo', 'Tipo'], ['igrejaMae', 'Igreja mãe (congregações)'], ['endereco', 'Endereço', 'span2'], ['bairro', 'Bairro'], ['cidade', 'Cidade'], ['uf', 'UF'], ['cep', 'CEP'], ['telefone', 'Telefone'], ['email', 'E-mail'], ['site', 'Site'], ['cnpj', 'CNPJ'], ['dataOrg', 'Data de organização'], ['secretario', 'Secretário do Conselho'], ['pastor', 'Pastor'], ['presbiterio', 'Presbitério', 'span2'], ['sinodo', 'Sínodo']];
      const m = modal(i.id ? 'Editar igreja' : 'Nova igreja', `<div class="grid g3">${F.map(([k, l, cls]) => `<div class="field ${cls || ''}"><label>${l}</label>${k === 'tipo' ? `<select data-k="tipo">${['Igreja', 'Congregação', 'Congregação Presbiterial'].map(x => `<option ${i.tipo === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : k === 'igrejaMae' ? `<select data-k="igrejaMae"><option value="">–</option>${igs.filter(x => x.id !== i.id && (x.tipo || 'Igreja') === 'Igreja').map(x => `<option value="${esc(x.id)}" ${i.igrejaMae === x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select>` : `<input type="text" data-k="${k}" value="${esc(i[k] || '')}">`}</div>`).join('')}<label class="full"><input type="checkbox" id="iAt" ${i.ativo !== false ? 'checked' : ''}> Ativa (aparece no login)</label></div>`,
        `${i.id ? '<button class="btn danger" id="iDel" style="margin-right:auto">Excluir</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="iOk">Salvar</button>`, true);
      $('[data-x]', m.el).onclick = m.fechar;
      $('#iOk', m.el).onclick = async () => {
        const item = { id: i.id, ativo: $('#iAt', m.el).checked };
        $$('[data-k]', m.el).forEach(el => { item[el.getAttribute('data-k')] = el.value.trim() || (el.getAttribute('data-k') === 'igrejaMae' ? null : ''); });
        if (await acao(() => api({ action: 'salvar', entidade: 'igreja', item }), 'Igreja salva.')) { m.fechar(); await recarregar(); render(); }
      };
      if ($('#iDel', m.el)) $('#iDel', m.el).onclick = async () => { if (await acao(() => api({ action: 'excluir', entidade: 'igreja', id: i.id }), 'Igreja excluída.')) { m.fechar(); await recarregar(); render(); } };
    };
    $('#bNI').onclick = () => abrir(null);
    $$('[data-ed]').forEach(tr => tr.onclick = () => abrir(igs.find(x => x.id === tr.getAttribute('data-ed'))));
  }
  function admUsuarios() {
    const us = S.d.usuarios;
    shell('admin', head('Usuários e acessos', 'Quem entra no sistema, em qual igreja e o que pode fazer.', '<button class="btn primary" id="bNU">+ Novo usuário</button>') + `
      <div class="card" style="margin-bottom:16px"><div class="grid g4 small">
        <div><b>Administrador</b><br><span class="muted">Tudo, inclusive igrejas, usuários, modelos e comissões.</span></div>
        <div><b>Editor</b><br><span class="muted">Preenche e envia os relatórios da sua igreja. Envia atas.</span></div>
        <div><b>Analista</b><br><span class="muted">Membro de comissão: analisa, escreve pareceres e assina.</span></div>
        <div><b>Somente leitura</b><br><span class="muted">Vê relatórios e o painel, sem alterar nada.</span></div>
      </div><p class="small muted" style="margin:10px 0 0">Usuários sem igreja são do Presbitério e veem todas as igrejas. Usuários de uma igreja veem só a própria.</p></div>
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Usuário</th><th>Igreja</th><th>Perfil</th><th>Cargo</th><th>Situação</th></tr></thead><tbody>
      ${us.map(u => `<tr class="click" data-ed="${esc(u.id)}"><td>${esc(u.nome)}</td><td class="code">${esc(u.username)}</td><td>${esc(u.igrejaId ? igNome(u.igrejaId) : 'Presbitério')}</td><td>${esc(ROLE_NOMES[u.role] || u.role)}</td><td>${esc(u.cargo || '')}</td><td>${u.ativo === false ? '<span class="tag gray">inativo</span>' : '<span class="tag">ativo</span>'}</td></tr>`).join('')}
      </tbody></table></div></div>`);
    const abrir = u => {
      u = u || { ativo: true, role: 'editor', igrejaId: '' };
      const m = modal(u.id ? 'Editar usuário' : 'Novo usuário', `<div class="grid g2">
        <div class="field"><label>Nome completo</label><input type="text" id="uN" value="${esc(u.nome || '')}"></div>
        <div class="field"><label>Usuário (login)</label><input type="text" id="uU" value="${esc(u.username || '')}"></div>
        <div class="field"><label>Igreja</label><select id="uI"><option value="">Presbitério (todas)</option>${S.d.igrejas.map(i => `<option value="${esc(i.id)}" ${u.igrejaId === i.id ? 'selected' : ''}>${esc(i.nome)}</option>`).join('')}</select></div>
        <div class="field"><label>Perfil de acesso</label><select id="uR">${Object.entries(ROLE_NOMES).map(([k, l]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label>Cargo / função</label><input type="text" id="uC" value="${esc(u.cargo || '')}" placeholder="Ex.: Secretário do Conselho"></div>
        <div class="field"><label>E-mail</label><input type="email" id="uE" value="${esc(u.email || '')}"></div>
        <div class="field"><label>${u.id ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial (mínimo 6)'}</label><input type="password" id="uS" autocomplete="new-password"></div>
        <label style="align-self:end"><input type="checkbox" id="uA" ${u.ativo !== false ? 'checked' : ''}> Ativo</label></div>`,
        `${u.id ? '<button class="btn danger" id="uDel" style="margin-right:auto">Excluir</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="uOk">Salvar</button>`, true);
      $('[data-x]', m.el).onclick = m.fechar;
      $('#uOk', m.el).onclick = async () => {
        const item = { id: u.id, nome: $('#uN', m.el).value.trim(), username: $('#uU', m.el).value.trim(), igrejaId: $('#uI', m.el).value || null, role: $('#uR', m.el).value, cargo: $('#uC', m.el).value.trim(), email: $('#uE', m.el).value.trim(), ativo: $('#uA', m.el).checked };
        if ($('#uS', m.el).value) item.senha = $('#uS', m.el).value;
        if (await acao(() => api({ action: 'salvar', entidade: 'usuario', item }), 'Usuário salvo.')) { m.fechar(); await recarregar(); render(); }
      };
      if ($('#uDel', m.el)) $('#uDel', m.el).onclick = async () => { if (await confirmar('Excluir o usuário ' + esc(u.nome) + '?', 'Excluir') && await acao(() => api({ action: 'excluir', entidade: 'usuario', id: u.id }), 'Usuário excluído.')) { m.fechar(); await recarregar(); render(); } };
    };
    $('#bNU').onclick = () => abrir(null);
    $$('[data-ed]').forEach(tr => tr.onclick = () => abrir(us.find(x => x.id === tr.getAttribute('data-ed'))));
  }
  function admComissoes() {
    const cs = S.d.comissoes;
    const analistas = S.d.usuarios.filter(u => u.ativo !== false && ['analista', 'admin'].includes(u.role));
    shell('admin', head('Comissões', 'Comissões que examinam os relatórios. Cada membro assina o parecer; o relator escreve o texto final.', (window.IPB_REUNIAO ? '<button class="btn" id="bPadrao">Criar comissões do concílio</button>' : '') + '<button class="btn primary" id="bNC">+ Nova comissão</button>') + `
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Comissão</th><th>Tipo</th><th>Ano</th><th>Membros</th><th>Situação</th></tr></thead><tbody>
      ${cs.map(c => `<tr class="click" data-ed="${esc(c.id)}"><td>${esc(c.nome)}</td><td>${esc(c.tipo || c.grupo || '')}</td><td>${esc(c.ano || '')}</td><td class="small">${(c.membros || []).map(m => esc(m.nome) + ' <span class="muted">(' + esc(m.funcao) + ')</span>').join('<br>')}</td><td>${c.ativa === false ? '<span class="tag gray">inativa</span>' : '<span class="tag">ativa</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="list-empty">Nenhuma comissão.</td></tr>'}
      </tbody></table></div></div>`);
    const abrir = c => {
      c = c ? JSON.parse(JSON.stringify(c)) : { ativa: true, ano: new Date().getFullYear(), tipo: 'Exame de relatórios', membros: [] };
      const m = modal(c.id ? 'Editar comissão' : 'Nova comissão', `<div class="grid g3"><div class="field span2"><label>Nome</label><input type="text" id="cN" value="${esc(c.nome || '')}"></div><div class="field"><label>Ano</label><input type="number" id="cA" value="${esc(c.ano || '')}"></div><div class="field span2"><label>Tipo</label><input type="text" id="cT" value="${esc(c.tipo || '')}"></div><label style="align-self:end"><input type="checkbox" id="cAt" ${c.ativa !== false ? 'checked' : ''}> Ativa</label></div>
        ${window.IPB_REUNIAO ? window.IPB_REUNIAO.camposComissao(c) : ''}
        <div class="lbl">Membros</div><div id="cM"></div><div><button class="btn sm" id="cAdd" type="button">+ Adicionar membro</button></div>
        <p class="small muted" style="margin:0">Vincule cada membro a um usuário para que ele possa assinar com a própria senha. Membros sem usuário assinam de forma presencial (desenho), colhida por outro membro. Marque um membro como Relator.</p>`,
        `${c.id ? '<button class="btn danger" id="cDel" style="margin-right:auto">Excluir</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="cOk">Salvar</button>`, true);
      const desenhar = () => {
        $('#cM', m.el).innerHTML = c.membros.map((mb, i) => `<div class="grid g3" style="margin-bottom:8px;align-items:end"><div class="field"><label>Usuário</label><select data-mu="${i}"><option value="">(sem usuário)</option>${analistas.map(u => `<option value="${esc(u.id)}" ${mb.userId === u.id ? 'selected' : ''}>${esc(u.nome)}</option>`).join('')}</select></div><div class="field"><label>Nome</label><input type="text" data-mn="${i}" value="${esc(mb.nome || '')}"></div><div class="field"><label>Função</label><div style="display:flex;gap:6px"><select data-mf="${i}">${['Relator', 'Membro', 'Presidente', 'Secretário'].map(x => `<option ${mb.funcao === x ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="btn ghost sm" data-mr="${i}" type="button" aria-label="Remover">×</button></div></div></div>`).join('') || '<p class="muted small" style="margin:0">Nenhum membro.</p>';
        $$('[data-mu]', m.el).forEach(s => s.onchange = () => { const i = +s.getAttribute('data-mu'); c.membros[i].userId = s.value || null; const u = analistas.find(x => x.id === s.value); if (u) c.membros[i].nome = u.nome; desenhar(); });
        $$('[data-mn]', m.el).forEach(s => s.oninput = () => { c.membros[+s.getAttribute('data-mn')].nome = s.value; });
        $$('[data-mf]', m.el).forEach(s => s.onchange = () => { c.membros[+s.getAttribute('data-mf')].funcao = s.value; });
        $$('[data-mr]', m.el).forEach(s => s.onclick = () => { c.membros.splice(+s.getAttribute('data-mr'), 1); desenhar(); });
      };
      desenhar();
      $('#cAdd', m.el).onclick = () => { c.membros.push({ userId: null, nome: '', funcao: c.membros.length ? 'Membro' : 'Relator' }); desenhar(); };
      $('[data-x]', m.el).onclick = m.fechar;
      $('#cOk', m.el).onclick = async () => {
        if (c.membros.filter(x => x.funcao === 'Relator').length > 1) return toast('Escolha apenas um relator.', true);
        const item = Object.assign({ id: c.id, nome: $('#cN', m.el).value.trim(), ano: Number($('#cA', m.el).value) || null, tipo: $('#cT', m.el).value.trim(), ativa: $('#cAt', m.el).checked, membros: c.membros },
          window.IPB_REUNIAO ? window.IPB_REUNIAO.lerCamposComissao(m.el) : {});
        if (await acao(() => api({ action: 'salvar', entidade: 'comissao', item }), 'Comissão salva.')) { m.fechar(); await recarregar(); render(); }
      };
      if ($('#cDel', m.el)) $('#cDel', m.el).onclick = async () => { if (await confirmar('Excluir esta comissão? Relatórios já encaminhados mantêm os membros.', 'Excluir') && await acao(() => api({ action: 'excluir', entidade: 'comissao', id: c.id }), 'Comissão excluída.')) { m.fechar(); await recarregar(); render(); } };
    };
    $('#bNC').onclick = () => abrir(null);
    if ($('#bPadrao')) $('#bPadrao').onclick = () => window.IPB_REUNIAO.criarPadrao();
    $$('[data-ed]').forEach(tr => tr.onclick = () => abrir(cs.find(x => x.id === tr.getAttribute('data-ed'))));
  }
  function admRegistro() {
    shell('admin', head('Registro de ações', 'Tudo o que foi feito no sistema, do mais recente para o mais antigo.', SERVER ? '' : '<button class="btn" id="bExp">Exportar backup (JSON)</button><label class="btn">Importar backup<input type="file" id="bImp" accept=".json" hidden></label><button class="btn danger" id="bReset">Restaurar dados iniciais</button>') + `
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>
      ${(S.d.log || []).map(l => `<tr><td class="small">${dt(l.em, true)}</td><td>${esc(l.usuario)}</td><td><span class="tag gray">${esc(l.acao)}</span></td><td class="small">${esc(l.detalhes)}</td></tr>`).join('') || '<tr><td colspan="4" class="list-empty">Sem registros.</td></tr>'}
      </tbody></table></div></div>`);
    if ($('#bExp')) {
      $('#bExp').onclick = () => baixar('relatorios-ipb-backup.json', JSON.stringify(window.IPB_LOCAL.exportar(), null, 1), 'application/json');
      $('#bImp').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { window.IPB_LOCAL.importar(JSON.parse(await f.text())); toast('Backup importado. Entre novamente.'); sair(); } catch (err) { toast(err.message, true); } };
      $('#bReset').onclick = async () => { if (await confirmar('Apagar tudo deste navegador e voltar aos dados iniciais (igrejas e relatórios importados)?', 'Restaurar')) { await window.IPB_LOCAL.reset(); toast('Dados restaurados. Entre novamente.'); sair(); } };
    }
  }
  /* ---- editor de modelos ---- */
  const TIPOS = { text: 'Texto curto', textarea: 'Texto longo', number: 'Número', money: 'Valor (R$)', date: 'Data', select: 'Lista de opções', checks: 'Várias opções (marcar)', yesno: 'Sim / Não', table: 'Tabela', calc: 'Cálculo' };
  let modEdit = null;
  function admModelos(id) {
    const a = rota().a;
    id = id || a[1];
    if (id) return editorModelo(id);
    shell('admin', head('Modelos de relatório', 'Os formulários que as igrejas preenchem. Todos os campos podem ser editados.', '<button class="btn primary" id="bNM">+ Novo modelo</button>') + `
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Modelo</th><th>Categoria</th><th class="num">Campos</th><th class="num">Versão</th><th>Situação</th></tr></thead><tbody>
      ${S.d.modelos.map(m => `<tr class="click" data-go="admin/modelos/${esc(m.id)}"><td>${esc(m.nome)}<div class="small muted">${esc(m.descricao || '')}</div></td><td>${esc(m.categoria || '')}</td><td class="num">${(m.secoes || []).reduce((n, s) => n + (s.campos || []).length, 0)}</td><td class="num">${m.versao || 1}</td><td>${m.ativo === false ? '<span class="tag gray">inativo</span>' : '<span class="tag">ativo</span>'}</td></tr>`).join('')}
      </tbody></table></div><p class="small muted">Relatórios já criados guardam a versão do modelo da época. Mudanças valem para os relatórios novos.</p></div>`);
    $$('[data-go]').forEach(tr => tr.onclick = () => ir(tr.getAttribute('data-go')));
    $('#bNM').onclick = () => { modEdit = { nome: 'Novo modelo', categoria: '', descricao: '', secoes: [{ titulo: 'Seção 1', campos: [] }], verificacoes: [], continuidade: [], ativo: true }; ir('admin/modelos/novo'); };
  }
  function editorModelo(id) {
    if (!modEdit || (modEdit.id !== id && id !== 'novo')) {
      const m = modelo(id);
      if (!m) { ir('admin/modelos'); return; }
      modEdit = JSON.parse(JSON.stringify(m));
    }
    const M = modEdit;
    const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
    shell('admin', head(esc(M.nome), 'Editar modelo', '<button class="btn" id="mVolta">Voltar</button><button class="btn primary" id="mSalva">Salvar modelo</button>') + `
      <div class="card"><div class="grid g3"><div class="field span2"><label>Nome</label><input type="text" data-m="nome" value="${esc(M.nome)}"></div><div class="field"><label>Categoria</label><input type="text" data-m="categoria" value="${esc(M.categoria || '')}"></div><div class="field full"><label>Descrição</label><textarea data-m="descricao">${esc(M.descricao || '')}</textarea></div><label><input type="checkbox" id="mAt" ${M.ativo !== false ? 'checked' : ''}> Ativo (disponível para novos relatórios)</label></div></div>
      <div class="card">${M.secoes.map((s, si) => `<div class="sec-box"><div class="card-head" style="margin-bottom:10px"><input type="text" data-st="${si}" value="${esc(s.titulo)}" style="font-weight:600;max-width:520px"><div class="icon-btns"><button data-smv="${si}|-1" title="Subir seção">↑</button><button data-smv="${si}|1" title="Descer seção">↓</button><button data-sdel="${si}" title="Excluir seção">🗑</button></div></div>
        ${(s.campos || []).map((c, ci) => `<div class="fld-row"><div class="field"><input type="text" data-cl="${si}|${ci}" value="${esc(c.label)}" aria-label="Rótulo"></div><select data-ct="${si}|${ci}">${opt(TIPOS, c.tipo)}</select><div class="icon-btns"><button data-cmv="${si}|${ci}|-1" title="Subir">↑</button><button data-cmv="${si}|${ci}|1" title="Descer">↓</button><button data-cdel="${si}|${ci}" title="Excluir campo">🗑</button></div>
          <div class="more"><div class="field"><label class="small">Identificador</label><input type="text" data-ci="${si}|${ci}" value="${esc(c.id)}" class="code"></div>
          ${['select', 'checks'].includes(c.tipo) ? `<div class="field"><label class="small">Opções (separe com ;)</label><input type="text" data-co="${si}|${ci}" value="${esc((c.opcoes || []).join('; '))}"></div>` : ''}
          ${c.tipo === 'calc' ? `<div class="field" style="grid-column:span 2"><label class="small">Fórmula</label><input type="text" data-cf="${si}|${ci}" value="${esc(c.formula || '')}" class="code"></div><div class="field"><label class="small">Formato</label><select data-cfm="${si}|${ci}"><option value="">Número</option><option value="money" ${c.formato === 'money' ? 'selected' : ''}>R$</option></select></div>` : ''}
          ${c.tipo === 'table' ? `<div class="field" style="grid-column:span 2"><label class="small">Colunas (id:Rótulo:tipo; …)</label><input type="text" data-cc="${si}|${ci}" value="${esc((c.colunas || []).map(x => x.id + ':' + x.label + ':' + x.tipo + (x.formula ? ':' + x.formula : '')).join('; '))}" class="code"></div><div class="field"><label class="small">Linhas fixas (separe com ;)</label><input type="text" data-cr="${si}|${ci}" value="${esc((c.linhas || []).join('; '))}"></div>` : ''}
          <div class="field"><label class="small">Texto de ajuda</label><input type="text" data-ch="${si}|${ci}" value="${esc(c.ajuda || '')}"></div>
          <label class="small" style="align-self:end"><input type="checkbox" data-cob="${si}|${ci}" ${c.obrigatorio ? 'checked' : ''}> Obrigatório</label>
          <label class="small" style="align-self:end"><input type="checkbox" data-cin="${si}|${ci}" ${c.indicador ? 'checked' : ''}> Indicador</label></div></div>`).join('')}
        <button class="btn sm" data-cadd="${si}" style="margin-top:8px">+ Campo</button></div>`).join('')}
        <button class="btn" id="mSec" style="margin-top:12px">+ Seção</button></div>
      <div class="card"><h3>Verificações automáticas</h3><p class="small muted">Uma por linha: <span class="code">expressão | nível (erro ou alerta) | mensagem</span>. A mensagem aparece quando a expressão for verdadeira. Ex.: <span class="code">fin_dizimo_sc == 0 | erro | Não repassou o dízimo ao SC.</span></p>
        <textarea id="mVer" class="code" style="min-height:160px">${esc((M.verificacoes || []).map(v => v.se + ' | ' + (v.nivel || 'alerta') + ' | ' + v.msg).join('\n'))}</textarea>
        <h3 style="margin-top:14px">Comparação com o ano anterior</h3><p class="small muted">Uma por linha: <span class="code">expressão deste ano | expressão do ano anterior | mensagem</span>.</p>
        <textarea id="mCont" class="code">${esc((M.continuidade || []).map(v => v.atual + ' | ' + v.anterior + ' | ' + v.msg).join('\n'))}</textarea></div>`);
    const P = s => s.split('|').map(Number);
    const fld = s => { const [a, b] = P(s); return M.secoes[a].campos[b]; };
    const re = () => editorModelo(id);
    $$('[data-m]').forEach(e => e.oninput = () => { M[e.getAttribute('data-m')] = e.value; });
    $('#mAt').onchange = e => { M.ativo = e.target.checked; };
    $$('[data-st]').forEach(e => e.oninput = () => { M.secoes[+e.getAttribute('data-st')].titulo = e.value; });
    $$('[data-cl]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-cl')).label = e.value; });
    $$('[data-ci]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-ci')).id = e.value.trim(); });
    $$('[data-ch]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-ch')).ajuda = e.value; });
    $$('[data-co]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-co')).opcoes = e.value.split(';').map(x => x.trim()).filter(Boolean); });
    $$('[data-cf]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-cf')).formula = e.value; });
    $$('[data-cfm]').forEach(e => e.onchange = () => { fld(e.getAttribute('data-cfm')).formato = e.value || undefined; });
    $$('[data-cr]').forEach(e => e.oninput = () => { const l = e.value.split(';').map(x => x.trim()).filter(Boolean); fld(e.getAttribute('data-cr')).linhas = l.length ? l : undefined; });
    $$('[data-cc]').forEach(e => e.oninput = () => { fld(e.getAttribute('data-cc')).colunas = e.value.split(';').map(x => x.trim()).filter(Boolean).map(x => { const [i, l, t, ...f] = x.split(':'); return { id: (i || '').trim(), label: (l || i || '').trim(), tipo: (t || 'text').trim(), formula: f.length ? f.join(':').trim() : undefined }; }); });
    $$('[data-cob]').forEach(e => e.onchange = () => { fld(e.getAttribute('data-cob')).obrigatorio = e.checked; });
    $$('[data-cin]').forEach(e => e.onchange = () => { fld(e.getAttribute('data-cin')).indicador = e.checked; });
    $$('[data-ct]').forEach(e => e.onchange = () => { const c = fld(e.getAttribute('data-ct')); c.tipo = e.value; if (e.value === 'table' && !c.colunas) c.colunas = [{ id: 'descricao', label: 'Descrição', tipo: 'text' }, { id: 'valor', label: 'Valor', tipo: 'number' }]; re(); });
    $$('[data-cdel]').forEach(e => e.onclick = () => { const [a, b] = P(e.getAttribute('data-cdel')); M.secoes[a].campos.splice(b, 1); re(); });
    $$('[data-cmv]').forEach(e => e.onclick = () => { const [a, b, d] = P(e.getAttribute('data-cmv')); const arr = M.secoes[a].campos; const j = b + d; if (j < 0 || j >= arr.length) return; [arr[b], arr[j]] = [arr[j], arr[b]]; re(); });
    $$('[data-cadd]').forEach(e => e.onclick = () => { M.secoes[+e.getAttribute('data-cadd')].campos.push({ id: 'campo_' + Date.now().toString(36), label: 'Novo campo', tipo: 'text' }); re(); });
    $$('[data-sdel]').forEach(e => e.onclick = async () => { if (await confirmar('Excluir a seção e seus campos?', 'Excluir')) { M.secoes.splice(+e.getAttribute('data-sdel'), 1); re(); } });
    $$('[data-smv]').forEach(e => e.onclick = () => { const [a, d] = P(e.getAttribute('data-smv')); const j = a + d; if (j < 0 || j >= M.secoes.length) return; [M.secoes[a], M.secoes[j]] = [M.secoes[j], M.secoes[a]]; re(); });
    $('#mSec').onclick = () => { M.secoes.push({ titulo: 'Nova seção', campos: [] }); re(); };
    $('#mVolta').onclick = () => { modEdit = null; ir('admin/modelos'); };
    $('#mSalva').onclick = async () => {
      M.verificacoes = $('#mVer').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0] && p.length >= 3).map(p => ({ se: p[0], nivel: p[1] === 'erro' ? 'erro' : 'alerta', msg: p.slice(2).join(' | ') }));
      M.continuidade = $('#mCont').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(p => p[0] && p.length >= 3).map(p => ({ atual: p[0], anterior: p[1], msg: p.slice(2).join(' | ') }));
      const ids = M.secoes.flatMap(s => s.campos.map(c => c.id));
      const dup = ids.find((x, i) => ids.indexOf(x) !== i);
      if (dup) return toast('Identificador repetido: ' + dup, true);
      if (ids.some(x => !/^[A-Za-z_]\w*$/.test(x))) return toast('Identificadores só podem ter letras sem acento, números e _ (sem começar com número).', true);
      const r = await acao(() => api({ action: 'salvar', entidade: 'modelo', item: M }), 'Modelo salvo.');
      if (r) { await recarregar(); modEdit = null; ir('admin/modelos'); }
    };
  }

  /* ======================= render ======================= */
  async function render() {
    tip(null, null);
    const { p, a } = rota();
    if (p === 'verificar' && !S.user) return telaVerificar(a[0]);
    if (!S.user) { if (!S.publico) S.publico = await acao(() => api({ action: 'publico' })) || { igrejas: [] }; return telaLogin(); }
    if (p !== 'relatorio') S.tab = S.tab || 'form';
    switch (p) {
      case 'painel': return telaPainel();
      case 'indicadores': return telaIndicadores();
      case 'relatorios': return telaRelatorios(a[0]);
      case 'relatorio': return telaRelatorio(a[0], S.edit && S.edit.id === a[0]);
      case 'atas': S.ataEdit = null; return telaAtas();
      case 'ata': return telaAta(a[0]);
      case 'verificar': return telaVerificar(a[0]);
      case 'admin': return telaAdmin(a[0]);
      case 'acervo': if (window.IPB_ACERVO) return window.IPB_ACERVO.render(a); return telaPainel();
      case 'tesouraria': if (window.IPB_TESOURARIA) return window.IPB_TESOURARIA.render(a); return telaPainel();
      case 'reuniao': case 'reunioes': case 'ata-geral': case 'comissoes': case 'comissao': case 'documentos': case 'delegados': case 'historico': case 'parecer': case 'mesa':
        if (window.IPB_REUNIAO) return window.IPB_REUNIAO.render(p, a);
        return telaPainel();
      default: return telaPainel();
    }
  }
  async function iniciar() {
    aplicarTema();
    try { S.token = localStorage.getItem(TOKEN_KEY); } catch (e) { S.token = null; }
    if (S.token) { try { await recarregar(); } catch (e) { S.token = null; S.user = null; } }
    render();
  }
  // funções do app usadas pelo módulo da reunião do concílio (reunioes.js)
  window.IPB_APP = { S, api, esc, $, $$, shell, head, modal, confirmar, toast, acao, recarregar, render, ir, barras, hbarras, ligarTips, baixar, isAdmin, num, money, moneyK, pct, dt, lerArquivo, tamanho, logo, ctx, modelo };
  window.addEventListener('beforeunload', e => { if (S.edit && S.edit.sujo) { e.preventDefault(); e.returnValue = ''; } });
  iniciar();
})();
