/**
 * API da Gestão de Programações · IP Filadélfia
 * Usa a própria planilha como banco de dados.
 *
 * Instalação: Planilha → Extensões → Apps Script → cole este arquivo →
 * Implantar → Nova implantação → App da Web
 *   Executar como: Eu
 *   Quem pode acessar: Qualquer pessoa
 * Copie a URL gerada para o arquivo config.js do site.
 *
 * Lembretes (48h antes de cada programação): no editor do Apps Script,
 * escolha a função "instalarLembretes" e clique em Executar uma vez.
 * Para o WhatsApp, veja as propriedades do script descritas em WHATSAPP, mais abaixo.
 */

const SHEETS = {
  users: {
    name: 'Usuarios',
    cols: ['id', 'name', 'username', 'role', 'active', 'passwordHash', 'createdAt', 'email', 'phone']
  },
  ministries: {
    name: 'Ministerios',
    cols: ['id', 'name', 'leader', 'color', 'description', 'createdAt', 'updatedAt']
  },
  events: {
    name: 'Programacoes',
    cols: ['id', 'title', 'ministryId', 'status', 'date', 'time', 'location', 'responsible', 'description', 'createdAt', 'updatedAt', 'updatedBy',
      'createdBy', 'responsibleEmail', 'responsiblePhone', 'reminderSentAt']
  },
  log: {
    name: 'Registro',
    cols: ['id', 'at', 'userId', 'username', 'action', 'entity', 'entityId', 'title', 'owner', 'details', 'alert']
  }
};

const SALT = 'ipf::';                 // mesmo sal usado pelo site (backups são compatíveis)
const SESSION_DAYS = 7;
const MAX_LOGIN_FAILS = 5;
const STATUSES = ['Pendente', 'Em andamento', 'Concluída'];
const REMINDER_HOURS = 48;
const LOG_LIMIT = 1000;               // linhas mais recentes enviadas ao painel do administrador

const EVENT_LABELS = {
  title: 'Título', ministryId: 'Ministério', status: 'Status', date: 'Data', time: 'Horário', location: 'Local',
  responsible: 'Responsável', description: 'Descrição', responsibleEmail: 'E-mail do responsável',
  responsiblePhone: 'WhatsApp do responsável', createdBy: 'Dono'
};
const FIELD_LABELS = Object.assign({
  name: 'Nome', username: 'Usuário', role: 'Perfil', active: 'Situação', email: 'E-mail', phone: 'WhatsApp',
  leader: 'Responsável', color: 'Cor'
}, EVENT_LABELS);

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
    log_(me, 'logout', 'sessão', '', '', '', '');
    return {};
  }
  if (action === 'getAll') return { data: getAll_(me), me: publicUser_(me, true) };
  if (action === 'getLog') { requireAdmin_(me); return { log: getLog_(), notify: notifyStatus_() }; }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (action) {
      case 'upsertEvent': upsertEvent_(p, me); break;
      case 'deleteEvent': deleteEvent_(str_(p.id), me); break;
      case 'upsertMinistry': upsertMinistry_(p, me); break;
      case 'deleteMinistry': deleteMinistry_(str_(p.id), me); break;
      case 'upsertUser': requireAdmin_(me); upsertUser_(p, me); break;
      case 'deleteUser': requireAdmin_(me); deleteUser_(str_(p.id), me); break;
      case 'setPassword':
        if (me.role !== 'admin' && me.id !== p.id) fail_('Sem permissão.', 'FORBIDDEN');
        setPassword_(str_(p.id), p.password, me);
        break;
      case 'importAll': requireAdmin_(me); importAll_(p, me); break;
      default: fail_('Ação desconhecida: ' + action);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  const fresh = getById_('users', me.id) || me;
  return { data: getAll_(fresh), me: publicUser_(fresh, true) };
}

/* ==========================================================================
   ESTRUTURA DA PLANILHA
   ========================================================================== */
function setup_() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(key => {
    const def = SHEETS[key];
    let sh = ss.getSheetByName(def.name);
    if (!sh) {
      sh = ss.insertSheet(def.name);
      sh.getRange(1, 1, sh.getMaxRows(), def.cols.length).setNumberFormat('@');
      sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols]).setFontWeight('bold').setBackground('#e6f3ea');
      sh.setFrozenRows(1);
      return;
    }
    // planilhas criadas por versões anteriores: acrescenta as colunas novas no fim
    const have = sh.getLastColumn();
    if (have < def.cols.length) {
      const missing = def.cols.slice(have);
      sh.getRange(1, have + 1, sh.getMaxRows(), missing.length).setNumberFormat('@');
      sh.getRange(1, have + 1, 1, missing.length).setValues([missing]).setFontWeight('bold').setBackground('#e6f3ea');
    }
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
    .map(r => toObj_(def, r));
}

