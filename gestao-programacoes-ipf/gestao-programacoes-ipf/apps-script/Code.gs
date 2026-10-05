/**
 * API da Gestão de Programações · IP Filadélfia
 * Usa a própria planilha como banco de dados.
 *
 * Instalação: Planilha → Extensões → Apps Script → cole este arquivo →
 * Implantar → Nova implantação → App da Web
 *   Executar como: Eu
 *   Quem pode acessar: Qualquer pessoa
 * Copie a URL gerada para o arquivo config.js do site.
 */

const SHEETS = {
  users: {
    name: 'Usuarios',
    cols: ['id', 'name', 'username', 'role', 'active', 'passwordHash', 'createdAt']
  },
  ministries: {
    name: 'Ministerios',
    cols: ['id', 'name', 'leader', 'color', 'description', 'createdAt', 'updatedAt']
  },
  events: {
    name: 'Programacoes',
    cols: ['id', 'title', 'ministryId', 'status', 'date', 'time', 'location', 'responsible', 'description', 'createdAt', 'updatedAt', 'updatedBy']
  }
};

const SALT = 'ipf::';                 // mesmo sal usado pelo site (backups são compatíveis)
const SESSION_DAYS = 7;
const MAX_LOGIN_FAILS = 5;
const STATUSES = ['Pendente', 'Em andamento', 'Concluída'];

/* ==========================================================================
   ENTRADA HTTP
   ========================================================================== */
