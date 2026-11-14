/**
 * Carteiro da Gestão de Programações · IP Filadélfia
 *
 * Os dados agora ficam no Supabase. Este Apps Script só ENVIA as mensagens:
 *   - lembretes 48h antes de cada programação (e-mail e, se configurado, WhatsApp);
 *   - alertas por e-mail aos administradores quando alguém mexe na programação de outro login.
 *
 * Instalação: cole este arquivo no editor do Apps Script (substituindo o antigo), salve,
 * escolha a função "instalarLembretes" no menu do topo e clique em Executar (uma vez só).
 * Ela cria um gatilho que roda a cada 5 minutos.
 */

const SUPABASE_URL = 'https://vocwzltpsrobahemhdic.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yTAx09CDvPFhssxpH-o2hg__n1rBnkt';   // chave pública
// Senha do carteiro: fica na tabela ipf_settings (chave carteiro_secret) do Supabase.
// Cole aqui ou, melhor, em Configurações do projeto → Propriedades do script → CARTEIRO_SENHA.
const CARTEIRO_SENHA = '';

const SITE_URL = 'https://gestao-programacoes-ipf.vercel.app';

/* ==========================================================================
   ENTRADA HTTP — o site não usa mais esta URL
   ========================================================================== */
function doGet() {
  return json_({ ok: true, app: 'ipf-programacoes', message: 'O sistema agora usa o Supabase. Abra ' + SITE_URL });
}

function doPost() {
  return json_({ ok: false, code: 'AUTH', error: 'O sistema foi atualizado. Recarregue a página (' + SITE_URL + ').' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ==========================================================================
   CARTEIRO
   ========================================================================== */
// Rode uma vez pelo editor do Apps Script para ativar os envios (a cada 5 minutos).
function instalarLembretes() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['enviarLembretes', 'carteiro'].indexOf(t.getHandlerFunction()) >= 0)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('carteiro').timeBased().everyMinutes(5).create();
  carteiro();
}

// mantém o nome antigo funcionando, caso algum gatilho antigo ainda chame esta função
function enviarLembretes() { carteiro(); }

function carteiro() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const job = rpc_('ipf_carteiro', { secret: senha_(), whatsapp: whatsappProvider_() });
    const result = { reminders: [], alerts: [] };

    (job.alerts || []).forEach(a => {
      let error = '';
      try {
        MailApp.sendEmail({ to: a.to, subject: a.subject, body: a.body, name: 'Programações IP Filadélfia' });
      } catch (err) { error = String(err.message || err); }
      result.alerts.push({ id: a.id, error: error });
    });

    (job.reminders || []).forEach(e => {
      const sent = [];
      const errors = [];
      if (isEmail_(e.responsibleEmail)) {
        try { sendReminderEmail_(e); sent.push('e-mail'); } catch (err) { errors.push('e-mail: ' + err.message); }
      }
      if (phoneDigits_(e.responsiblePhone) && whatsappProvider_()) {
        try { sendWhatsApp_(e); sent.push('WhatsApp'); } catch (err) { errors.push('WhatsApp: ' + err.message); }
      }
      const parts = [];
      parts.push(sent.length ? 'Enviado por ' + sent.join(' e ') : 'Nenhum lembrete enviado (responsável sem e-mail' + (whatsappProvider_() ? ' ou WhatsApp' : '') + ')');
      if (errors.length) parts.push('Falhas: ' + errors.join('; '));
      result.reminders.push({ id: e.id, details: parts.join(' | ') });
    });

    if (result.alerts.length || result.reminders.length) rpc_('ipf_carteiro_feito', { secret: senha_(), result: result });
  } finally {
    lock.releaseLock();
  }
}

function senha_() {
  const s = (PropertiesService.getScriptProperties().getProperty('CARTEIRO_SENHA') || CARTEIRO_SENHA || '').trim();
  if (!s) throw new Error('Configure a CARTEIRO_SENHA (veja o topo do arquivo).');
  return s;
}

function rpc_(fn, body) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'post',
    contentType: 'application/json',
    headers: { apikey: SUPABASE_KEY },
    muteHttpExceptions: true,
    payload: JSON.stringify(body)
  });
  const code = res.getResponseCode();
  let json = null;
  try { json = JSON.parse(res.getContentText()); } catch (e) { json = null; }
  if (code >= 300 || !json || json.ok === false) {
    throw new Error('Supabase ' + fn + ' (' + code + '): ' + ((json && (json.error || json.message)) || res.getContentText().slice(0, 200)));
  }
  return json;
}

function reminderText_(e) {
  const m = e.ministryName || '';
  return 'Olá, ' + e.responsible + '! Lembrete da IP Filadélfia: a programação "' + e.title + '"' +
    (m ? ' (' + m + ')' : '') + ' acontece em ' + e.dateBr + ' às ' + e.time + ', em ' + e.location + '.';
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
    subject: '[IP Filadélfia] Lembrete: ' + e.title + ' em ' + e.dateBr + ' às ' + e.time,
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
  const vars = [e.responsible, e.title, e.dateBr, e.time, e.location];

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

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */
function isEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')); }
// devolve só os dígitos com o código do país (Brasil por padrão), ou '' se inválido
function phoneDigits_(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return d.length >= 12 && d.length <= 15 ? d : '';
}