function toObj_(def, r) {
  const o = {};
  def.cols.forEach((c, i) => { o[c] = r[i] === undefined ? '' : r[i]; });
  return o;
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

function getAll_(me) {
  const users = readAll_('users');
  const admin = me && me.role === 'admin';
  return {
    users: users.map(u => publicUser_(u, admin || (me && u.id === me.id))),
    ministries: readAll_('ministries').map(m => ({
      id: m.id, name: m.name, leader: m.leader, color: m.color, description: m.description
    })),
    events: readAll_('events').map(e => ({
      id: e.id, title: e.title, ministryId: e.ministryId, status: e.status, date: e.date, time: e.time,
      location: e.location, responsible: e.responsible, description: e.description,
      responsibleEmail: e.responsibleEmail, responsiblePhone: e.responsiblePhone,
      createdBy: ownerOf_(e, users), reminderSentAt: e.reminderSentAt,
      updatedAt: e.updatedAt, updatedBy: e.updatedBy
    })),
    alerts: admin ? getLog_(200).filter(l => l.alert) : []
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
    log_({ id: '', username: username }, 'login_falhou', 'sessão', '', '', '', 'Usuário ou senha incorretos.');
    fail_('Usuário ou senha incorretos.');
  }
  cache.remove(failKey);

  const props = PropertiesService.getScriptProperties();
  purgeSessions_(props);
  const token = Utilities.getUuid();
  props.setProperty('sess_' + token, JSON.stringify({ uid: user.id, exp: Date.now() + SESSION_DAYS * 86400000 }));
  log_(user, 'login', 'sessão', '', '', '', '');
  return { token: token, me: publicUser_(user, true), data: getAll_(user) };
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

// e-mail e telefone só vão para o próprio usuário e para administradores
function publicUser_(u, withContacts) {
  const o = { id: u.id, name: u.name, username: u.username, role: u.role === 'admin' ? 'admin' : 'user', active: isTrue_(u.active) };
  if (withContacts) { o.email = u.email || ''; o.phone = u.phone || ''; }
  return o;
}

/* ==========================================================================
   PROGRAMAÇÕES
   ========================================================================== */
// Dono = login que cadastrou. Programações antigas (sem essa coluna) ficam com o último login que as alterou.
function ownerOf_(e, users) {
  if (e.createdBy) return e.createdBy;
  const u = (users || readAll_('users')).find(x => x.username && x.username === e.updatedBy);
  return u ? u.id : '';
}

function canEditEvent_(e, me, users) {
  return me.role === 'admin' || ownerOf_(e, users) === me.id;
}

function upsertEvent_(p, me) {
  const data = {
    title: str_(p.title, 120),
    ministryId: str_(p.ministryId),
    status: STATUSES.indexOf(p.status) >= 0 ? p.status : 'Pendente',
    date: str_(p.date),
    time: str_(p.time),
    location: str_(p.location, 120),
    responsible: str_(p.responsible, 120),
    description: str_(p.description, 2000),
    responsibleEmail: str_(p.responsibleEmail, 120),
    responsiblePhone: str_(p.responsiblePhone, 30)
  };
  if (!data.title || !data.date || !data.time || !data.location || !data.responsible) fail_('Preencha todos os campos obrigatórios.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) fail_('Data inválida.');
  if (!/^\d{2}:\d{2}$/.test(data.time)) fail_('Horário inválido.');
  if (data.responsibleEmail && !isEmail_(data.responsibleEmail)) fail_('E-mail do responsável inválido.');
  if (data.responsiblePhone && !phoneDigits_(data.responsiblePhone)) fail_('WhatsApp do responsável inválido. Use DDD + número.');

  const users = readAll_('users');
  const id = validId_(p.id, 'e');
  const existing = getById_('events', id);
  const owner = existing ? ownerOf_(existing, users) : me.id;

  if (existing && !canEditEvent_(existing, me, users)) {
    fail_('Você só pode alterar as programações cadastradas por você.', 'FORBIDDEN');
  }
  // o administrador pode transferir a programação para outro login
  let createdBy = owner;
  if (me.role === 'admin' && p.createdBy && users.some(u => u.id === p.createdBy)) createdBy = p.createdBy;

  const row = Object.assign({}, existing || {}, data, {
    id: id,
    createdBy: createdBy,
    createdAt: existing ? existing.createdAt : now_(),
    updatedAt: now_(),
    updatedBy: me.username
  });
  // mudou data ou horário: o lembrete volta a valer para a nova data
  if (existing && (existing.date !== data.date || existing.time !== data.time)) row.reminderSentAt = '';
  writeRow_('events', row);

  if (!existing) {
    log_(me, 'criou', 'programação', id, data.title, userName_(users, createdBy), formatDateBr_(data.date) + ' ' + data.time);
    return;
  }
  const before = Object.assign({}, existing, { createdBy: owner });
  const changes = diff_(before, row, Object.keys(EVENT_LABELS), users);
  if (!changes) return;
  const onlyStatus = Object.keys(EVENT_LABELS).every(k => k === 'status' || String(before[k] || '') === String(row[k] || ''));
  log_(me, onlyStatus ? 'mudou_status' : 'editou', 'programação', id, data.title, userName_(users, owner), changes, owner && owner !== me.id);
}

function deleteEvent_(id, me) {
  const users = readAll_('users');
  const existing = getById_('events', id);
  if (!existing) return;
  if (!canEditEvent_(existing, me, users)) fail_('Você só pode excluir as programações cadastradas por você.', 'FORBIDDEN');
  const owner = ownerOf_(existing, users);
  deleteRow_('events', id);
  log_(me, 'excluiu', 'programação', id, existing.title, userName_(users, owner),
    formatDateBr_(existing.date) + ' ' + existing.time + ' · ' + existing.location, owner && owner !== me.id);
}

/* ==========================================================================
   MINISTÉRIOS
   ========================================================================== */
function upsertMinistry_(p, me) {
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
  if (existing) requireAdmin_(me);   // todos cadastram; só administradores alteram
  writeRow_('ministries', Object.assign({}, existing || {}, data, {
    id: id,
    createdAt: existing ? existing.createdAt : now_(),
    updatedAt: now_()
  }));
  if (!existing) log_(me, 'criou', 'ministério', id, data.name, '', '');
  else {
    const changes = diff_(existing, data, ['name', 'leader', 'color', 'description']);
    if (changes) log_(me, 'editou', 'ministério', id, data.name, '', changes);
  }
}

function deleteMinistry_(id, me) {
  requireAdmin_(me);
  const existing = getById_('ministries', id);
  if (!existing) return;
  deleteRow_('ministries', id);
  const sh = sheet_('events');
  const n = sh.getLastRow() - 1;
  let unlinked = 0;
  if (n >= 1) {
    const col = SHEETS.events.cols.indexOf('ministryId') + 1;
    const range = sh.getRange(2, col, n, 1);
    const vals = range.getDisplayValues().map(r => {
      if (r[0] === id) { unlinked++; return ['']; }
      return [r[0]];
    });
    range.setValues(vals);
  }
  log_(me, 'excluiu', 'ministério', id, existing.name, '', unlinked ? unlinked + ' programação(ões) ficaram sem ministério' : '');
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
  const email = str_(p.email, 120);
  const phone = str_(p.phone, 30);
  if (!name || !username) fail_('Preencha todos os campos obrigatórios.');
  if (!/^[a-zA-Z0-9._-]{2,}$/.test(username)) fail_('Usuário deve ter ao menos 2 caracteres, sem espaços ou acentos.');
  if (email && !isEmail_(email)) fail_('E-mail inválido.');
  if (phone && !phoneDigits_(phone)) fail_('WhatsApp inválido. Use DDD + número.');

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

  const row = {
    id: id, name: name, username: username, role: role, active: active ? 'TRUE' : 'FALSE',
    passwordHash: existing ? existing.passwordHash : hash_(String(p.password)),
    createdAt: existing ? existing.createdAt : now_(),
    email: email, phone: phone
  };
  writeRow_('users', row);
  if (!existing) log_(me, 'criou', 'usuário', id, name + ' (' + username + ')', '', role === 'admin' ? 'Administrador' : 'Usuário');
  else {
    const changes = diff_(existing, row, ['name', 'username', 'role', 'active', 'email', 'phone']);
    if (changes) log_(me, 'editou', 'usuário', id, name + ' (' + username + ')', '', changes);
  }
}

function deleteUser_(id, me) {
  if (id === me.id) fail_('Você não pode excluir o seu próprio usuário.');
  const users = readAll_('users');
  const u = users.find(x => x.id === id);
  if (!u) return;
  if (u.role === 'admin' && activeAdmins_(users, id) === 0) fail_('É necessário manter ao menos um administrador ativo.');
  deleteRow_('users', id);
  log_(me, 'excluiu', 'usuário', id, u.name + ' (' + u.username + ')', '', '');
}

function setPassword_(id, password, me) {
  password = String(password || '');
  if (password.length < 4) fail_('A senha deve ter ao menos 4 caracteres.');
  const u = getById_('users', id);
  if (!u) fail_('Usuário não encontrado.');
  u.passwordHash = hash_(password);
  writeRow_('users', u);
  log_(me, 'senha', 'usuário', id, u.name + ' (' + u.username + ')', '', id === me.id ? 'Trocou a própria senha' : 'Redefiniu a senha');
}

/* ==========================================================================
   IMPORTAÇÃO DE BACKUP
   ========================================================================== */
function importAll_(p, me) {
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
      passwordHash: passwordHash, createdAt: (old && old.createdAt) || ts,
      email: str_(u.email || (old && old.email), 120), phone: str_(u.phone || (old && old.phone), 30)
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
    createdAt: ts, updatedAt: ts, updatedBy: 'importação',
    createdBy: str_(e.createdBy), responsibleEmail: str_(e.responsibleEmail, 120),
    responsiblePhone: str_(e.responsiblePhone, 30), reminderSentAt: str_(e.reminderSentAt)
  })).filter(e => e.title);

  replaceAll_('users', users);
  replaceAll_('ministries', ministries);
  replaceAll_('events', events);
  log_(me, 'importou', 'backup', '', 'Backup', '',
    events.length + ' programações, ' + ministries.length + ' ministérios, ' + users.length + ' usuários');
}