function doGet() {
  return json_({ ok: true, app: 'ipf-programacoes', message: 'API ativa.' });
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_(Object.assign({ ok: true }, handle_(req)));
  } catch (err) {
    return json_({ ok: false, error: err.message || String(err), code: err.code || 'ERROR' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(message, code) {
  const err = new Error(message);
  err.code = code || 'ERROR';
  throw err;
}

function handle_(req) {
  setup_();
  const action = req.action;
  const p = req.payload || {};

  if (action === 'ping') return {};
  if (action === 'login') return login_(p);

  const me = auth_(req.token);
  if (action === 'logout') {
    PropertiesService.getScriptProperties().deleteProperty('sess_' + req.token);
    return {};
  }
  if (action === 'getAll') return { data: getAll_(), me: publicUser_(me) };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (action) {
      case 'upsertEvent': upsertEvent_(p, me); break;
      case 'deleteEvent': deleteRow_('events', str_(p.id)); break;
      case 'upsertMinistry': upsertMinistry_(p); break;
      case 'deleteMinistry': deleteMinistry_(str_(p.id)); break;
      case 'upsertUser': requireAdmin_(me); upsertUser_(p, me); break;
      case 'deleteUser': requireAdmin_(me); deleteUser_(str_(p.id), me); break;
      case 'setPassword':
        if (me.role !== 'admin' && me.id !== p.id) fail_('Sem permissão.', 'FORBIDDEN');
        setPassword_(str_(p.id), p.password);
        break;
      case 'importAll': requireAdmin_(me); importAll_(p); break;
      default: fail_('Ação desconhecida: ' + action);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  const fresh = getById_('users', me.id) || me;
  return { data: getAll_(), me: publicUser_(fresh) };
}

/* ==========================================================================
   ESTRUTURA DA PLANILHA
   ========================================================================== */
function setup_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(key => {
    const def = SHEETS[key];
    if (ss.getSheetByName(def.name)) return;
    const sh = ss.insertSheet(def.name);
    sh.getRange(1, 1, sh.getMaxRows(), def.cols.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols]).setFontWeight('bold').setBackground('#e6f3ea');
    sh.setFrozenRows(1);
  });
  if (readAll_('users').length === 0) {
    writeRow_('users', {
      id: 'u-admin', name: 'Administrador', username: 'admin', role: 'admin',
      active: 'TRUE', passwordHash: hash_('admin123'), createdAt: now_()
    });
  }
}

function sheet_(key) {
  return SpreadsheetApp.getActive().getSheetByName(SHEETS[key].name);
}

function readAll_(key) {
  const def = SHEETS[key];
  const sh = sheet_(key);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, def.cols.length).getDisplayValues()
    .filter(r => r[0])
    .map(r => {
      const o = {};
      def.cols.forEach((c, i) => { o[c] = r[i]; });
      return o;
    });
}

function findRow_(key, id) {
  const sh = sheet_(key);
  const n = sh.getLastRow() - 1;
  if (n < 1 || !id) return -1;
  const ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function getById_(key, id) {
  return readAll_(key).find(o => o.id === id) || null;
}

function writeRow_(key, obj) {
  const def = SHEETS[key];
  const sh = sheet_(key);
  const row = def.cols.map(c => (obj[c] === undefined || obj[c] === null) ? '' : String(obj[c]));
  let r = findRow_(key, obj.id);
  if (r < 0) r = sh.getLastRow() + 1;
  const range = sh.getRange(r, 1, 1, row.length);
  range.setNumberFormat('@');
  range.setValues([row]);
}

function deleteRow_(key, id) {
  const r = findRow_(key, id);
  if (r > 0) sheet_(key).deleteRow(r);
}

function replaceAll_(key, list) {
  const def = SHEETS[key];
  const sh = sheet_(key);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
  if (!list.length) return;
  const rows = list.map(o => def.cols.map(c => (o[c] === undefined || o[c] === null) ? '' : String(o[c])));
  const range = sh.getRange(2, 1, rows.length, def.cols.length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function getAll_() {
  return {
    users: readAll_('users').map(publicUser_),
    ministries: readAll_('ministries').map(m => ({
      id: m.id, name: m.name, leader: m.leader, color: m.color, description: m.description
    })),
    events: readAll_('events').map(e => ({
      id: e.id, title: e.title, ministryId: e.ministryId, status: e.status, date: e.date, time: e.time,
      location: e.location, responsible: e.responsible, description: e.description,
      updatedAt: e.updatedAt, updatedBy: e.updatedBy
    }))
  };
}

/* ==========================================================================
   AUTENTICAÇÃO
   ========================================================================== */
function hash_(pass) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, SALT + pass, Utilities.Charset.UTF_8);
  return 'sha256:' + bytes.map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function login_(p) {
  const username = str_(p.username).toLowerCase();
  const password = String(p.password || '');
  if (!username || !password) fail_('Informe usuário e senha.');

  const cache = CacheService.getScriptCache();
  const failKey = 'fail_' + username;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= MAX_LOGIN_FAILS) fail_('Muitas tentativas. Aguarde 5 minutos e tente novamente.');

  const user = readAll_('users').find(u => u.username.toLowerCase() === username);
  if (!user || !isTrue_(user.active) || user.passwordHash !== hash_(password)) {
    cache.put(failKey, String(fails + 1), 300);
    fail_('Usuário ou senha incorretos.');
  }
  cache.remove(failKey);

  const props = PropertiesService.getScriptProperties();
  purgeSessions_(props);
  const token = Utilities.getUuid();
  props.setProperty('sess_' + token, JSON.stringify({ uid: user.id, exp: Date.now() + SESSION_DAYS * 86400000 }));
  return { token: token, me: publicUser_(user), data: getAll_() };
}

function auth_(token) {
  if (!token) fail_('Sessão expirada. Entre novamente.', 'AUTH');
  const raw = PropertiesService.getScriptProperties().getProperty('sess_' + token);
  if (!raw) fail_('Sessão expirada. Entre novamente.', 'AUTH');
  const sess = JSON.parse(raw);
  if (sess.exp < Date.now()) fail_('Sessão expirada. Entre novamente.', 'AUTH');
  const user = getById_('users', sess.uid);
  if (!user || !isTrue_(user.active)) fail_('Usuário inativo ou removido.', 'AUTH');
  return user;
}

function purgeSessions_(props) {
  const all = props.getProperties();
  const now = Date.now();
  Object.keys(all).forEach(k => {
    if (k.indexOf('sess_') !== 0) return;
    try { if (JSON.parse(all[k]).exp < now) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
}

function requireAdmin_(me) {
  if (me.role !== 'admin') fail_('Apenas administradores podem fazer isso.', 'FORBIDDEN');
}

function publicUser_(u) {
  return { id: u.id, name: u.name, username: u.username, role: u.role === 'admin' ? 'admin' : 'user', active: isTrue_(u.active) };
}

/* ==========================================================================
   PROGRAMAÇÕES
   ========================================================================== */
function upsertEvent_(p, me) {
  const data = {
    title: str_(p.title, 120),
    ministryId: str_(p.ministryId),
    status: STATUSES.indexOf(p.status) >= 0 ? p.status : 'Pendente',
    date: str_(p.date),
    time: str_(p.time),
    location: str_(p.location, 120),
    responsible: str_(p.responsible, 120),
    description: str_(p.description, 2000)
  };
  if (!data.title || !data.date || !data.time || !data.location || !data.responsible) fail_('Preencha todos os campos obrigatórios.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) fail_('Data inválida.');
  if (!/^\d{2}:\d{2}$/.test(data.time)) fail_('Horário inválido.');

  const id = validId_(p.id, 'e');
  const existing = getById_('events', id);
  writeRow_('events', Object.assign({}, existing || {}, data, {
    id: id,
    createdAt: existing ? existing.createdAt : now_(),
    updatedAt: now_(),
    updatedBy: me.username
  }));
}

/* ==========================================================================
   MINISTÉRIOS
   ========================================================================== */
function upsertMinistry_(p) {
  const data = {
    name: str_(p.name, 60),
    leader: str_(p.leader, 120),
    color: /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '#4f46e5',
    description: str_(p.description, 2000)
  };
  if (!data.name || !data.leader) fail_('Preencha todos os campos obrigatórios.');
  const id = validId_(p.id, 'm');
  const dup = readAll_('ministries').find(m => m.id !== id && norm_(m.name) === norm_(data.name));
  if (dup) fail_('Já existe um ministério com esse nome.');
  const existing = getById_('ministries', id);
  writeRow_('ministries', Object.assign({}, existing || {}, data, {
    id: id,
    createdAt: existing ? existing.createdAt : now_(),
    updatedAt: now_()
  }));
}

function deleteMinistry_(id) {
  deleteRow_('ministries', id);
  const sh = sheet_('events');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const col = SHEETS.events.cols.indexOf('ministryId') + 1;
  const range = sh.getRange(2, col, n, 1);
  const vals = range.getDisplayValues().map(r => [r[0] === id ? '' : r[0]]);
  range.setValues(vals);
}

/* ==========================================================================
   USUÁRIOS
   ========================================================================== */
function activeAdmins_(users, excludeId) {
  return users.filter(u => u.role === 'admin' && isTrue_(u.active) && u.id !== excludeId).length;
}

function upsertUser_(p, me) {
  const name = str_(p.name, 80);
  const username = str_(p.username, 40);
  const role = p.role === 'admin' ? 'admin' : 'user';
  const active = p.active !== false;
  if (!name || !username) fail_('Preencha todos os campos obrigatórios.');
  if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) fail_('Usuário deve ter ao menos 2 caracteres, sem espaços ou acentos.');

  const users = readAll_('users');
  const id = validId_(p.id, 'u');
  const existing = users.find(u => u.id === id);
  if (users.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase())) fail_('Esse nome de usuário já está em uso.');

  if (existing) {
    if (existing.id === me.id && (!active || role !== 'admin')) fail_('Você não pode remover o seu próprio acesso de administrador.');
    if (existing.role === 'admin' && (role !== 'admin' || !active) && activeAdmins_(users, id) === 0) fail_('É necessário manter ao menos um administrador ativo.');
  } else {
    if (String(p.password || '').length < 4) fail_('A senha deve ter ao menos 4 caracteres.');
  }

  writeRow_('users', {
    id: id, name: name, username: username, role: role, active: active ? 'TRUE' : 'FALSE',
    passwordHash: existing ? existing.passwordHash : hash_(String(p.password)),
    createdAt: existing ? existing.createdAt : now_()
  });
}

function deleteUser_(id, me) {
  if (id === me.id) fail_('Você não pode excluir o seu próprio usuário.');
  const users = readAll_('users');
  const u = users.find(x => x.id === id);
  if (!u) return;
  if (u.role === 'admin' && activeAdmins_(users, id) === 0) fail_('É necessário manter ao menos um administrador ativo.');
  deleteRow_('users', id);
}

function setPassword_(id, password) {
  password = String(password || '');
  if (password.length < 4) fail_('A senha deve ter ao menos 4 caracteres.');
  const u = getById_('users', id);
  if (!u) fail_('Usuário não encontrado.');
  u.passwordHash = hash_(password);
  writeRow_('users', u);
}

/* ==========================================================================
   IMPORTAÇÃO DE BACKUP
   ========================================================================== */
function importAll_(p) {
  if (!Array.isArray(p.users) || !Array.isArray(p.ministries) || !Array.isArray(p.events)) fail_('Backup inválido.');
  const current = readAll_('users');
  const ts = now_();

  const users = p.users.map(u => {
    const old = current.find(c => c.id === u.id);
    let passwordHash = '';
    if (u.passwordHash && String(u.passwordHash).indexOf('sha256:') === 0) passwordHash = u.passwordHash;
    else if (u.password) passwordHash = hash_(String(u.password));
    else if (old) passwordHash = old.passwordHash;
    return {
      id: validId_(u.id, 'u'), name: str_(u.name, 80), username: str_(u.username, 40),
      role: u.role === 'admin' ? 'admin' : 'user', active: u.active === false || u.active === 'FALSE' ? 'FALSE' : 'TRUE',
      passwordHash: passwordHash, createdAt: (old && old.createdAt) || ts
    };
  }).filter(u => u.name && u.username);
  if (!users.some(u => u.role === 'admin' && u.active === 'TRUE' && u.passwordHash)) fail_('O backup não possui nenhum administrador ativo com senha.');

  const ministries = p.ministries.map(m => ({
    id: validId_(m.id, 'm'), name: str_(m.name, 60), leader: str_(m.leader, 120),
    color: /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#4f46e5',
    description: str_(m.description, 2000), createdAt: ts, updatedAt: ts
  })).filter(m => m.name);

  const events = p.events.map(e => ({
    id: validId_(e.id, 'e'), title: str_(e.title, 120), ministryId: str_(e.ministryId),
    status: STATUSES.indexOf(e.status) >= 0 ? e.status : 'Pendente',
    date: str_(e.date), time: str_(e.time), location: str_(e.location, 120),
    responsible: str_(e.responsible, 120), description: str_(e.description, 2000),
    createdAt: ts, updatedAt: ts, updatedBy: 'importação'
  })).filter(e => e.title);

  replaceAll_('users', users);
  replaceAll_('ministries', ministries);
  replaceAll_('events', events);
}

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */
function str_(v, max) {
  const s = (v === undefined || v === null) ? '' : String(v).trim();
  return max ? s.slice(0, max) : s;
}
function norm_(s) { return str_(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function now_() { return new Date().toISOString(); }
function validId_(id, prefix) {
  return /^[a-z]-[A-Za-z0-9_-]{1,40}$/.test(id || '') ? id : prefix + '-' + Utilities.getUuid().slice(0, 12);
}
