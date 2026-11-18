// Gera supabase/relatorios-dados.sql (modelos de relatório) a partir de relatorios/modelos.js.
// Se existir relatorios/dados-historicos.js (fica fora do repositório, porque tem dados
// das igrejas), gera também supabase/relatorios-historico.sql com igrejas e relatórios.
// Uso: node ferramentas/gerar-sql-dados.js
const fs = require('fs'), path = require('path');
global.window = {};
require(path.join(__dirname, '../relatorios/modelos.js'));
const HIST = path.join(__dirname, '../relatorios/dados-historicos.js');
if (fs.existsSync(HIST)) require(HIST);
const q = o => { const s = JSON.stringify(o); if (s.includes('$ipb$')) throw new Error('texto inválido'); return '$ipb$' + s + '$ipb$::jsonb'; };
const nova = { comissaoId: null, comissaoNome: '', membros: [], pareceres: [], ia: null, final: null, assinaturas: [] };
const CAB = '-- Gerado por ferramentas/gerar-sql-dados.js. Não sobrescreve nada que já exista (on conflict do nothing).\n\n';
let out = CAB;
let hist = CAB;
for (const i of (window.IPB_HISTORICO || { igrejas: [] }).igrejas) hist += `insert into ipb_igrejas (id, doc) values ('${i.id}', ${q(i)}) on conflict (id) do nothing;\n`;
out += '\n';
window.IPB_MODELOS_PADRAO.forEach((m, k) => {
  const d = Object.assign({}, m, { ativo: true, versao: 1, ordem: k + 1, updatedAt: new Date().toISOString() });
  out += `insert into ipb_modelos (id, doc) values ('${m.id}', ${q(d)}) on conflict (id) do nothing;\n`;
});
out += '\n';
for (const h of (window.IPB_HISTORICO || { relatorios: [] }).relatorios) {
  const r = Object.assign({}, h, { criadoPor: null, criadoPorNome: 'Importação', createdAt: h.enviadoEm, updatedAt: h.enviadoEm, analise: nova });
  hist += `insert into ipb_relatorios (id, igreja_id, doc) values ('${r.id}', '${r.igrejaId}', ${q(r)}) on conflict (id) do nothing;\n`;
}
hist += `\n-- cópia do modelo dentro de cada relatório importado\nupdate ipb_relatorios r set doc = r.doc || jsonb_build_object('modelo', ipb_snapshot(m.doc)) from ipb_modelos m where m.id = r.doc->>'modeloId' and not (r.doc ? 'modelo');\n`;
fs.writeFileSync(path.join(__dirname, '../supabase/relatorios-dados.sql'), out);
if (window.IPB_HISTORICO) fs.writeFileSync(path.join(__dirname, '../supabase/relatorios-historico.sql'), hist);
console.log('modelos', out.length, 'historico', window.IPB_HISTORICO ? hist.length : 0);