/* ==========================================================================
   REGISTRO DE AÇÕES (painel do administrador)
   ========================================================================== */
// alert = alguém mexeu numa programação de outro login: os administradores recebem um e-mail
function log_(me, action, entity, entityId, title, owner, details, alert) {
  const entry = {
    id: 'l-' + Utilities.getUuid().slice(0, 12), at: now_(), userId: me.id || '', username: me.username || '',
    action: action, entity: entity, entityId: entityId || '', title: title || '', owner: owner || '',
    details: String(details || '').slice(0, 1500), alert: alert ? 'TRUE' : ''
  };
  const sh = sheet_('log');
  const row = SHEETS.log.cols.map(c => String(entry[c]));
  const r = sh.getLastRow() + 1;
  const range = sh.getRange(r, 1, 1, row.length);
  range.setNumberFormat('@');
  range.setValues([row]);
  if (alert) {
    try { alertAdmins_(entry, me); } catch (e) { console.error('Falha ao avisar administradores: ' + e); }
  }
}

function getLog_(limit) {
  const def = SHEETS.log;
  const sh = sheet_('log');
  const last = sh.getLastRow();
  if (last < 2) return [];
  const n = Math.min(last - 1, limit || LOG_LIMIT);
  return sh.getRange(last - n + 1, 1, n, def.cols.length).getDisplayValues()
    .filter(r => r[0])
    .map(r => {
      const o = toObj_(def, r);
      o.alert = isTrue_(o.alert);
      return o;
    })
    .reverse();
}

function alertAdmins_(entry, me) {
  const to = readAll_('users')
    .filter(u => u.role === 'admin' && isTrue_(u.active) && u.id !== me.id && isEmail_(u.email))
    .map(u => u.email);
  if (!to.length) return;
  const verb = entry.action === 'excluiu' ? 'EXCLUIU' : 'ALTEROU';
  const subject = '[IP Filadélfia] ' + (me.name || me.username) + ' ' + verb.toLowerCase() + ' uma programação de ' + entry.owner;
  const body = [
    (me.name || me.username) + ' (' + me.username + ') ' + verb + ' a programação "' + entry.title + '", cadastrada por ' + entry.owner + '.',
    '',
    'Detalhes:',
    entry.details.split(' | ').join('\n'),
    '',
    'Quando: ' + formatDateTimeBr_(new Date()),
    'Veja o histórico completo em Registro de ações, no sistema.'
  ].join('\n');
  MailApp.sendEmail({ to: to.join(','), subject: subject, body: body, name: 'Programações IP Filadélfia' });
}

function diff_(before, after, keys, users) {
  const out = [];
  keys.forEach(k => {
    const a = String(before[k] === undefined ? '' : before[k]);
    const b = String(after[k] === undefined ? '' : after[k]);
    if (a === b) return;
    let fa = a, fb = b;
    if (k === 'ministryId') { fa = ministryName_(a); fb = ministryName_(b); }
    if (k === 'createdBy') { fa = userName_(users, a); fb = userName_(users, b); }
    if (k === 'date') { fa = formatDateBr_(a); fb = formatDateBr_(b); }
    if (k === 'active') { fa = isTrue_(a) ? 'ativo' : 'inativo'; fb = isTrue_(b) ? 'ativo' : 'inativo'; }
    if (k === 'role') { fa = a === 'admin' ? 'Administrador' : 'Usuário'; fb = b === 'admin' ? 'Administrador' : 'Usuário'; }
    if (k === 'description' && (a.length > 60 || b.length > 60)) { out.push((FIELD_LABELS[k] || k) + ' alterada'); return; }
    out.push((FIELD_LABELS[k] || k) + ': ' + (fa || '(vazio)') + ' → ' + (fb || '(vazio)'));
  });
  return out.join(' | ');
}

function ministryName_(id) {
  if (!id) return '';
  const m = getById_('ministries', id);
  return m ? m.name : id;
}

function userName_(users, id) {
  if (!id) return '';
  const u = (users || readAll_('users')).find(x => x.id === id);
  return u ? u.username : id;
}

/* ==========================================================================
   LEMBRETES (48h antes) — e-mail e WhatsApp para o responsável
   ========================================================================== */
// Rode uma vez pelo editor do Apps Script para ativar os lembretes (a cada hora).
function instalarLembretes() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'enviarLembretes')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('enviarLembretes').timeBased().everyHours(1).create();
  enviarLembretes();
}

function enviarLembretes() {
  setup_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const tz = Session.getScriptTimeZone();
    const now = Date.now();
    const limit = now + REMINDER_HOURS * 3600000;
    const system = { id: '', username: 'sistema', name: 'Sistema' };
    readAll_('events').forEach(e => {
      if (e.reminderSentAt || e.status === 'Concluída') return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date) || !/^\d{2}:\d{2}$/.test(e.time)) return;
      const when = Utilities.parseDate(e.date + ' ' + e.time, tz, 'yyyy-MM-dd HH:mm').getTime();
      if (when <= now || when > limit) return;

      const sent = [];
      const errors = [];
      if (isEmail_(e.responsibleEmail)) {
        try { sendReminderEmail_(e); sent.push('e-mail'); } catch (err) { errors.push('e-mail: ' + err.message); }
      }
      if (phoneDigits_(e.responsiblePhone) && whatsappProvider_()) {
        try { sendWhatsApp_(e); sent.push('WhatsApp'); } catch (err) { errors.push('WhatsApp: ' + err.message); }
      }
      e.reminderSentAt = now_();
      writeRow_('events', e);
      const parts = [];
      parts.push(sent.length ? 'Enviado por ' + sent.join(' e ') : 'Nenhum lembrete enviado (responsável sem e-mail' + (whatsappProvider_() ? ' ou WhatsApp' : '') + ')');
      if (errors.length) parts.push('Falhas: ' + errors.join('; '));
      log_(system, 'lembrete', 'programação', e.id, e.title, e.responsible, parts.join(' | '));
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function reminderText_(e) {
  const m = e.ministryId ? ministryName_(e.ministryId) : '';
  return 'Olá, ' + e.responsible + '! Lembrete da IP Filadélfia: a programação "' + e.title + '"' +
    (m ? ' (' + m + ')' : '') + ' acontece em ' + formatDateBr_(e.date) + ' às ' + e.time + ', em ' + e.location + '.';
}

function sendReminderEmail_(e) {
  const body = [
    reminderText_(e),
    '',
    e.description ? 'Ações / descrição:\n' + e.description + '\n' : '',
    'Você está recebendo esta mensagem porque é o responsável por esta programação.'
  ].join('\n');
  MailApp.sendEmail({
    to: e.responsibleEmail,
    subject: '[IP Filadélfia] Lembrete: ' + e.title + ' em ' + formatDateBr_(e.date) + ' às ' + e.time,
    body: body,
    name: 'Programações IP Filadélfia'
  });
}

/*
 * WHATSAPP — configure em Apps Script → Configurações do projeto → Propriedades do script.
 * Sem WHATSAPP_PROVIDER, só o e-mail é enviado.
 *
 * WhatsApp oficial da Meta (WHATSAPP_PROVIDER = meta)
 *   META_PHONE_NUMBER_ID   ID do número no WhatsApp Business
 *   META_TOKEN             token de acesso permanente
 *   META_TEMPLATE          nome do modelo aprovado (ex.: lembrete_programacao)
 *   META_TEMPLATE_LANG     idioma do modelo (padrão pt_BR)
 *   O modelo deve ter 5 variáveis no corpo, nesta ordem: responsável, título, data, horário, local.
 *   Ex.: "Olá, {{1}}! Lembrete da IP Filadélfia: {{2}} acontece em {{3}} às {{4}}, em {{5}}."
 *
 * Twilio (WHATSAPP_PROVIDER = twilio)
 *   TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM (ex.: +5511999999999)
 *   TWILIO_CONTENT_SID     opcional: modelo aprovado (mesmas 5 variáveis). Sem ele, envia texto livre.
 */
function whatsappProvider_() {
  return (PropertiesService.getScriptProperties().getProperty('WHATSAPP_PROVIDER') || '').trim().toLowerCase();
}

function sendWhatsApp_(e) {
  const props = PropertiesService.getScriptProperties();
  const provider = whatsappProvider_();
  const phone = phoneDigits_(e.responsiblePhone);
  const vars = [e.responsible, e.title, formatDateBr_(e.date), e.time, e.location];

  if (provider === 'meta') {
    const res = UrlFetchApp.fetch('https://graph.facebook.com/v20.0/' + props.getProperty('META_PHONE_NUMBER_ID') + '/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + props.getProperty('META_TOKEN') },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: props.getProperty('META_TEMPLATE'),
          language: { code: props.getProperty('META_TEMPLATE_LANG') || 'pt_BR' },
          components: [{ type: 'body', parameters: vars.map(v => ({ type: 'text', text: String(v) })) }]
        }
      })
    });
    if (res.getResponseCode() >= 300) throw new Error('Meta ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
    return;
  }

  if (provider === 'twilio') {
    const sid = props.getProperty('TWILIO_SID');
    const payload = { From: 'whatsapp:' + props.getProperty('TWILIO_FROM'), To: 'whatsapp:+' + phone };
    const contentSid = props.getProperty('TWILIO_CONTENT_SID');
    if (contentSid) {
      payload.ContentSid = contentSid;
      payload.ContentVariables = JSON.stringify({ 1: vars[0], 2: vars[1], 3: vars[2], 4: vars[3], 5: vars[4] });
    } else {
      payload.Body = reminderText_(e);
    }
    const res = UrlFetchApp.fetch('https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Messages.json', {
      method: 'post',
      headers: { Authorization: 'Basic ' + Utilities.base64Encode(sid + ':' + props.getProperty('TWILIO_TOKEN')) },
      muteHttpExceptions: true,
      payload: payload
    });
    if (res.getResponseCode() >= 300) throw new Error('Twilio ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
    return;
  }

  throw new Error('WHATSAPP_PROVIDER desconhecido: ' + provider);
}

function notifyStatus_() {
  let reminders = false;
  try { reminders = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'enviarLembretes'); } catch (e) { reminders = false; }
  const admins = readAll_('users').filter(u => u.role === 'admin' && isTrue_(u.active));
  return {
    reminders: reminders,
    whatsapp: whatsappProvider_(),
    adminsWithEmail: admins.filter(u => isEmail_(u.email)).length,
    admins: admins.length
  };
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
function isEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }
// devolve só os dígitos com o código do país (Brasil por padrão), ou '' se inválido
function phoneDigits_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d.length >= 12 && d.length <= 15 ? d : '';
}
function now_() { return new Date().toISOString(); }
function formatDateBr_(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(iso || '');
}
function formatDateTimeBr_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}
function validId_(id, prefix) {
  return /^[a-z]-[A-Za-z0-9_-]{1,40}$/.test(id || '') ? id : prefix + '-' + Utilities.getUuid().slice(0, 12);
}
