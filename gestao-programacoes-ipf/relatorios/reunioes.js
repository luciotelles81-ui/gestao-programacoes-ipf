/**
 * Reunião do concílio (Presbitério): comissões com ambiente próprio, membros por comissão
 * (Relator ou Participante), documentos da reunião com o PDF original, pareceres no modelo
 * usado pelo PLRN (cabeçalho da Secretaria Executiva, Doc nº, destino, data, Sala de Sessões
 * e assinaturas) e histórico do presbitério em gráficos.
 *
 * Usa as funções do app (window.IPB_APP) e a ação "reuniao" da API (servidor-local.js e
 * supabase/relatorios.sql). Base: Constituição da IPB, arts. 72-74 (reuniões), 85-88
 * (presbitério), 99 (comissões) e 106 § 1º (secretários de causa).
 */
(function () {
  const A = () => window.IPB_APP;
  const REU_KEY = 'ipb-reuniao-atual';

  /* ======================= referências ======================= */
  const COMISSOES_PADRAO = [
    { id: 'exame-atas', nome: 'Exame de Livros de Atas', grupo: 'Comissão de exame', modelo: 'atas', ordem: 1, base: 'CI/IPB art. 88, i: examinar as atas dos conselhos.', titulo: 'Relatório Final da Comissão de Exame do Livro de Atas' },
    { id: 'atas-ce', nome: 'Exame de Atas da Comissão Executiva', grupo: 'Comissão de exame', modelo: 'atas', ordem: 2, base: 'CI/IPB arts. 102 a 104: a Comissão Executiva presta contas ao concílio.', titulo: 'Relatório Final da Comissão de Exame das Atas da Comissão Executiva' },
    { id: 'legislacao', nome: 'Legislação e Justiça', grupo: 'Comissão permanente', modelo: 'geral', ordem: 3, base: 'Exame de consultas, propostas e matérias constitucionais.', titulo: 'Relatório Final da Comissão de Legislação e Justiça' },
    { id: 'estatisticas', nome: 'Exame de Relatórios de Estatísticas', grupo: 'Comissão de exame', modelo: 'geral', ordem: 4, base: 'CI/IPB art. 70, l: as igrejas enviam relatório e estatística ao concílio.', titulo: 'Relatório Final da Comissão de Exame de Relatórios de Estatísticas' },
    { id: 'estado-religioso', nome: 'Estado Religioso', grupo: 'Comissão de exame', modelo: 'geral', ordem: 5, base: 'CI/IPB art. 88, g e n: receber os relatórios das igrejas e velar por elas.', titulo: 'Relatório Final da Comissão de Estado Religioso' },
    { id: 'ministros', nome: 'Exame de Relatórios de Ministros', grupo: 'Comissão de exame', modelo: 'geral', ordem: 6, base: 'CI/IPB art. 88, e e g: velar pelos ministros e julgar seus relatórios.', titulo: 'Relatório Final da Comissão de Exame de Relatórios de Ministros' },
    { id: 'financas', nome: 'Finanças e Distribuição de Obreiros', grupo: 'Comissão permanente', modelo: 'geral', ordem: 7, base: 'Orçamento, contribuições das igrejas e distribuição do trabalho pastoral.', titulo: 'Relatório Final da Comissão de Finanças e Distribuição de Obreiros' },
    { id: 'tesouraria', nome: 'Exame de Contas da Tesouraria', grupo: 'Comissão de exame', modelo: 'geral', ordem: 8, base: 'CI/IPB art. 88, j: dízimo ao Supremo Concílio; exame das contas do tesoureiro.', titulo: 'Relatório Final da Comissão de Exame de Contas da Tesouraria' },
    { id: 'diplomacia', nome: 'Diplomacia', grupo: 'Comissão temporária', modelo: 'geral', ordem: 9, base: 'Saudações, visitantes e relações com outros concílios e igrejas.', titulo: 'Relatório da Comissão de Diplomacia' },
    { id: 'especial', nome: 'Comissão Especial', grupo: 'Comissão especial', modelo: 'geral', ordem: 10, base: 'CI/IPB art. 99, § 1º: ao menos três ministros e dois presbíteros.', titulo: 'Relatório da Comissão Especial' },
    { id: 'sec-saf', nome: 'Secretaria da SAF', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 20, base: 'CI/IPB art. 106, § 1º: os secretários relatam suas atividades ao concílio.', titulo: 'Relatório do Secretário Presbiterial da SAF' },
    { id: 'sec-uph', nome: 'Secretaria da UPH', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 21, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário Presbiterial da UPH' },
    { id: 'sec-ump', nome: 'Secretaria da UMP', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 22, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário Presbiterial da UMP' },
    { id: 'sec-upa', nome: 'Secretaria da UPA / UCP', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 23, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário Presbiterial de Adolescentes e Crianças' },
    { id: 'sec-evangelizacao', nome: 'Secretaria de Evangelização e Missões', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 24, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário de Evangelização e Missões' },
    { id: 'sec-educacao', nome: 'Secretaria de Educação Cristã', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 25, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário de Educação Cristã' },
    { id: 'sec-apoio', nome: 'Secretaria de Apoio Pastoral', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 26, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário de Apoio Pastoral' },
    { id: 'sec-mordomia', nome: 'Secretaria de Mordomia Cristã', grupo: 'Secretaria de causa', modelo: 'secretaria', ordem: 27, base: 'CI/IPB art. 106, § 1º.', titulo: 'Relatório do Secretário de Mordomia Cristã' }
  ];
  const GRUPOS = ['Comissão de exame', 'Comissão permanente', 'Comissão temporária', 'Comissão especial', 'Secretaria de causa'];
  const MODELOS = { atas: 'Exame de livro de atas', geral: 'Relatório final (apontamentos, recomendações, determinações)', secretaria: 'Relatório de secretaria de causa' };
  const STATUS = { rascunho: 'Rascunho', concluido: 'Pronto para o plenário', aprovado: 'Aprovado pelo plenário', emendas: 'Aprovado com emendas', rejeitado: 'Rejeitado' };
  const PLENARIO = ['aprovado', 'emendas', 'rejeitado'];
  const DESTINOS = ['Arquivo', 'Plenário', 'Comissão Executiva', 'Sínodo', 'Supremo Concílio'];
  const DECISOES_ATAS = ['Aprovar, sem ressalvas, o livro de Atas', 'Aprovar o livro de Atas, com as observações abaixo', 'Não aprovar o livro de Atas, devolvendo-o para correção'];
  const DECISOES_GERAL = ['aprovar em seus termos', 'aprovar com as ressalvas abaixo', 'tomar conhecimento', 'baixar em diligência', 'não aprovar'];
  const CONSIDERANDOS_ATAS = [
    'O bom estado de conservação e organização do livro e das Atas',
    'O atendimento às exigências constantes do Manual de Confecção de Atas Eletrônicas da IPB',
    'As atas estão devidamente numeradas, datadas e assinadas pelo presidente e pelo secretário',
    'Não há rasuras, entrelinhas ou espaços em branco sem a devida ressalva',
    'Os termos de abertura e de encerramento estão lavrados corretamente',
    'O rol de membros e as decisões do Conselho estão registrados conforme a CI/IPB'
  ];
  const CAMPOS_EST = [
    ['membros', 'Total de membros'], ['comungantes', 'Membros comungantes'], ['naoComungantes', 'Não comungantes'],
    ['ministros', 'Ministros'], ['presbiteros', 'Presbíteros'], ['diaconos', 'Diáconos'],
    ['ebds', 'Escolas dominicais'], ['ebdAlunos', 'Alunos na EBD'], ['ebdProfessores', 'Professores da EBD'],
    ['saf', 'Sócias SAF'], ['uph', 'Sócios UPH'], ['ump', 'Sócios UMP'], ['upa', 'Sócios UPA'], ['ucp', 'Crianças UCP'],
    ['profissoes', 'Profissões de fé'], ['batismos', 'Batismos'], ['crescimentoPct', 'Crescimento da membresia (%)']
  ];
  const TOTAL = '__total'; // linha com os totais do presbitério informados pela Comissão de Estatísticas
  const CAMPOS_FIN = [['receitas', 'Receitas (R$)'], ['despesas', 'Despesas (R$)'], ['resultado', 'Resultado do ano (R$)'], ['saldoAcumulado', 'Saldo acumulado (R$)'], ['verbaPrevista', 'Verba presbiterial prevista (R$)'], ['dizimoSC', 'Dízimo ao Supremo Concílio (R$)']];
  // Mesa do presbitério (CI/IPB art. 67 e estatuto do presbitério)
  const CARGOS_MESA = ['Presidente', 'Vice-Presidente', 'Secretário Executivo', 'Primeiro Secretário', 'Segundo Secretário', 'Tesoureiro'];
  const TRATAMENTOS = ['Rev.', 'Presb.', 'Diác.', 'Sr.', 'Sra.', ''];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const CORES = ['#2c5234', '#5b8fb9', '#c9902b', '#8a5a9e', '#c4553d', '#4a9e8f'];

  /* ======================= utilidades ======================= */
  const linhas = t => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
  const numero = v => { if (typeof v === 'number') return v; const n = Number(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
  const temValor = v => v !== undefined && v !== null && v !== '';
  function dataBr(iso) { if (!iso) return '__/__/____'; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  function dataExtenso(iso) { if (!iso) return '___ de __________ de ____'; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${String(d).padStart(2, '0')} de ${MESES[m - 1]} de ${y}`; }
  function hoje() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
  const nomeArquivo = s => String(s || 'documento').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90);

  /* ======================= dados ======================= */
  const S = () => A().S;
  const itens = tipo => ((S().d && S().d.reuniao) || []).filter(x => x.tipo === tipo);
  const cfg = () => itens('cfg')[0] || {};
  const ORG = () => A().ORG;
  const sigla = () => cfg().sigla || ORG().sigla || ORG().tipo;
  const nomePresb = () => cfg().nome || ORG().nome || ORG().tipo;
  function igrejasCfg() {
    const l = linhas(cfg().igrejas);
    return l.length ? l : (S().d.igrejas || []).filter(i => i.ativo !== false).map(i => i.nome);
  }
  function reunioes() { return itens('reuniao').sort((a, b) => (b.ano - a.ano) || (String(b.dataInicio || '').localeCompare(String(a.dataInicio || ''))) || (b.numero - a.numero)); }
  function reuniaoId() {
    const rs = reunioes();
    const salvo = lsGet(REU_KEY);
    if (salvo && rs.some(r => r.id === salvo)) return salvo;
    if (cfg().reuniaoAtual && rs.some(r => r.id === cfg().reuniaoAtual)) return cfg().reuniaoAtual;
    return rs[0] ? rs[0].id : null;
  }
  const reuniao = id => itens('reuniao').find(r => r.id === (id || reuniaoId())) || null;
  const comissoes = () => (S().d.comissoes || []).filter(c => c.modelo && c.ativa !== false).sort((a, b) => (Number(a.ordem) || 99) - (Number(b.ordem) || 99) || String(a.nome).localeCompare(String(b.nome)));
  const comissao = id => (S().d.comissoes || []).find(c => c.id === id) || null;
  function delegadosDe(comId, reuId) {
    return itens('delegado').filter(d => d.comissaoId === comId && d.reuniaoId === (reuId || reuniaoId()))
      .sort((a, b) => (a.funcao === 'Relator' ? 0 : 1) - (b.funcao === 'Relator' ? 0 : 1) || String(a.nome).localeCompare(String(b.nome)));
  }
  const nomeDel = d => [d.tratamento, d.nome].filter(Boolean).join(' ');
  const documentos = (reuId) => itens('documento').filter(d => !reuId || d.reuniaoId === reuId).sort((a, b) => numero(a.numero) - numero(b.numero) || String(a.titulo).localeCompare(String(b.titulo)));
  const pareceres = (reuId) => itens('parecer').filter(p => !reuId || p.reuniaoId === reuId).sort((a, b) => numero(a.docNumero) - numero(b.docNumero) || String(a.updatedAt).localeCompare(String(b.updatedAt)));
  const usuario = () => S().user;
  const isAdmin = () => A().isAdmin();
  // mesmas regras do servidor (o servidor é quem decide)
  function podeParecer(comId, reuId) {
    const u = usuario();
    if (isAdmin()) return true;
    if (u.role === 'leitor') return false;
    const ds = delegadosDe(comId, reuId);
    if (ds.some(d => d.userId === u.id)) return true;
    return u.role === 'analista' && !ds.some(d => d.userId);
  }
  function souRelator(comId, reuId) {
    if (isAdmin()) return true;
    const rel = delegadosDe(comId, reuId).find(d => d.funcao === 'Relator' && d.userId);
    return rel ? rel.userId === usuario().id : podeParecer(comId, reuId);
  }
  function minhasComissoes(reuId) { const u = usuario(); return itens('delegado').filter(d => d.userId === u.id && d.reuniaoId === (reuId || reuniaoId())).map(d => d.comissaoId); }
  function periodo(r) { if (!r) return ''; if (r.dataFim && r.dataFim !== r.dataInicio) return `${dataBr(r.dataInicio)} a ${dataBr(r.dataFim)}`; return r.dataInicio ? dataBr(r.dataInicio) : ''; }
  function periodoExtenso(r) {
    if (!r || !r.dataInicio) return '';
    const [y1, m1, d1] = r.dataInicio.split('-').map(Number);
    if (!r.dataFim || r.dataFim === r.dataInicio) return dataExtenso(r.dataInicio);
    const [y2, m2, d2] = r.dataFim.split('-').map(Number);
    if (m1 === m2 && y1 === y2) return `${String(d1).padStart(2, '0')} a ${String(d2).padStart(2, '0')} de ${MESES[m1 - 1]} de ${y1}`;
    return `${dataExtenso(r.dataInicio)} a ${dataExtenso(r.dataFim)}`;
  }
  // protocolo do documento (carimbo da Secretaria Executiva): Doc nº NN/AA, destino, data e rubrica do Presidente
  const DESTINOS_DOC = ['Arquivo', 'Plenário', 'Mesa', 'Comissão Executiva', 'Tesouraria', 'Sínodo', 'Supremo Concílio'];
  function destinoDoc(d) { return d.comissaoId ? ((comissao(d.comissaoId) || {}).nome || '') : (d.destino || ''); }
  function numProtocolo(d, r) { const n = numero(d.numero); return n ? n + '/' + String((r && r.ano) || '').slice(-2) : (d.numero || ''); }
  function imprimirCarimbos(docs, r) {
    const html = `<style>.carimbo{width:186mm;margin:8mm auto;break-inside:avoid}.carimbo .pf-cab{background:#fff}</style>` +
      docs.map(d => `<div class="carimbo">${cabecalho(numProtocolo(d, r), destinoDoc(d), d.dataProtocolo || d.data, r)}<div style="font:11px 'Times New Roman',serif;color:#555;margin-top:3px">${A().esc(d.titulo || '')}${d.origem ? ' · ' + A().esc(d.origem) : ''}</div></div>`).join('');
    imprimir('Carimbos de protocolo', html);
  }
  function proximoNumeroDoc(reuId) {
    const r = reuniao(reuId);
    return r ? numeracao(r).proximo : 1;
  }
  async function salvarItem(tipo, item, okMsg) {
    const r = await A().acao(() => A().api({ action: 'reuniao', op: 'salvar', tipo, item }), okMsg);
    if (r) await A().recarregar();
    return r;
  }
  function chip(st) { return `<span class="pst pst-${A().esc(st)}">${A().esc(STATUS[st] || st)}</span>`; }

  /* ======================= cabeçalho comum ======================= */
  function seletorReuniao() {
    const esc = A().esc;
    const rs = reunioes();
    if (!rs.length) return '';
    const atual = reuniaoId();
    return `<select id="rSel" aria-label="Reunião" style="max-width:320px">${rs.map(r => `<option value="${esc(r.id)}" ${r.id === atual ? 'selected' : ''}>${esc(r.codigo || (r.numero + 'ª/' + r.ano))}${r.id === cfg().reuniaoAtual ? ' (atual)' : ''}</option>`).join('')}</select>`;
  }
  function ligarSeletor() { const s = A().$('#rSel'); if (s) s.onchange = () => { lsSet(REU_KEY, s.value); A().render(); }; }
  function subReuniao(r) { const esc = A().esc; return r ? `${esc(r.codigo || '')} · ${esc(r.nome || '')}${periodo(r) ? ' · ' + esc(periodo(r)) : ''}${r.local ? ' · ' + esc(r.local) : ''}` : 'Nenhuma reunião cadastrada.'; }
  function semReuniao(pagina, titulo) {
    const esc = A().esc;
    A().shell(pagina, A().head(titulo, 'Nenhuma reunião cadastrada ainda.') + `<div class="card"><p style="margin-top:0">Para começar, a Mesa (administrador) cadastra os dados do ${esc(ORG().tipoMin)} e a reunião, ou importa o pacote de dados de reuniões anteriores.</p>
      ${isAdmin() ? '<a class="btn primary" href="#/reuniao">Configurar a reunião</a>' : '<p class="muted small" style="margin:0">Peça ao Secretário Executivo ou ao Presidente para cadastrar a reunião.</p>'}</div>`);
    void esc;
  }

  /* ======================= Reunião (painel) ======================= */
  function telaReuniao() {
    const { esc, shell, head } = A();
    const r = reuniao();
    const rid = r && r.id;
    const docs = rid ? documentos(rid) : [];
    const minhas = rid ? minhasComissoes(rid) : [];
    const extra = r && r.tipoReuniao === 'E';
    let html = head(r ? (extra ? 'Reunião extraordinária' : 'Reunião Ordinária (RO)') : 'Reunião do concílio', subReuniao(r), seletorReuniao());
    if (r) html += etapas('', r);
    if (extra) {
      // extraordinária: trata só do assunto da convocação (CI/IPB art. 74), sem comissões
      html += `<div class="card"><div class="section-title" style="margin-top:0">Assunto da convocação</div><p style="margin:0">${esc(r.materia || 'Não informado.')}</p>${r.convocadaPor ? `<p class="small muted" style="margin:6px 0 0">Convocada por ${esc(r.convocadaPor)}${r.dataConvocacao ? ' em ' + esc(dataBr(r.dataConvocacao)) : ''}</p>` : ''}</div>`;
      html += `<div class="card"><div class="section-title" style="margin-top:0">Documentos da reunião</div>${docs.length ? `<ul class="lista-docs" style="margin:0;padding-left:18px">${docs.map(d => `<li><a href="#/acervo/${esc(String(r.ano || ''))}/reuniao/${encodeURIComponent(rid)}">${esc([d.numero ? 'Doc ' + d.numero : '', d.tipoDoc, d.titulo].filter(Boolean).join(' · ') || d.arquivoNome || 'Documento')}</a></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Nenhum documento ainda.</p>'}
        <div class="row-wrap" style="margin-top:12px"><button class="btn" data-rel="documentos">Imprimir a lista de documentos</button></div></div>`;
    } else if (r) {
      // o que falta, na ordem das etapas
      const ps = passosReuniao(r);
      const pars = pareceres(rid);
      const falta = [];
      if (!(r.mesa || []).some(m => m.nome)) falta.push(['mesa', 'Informar a Mesa eleita para o ano.']);
      const semNum = docs.filter(d => !d.numero && pastaAuto(d) === 'relatorio').length;
      if (semNum) falta.push(['documentos', `${semNum} documento(s) sem número.`]);
      const rep = numeracao(r).repetidos;
      if (rep.length) falta.push(['numeracao', `Número(s) de documento repetido(s): ${rep.join(', ')}.`]);
      const semCom = docs.filter(d => d.numero && !d.comissaoId && pastaAuto(d) === 'relatorio').length;
      if (semCom) falta.push(['documentos', `${semCom} documento(s) numerado(s) sem comissão.`]);
      const semRel = comissoes().filter(c => !delegadosDe(c.id, rid).some(d => d.funcao === 'Relator')).length;
      if (semRel) falta.push(['comissoes', `${semRel} comissão(ões) sem relator.`]);
      const rasc = pars.filter(p => p.status === 'rascunho').length;
      if (rasc) falta.push(['pareceres', `${rasc} parecer(es) em rascunho.`]);
      const pauta = pars.filter(p => p.status === 'concluido').length;
      if (pauta) falta.push(['plenario', `${pauta} parecer(es) aguardando o plenário.`]);
      const lnk = k => k === 'numeracao' ? '#/numeracao' : (ps.find(p => p[0] === k) || [])[3] || '#/reuniao';
      html += `<div class="card"><div class="section-title" style="margin-top:0">O que falta</div>${falta.length ? `<ul style="margin:0;padding-left:18px">${falta.map(([k, t]) => `<li><a href="${lnk(k)}">${esc(t)}</a></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">Nada pendente nas etapas da reunião.</p>'}</div>`;
      if (minhas.length) html += `<div class="card"><div class="section-title" style="margin-top:0">Minhas comissões nesta reunião</div><div class="com-grid">${minhas.map(id => comissao(id)).filter(Boolean).map(c => cardComissao(c, rid)).join('')}</div></div>`;
      html += `<div class="card"><div class="section-title" style="margin-top:0">Relatórios da reunião</div>
        <p class="muted small" style="margin-top:0">Cada relatório sai no papel com o cabeçalho da Secretaria Executiva, o código e o período da reunião. Use Imprimir para salvar em PDF, ou baixe para o Word.</p>
        <div class="row-wrap">
          <button class="btn" data-rel="composicao">Composição das comissões</button>
          <button class="btn" data-rel="documentos">Lista de documentos</button>
          <button class="btn" data-rel="consolidado">Situação dos pareceres</button>
          <button class="btn" data-rel="pareceres">Todos os pareceres concluídos</button>
        </div></div>`;
    }
    if (isAdmin()) html += painelConfig();
    shell('reuniao', html);
    ligarSeletor();
    A().$$('[data-rel]').forEach(b => b.onclick = () => relatorioReuniao(b.getAttribute('data-rel')));
    if (isAdmin()) ligarConfig();
  }
  function semComissoes() {
    return `<p class="muted" style="margin:0">Nenhuma comissão do concílio cadastrada. ${isAdmin() ? '<button class="btn sm" id="bPadrao2">Criar as comissões de costume</button>' : ''}</p>`;
  }
  // lista de membros para a dica (passar o mouse ou tocar): "Rev. Fulano · Relator (IP X)"
  function listaMembros(ds) {
    return ds.slice().sort((a, b) => (a.funcao === 'Relator' ? 0 : 1) - (b.funcao === 'Relator' ? 0 : 1) || String(a.igreja || '').localeCompare(String(b.igreja || ''), 'pt-BR'))
      .map(d => nomeDel(d) + ' · ' + (d.funcao || 'Participante') + (d.igreja ? ' (' + d.igreja + ')' : '')).join('\n');
  }
  function cardComissao(c, rid) {
    const esc = A().esc;
    const ds = delegadosDe(c.id, rid);
    const rels = ds.filter(d => d.funcao === 'Relator');
    const ps = pareceres(rid).filter(p => p.comissaoId === c.id);
    const nd = documentos(rid).filter(d => d.comissaoId === c.id).length;
    const st = ps.length ? (ps.every(p => PLENARIO.includes(p.status)) ? 'aprovado' : ps.some(p => p.status === 'rascunho') ? 'rascunho' : 'concluido') : '';
    const relTxt = rels.length === 1 ? 'Relator: ' + esc(nomeDel(rels[0]))
      : rels.length > 1 ? `<span class="dica" tabindex="0" data-dica="${esc(rels.map(d => nomeDel(d) + (d.igreja ? ' (' + d.igreja + ')' : '')).join('\n'))}">${rels.length} relatores</span>`
      : '<span class="muted">Sem relator</span>';
    const memTxt = ds.length ? ` · <span class="dica" tabindex="0" data-dica="${esc(listaMembros(ds))}">${ds.length} ${ds.length === 1 ? 'membro' : 'membros'}</span>` : '';
    return `<a class="com-card" href="#/comissao/${encodeURIComponent(c.id)}">
      <span class="small muted">${esc(c.grupo || '')}</span>
      <b>${esc(c.nome)}</b>
      <span class="small">${relTxt}${memTxt}</span>
      <span class="small muted">${nd} documento(s) · ${ps.length} parecer(es) ${st ? chip(st) : ''}</span>
    </a>`;
  }
  /* etapas da reunião: a sequência de trabalho da RO, no alto de cada tela dela (a explicação aparece ao passar o mouse ou tocar) */
  const IC = {
    mesa: '<path d="M4 20h16M6 20v-6h12v6"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="7" r="2.5"/><path d="M5 14c0-2 2-3.5 4-3.5s3 1 3 1 1-1 3-1 4 1.5 4 3.5"/>',
    docs: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h6M9.5 15h6M9.5 18h4"/>',
    comissao: '<circle cx="7" cy="8" r="2.3"/><circle cx="17" cy="8" r="2.3"/><circle cx="12" cy="6" r="2.3"/><path d="M3 18c0-3 2-5 4-5M21 18c0-3-2-5-4-5M7.5 19c0-3.2 2-5.5 4.5-5.5s4.5 2.3 4.5 5.5"/>',
    relator: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/><path d="M4 20h16"/>',
    plenario: '<path d="M12 3l8 4H4z"/><path d="M6 9v8M10 9v8M14 9v8M18 9v8"/><path d="M3 20h18"/>',
    ata: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h10"/><path d="M9 8h5"/>'
  };
  function passosReuniao(r) {
    const rid = r.id;
    const docs = documentos(rid), pars = pareceres(rid), dels = itens('delegado').filter(d => d.reuniaoId === rid);
    const ata = itens('ata').find(a => a.reuniaoId === rid);
    const ataSt = ata ? (ata.situacao === 'aprovada' ? 'aprovada' : 'em redação') : 'a lavrar';
    const semNum = docs.filter(d => !d.numero && pastaAuto(d) === 'relatorio').length;
    const docsSt = `${docs.length} documento(s)${semNum ? ' · ' + semNum + ' sem nº' : ''}`;
    if (r.tipoReuniao === 'E') return [
      ['documentos', 'docs', 'Convocação e documentos', '#/documentos', docsSt, 'A reunião extraordinária trata só do assunto da convocação (CI/IPB art. 74). O 2º Secretário numera os documentos recebidos.'],
      ['ata', 'ata', 'Ata', '#/ata-geral/' + encodeURIComponent(rid), ataSt, 'O 1º Secretário redige a ata da reunião, com a Mesa, os presentes e a decisão sobre o assunto da convocação.']
    ];
    const mesaOk = CARGOS_MESA.filter(c => (r.mesa || []).some(m => m.cargo === c && m.nome)).length;
    return [
      ['mesa', 'mesa', 'Mesa', '#/mesa', `${mesaOk} de ${CARGOS_MESA.length} cargos`, 'Diretoria da Mesa eleita para o ano (Presidente, Vice, Secretário Executivo, 1º e 2º Secretários e Tesoureiro), secretarias de causa e designações.'],
      ['documentos', 'docs', 'Documentos', '#/documentos', docsSt, 'O 2º Secretário recebe os relatórios das igrejas e os demais documentos, dá o número (Doc nº) e encaminha cada um à comissão que vai examiná-lo.'],
      ['comissoes', 'comissao', 'Comissões', '#/comissoes', `${comissoes().length} comissões · ${dels.filter(d => d.funcao === 'Relator').length} relatores`, 'Definição das comissões da reunião, com o relator e os membros de cada uma.'],
      ['pareceres', 'relator', 'Pareceres', '#/pareceres', `${pars.filter(p => p.status !== 'rascunho').length} de ${pars.length} prontos`, 'Cada comissão analisa os documentos e redige o parecer. A IA dá uma prévia com a base no Manual Presbiteriano (página, artigo, parágrafo e inciso); o relator revisa, conclui e envia ao plenário.'],
      ['plenario', 'plenario', 'Plenário', '#/plenario', `${pars.filter(p => PLENARIO.includes(p.status)).length} decididos · ${pars.filter(p => p.status === 'concluido').length} na pauta`, 'O plenário aprecia os pareceres prontos e a Mesa registra a decisão: aprovado, aprovado com emendas ou rejeitado (quórum: CI/IPB art. 86).'],
      ['ata', 'ata', 'Ata', '#/ata-geral/' + encodeURIComponent(rid), ataSt, 'O 1º Secretário redige a ata geral da reunião, que já traz a Mesa, os presentes e as decisões do plenário sobre os pareceres.']
    ];
  }
  function etapas(ativa, r) {
    r = r || reuniao();
    if (!r) return '';
    const esc = A().esc;
    const ic = k => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
    const ps = passosReuniao(r);
    return `<nav class="card fluxo-card no-print" aria-label="Etapas da reunião"><ol class="fluxo etapas">${ps.map((p, i) => `${i ? '<li class="fx-seta" aria-hidden="true">›</li>' : ''}<li class="fx-li"><a href="${p[3]}" class="fx-passo${p[0] === ativa ? ' ativa' : ''}${i === 0 ? ' ini' : i === ps.length - 1 ? ' fim' : ''}" ${p[0] === ativa ? 'aria-current="step"' : ''}>
        <span class="fx-ic">${ic(p[1])}</span><span class="fx-n"><small>${i + 1}</small> ${esc(p[2])}</span><span class="fx-st">${esc(p[4])}</span><span class="fx-dica" role="tooltip">${esc(p[5])}</span></a></li>`).join('')}</ol></nav>`;
  }
  // as telas da reunião ficam todas sob o item "Reunião" do menu, com as etapas no alto
  function telaRO(ativa, titulo, sub, acoes, corpo, r, pagina) {
    const { shell, head } = A();
    shell(pagina || 'reuniao', head(titulo, sub, acoes) + etapas(ativa, r) + corpo);
  }
  // quem numera e edita os documentos e a ata: a Mesa (admin) e os secretários marcados por ela (cfg.secretarios)
  function podeSecretaria() {
    const u = usuario();
    if (!u) return false;
    if (isAdmin()) return true;
    const s = cfg().secretarios;
    return u.role !== 'leitor' && Array.isArray(s) && s.includes(u.id);
  }

  /* ======================= Configuração (Mesa) ======================= */
  function painelConfig() {
    const esc = A().esc;
    const c = cfg();
    const rs = reunioes();
    return `<div class="card"><div class="section-title" style="margin-top:0">Configuração da Mesa</div>
      <div class="grid g2">
        <div><div class="lbl">${esc(ORG().tipo)}</div><p style="margin:4px 0">${esc(c.nome || ORG().nome || 'Não informado')}${c.sigla ? ' (' + esc(c.sigla) + ')' : ''}<br><span class="small muted">${esc(c.sinodo || '')}${c.cidade ? ' · ' + esc(c.cidade) : ''}</span><br><span class="small muted">${igrejasCfg().length} igrejas e congregações</span></p>
          <button class="btn sm" id="bCfg">Editar dados do ${esc(ORG().tipoMin)}</button></div>
        <div><div class="lbl">Reuniões</div>
          <div class="tbl-wrap"><table><tbody>${rs.map(r => `<tr class="click" data-reu="${esc(r.id)}"><td>${esc(r.codigo || '')}${r.id === c.reuniaoAtual ? ' <span class="tag">atual</span>' : ''}</td><td class="small">${esc(periodo(r))}</td></tr>`).join('') || '<tr><td class="muted">Nenhuma reunião.</td></tr>'}</tbody></table></div>
          <button class="btn sm" id="bNovaReu" style="margin-top:8px">+ Nova reunião</button></div>
      </div>
      <div class="grid g2" style="margin-top:14px">
        <div><div class="lbl">Comissões do concílio</div><p class="small muted" style="margin:4px 0">Nome, grupo, modelo de parecer e base legal de cada comissão.</p><a class="btn sm" href="#/admin/comissoes">Abrir comissões</a></div>
        <div><div class="lbl">Importar ou levar para outro concílio</div><p class="small muted" style="margin:4px 0">Importe o pacote de reuniões anteriores (arquivo .json) e depois os PDFs dos documentos. Para outro presbitério, exporte só a estrutura (comissões e dados da Mesa) e ajuste os nomes.</p>
          <div class="row-wrap"><label class="btn sm">Importar pacote (.json)<input type="file" id="fPac" accept=".json,application/json" hidden></label>
          <label class="btn sm">Enviar PDFs dos documentos<input type="file" id="fPdfs" accept="application/pdf,image/*" multiple hidden></label>
          <button class="btn sm" id="bExp">Exportar estrutura</button></div>
          <div id="impMsg" class="small muted" style="margin-top:6px"></div></div>
      </div></div>`;
  }
  function ligarConfig() {
    const { $, $$ } = A();
    $('#bCfg').onclick = editarCfg;
    $('#bNovaReu').onclick = () => editarReuniao(null);
    $$('[data-reu]').forEach(tr => tr.onclick = () => editarReuniao(reuniao(tr.getAttribute('data-reu'))));
    $('#fPac').onchange = e => importarPacote(e.target.files[0]);
    $('#fPdfs').onchange = e => enviarPdfs(Array.from(e.target.files || []));
    $('#bExp').onclick = exportarEstrutura;
  }
  function editarCfg() {
    const { esc, modal, $ } = A();
    const c = cfg();
    const f = (id, l, v, extra) => `<div class="field ${extra || ''}"><label for="${id}">${l}</label><input type="text" id="${id}" value="${esc(v || '')}"></div>`;
    const m = modal('Dados do ' + ORG().tipoMin, `<div class="grid g2">
      ${f('cNome', 'Nome do ' + ORG().tipoMin, c.nome || ORG().nome, 'span2')}${f('cSigla', 'Sigla', c.sigla)}${f('cSinodo', 'Sínodo', c.sinodo)}
      ${f('cCidade', 'Cidade (Sala de Sessões)', c.cidade)}${f('cUf', 'UF', c.uf)}
      ${f('cPres', 'Presidente', c.presidente)}${f('cSec', 'Secretário Executivo', c.secretario)}${f('cTes', 'Tesoureiro', c.tesoureiro)}
      <div class="field span2"><label for="cIg">Igrejas e congregações <span class="help">uma por linha, como aparecem nos pareceres</span></label><textarea id="cIg" rows="8">${esc(c.igrejas || '')}</textarea>
      <button type="button" class="btn sm ghost" id="cIgCad" style="align-self:flex-start">Usar as igrejas cadastradas no sistema</button></div></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="cOk">Salvar</button>', true);
    $('[data-x]', m.el).onclick = m.fechar;
    $('#cIgCad', m.el).onclick = () => { $('#cIg', m.el).value = (S().d.igrejas || []).filter(i => i.ativo !== false).map(i => i.nome).join('\n'); };
    $('#cOk', m.el).onclick = async () => {
      const v = id => $('#' + id, m.el).value.trim();
      const item = { nome: v('cNome'), sigla: v('cSigla'), sinodo: v('cSinodo'), cidade: v('cCidade'), uf: v('cUf'), presidente: v('cPres'), secretario: v('cSec'), tesoureiro: v('cTes'), igrejas: v('cIg'), reuniaoAtual: c.reuniaoAtual || '' };
      if (await salvarItem('cfg', item, 'Dados do ' + ORG().tipoMin + ' salvos.')) { m.fechar(); A().render(); }
    };
  }
  function editarReuniao(r) {
    const { esc, modal, $ } = A();
    const novo = !r;
    r = r ? JSON.parse(JSON.stringify(r)) : { tipoReuniao: 'O', numero: 1, ano: new Date().getFullYear() + (new Date().getMonth() > 8 ? 1 : 0), local: '', cidade: cfg().cidade || '' };
    const m = modal(novo ? 'Nova reunião' : 'Editar reunião', `<div class="grid g3">
      <div class="field"><label for="rTipo">Tipo</label><select id="rTipo"><option value="O" ${r.tipoReuniao !== 'E' ? 'selected' : ''}>Ordinária</option><option value="E" ${r.tipoReuniao === 'E' ? 'selected' : ''}>Extraordinária</option></select></div>
      <div class="field"><label for="rNum">Número</label><input type="number" id="rNum" min="1" value="${esc(r.numero || 1)}"></div>
      <div class="field"><label for="rAno">Ano</label><input type="number" id="rAno" value="${esc(r.ano || '')}"></div>
      <div class="field"><label for="rIni">Início</label><input type="date" id="rIni" value="${esc(r.dataInicio || '')}"></div>
      <div class="field"><label for="rFim">Término</label><input type="date" id="rFim" value="${esc(r.dataFim || '')}"></div>
      <div class="field"><label for="rCid">Cidade</label><input type="text" id="rCid" value="${esc(r.cidade || '')}"></div>
      <div class="field span3"><label for="rLocal">Local</label><input type="text" id="rLocal" value="${esc(r.local || '')}" placeholder="ex.: Igreja Presbiteriana de Macaíba, Macaíba/RN"></div>
      <div class="field span3"><label for="rMat">Assunto da convocação <span class="help">na extraordinária, só se trata desse assunto (art. 74)</span></label><input type="text" id="rMat" value="${esc(r.materia || '')}"></div>
      <div class="field"><label for="rDConv">Data da convocação</label><input type="date" id="rDConv" value="${esc(r.dataConvocacao || '')}"></div>
      <div class="field span2"><label for="rConvPor">Convocada por</label><input type="text" id="rConvPor" value="${esc(r.convocadaPor || '')}" placeholder="ex.: Presidente do PLRN, a pedido de ..."></div>
      <div class="field span3"><label for="rPauta">Pauta <span class="help">um item por linha</span></label><textarea id="rPauta" rows="3">${esc(r.pauta || '')}</textarea></div>
      <div class="field"><label for="rPres">Presidente</label><input type="text" id="rPres" value="${esc(r.presidente || cfg().presidente || '')}"></div>
      <div class="field"><label for="rSec">Secretário Executivo</label><input type="text" id="rSec" value="${esc(r.secretario || cfg().secretario || '')}"></div>
      <label style="align-self:end"><input type="checkbox" id="rAtual" ${novo || cfg().reuniaoAtual === r.id ? 'checked' : ''}> Reunião atual</label>
      </div>
      <div class="lbl sec-lbl">Mesa diretora desta reunião</div>
      <p class="small muted" style="margin:0 0 6px">Nome, título e cargo de quem foi eleito (ou de quem presidiu, na extraordinária). Aparece na ata e nas assinaturas.</p>
      <div id="rMesa"></div><button type="button" class="btn sm" id="rMesaAdd">+ Membro da mesa</button><p class="small muted" id="rPrev" style="margin:0"></p>`,
      `${!novo ? '<button class="btn danger" id="rDel" style="margin-right:auto">Excluir</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="rOk">Salvar</button>`, true);
    const montar = () => {
      const t = $('#rTipo', m.el).value, n = Number($('#rNum', m.el).value) || 1, a = Number($('#rAno', m.el).value) || '';
      return { codigo: `${sigla()} – ${t}${n} – ${a}`, nome: `${n}ª Reunião ${t === 'E' ? 'Extraordinária' : 'Ordinária'} do ${nomePresb()}` };
    };
    r.mesa = Array.isArray(r.mesa) && r.mesa.length ? r.mesa : CARGOS_MESA.map(c => ({ cargo: c, tratamento: 'Rev.', nome: c === 'Presidente' ? (r.presidente || cfg().presidente || '') : c === 'Secretário Executivo' ? (r.secretario || cfg().secretario || '') : '', igreja: '' }));
    const lerMesa = () => A().$$('.mesa-row', m.el).map(x => ({ cargo: $('.mc', x).value.trim(), tratamento: $('.mt', x).value, nome: $('.mn', x).value.trim(), igreja: $('.mi', x).value.trim() })).filter(x => x.cargo || x.nome);
    const desenharMesa = () => {
      $('#rMesa', m.el).innerHTML = `<datalist id="dlCargos">${CARGOS_MESA.map(c => `<option value="${esc(c)}">`).join('')}</datalist><datalist id="dlIg4">${igrejasCfg().map(i => `<option value="${esc(i)}">`).join('')}</datalist>` + r.mesa.map(x => `<div class="mesa-row"><input type="text" class="mc" list="dlCargos" value="${esc(x.cargo || '')}" placeholder="Cargo" aria-label="Cargo"><select class="mt" aria-label="Título">${TRATAMENTOS.map(t => `<option value="${t}" ${x.tratamento === t ? 'selected' : ''}>${t || '(título)'}</option>`).join('')}</select><input type="text" class="mn" value="${esc(x.nome || '')}" placeholder="Nome" aria-label="Nome"><input type="text" class="mi" list="dlIg4" value="${esc(x.igreja || '')}" placeholder="Igreja" aria-label="Igreja"><button type="button" class="btn ghost sm tiraMesa" aria-label="Tirar">×</button></div>`).join('');
      A().$$('.tiraMesa', m.el).forEach((b, i) => b.onclick = () => { r.mesa = lerMesa(); r.mesa.splice(i, 1); desenharMesa(); });
    };
    desenharMesa();
    $('#rMesaAdd', m.el).onclick = () => { r.mesa = lerMesa(); r.mesa.push({ cargo: '', tratamento: 'Rev.', nome: '', igreja: '' }); desenharMesa(); };
    const prev = () => { const x = montar(); $('#rPrev', m.el).textContent = x.codigo + ' · ' + x.nome; };
    ['#rTipo', '#rNum', '#rAno'].forEach(s => { $(s, m.el).oninput = prev; $(s, m.el).onchange = prev; });
    prev();
    $('[data-x]', m.el).onclick = m.fechar;
    $('#rOk', m.el).onclick = async () => {
      const v = id => $('#' + id, m.el).value.trim();
      const item = Object.assign({ id: r.id, tipoReuniao: v('rTipo'), numero: Number(v('rNum')), ano: Number(v('rAno')), dataInicio: v('rIni'), dataFim: v('rFim') || v('rIni'), cidade: v('rCid'), local: v('rLocal'), materia: v('rMat'), presidente: v('rPres'), secretario: v('rSec'), dataConvocacao: v('rDConv'), convocadaPor: v('rConvPor'), pauta: v('rPauta'), mesa: lerMesa() }, montar());
      const pres = item.mesa.find(x => /^presidente$/i.test(x.cargo)); if (pres && pres.nome) item.presidente = [pres.tratamento, pres.nome].filter(Boolean).join(' ');
      const sec = item.mesa.find(x => /secret[aá]rio executivo/i.test(x.cargo)); if (sec && sec.nome) item.secretario = [sec.tratamento, sec.nome].filter(Boolean).join(' ');
      const res = await salvarItem('reuniao', item, 'Reunião salva.');
      if (!res) return;
      if ($('#rAtual', m.el).checked && cfg().reuniaoAtual !== res.item.id) await salvarItem('cfg', Object.assign({}, cfg(), { reuniaoAtual: res.item.id }));
      lsSet(REU_KEY, res.item.id);
      m.fechar(); A().render();
    };
    if ($('#rDel', m.el)) $('#rDel', m.el).onclick = async () => {
      if (!await A().confirmar('Excluir esta reunião apaga também os membros, documentos e pareceres dela. Continuar?', 'Excluir')) return;
      if (await A().acao(() => A().api({ action: 'reuniao', op: 'excluir', id: r.id }), 'Reunião excluída.')) { await A().recarregar(); m.fechar(); A().render(); }
    };
  }
  async function criarPadrao() {
    const existentes = new Set((S().d.comissoes || []).map(c => c.id));
    const faltam = COMISSOES_PADRAO.filter(c => !existentes.has(c.id));
    if (!faltam.length) return A().toast('As comissões de costume já estão cadastradas.');
    if (!await A().confirmar(`Criar ${faltam.length} comissões e secretarias de costume (exame de atas, legislação e justiça, estatísticas, estado religioso, finanças, tesouraria, diplomacia e secretarias de causa)? Depois você pode renomear ou desativar.`, 'Criar')) return;
    const r = await A().acao(() => A().api({ action: 'reuniao', op: 'importar', itens: faltam.map(c => Object.assign({ tipo: 'comissao', ano: null, tipoComissao: c.grupo }, c)) }), 'Comissões criadas.');
    if (r) { await A().recarregar(); A().render(); }
  }
  async function importarPacote(file) {
    const { $ } = A();
    if (!file) return;
    const msg = $('#impMsg');
    let dados;
    try { dados = JSON.parse(await file.text()); } catch (e) { return A().toast('O arquivo não é um pacote válido (.json).', true); }
    const lista = Array.isArray(dados) ? dados : (dados.itens || []);
    if (!lista.length) return A().toast('O pacote está vazio.', true);
    msg.textContent = 'Importando ' + lista.length + ' itens…';
    const r = await A().acao(() => A().api({ action: 'reuniao', op: 'importar', itens: lista }));
    if (!r) { msg.textContent = ''; return; }
    await A().recarregar();
    const semPdf = itens('documento').filter(d => !d.arquivo && d.arquivoNome).length;
    A().toast(r.importados + ' itens importados.');
    A().render();
    const m2 = A().$('#impMsg');
    if (m2 && semPdf) m2.textContent = `${r.importados} itens importados. Agora envie os PDFs (${semPdf} documentos esperam o arquivo): use "Enviar PDFs dos documentos" e selecione todos os arquivos da pasta.`;
  }
  async function enviarPdfs(files) {
    if (!files.length) return;
    const msg = A().$('#impMsg') || { textContent: '' };
    const docs = itens('documento');
    const chave = s => String(s || '').toLowerCase().replace(/\.[a-z0-9]+$/, '');
    let ok = 0, sem = [], falhas = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      msg.textContent = `Enviando ${i + 1} de ${files.length}: ${f.name}`;
      const d = docs.find(x => chave(x.arquivoNome) === chave(f.name)) || docs.find(x => chave(x.id) === chave(f.name));
      if (!d) { sem.push(f.name); continue; }
      if (f.size > 15e6) { falhas++; continue; }
      try { await A().api({ action: 'reuniao', op: 'enviar_arquivo', id: d.id, nome: f.name, dados: await A().lerArquivo(f) }); ok++; } catch (e) { falhas++; }
    }
    await A().recarregar();
    A().toast(`${ok} PDF(s) anexados${falhas ? ', ' + falhas + ' com erro' : ''}.`, !!falhas);
    A().render();
    const m2 = A().$('#impMsg');
    if (m2 && sem.length) m2.textContent = `Sem documento correspondente (anexe pela tela Documentos): ${sem.slice(0, 8).join(', ')}${sem.length > 8 ? '…' : ''}`;
  }
  function exportarEstrutura() {
    const c = Object.assign({}, cfg()); delete c.reuniaoAtual;
    const est = { versao: 1, descricao: 'Estrutura do ' + ORG().sistema + ': dados da Mesa e comissões do concílio. Ajuste os nomes e importe no outro presbitério ou sínodo.', itens: [Object.assign({ tipo: 'cfg', id: 'cfg' }, c, { presidente: '', secretario: '', tesoureiro: '' })].concat(comissoes().map(x => ({ tipo: 'comissao', id: x.id, nome: x.nome, grupo: x.grupo, modelo: x.modelo, ordem: x.ordem, base: x.base, titulo: x.titulo }))) };
    A().baixar('estrutura-' + (sigla() || 'presbiterio').toLowerCase() + '.json', JSON.stringify(est, null, 2), 'application/json');
  }

  /* campos da comissão no cadastro de comissões (app.js) */
  function camposComissao(c) {
    const esc = A().esc;
    return `<div class="lbl" style="margin-top:6px">Na reunião do concílio</div><div class="grid g3">
      <div class="field"><label for="cGr">Grupo</label><select id="cGr"><option value="">(não aparece na reunião)</option>${GRUPOS.map(g => `<option ${c.grupo === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label for="cMo">Modelo do parecer</label><select id="cMo"><option value="">(nenhum)</option>${Object.entries(MODELOS).map(([k, l]) => `<option value="${k}" ${c.modelo === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="field"><label for="cOr">Ordem</label><input type="number" id="cOr" value="${esc(c.ordem || '')}"></div>
      <div class="field span3"><label for="cTi">Título do relatório</label><input type="text" id="cTi" value="${esc(c.titulo || '')}" placeholder="ex.: Relatório Final da Comissão de Exame do Livro de Atas"></div>
      <div class="field span3"><label for="cBa">Base legal ou atribuição</label><input type="text" id="cBa" value="${esc(c.base || '')}"></div></div>
      <p class="small muted" style="margin:0">Os membros de cada reunião (Relator e Participantes) são definidos em <b>Membros das comissões</b>, porque mudam a cada reunião.</p>`;
  }
  function lerCamposComissao(el) {
    const $ = A().$;
    if (!$('#cGr', el)) return {};
    const grupo = $('#cGr', el).value, modelo = $('#cMo', el).value;
    return { grupo, modelo: modelo || (grupo ? 'geral' : ''), ordem: Number($('#cOr', el).value) || null, titulo: $('#cTi', el).value.trim(), base: $('#cBa', el).value.trim() };
  }

  /* ======================= Comissões ======================= */
  function telaComissoes() {
    const { shell, head } = A();
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Comissões');
    const cs = comissoes();
    const minhas = new Set(minhasComissoes(r.id));
    let html = head('Comissões', subReuniao(r), seletorReuniao() + `<a class="btn${isAdmin() ? ' primary' : ''}" href="#/delegados">${isAdmin() ? 'Definir relatores e membros' : 'Relatores e membros'}</a>`) + etapas('comissoes', r);
    if (!cs.length) html += `<div class="card">${semComissoes()}</div>`;
    GRUPOS.concat(['']).forEach(g => {
      const lista = cs.filter(c => (c.grupo || '') === g);
      if (!lista.length) return;
      html += `<div class="section-title">${A().esc(g || 'Outras')}</div><div class="com-grid">${lista.map(c => cardComissao(c, r.id).replace('class="com-card"', `class="com-card${minhas.has(c.id) ? ' minha' : ''}"`)).join('')}</div>`;
    });
    shell('reuniao', html);
    ligarSeletor();
    const b = A().$('#bPadrao2'); if (b) b.onclick = criarPadrao;
  }

  function telaComissao(id) {
    const { esc, shell, head, $, $$ } = A();
    const c = comissao(id);
    const r = reuniao();
    if (!c) { A().ir('comissoes'); return; }
    if (!r) return semReuniao('reuniao', c.nome);
    const ds = delegadosDe(c.id, r.id);
    const docs = documentos(r.id).filter(d => d.comissaoId === c.id);
    const pars = pareceres(r.id).filter(p => p.comissaoId === c.id);
    const anteriores = pareceres().filter(p => p.comissaoId === c.id && p.reuniaoId !== r.id);
    const pode = podeParecer(c.id, r.id);
    const eu = ds.find(d => d.userId === usuario().id);
    let html = head(esc(c.nome), `${esc(c.grupo || '')} · ${subReuniao(r)}`,
      seletorReuniao() + (pode ? `<button class="btn primary" id="bNovo">+ Novo ${c.modelo === 'secretaria' ? 'relatório' : 'parecer'}</button>` : '')) + etapas('pareceres', r);
    html += `<div class="card com-amb"><div class="grid g2">
      <div><div class="lbl">Atribuição</div><p style="margin:4px 0">${esc(c.base || '—')}</p>
        <div class="lbl" style="margin-top:10px">Modelo do parecer</div><p style="margin:4px 0">${esc(MODELOS[c.modelo] || '')}</p>
        ${eu ? `<p class="small" style="margin:8px 0 0"><span class="tag">Você é ${esc(eu.funcao)}</span></p>` : (pode ? '' : '<p class="small muted" style="margin:8px 0 0">Você vê esta comissão, mas não está entre os membros dela.</p>')}</div>
      <div><div class="lbl">Membros nesta reunião</div>
        ${ds.length ? `<ul class="del-list">${ds.map(d => `<li><b>${esc(nomeDel(d))}</b>${d.igreja ? ' <span class="muted small">· ' + esc(d.igreja) + '</span>' : ''} <span class="tag ${d.funcao === 'Relator' ? '' : 'gray'}">${esc(d.funcao)}</span>${d.userId ? '' : ' <span class="small muted" title="Sem usuário vinculado">(sem acesso)</span>'}</li>`).join('')}</ul>` : '<p class="muted" style="margin:4px 0">Nenhum membro definido.</p>'}
        ${isAdmin() ? `<a class="btn sm" href="#/delegados?c=${encodeURIComponent(c.id)}">Definir membros</a>` : ''}</div>
    </div></div>`;
    html += `<div class="card"><div class="section-title" style="margin-top:0">Documentos para análise <span class="muted small">(${docs.length})</span></div>
      ${docs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Documento</th><th>Origem</th><th>PDF</th><th></th></tr></thead><tbody>
      ${docs.map(d => `<tr><td class="num">${esc(d.numero || '')}</td><td>${esc(d.titulo)}${d.resumo ? `<div class="small muted">${esc(d.resumo).slice(0, 220)}</div>` : ''}</td><td class="small">${esc(d.origem || '')}</td>
        <td>${d.arquivo ? `<button class="btn sm" data-pdf="${esc(d.id)}">Abrir</button>` : '<span class="small muted">sem PDF</span>'}</td>
        <td>${pode ? `<button class="btn sm primary" data-par="${esc(d.id)}">Fazer parecer</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted" style="margin:0">Nenhum documento encaminhado a esta comissão nesta reunião.</p>'}</div>`;
    html += `<div class="card"><div class="section-title" style="margin-top:0">Pareceres desta reunião</div>${tabelaPareceres(pars)}</div>`;
    if (anteriores.length) html += `<div class="card"><div class="section-title" style="margin-top:0">Pareceres de reuniões anteriores</div>${tabelaPareceres(anteriores, true)}</div>`;
    shell('reuniao', html);
    ligarSeletor();
    if ($('#bNovo')) $('#bNovo').onclick = () => abrirEditor(null, c.id, null);
    $$('[data-par]').forEach(b => b.onclick = () => abrirEditor(null, c.id, b.getAttribute('data-par')));
    $$('[data-pdf]').forEach(b => b.onclick = () => abrirPdf(b.getAttribute('data-pdf')));
    $$('[data-vp]').forEach(tr => tr.onclick = () => A().ir('parecer/' + tr.getAttribute('data-vp')));
  }
  function tabelaPareceres(pars, mostraReu) {
    const esc = A().esc;
    if (!pars.length) return '<p class="muted" style="margin:0">Nenhum parecer ainda.</p>';
    return `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Assunto</th>${mostraReu ? '<th>Reunião</th>' : ''}<th>Data</th><th>Situação</th></tr></thead><tbody>
      ${pars.map(p => `<tr class="click" data-vp="${esc(p.id)}"><td class="num">${esc(p.docNumero || '–')}</td><td>${esc(p.assunto || '')}</td>${mostraReu ? `<td class="small">${esc((reuniao(p.reuniaoId) || {}).codigo || '')}</td>` : ''}<td class="small">${esc(dataBr(p.data))}</td><td>${chip(p.status)}</td></tr>`).join('')}
    </tbody></table></div>`;
  }

  /* ======================= PDF dos documentos ======================= */
  const pdfCache = {};
  async function abrirPdf(id) {
    const w = window.open('', '_blank');
    try {
      if (!pdfCache[id]) {
        const x = await A().api({ action: 'reuniao', op: 'arquivo', id });
        const blob = x.blob || await (await fetch(x.dados)).blob();
        pdfCache[id] = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: x.tipo || 'application/pdf' }));
      }
      if (w) w.location.href = pdfCache[id]; else location.href = pdfCache[id];
    } catch (e) { if (w) w.close(); A().toast(e.message || String(e), true); }
  }

  /* ======================= Editor do parecer ======================= */
  function linhaAssin(a) {
    const esc = A().esc;
    return `<div class="assin-row"><input type="text" class="an" value="${esc(a.nome || '')}" placeholder="Nome (ex.: Rev. Fulano de Tal)"><input type="text" class="af" value="${esc(a.funcao || '')}" placeholder="Relator / Membro"><button type="button" class="btn ghost sm rmA" aria-label="Remover">×</button></div>`;
  }
  function camposModelo(modelo, p) {
    const esc = A().esc;
    const f = p.campos || {};
    const sg = esc(sigla());
    if (modelo === 'atas') {
      return `<div class="lbl sec-lbl">Parecer quanto às atas e aos atos</div><div class="grid g3">
        <div class="field span2"><label for="aIgreja">Igreja ou concílio examinado</label><input type="text" id="aIgreja" list="dlIgrejas" value="${esc(f.igreja || '')}"><datalist id="dlIgrejas">${igrejasCfg().map(i => `<option value="${esc(i)}">`).join('')}<option value="Comissão Executiva do ${sg}"></datalist></div>
        <div class="field"><label for="aLivro">Livro nº</label><input type="text" id="aLivro" value="${esc(f.livro || '')}"></div>
        <div class="field"><label for="aDe">Atas nº (de)</label><input type="text" id="aDe" value="${esc(f.atasDe || '')}"></div>
        <div class="field"><label for="aAte">Atas nº (até)</label><input type="text" id="aAte" value="${esc(f.atasAte || '')}"></div>
        <div class="field"><label for="aFolhas">Folhas</label><input type="text" id="aFolhas" value="${esc(f.folhas || '')}" placeholder="ex.: 12 a 48"></div>
        <div class="field span3"><label for="aPeriodo">Período das atas</label><input type="text" id="aPeriodo" value="${esc(f.periodo || '')}" placeholder="ex.: janeiro a dezembro de 2025"></div></div>
        <div class="lbl" style="margin-top:12px">Considerando:</div>
        <div class="checks">${CONSIDERANDOS_ATAS.map(t => `<label><input type="checkbox" class="aCons" value="${esc(t)}" ${(f.considerandos || []).includes(t) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>
        <div class="field" style="margin-top:8px"><label for="aConsOutros">Outros considerandos <span class="help">um por linha</span></label><textarea id="aConsOutros" rows="2">${esc(f.consOutros || '')}</textarea></div>
        <div class="lbl" style="margin-top:12px">O ${sg} resolve:</div>
        <div class="checks">${DECISOES_ATAS.map(t => `<label><input type="radio" name="aDec" value="${esc(t)}" ${(f.decisao || DECISOES_ATAS[0]) === t ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>
        <div class="field" style="margin-top:8px"><label for="aObs">Observações a lançar no livro <span class="help">uma por linha (rasuras, falta de assinatura, numeração etc.)</span></label><textarea id="aObs" rows="3">${esc(f.observacoes || '')}</textarea></div>
        <div class="field"><label for="aRec">Recomendações <span class="help">uma por linha</span></label><textarea id="aRec" rows="2">${esc(f.recomendacoes || '')}</textarea></div>
        <label style="margin-top:6px;display:block"><input type="checkbox" id="aParab" ${f.parabenizar ? 'checked' : ''}> Parabenizar pelo zelo e cuidado com que os registros das atas e atos foram escritos</label>`;
    }
    if (modelo === 'secretaria') {
      const tab = f.tabela || igrejasCfg().map(i => ({ igreja: i, sociedades: '', socios: '' }));
      return `<div class="lbl sec-lbl">Dados do relatório</div><div class="grid g3">
        <div class="field"><label for="sNome">Secretário(a)</label><input type="text" id="sNome" value="${esc(f.secretario || '')}"></div>
        <div class="field"><label for="sPeriodo">Período</label><input type="text" id="sPeriodo" value="${esc(f.periodo || '')}" placeholder="ex.: 2025"></div>
        <div class="field"><label for="pDocs">Documentos (nºs)</label><input type="text" id="pDocs" value="${esc(p.docsAnalisados || '')}"></div></div>
        <div class="lbl" style="margin-top:12px">Sociedades internas por igreja</div>
        <div class="tbl-wrap"><table id="sTab"><thead><tr><th>Igreja</th><th>Sociedades</th><th>Sócios</th></tr></thead><tbody>
        ${tab.map(x => `<tr><td><input type="text" class="sIg" value="${esc(x.igreja)}"></td><td><input type="text" class="sSoc" inputmode="numeric" value="${esc(x.sociedades)}"></td><td><input type="text" class="sSoc2" inputmode="numeric" value="${esc(x.socios)}"></td></tr>`).join('')}
        </tbody></table></div><button type="button" class="btn sm" id="sAddLinha" style="margin-top:6px">+ Linha</button>
        <div class="grid g2" style="margin-top:12px">
        <div class="field"><label for="sAtiv">Atividades realizadas <span class="help">uma por linha</span></label><textarea id="sAtiv" rows="4">${esc(f.atividades || '')}</textarea></div>
        <div class="field"><label for="sDif">Dificuldades encontradas <span class="help">uma por linha</span></label><textarea id="sDif" rows="4">${esc(f.dificuldades || '')}</textarea></div>
        <div class="field"><label for="sPlano">Plano para o próximo período</label><textarea id="sPlano" rows="3">${esc(f.plano || '')}</textarea></div>
        <div class="field"><label for="sRec">Recomendações ao concílio</label><textarea id="sRec" rows="3">${esc(f.recomendacoes || '')}</textarea></div></div>`;
    }
    return `<div class="lbl sec-lbl">Documentos examinados</div><div class="grid g2">
      <div class="field"><label for="pDocs">Quanto aos documentos (nºs)</label><input type="text" id="pDocs" value="${esc(p.docsAnalisados || '')}" placeholder="ex.: 031, 032, 033"></div>
      <div class="field"><label for="pOrig">Oriundos de</label><input type="text" id="pOrig" value="${esc(p.origens || '')}" placeholder="ex.: IP Filadélfia, IP Maanaim"></div>
      <div class="field span2"><label for="gEmentas">Ementas <span class="help">uma por linha</span></label><textarea id="gEmentas" rows="3">${esc(f.ementas || '')}</textarea></div>
      <div class="field span2"><label for="gAus">Ausências ou pendências <span class="help">ex.: igrejas que não enviaram relatório</span></label><input type="text" id="gAus" value="${esc(f.ausencias || '')}"></div></div>
      <div class="lbl sec-lbl">O ${sg} resolve</div><div class="grid g2">
      <div class="field"><label for="gDec">Decisão proposta</label><select id="gDec">${DECISOES_GERAL.map(t => `<option ${f.decisao === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div><div></div>
      <div class="field span2"><label for="gApont">Apontamentos <span class="help">um por linha; viram itens numerados</span></label><textarea id="gApont" rows="5">${esc(f.apontamentos || '')}</textarea></div>
      <div class="field"><label for="gRec">Recomendações <span class="help">uma por linha</span></label><textarea id="gRec" rows="3">${esc(f.recomendacoes || '')}</textarea></div>
      <div class="field"><label for="gDet">Determinações <span class="help">uma por linha</span></label><textarea id="gDet" rows="3">${esc(f.determinacoes || '')}</textarea></div></div>`;
  }
  function lerModelo(m, modelo) {
    const $ = A().$;
    const q = s => $(s, m);
    if (modelo === 'atas') return {
      igreja: q('#aIgreja').value.trim(), livro: q('#aLivro').value.trim(), atasDe: q('#aDe').value.trim(), atasAte: q('#aAte').value.trim(), periodo: q('#aPeriodo').value.trim(), folhas: q('#aFolhas').value.trim(),
      considerandos: A().$$('.aCons:checked', m).map(x => x.value), consOutros: q('#aConsOutros').value, decisao: (m.querySelector('input[name=aDec]:checked') || {}).value || DECISOES_ATAS[0],
      observacoes: q('#aObs').value, recomendacoes: q('#aRec').value, parabenizar: q('#aParab').checked
    };
    if (modelo === 'secretaria') return {
      secretario: q('#sNome').value.trim(), periodo: q('#sPeriodo').value.trim(),
      tabela: A().$$('#sTab tbody tr', m).map(r => ({ igreja: $('.sIg', r).value.trim(), sociedades: $('.sSoc', r).value.trim(), socios: $('.sSoc2', r).value.trim() })).filter(r => r.igreja),
      atividades: q('#sAtiv').value, dificuldades: q('#sDif').value, plano: q('#sPlano').value, recomendacoes: q('#sRec').value
    };
    return { ementas: q('#gEmentas').value, ausencias: q('#gAus').value.trim(), decisao: q('#gDec').value, apontamentos: q('#gApont').value, recomendacoes: q('#gRec').value, determinacoes: q('#gDet').value };
  }
  function abrirEditor(p, comId, docId) {
    const { esc, modal, $, $$ } = A();
    const c = comissao(comId);
    const reu = reuniao(p ? p.reuniaoId : null);
    if (!c || !reu) return A().toast('Cadastre a reunião primeiro.', true);
    const doc = docId ? itens('documento').find(d => d.id === docId) : null;
    const novo = !p;
    const modelo = (p && p.modelo) || c.modelo || 'geral';
    p = p ? JSON.parse(JSON.stringify(p)) : {
      comissaoId: comId, reuniaoId: reu.id, modelo, status: 'rascunho', data: hoje(), destino: 'Plenário',
      cidade: reu.cidade || cfg().cidade || '', docNumero: '', titulo: c.titulo || ('Relatório da ' + c.nome),
      docsAnalisados: doc ? String(doc.numero || '') : '', origens: doc ? (doc.origem || '') : '', assunto: doc ? doc.titulo : '', documentoIds: doc ? [doc.id] : [],
      campos: {}, assinaturas: delegadosDe(comId, reu.id).map(d => ({ nome: nomeDel(d), funcao: d.funcao === 'Relator' ? 'Relator' : 'Membro' }))
    };
    if (modelo === 'atas' && novo) Object.assign(p.campos, { considerandos: CONSIDERANDOS_ATAS.slice(0, 2), decisao: DECISOES_ATAS[0], parabenizar: true, igreja: doc ? doc.origem || '' : '' });
    if (modelo === 'geral' && novo) p.campos.decisao = DECISOES_GERAL[0];
    const relator = souRelator(comId, reu.id);
    const m = modal(`${novo ? 'Novo' : 'Editar'} ${modelo === 'secretaria' ? 'relatório' : 'parecer'} · ${esc(c.nome)}`, `
      <p class="small muted" style="margin:0 0 6px">${subReuniao(reu)}</p>
      <form id="fPar" class="parecer-form">
        ${caixaPrevia()}
        <div class="lbl sec-lbl">Cabeçalho do documento</div>
        <div class="grid g3">
          <div class="field"><label for="pDocNumero">Doc nº <span class="help">número da Secretaria Executiva</span></label><input type="text" id="pDocNumero" value="${esc(p.docNumero || '')}" placeholder="ex.: ${proximoNumeroDoc(reu.id)}"></div>
          <div class="field"><label for="pData">Data</label><input type="date" id="pData" value="${esc(p.data || '')}"></div>
          <div class="field"><label for="pDestino">Destino</label><select id="pDestino">${DESTINOS.map(x => `<option ${p.destino === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="field"><label for="pCidade">Cidade (Sala de Sessões)</label><input type="text" id="pCidade" value="${esc(p.cidade || '')}"></div>
          <div class="field span2"><label for="pTitulo">Título</label><input type="text" id="pTitulo" value="${esc(p.titulo || '')}"></div>
          <div class="field span3"><label for="pAssunto">Assunto <span class="req">*</span> <span class="help">aparece nas listas e nos relatórios</span></label><input type="text" id="pAssunto" value="${esc(p.assunto || '')}" placeholder="ex.: Livro de Atas da IP Marinas Praia Sul"></div>
        </div>
        ${camposModelo(modelo, p)}
        <div class="lbl sec-lbl">Assinaturas</div>
        <p class="small muted" style="margin:0 0 6px">Já vem com os membros da comissão. Ajuste se precisar.</p>
        <div id="assins">${(p.assinaturas || []).map(linhaAssin).join('')}</div>
        <button type="button" class="btn sm" id="addAssin">+ Assinatura</button>
        <div id="prevBox"></div>
      </form>`,
      `<button class="btn" id="bPrev" style="margin-right:auto">Pré-visualizar</button><button class="btn" data-x>Cancelar</button><button class="btn" id="bRasc">Salvar rascunho</button>${relator ? '<button class="btn primary" id="bConc">Concluir e enviar ao plenário</button>' : ''}`, true);
    const el = m.el;
    const ligarRm = () => $$('.rmA', el).forEach(b => b.onclick = () => b.closest('.assin-row').remove());
    ligarRm();
    $('#addAssin', el).onclick = () => { $('#assins', el).insertAdjacentHTML('beforeend', linhaAssin({ nome: '', funcao: 'Membro' })); ligarRm(); };
    if ($('#sAddLinha', el)) $('#sAddLinha', el).onclick = () => $('#sTab tbody', el).insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="sIg"></td><td><input type="text" class="sSoc" inputmode="numeric"></td><td><input type="text" class="sSoc2" inputmode="numeric"></td></tr>');
    $('[data-x]', el).onclick = m.fechar;
    const coletar = () => {
      const v = id => $('#' + id, el).value.trim();
      p.docNumero = v('pDocNumero'); p.data = v('pData'); p.destino = v('pDestino'); p.cidade = v('pCidade'); p.titulo = v('pTitulo'); p.assunto = v('pAssunto');
      p.campos = lerModelo(el, modelo);
      p.docsAnalisados = $('#pDocs', el) ? v('pDocs') : (p.docsAnalisados || '');
      if ($('#pOrig', el)) p.origens = v('pOrig');
      p.assinaturas = $$('.assin-row', el).map(r => ({ nome: $('.an', r).value.trim(), funcao: $('.af', r).value.trim() })).filter(a => a.nome);
      return p;
    };
    $('#bPrev', el).onclick = () => { coletar(); const w = $('#prevBox', el); w.innerHTML = `<div class="folha-wrap" style="margin-top:14px">${folhaParecer(p)}</div>`; w.scrollIntoView({ behavior: 'smooth' }); };
    const salvar = async st => {
      coletar();
      if (!p.assunto) { A().toast('Informe o assunto.', true); $('#pAssunto', el).focus(); return; }
      if (st === 'concluido' && !await A().confirmar('Concluir este parecer e enviá-lo ao plenário? Depois disso só a Mesa pode alterar.', 'Concluir')) return;
      const item = Object.assign({}, p, { status: st });
      const r = await salvarItem('parecer', item, st === 'concluido' ? 'Parecer concluído e enviado ao plenário.' : 'Rascunho salvo.');
      if (r) { m.fechar(); A().ir('parecer/' + r.item.id); }
    };
    $('#bRasc', el).onclick = () => salvar('rascunho');
    if ($('#bConc', el)) $('#bConc', el).onclick = () => salvar('concluido');
    ligarPrevia(el, () => coletar(), c, reu, modelo);
  }

  /* ======================= Prévia do parecer (IA) ======================= */
  // A IA lê o documento (PDF) e aponta o que conferir, com a fonte no Manual Presbiteriano: documento, artigo,
  // parágrafo, inciso e página. A página vem sempre do índice (base-legal.js), não da IA. O texto final é do relator.
  const TIPOS_ITEM = { nao_conforme: 'Não conforme', observacao: 'Observação', recomendacao: 'Recomendação', determinacao: 'Determinação', conforme: 'Conforme', conferir: 'A conferir' };
  function caixaPrevia() {
    return `<div class="ia-box" id="iaBox"><div class="row-wrap" style="justify-content:space-between;align-items:flex-start">
      <div style="flex:1;min-width:220px"><b>Prévia do parecer</b><div class="small muted">${A().SERVER ? 'A IA lê o documento e aponta o que está ou não conforme, com a base no Manual Presbiteriano (página, artigo, parágrafo e inciso). O relator revisa e decide.' : 'No modo demonstração (sem o servidor) a IA não está disponível: o sistema mostra o roteiro de conferência da comissão com a base legal e a página do Manual Presbiteriano.'}</div></div>
      <button type="button" class="btn sm primary" id="bIA">${A().SERVER ? 'Gerar prévia com a IA' : 'Ver roteiro com a base legal'}</button></div><div id="iaRes"></div></div>`;
  }
  const B = () => window.IPB_BASE_LEGAL;
  const blobB64 = blob => new Promise((ok, erro) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = erro; fr.readAsDataURL(blob); });
  function docsDoEditor(p) {
    return docsDoParecer(p, itens('documento').filter(d => d.reuniaoId === p.reuniaoId));
  }
  function fontesDaComissao(c, modelo) {
    if (modelo === 'atas') return (window.IPB_REGRAS_ATAS || []).map(g => ({ id: g.id, grupo: g.grupo, texto: g.texto, fundamentos: B().partes(g.artigo), artigo: g.artigo }));
    return B().partes(c.base).length ? [{ id: 'base', grupo: 'Atribuição da comissão', texto: c.base, fundamentos: B().partes(c.base), artigo: c.base }] : [];
  }
  function previaLocal(c, modelo) {
    const fs = fontesDaComissao(c, modelo);
    return {
      local: true,
      resumo: modelo === 'atas' ? 'Roteiro de conferência do livro de atas, item por item, com a fonte no Manual Presbiteriano. Leve ao parecer só o que não estiver conforme.' : 'Base legal da atribuição desta comissão. Use-a para fundamentar os apontamentos, recomendações e determinações.',
      itens: fs.map(g => ({ tipo: 'conferir', grupo: g.grupo, texto: g.texto, evidencia: '', fundamentos: g.fundamentos }))
    };
  }
  async function previaIA(p, c, reu, modelo) {
    const docs = docsDoEditor(p);
    let pdf = null, pdfNome = '';
    const d = docs.find(x => x.arquivo);
    if (d) {
      const x = await A().api({ action: 'reuniao', op: 'arquivo', id: d.id });
      const blob = x.blob || await (await fetch(x.dados)).blob();
      if (blob.size <= 20e6 && /pdf/i.test(blob.type || x.tipo || '')) { pdf = await blobB64(blob); pdfNome = d.arquivo.nome || d.titulo; }
    }
    const fontes = fontesDaComissao(c, modelo);
    const res = await A().ia({ tipo: 'parecer',
      comissao: { nome: c.nome, atribuicao: c.base || '', modelo },
      reuniao: { codigo: reu.codigo || '', ano: reu.ano },
      parecer: { assunto: p.assunto, docNumero: p.docNumero, docsAnalisados: p.docsAnalisados, origens: p.origens, campos: p.campos },
      documentos: docs.map(x => ({ numero: x.numero, titulo: x.titulo, origem: x.origem, tipo: x.tipoDoc, resumo: x.resumo })),
      regras: fontes.map(g => ({ id: g.id, artigo: g.artigo, texto: g.texto })),
      indice: B().indiceTexto(['CI/IPB', 'CD/IPB', 'PL/IPB', 'Regulamento de Atas', 'Modelo de Estatuto de Presbitério', 'Modelo de RI de Presbitério', 'Modelo de Estatuto de Igreja']),
      pdf, pdfNome });
    const r = res.resultado || {};
    (r.itens || []).forEach(it => { it.fundamentos = (it.fundamentos || []).map(f => Object.assign({}, f, { documento: B().doc(f.documento) || f.documento, pagina: B().pagina(f.documento, f.artigo) })); });
    r.semPdf = !pdf;
    return r;
  }
  function htmlPrevia(r) {
    const esc = A().esc;
    const cit = it => (it.fundamentos || []).map(f => B().citar(f)).join('; ');
    const ordem = ['nao_conforme', 'determinacao', 'recomendacao', 'observacao', 'conferir', 'conforme'];
    const todos = r.itens || [];
    const its = todos.slice().sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo));
    return `<div style="margin-top:10px">${r.semPdf && !r.local ? '<p class="small" style="margin:0 0 6px"><b>Atenção:</b> o documento não tem PDF anexado (ou passa de 20 MB); a IA usou só os dados cadastrados.</p>' : ''}
      ${r.resumo ? `<p class="txt" style="margin:0 0 8px">${esc(r.resumo)}</p>` : ''}
      <ol class="small" style="margin:0;padding-left:20px">${its.map(it => `<li style="margin-bottom:6px"><label class="chk" style="display:inline"><input type="checkbox" class="iaSel" data-i="${todos.indexOf(it)}" ${it.tipo === 'conforme' || it.tipo === 'conferir' ? '' : 'checked'}> <span class="tag ${it.tipo === 'nao_conforme' ? '' : 'gray'}">${esc(TIPOS_ITEM[it.tipo] || it.tipo)}</span></label> ${esc(it.texto)}
        ${it.evidencia ? `<div class="ia-ev">${esc(it.evidencia)}</div>` : ''}${cit(it) ? `<div class="muted">Base: ${esc(cit(it))}</div>` : ''}</li>`).join('')}</ol>
      ${its.length ? `<div class="row-wrap" style="margin-top:8px"><button type="button" class="btn sm" id="bIAUsar">Levar os itens marcados para o parecer</button><span class="small muted">Entram nos campos de observações, recomendações e determinações, com a fonte entre parênteses.</span></div>` : ''}</div>`;
  }
  function ligarPrevia(el, coletar, c, reu, modelo) {
    const { $, $$ } = A();
    const b = $('#bIA', el);
    if (!b) return;
    let ultimo = null;
    b.onclick = async () => {
      const p = coletar();
      b.disabled = true; const t = b.textContent; b.textContent = A().SERVER ? 'A IA está lendo o documento…' : 'Montando…';
      try { ultimo = A().SERVER ? await previaIA(p, c, reu, modelo) : previaLocal(c, modelo); $('#iaRes', el).innerHTML = htmlPrevia(ultimo); }
      catch (e) { $('#iaRes', el).innerHTML = `<p class="small" style="margin:8px 0 0">${A().esc(e.message || String(e))}</p>`; }
      finally { b.disabled = false; b.textContent = t; }
      const u = $('#bIAUsar', el);
      if (u) u.onclick = () => {
        const sel = $$('.iaSel', el).filter(x => x.checked).map(x => ultimo.itens[Number(x.getAttribute('data-i'))]);
        const linha = it => it.texto + ((it.fundamentos || []).length ? ' (' + it.fundamentos.map(f => B().citar(f)).join('; ') + ')' : '');
        const add = (id, its) => { const f = $('#' + id, el); if (!f || !its.length) return; f.value = (f.value.trim() ? f.value.trim() + '\n' : '') + its.map(linha).join('\n'); };
        const de = (...tipos) => sel.filter(it => tipos.includes(it.tipo));
        if (modelo === 'atas') { add('aObs', de('nao_conforme', 'observacao', 'conferir')); add('aRec', de('recomendacao', 'determinacao')); }
        else if (modelo === 'secretaria') add('sRec', sel.filter(it => it.tipo !== 'conforme'));
        else { add('gApont', de('nao_conforme', 'observacao', 'conferir')); add('gRec', de('recomendacao')); add('gDet', de('determinacao')); }
        A().toast(sel.length + ' item(ns) levados ao parecer. Revise o texto antes de salvar.');
      };
    };
  }

  /* ======================= Folha do parecer (modelo do PLRN) ======================= */
  function cabecalho(docNumero, destino, data, reu) {
    const esc = A().esc;
    return `<div class="pf-cab">
      <div class="pf-logo"><img src="img/logo-ipb.png" alt="Igreja Presbiteriana do Brasil"></div>
      <div class="pf-c"><b>Secretaria Executiva do ${esc(nomePresb())}</b>
        <div class="pf-sig">${esc((reu && reu.codigo) || '')}</div>
        <div>${esc(periodoExtenso(reu))}</div><div>${esc((reu && reu.local) || '')}</div></div>
      <div class="pf-d"><div>Doc nº: <span class="pf-lin">${esc(docNumero || '')}</span></div>
        <div>Destino: <span class="pf-lin">${esc(destino || '')}</span></div>
        <div>Data: ${esc(dataBr(data))}</div>
        <div class="pf-pres">Presidente do ${esc(sigla())}</div></div>
    </div>`;
  }
  const ol = arr => arr.length ? `<ol>${arr.map(x => `<li>${A().esc(x)}</li>`).join('')}</ol>` : '';
  function assinaturasHtml(as) { const esc = A().esc; return as && as.length ? `<div class="pf-assin">${as.map(a => `<div>${esc(a.nome)}<br>${esc(a.funcao || '')}</div>`).join('')}</div>` : ''; }
  function folhaParecer(p) {
    const esc = A().esc;
    const reu = reuniao(p.reuniaoId);
    const c = comissao(p.comissaoId) || {};
    const f = p.campos || {};
    const sg = esc(sigla());
    let corpo = '';
    if (p.modelo === 'atas') {
      const cons = [...(f.considerandos || []), ...linhas(f.consOutros)];
      const ig = f.igreja || '';
      const det = [f.livro ? `Livro nº ${f.livro}` : '', (f.atasDe || f.atasAte) ? `Atas nº ${f.atasDe || '?'} a ${f.atasAte || '?'}` : '', f.periodo ? `período ${f.periodo}` : '', f.folhas ? `folhas ${f.folhas}` : ''].filter(Boolean).join('; ');
      corpo = `<p class="pf-sec">PARECER QUANTO ÀS ATAS E OS ATOS ${esc(ig.toUpperCase())}</p>
        ${det ? `<p>${esc(det)}.</p>` : ''}
        ${cons.length ? `<p><b>Considerando:</b></p>${cons.map(x => `<p>${esc(x)};</p>`).join('')}` : ''}
        <p>O ${sg} <b>resolve</b>,</p>
        <p>${esc(f.decisao || DECISOES_ATAS[0])}${/livro de Atas$/.test(f.decisao || DECISOES_ATAS[0]) && ig ? ` da ${esc(ig)}` : ''}.</p>
        ${linhas(f.observacoes).length ? `<p class="pf-sec">Observações:</p>${ol(linhas(f.observacoes))}` : ''}
        ${linhas(f.recomendacoes).length ? `<p class="pf-sec">Recomendações:</p>${ol(linhas(f.recomendacoes))}` : ''}
        ${f.parabenizar ? `<p>Parabenizar pelo zelo e cuidado com que os registros das atas e atos ${ig ? 'da ' + esc(ig) + ' ' : ''}foram escritos.</p>` : ''}`;
    } else if (p.modelo === 'secretaria') {
      const tab = (f.tabela || []).filter(r => r.sociedades || r.socios);
      const totS = tab.reduce((a, r) => a + numero(r.sociedades), 0), totM = tab.reduce((a, r) => a + numero(r.socios), 0);
      corpo = `${p.docsAnalisados ? `<p>Referente ao(s) documento(s) ${esc(p.docsAnalisados)}${f.periodo ? `, período ${esc(f.periodo)}` : ''}.</p>` : (f.periodo ? `<p>Período: ${esc(f.periodo)}.</p>` : '')}
        ${f.secretario ? `<p>Secretário(a): ${esc(f.secretario)}.</p>` : ''}
        ${tab.length ? `<p class="pf-sec">Sociedades internas por igreja</p><table><thead><tr><th>Igreja</th><th>Sociedades</th><th>Sócios</th></tr></thead><tbody>${tab.map(r => `<tr><td>${esc(r.igreja)}</td><td class="num">${esc(r.sociedades)}</td><td class="num">${esc(r.socios)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num"><b>${totS}</b></td><td class="num"><b>${totM}</b></td></tr></tbody></table>` : ''}
        ${linhas(f.atividades).length ? `<p class="pf-sec">Atividades realizadas:</p>${ol(linhas(f.atividades))}` : ''}
        ${linhas(f.dificuldades).length ? `<p class="pf-sec">Dificuldades:</p>${ol(linhas(f.dificuldades))}` : ''}
        ${linhas(f.plano).length ? `<p class="pf-sec">Plano para o próximo período:</p>${ol(linhas(f.plano))}` : ''}
        ${linhas(f.recomendacoes).length ? `<p class="pf-sec">Recomendações ao concílio:</p>${ol(linhas(f.recomendacoes))}` : ''}`;
    } else {
      const tem = linhas(f.apontamentos).length || linhas(f.recomendacoes).length || linhas(f.determinacoes).length;
      corpo = `${p.docsAnalisados ? `<p>Quanto aos documentos ${esc(p.docsAnalisados)}${p.origens ? ` oriundos, respectivamente, do(a): ${esc(p.origens)}` : ''}.</p>` : ''}
        ${f.ausencias ? `<p>${esc(f.ausencias)}</p>` : ''}
        ${linhas(f.ementas).length ? `<p class="pf-sec">Ementas:</p><ul>${linhas(f.ementas).map(x => `<li>${esc(x)};</li>`).join('')}</ul>` : ''}
        <p>Quanto aos documentos supracitados, o ${sg} resolve <b>${esc(f.decisao || DECISOES_GERAL[0])}</b>${tem ? ', com os seguintes apontamentos, recomendações e determinações:' : '.'}</p>
        ${linhas(f.apontamentos).length ? `<p class="pf-sec">Quanto aos apontamentos:</p>${ol(linhas(f.apontamentos))}` : ''}
        ${linhas(f.recomendacoes).length ? `<p class="pf-sec">Quanto às recomendações:</p>${ol(linhas(f.recomendacoes))}` : ''}
        ${linhas(f.determinacoes).length ? `<p class="pf-sec">Quanto às determinações:</p>${ol(linhas(f.determinacoes))}` : ''}`;
    }
    const plen = PLENARIO.includes(p.status) ? `<p class="pf-plen"><i>Decisão do plenário: ${esc(STATUS[p.status])}${p.emendas ? ` — ${esc(p.emendas)}` : ''}.</i></p>` : '';
    return `<div class="parecer-folha">${cabecalho(p.docNumero, p.destino, p.data, reu)}
      <h4>${esc(p.titulo || c.titulo || '')}${p.modelo === 'atas' && f.igreja ? ` da ${esc(f.igreja)}` : ''}</h4>
      ${corpo}
      <p class="pf-local">Sala de Sessões,<br>${esc(p.cidade || cfg().cidade || '')}, ${esc(dataExtenso(p.data))}.</p>
      ${assinaturasHtml(p.assinaturas)}
      ${plen}
    </div>`;
  }
  function folhaSimples(titulo, corpo, reu) {
    const esc = A().esc;
    return `<div class="parecer-folha">${cabecalho('', 'Arquivo', hoje(), reu)}<h4>${esc(titulo)}</h4>${corpo}
      <p class="pf-local">Sala de Sessões,<br>${esc((reu && reu.cidade) || cfg().cidade || '')}, ${esc(dataExtenso(hoje()))}.</p>
      ${assinaturasHtml([{ nome: (reu && reu.secretario) || cfg().secretario || '', funcao: 'Secretário Executivo do ' + sigla() }])}</div>`;
  }

  /* ======================= Tela do parecer ======================= */
  function telaParecer(id) {
    const { esc, shell, head, $ } = A();
    const p = itens('parecer').find(x => x.id === id);
    if (!p) { A().ir('comissoes'); return; }
    const c = comissao(p.comissaoId) || { nome: '' };
    const editar = isAdmin() || (podeParecer(p.comissaoId, p.reuniaoId) && !PLENARIO.includes(p.status));
    const excluir = isAdmin() || (p.status === 'rascunho' && p.criadoPor === usuario().id);
    let html = head(esc(p.assunto || c.nome), `${esc(c.nome)} · ${subReuniao(reuniao(p.reuniaoId))}`,
      `<a class="btn" href="#/comissao/${encodeURIComponent(p.comissaoId)}">← Comissão</a><button class="btn" id="bImp">Imprimir / PDF</button><button class="btn" id="bDoc">Baixar Word</button>${editar ? '<button class="btn primary" id="bEd">Editar</button>' : ''}`);
    html += `<div class="card"><div class="row-wrap" style="justify-content:space-between"><div>${chip(p.status)} <span class="small muted">Atualizado em ${esc(A().dt(p.updatedAt, true))}${p.atualizadoPorNome ? ' por ' + esc(p.atualizadoPorNome) : ''}</span></div>
      ${excluir ? '<button class="btn danger sm" id="bDel">Excluir</button>' : ''}</div>
      ${isAdmin() ? `<div class="grid g3" style="margin-top:12px;align-items:end"><div class="field"><label for="dSt">Decisão do plenário (Mesa)</label><select id="dSt">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="dEm">Emendas ou observações do plenário</label><input type="text" id="dEm" value="${esc(p.emendas || '')}"></div><div><button class="btn primary" id="bDec">Registrar decisão</button></div></div>` : ''}
    </div>
    <div class="folha-wrap" style="margin-top:16px">${folhaParecer(p)}</div>
    ${(p.historico || []).length ? `<div class="card" style="margin-top:16px"><div class="section-title" style="margin-top:0">Histórico</div><ul class="small" style="margin:0;padding-left:18px">${p.historico.slice().reverse().map(h => `<li>${esc(A().dt(h.em, true))} · ${esc(h.por)} · ${esc(h.acao)}</li>`).join('')}</ul></div>` : ''}`;
    shell('reuniao', html.replace(/^<div class="page-head">[\s\S]*?<\/div><\/div>/, m => m + etapas(PLENARIO.includes(p.status) || p.status === 'concluido' ? 'plenario' : 'pareceres', reuniao(p.reuniaoId))));
    const nome = nomeArquivo(`${p.docNumero ? 'Doc ' + p.docNumero + ' - ' : ''}${p.assunto || c.nome}`);
    $('#bImp').onclick = () => imprimir(nome, folhaParecer(p));
    $('#bDoc').onclick = () => baixarWord(folhaParecer(p), nome + '.doc');
    if ($('#bEd')) $('#bEd').onclick = () => abrirEditor(p, p.comissaoId, null);
    if ($('#bDel')) $('#bDel').onclick = async () => {
      if (!await A().confirmar('Excluir este parecer?', 'Excluir')) return;
      if (await A().acao(() => A().api({ action: 'reuniao', op: 'excluir', id: p.id }), 'Parecer excluído.')) { await A().recarregar(); A().ir('comissao/' + encodeURIComponent(p.comissaoId)); }
    };
    if ($('#bDec')) $('#bDec').onclick = async () => {
      const r = await A().acao(() => A().api({ action: 'reuniao', op: 'decidir', id: p.id, status: $('#dSt').value, emendas: $('#dEm').value.trim() }), 'Decisão registrada.');
      if (r) { await A().recarregar(); A().render(); }
    };
  }

  /* ======================= impressão e Word ======================= */
  const CSS_FOLHA = `
    .parecer-folha{background:#fff;color:#111;width:794px;max-width:100%;box-sizing:border-box;margin:0 auto;padding:46px 56px;font-family:'Times New Roman',Times,'Liberation Serif',serif;font-size:15px;line-height:1.5}
    .parecer-folha h4,.pf-cab{font-family:'Zapf Humanist 601 BT','Zapf Humanist',Optima,'Libertinus Sans','URW Classico',Candara,'Segoe UI',sans-serif}
    .parecer-folha h4{text-align:center;font-size:16px;margin:18px 0 14px;font-weight:700;text-transform:uppercase}
    .pf-cab{display:grid;grid-template-columns:130px 1fr 210px;border:1px solid #444}
    .pf-cab>div{padding:8px;border-right:1px solid #444;display:flex;flex-direction:column;justify-content:center}
    .pf-cab>div:last-child{border-right:0;font-size:13px;gap:6px;justify-content:flex-start}
    .pf-logo img{width:100%;height:auto}
    .pf-c{text-align:center;font-size:13px}.pf-c b{font-size:13.5px}
    .pf-sig{font-size:17px;font-weight:700;margin:6px 0}
    .pf-lin{display:inline-block;min-width:110px;border-bottom:1px solid #555}
    .pf-pres{margin-top:22px;border-top:1px solid #555;text-align:center;font-size:12px}
    .parecer-folha p{margin:8px 0;text-align:justify}
    .parecer-folha ol,.parecer-folha ul{margin:6px 0 6px 22px;padding:0}
    .parecer-folha li{margin:3px 0;text-align:justify}
    .pf-sec{font-weight:700;margin-top:14px!important}
    .pf-local{text-align:right!important;margin-top:26px!important}
    .pf-assin{display:grid;grid-template-columns:1fr 1fr;gap:36px 40px;margin-top:46px}
    .pf-assin div{border-top:1px solid #222;padding-top:4px;text-align:center;font-size:13.5px}
    .pf-plen{margin-top:14px;font-size:13px}
    .parecer-folha table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
    .parecer-folha th,.parecer-folha td{border:1px solid #777;padding:4px 6px;text-align:left}
    .parecer-folha td.num{text-align:right}`;
  function imprimir(titulo, html) {
    const w = window.open('', '_blank');
    if (!w) return A().toast('Permita a abertura de janelas para imprimir.', true);
    const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, '');
    if (LOGO_DATA) html = html.split('src="img/logo-ipb.png"').join('src="' + LOGO_DATA + '"');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${A().esc(titulo)}</title><base href="${A().esc(base)}">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libertinus+Sans:ital,wght@0,400;0,700;1,400&display=swap">
      <style>${CSS_FOLHA}body{margin:0;background:#fff}@page{size:A4;margin:0}.parecer-folha{page-break-after:always;width:auto;max-width:210mm;min-height:0}.parecer-folha:last-child{page-break-after:auto}tr,li,.pf-assin,.pf-cab{break-inside:avoid}</style></head>
      <body>${html}<script>window.onload=function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print()},300)})}<\/script></body></html>`);
    w.document.close();
  }
  let LOGO_DATA = null;
  setTimeout(() => { logoData(); }, 1500);
  async function logoData() {
    if (LOGO_DATA) return LOGO_DATA;
    try { const b = await (await fetch('img/logo-ipb.png')).blob(); LOGO_DATA = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); } catch (e) { LOGO_DATA = ''; }
    return LOGO_DATA;
  }
  async function baixarWord(html, filename) {
    const logo = await logoData();
    const css = `body{font-family:'Times New Roman',serif;font-size:12pt} h4{font-family:'Zapf Humanist 601 BT',Optima,'Libertinus Sans',Candara,sans-serif;text-align:center;text-transform:uppercase;font-size:13pt}
      p{text-align:justify;margin:6pt 0} .pf-sec{font-weight:bold} .pf-local{text-align:right}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #777;padding:3pt 5pt}`;
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    // o Word não entende grid: cabeçalho e assinaturas viram tabelas
    tmp.querySelectorAll('.pf-cab').forEach(cab => {
      const cols = Array.from(cab.children);
      const t = document.createElement('table'); t.setAttribute('border', '1'); t.style.width = '100%';
      t.innerHTML = `<tr><td width="18%" align="center">${logo ? `<img src="${logo}" width="100">` : ''}</td><td width="52%" align="center">${cols[1].innerHTML}</td><td width="30%">${Array.from(cols[2].children).map(x => `<p style="margin:2pt 0">${A().esc(x.textContent)}</p>`).join('')}</td></tr>`;
      cab.replaceWith(t);
    });
    tmp.querySelectorAll('.pf-assin').forEach(a => {
      const ds = Array.from(a.children); let rows = '';
      for (let i = 0; i < ds.length; i += 2) rows += `<tr>${[ds[i], ds[i + 1]].map(d => `<td style="border:0;border-top:1px solid #000;text-align:center;padding-top:4pt" width="50%">${d ? d.innerHTML : ''}</td>`).join('')}</tr><tr><td style="border:0;height:30pt"></td><td style="border:0"></td></tr>`;
      const t = document.createElement('table'); t.style.marginTop = '36pt'; t.innerHTML = rows; a.replaceWith(t);
    });
    const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>${css}</style></head><body>${tmp.innerHTML}</body></html>`;
    A().baixar(filename, '﻿' + doc, 'application/msword');
  }

  /* ======================= relatórios da reunião ======================= */
  function relatorioReuniao(tipo) {
    const esc = A().esc;
    const r = reuniao();
    if (!r) return;
    let titulo = '', corpo = '';
    if (tipo === 'composicao') {
      titulo = 'Composição das comissões';
      corpo = comissoes().map(c => { const ds = delegadosDe(c.id, r.id); return `<p class="pf-sec">${esc(c.nome)}</p>${ds.length ? `<ul>${ds.map(d => `<li>${esc(nomeDel(d))}${d.igreja ? ' (' + esc(d.igreja) + ')' : ''} — ${esc(d.funcao)}</li>`).join('')}</ul>` : '<p><i>Sem membros.</i></p>'}`; }).join('');
    } else if (tipo === 'documentos') {
      titulo = 'Relação de documentos';
      corpo = `<table><thead><tr><th>Doc nº</th><th>Documento</th><th>Origem</th><th>Comissão</th></tr></thead><tbody>${documentos(r.id).map(d => `<tr><td class="num">${esc(d.numero || '')}</td><td>${esc(d.titulo)}</td><td>${esc(d.origem || '')}</td><td>${esc((comissao(d.comissaoId) || {}).nome || '')}</td></tr>`).join('')}</tbody></table>`;
    } else if (tipo === 'consolidado') {
      titulo = 'Situação dos pareceres';
      corpo = `<table><thead><tr><th>Doc nº</th><th>Comissão</th><th>Assunto</th><th>Situação</th></tr></thead><tbody>${pareceres(r.id).map(p => `<tr><td class="num">${esc(p.docNumero || '')}</td><td>${esc((comissao(p.comissaoId) || {}).nome || '')}</td><td>${esc(p.assunto || '')}</td><td>${esc(STATUS[p.status] || '')}${p.emendas ? ' — ' + esc(p.emendas) : ''}</td></tr>`).join('')}</tbody></table>`;
    } else if (tipo === 'pareceres') {
      const ps = pareceres(r.id).filter(p => p.status !== 'rascunho');
      if (!ps.length) return A().toast('Nenhum parecer concluído nesta reunião.', true);
      const html = ps.map(folhaParecer).join('');
      return previa('Pareceres concluídos · ' + (r.codigo || ''), html);
    }
    previa(titulo + ' · ' + (r.codigo || ''), folhaSimples(titulo, corpo, r));
  }
  function previa(titulo, html) {
    const { modal, $ } = A();
    const m = modal(A().esc(titulo), `<div class="folha-wrap">${html}</div>`, '<button class="btn" data-x>Fechar</button><button class="btn" id="pDoc">Baixar Word</button><button class="btn primary" id="pImp">Imprimir / PDF</button>', true);
    $('[data-x]', m.el).onclick = m.fechar;
    $('#pImp', m.el).onclick = () => imprimir(titulo, html);
    $('#pDoc', m.el).onclick = () => baixarWord(html, nomeArquivo(titulo) + '.doc');
  }

  /* ======================= Documentos ======================= */
  const F = { reuniao: '', comissao: '', busca: '' };
  function telaDocumentos() {
    const { esc, shell, head, $, $$ } = A();
    const r = reuniao();
    if (!r && !isAdmin()) return semReuniao('reuniao', 'Documentos');
    const rid = F.reuniao === 'todas' ? '' : (r ? r.id : '');
    const q = F.busca.toLowerCase();
    const lista = documentos(rid).filter(d => (!F.comissao || d.comissaoId === F.comissao) && (!q || [d.numero, d.titulo, d.origem, d.resumo, d.tipoDoc].join(' ').toLowerCase().includes(q)));
    let html = head('Documentos', `${subReuniao(r)}`, seletorReuniao() + (r ? '<a class="btn" href="#/numeracao">Numeração (2º Secretário)</a>' : '') + (podeSecretaria() && r ? '<button class="btn primary" id="bNovoDoc">+ Documento</button>' : '')) + etapas('documentos', r);
    html += `<div class="filters card" style="padding:12px 14px"><div class="row-wrap">
      <div class="field"><label for="fRe">Reunião</label><select id="fRe"><option value="">Selecionada no topo</option><option value="todas" ${F.reuniao === 'todas' ? 'selected' : ''}>Todas as reuniões</option></select></div>
      <div class="field"><label for="fCo">Comissão</label><select id="fCo"><option value="">Todas</option>${comissoes().map(c => `<option value="${esc(c.id)}" ${F.comissao === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="field" style="flex:1"><label for="fBu">Buscar</label><input type="search" id="fBu" value="${esc(F.busca)}" placeholder="número, título, igreja…"></div></div></div>
      <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Documento</th>${rid ? '' : '<th>Reunião</th>'}<th>Origem</th><th>Destino</th><th>PDF</th></tr></thead><tbody>
      ${lista.map(d => `<tr class="${podeSecretaria() ? 'click' : ''}" data-ed="${esc(d.id)}"><td class="num">${esc(d.numero || '')}</td><td>${esc(d.titulo)}${d.resumo ? `<div class="small muted">${esc(d.resumo).slice(0, 180)}</div>` : ''}</td>${rid ? '' : `<td class="small">${esc((reuniao(d.reuniaoId) || {}).codigo || '')}</td>`}
        <td class="small">${esc(d.origem || '')}</td><td class="small">${d.comissaoId ? `<a href="#/comissao/${encodeURIComponent(d.comissaoId)}">${esc((comissao(d.comissaoId) || {}).nome || '')}</a>` : esc(d.destino || '')}</td>
        <td>${d.arquivo ? `<button class="btn sm" data-pdf="${esc(d.id)}">Abrir</button>` : '<span class="small muted">–</span>'}</td></tr>`).join('') || `<tr><td colspan="6" class="list-empty">Nenhum documento${F.busca || F.comissao ? ' com esse filtro' : ''}.</td></tr>`}
      </tbody></table></div><p class="small muted" style="margin:8px 0 0">${lista.length} documento(s).</p></div>`;
    shell('reuniao', html);
    ligarSeletor();
    $('#fRe').onchange = e => { F.reuniao = e.target.value; telaDocumentos(); };
    $('#fCo').onchange = e => { F.comissao = e.target.value; telaDocumentos(); };
    let t; $('#fBu').oninput = e => { clearTimeout(t); t = setTimeout(() => { F.busca = e.target.value; telaDocumentos(); const b = $('#fBu'); b.focus(); b.setSelectionRange(b.value.length, b.value.length); }, 250); };
    $$('[data-pdf]').forEach(b => b.onclick = e => { e.stopPropagation(); abrirPdf(b.getAttribute('data-pdf')); });
    if (podeSecretaria()) {
      if ($('#bNovoDoc')) $('#bNovoDoc').onclick = () => editarDocumento(null);
      $$('tr[data-ed]').forEach(tr => tr.onclick = () => editarDocumento(itens('documento').find(d => d.id === tr.getAttribute('data-ed'))));
    }
  }
  const SECOES_DOC = [['', 'Pasta da reunião'], ['executiva', 'Comissão Executiva'], ['tesouraria', 'Tesouraria'], ['concilios', 'Sínodo e Supremo Concílio'], ['correspondencia', 'Correspondência'], ['institucional', 'Estatuto, regimento e normas (permanente)'], ['outros', 'Outros documentos']];
  const PASTAS_DOC = [['convocacao', 'Convocação e pauta'], ['ata', 'Atas'], ['relatorio', 'Relatórios e documentos'], ['anexo', 'Anexos e outros']];
  const ACEITOS = 'application/pdf,image/png,image/jpeg,image/webp,.doc,.docx,.xls,.xlsx';
  function pastaAuto(d) {
    if (d.pasta) return d.pasta;
    const t = (d.tipoDoc || '') + ' ' + (d.titulo || '');
    if (/convoca|retifica|edital/i.test(t)) return 'convocacao';
    if (/^\s*ata\b|\bata da\b|\bata do\b/i.test(t) || /^ata$/i.test(d.tipoDoc || '')) return 'ata';
    if (d.numero || d.comissaoId) return 'relatorio';
    return 'anexo';
  }
  async function enviarArquivoDoc(id, f) {
    if (f.size > 15e6) { A().toast('O arquivo ' + f.name + ' passa de 15 MB.', true); return false; }
    const r = await A().acao(async () => A().api({ action: 'reuniao', op: 'enviar_arquivo', id, nome: f.name, dados: await A().lerArquivo(f) }));
    delete pdfCache[id];
    return !!r;
  }
  function editarDocumento(d, opts) {
    const { esc, modal, $ } = A();
    opts = opts || {};
    const novo = !d || !d.id;
    if (!d) { const r0 = reuniao(); d = { reuniaoId: r0 ? r0.id : '', titulo: '', comissaoId: '', tipoDoc: '', origem: '', resumo: '' }; }
    d = Object.assign({}, d);
    if (novo && !d.numero && d.reuniaoId && !opts.semNumero && pastaAuto(d) === 'relatorio') d.numero = String(proximoNumeroDoc(d.reuniaoId));
    if (novo && d.numero && !d.dataProtocolo) d.dataProtocolo = hoje();
    const anoAtual = new Date().getFullYear();
    const m = modal(novo ? 'Novo documento' : 'Documento ' + esc(d.numero || ''), `<div class="grid g3">
      <div class="field span2"><label for="dTit">Título</label><input type="text" id="dTit" value="${esc(d.titulo || '')}" placeholder="ex.: Relatório Atas - IP Marinas"></div>
      <div class="field"><label for="dNum">Doc nº</label><input type="text" id="dNum" value="${esc(d.numero || '')}"></div>
      <div class="field"><label for="dReu">Reunião</label><select id="dReu"><option value="">(nenhuma: seção do acervo)</option>${reunioes().map(r => `<option value="${esc(r.id)}" ${d.reuniaoId === r.id ? 'selected' : ''}>${esc(r.codigo || r.nome)}</option>`).join('')}</select></div>
      <div class="field" id="wPas"><label for="dPas">Pasta da reunião</label><select id="dPas">${PASTAS_DOC.map(([k, n]) => `<option value="${k}" ${pastaAuto(d) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field" id="wSec"><label for="dSec">Seção do acervo</label><select id="dSec">${SECOES_DOC.slice(1).map(([k, n]) => `<option value="${k}" ${d.secao === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field" id="wAno"><label for="dAno">Ano</label><input type="number" id="dAno" min="1900" max="2200" value="${esc(d.ano || anoAtual)}"></div>
      <div class="field"><label for="dDat">Data do documento</label><input type="date" id="dDat" value="${esc(d.data || '')}"></div>
      <div class="field"><label for="dTip">Tipo</label><input type="text" id="dTip" list="dlTip" value="${esc(d.tipoDoc || '')}" placeholder="ex.: Convocação, Ata, Relatório"><datalist id="dlTip">${['Convocação', 'Retificação', 'Ata', 'Relatório', 'Proposta', 'Ofício', 'Solicitação', 'Parecer', 'Estatuto', 'Regimento', 'Relatório financeiro', 'Composição'].map(x => `<option value="${x}">`).join('')}</datalist></div>
      <div class="field"><label for="dOri">Origem</label><input type="text" id="dOri" list="dlIg2" value="${esc(d.origem || '')}"><datalist id="dlIg2">${igrejasCfg().map(i => `<option value="${esc(i)}">`).join('')}</datalist></div>
      <div class="field"><label for="dCom">Destino</label><select id="dCom"><option value="">(a definir)</option><optgroup label="Comissões">${comissoes().map(c => `<option value="c:${esc(c.id)}" ${d.comissaoId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup><optgroup label="Outros">${DESTINOS_DOC.map(x => `<option value="${esc(x)}" ${!d.comissaoId && d.destino === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</optgroup></select></div>
      <div class="field"><label for="dPro">Data do protocolo</label><input type="date" id="dPro" value="${esc(d.dataProtocolo || '')}"></div>
      <div class="field span2"><label class="chk" style="margin-top:26px"><input type="checkbox" id="dDes" ${d.despachadoEm ? 'checked' : ''} ${isAdmin() ? '' : 'disabled'}> Despachado pelo Presidente${d.despachadoEm ? ' em ' + esc(dataBr(d.despachadoEm)) : ''}${isAdmin() ? '' : ' <span class="muted small">(só a Mesa marca)</span>'}</label></div>
      <div class="field span3"><label for="dRes">Resumo</label><textarea id="dRes" rows="3">${esc(d.resumo || '')}</textarea></div>
      <div class="field span3"><label class="chk"><input type="checkbox" id="dRst" ${d.restrito ? 'checked' : ''}> Acesso restrito à Mesa (dados pessoais sensíveis, como atestados, conforme a LGPD)</label></div>
      <div class="field span3"><label for="dArq">Arquivo (PDF, imagem, Word ou Excel, até 15 MB)</label>${d.arquivo ? `<p class="small" style="margin:0">Atual: ${esc(d.arquivo.nome)} (${esc(A().tamanho(d.arquivo.tamanho || 0))})</p>` : ''}<input type="file" id="dArq" accept="${ACEITOS}"></div></div>`,
      `${!novo && isAdmin() ? '<button class="btn danger" id="dDel" style="margin-right:auto">Excluir</button>' : ''}${!novo && d.numero && d.reuniaoId ? '<button class="btn" id="dCar">Imprimir carimbo</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="dOk">Salvar</button>`, true);
    if ($('#dCar', m.el)) $('#dCar', m.el).onclick = () => imprimirCarimbos([d], reuniao(d.reuniaoId));
    const vis = () => { const temReu = !!$('#dReu', m.el).value; $('#wPas', m.el).hidden = !temReu; $('#wSec', m.el).hidden = temReu; $('#wAno', m.el).hidden = temReu || $('#dSec', m.el).value === 'institucional'; };
    $('#dReu', m.el).onchange = vis; $('#dSec', m.el).onchange = vis; vis();
    $('[data-x]', m.el).onclick = m.fechar;
    $('#dOk', m.el).onclick = async () => {
      const v = id => $('#' + id, m.el).value.trim();
      const rid = v('dReu');
      const dest = v('dCom');
      const desp = $('#dDes', m.el).checked;
      const item = { id: d.id, reuniaoId: rid, numero: v('dNum'), titulo: v('dTit'), comissaoId: dest.startsWith('c:') ? dest.slice(2) : '', destino: dest.startsWith('c:') ? '' : dest, origem: v('dOri'), tipoDoc: v('dTip'), resumo: v('dRes'), arquivoNome: d.arquivoNome || '',
        dataProtocolo: v('dPro'), despachadoEm: desp ? (d.despachadoEm || hoje()) : '',
        data: v('dDat'), restrito: $('#dRst', m.el).checked, pasta: rid ? v('dPas') : '', secao: rid ? '' : v('dSec'), ano: rid ? (reuniao(rid) || {}).ano || '' : (v('dSec') === 'institucional' ? '' : Number(v('dAno')) || '') };
      const res = await salvarItem('documento', item, 'Documento salvo.');
      if (!res) return;
      const f = $('#dArq', m.el).files[0];
      if (f && await enviarArquivoDoc(res.item.id, f)) { A().toast('Arquivo anexado.'); await A().recarregar(); }
      m.fechar(); A().render();
    };
    if ($('#dDel', m.el)) $('#dDel', m.el).onclick = async () => {
      if (!await A().confirmar('Excluir este documento e o arquivo dele? Essa ação não pode ser desfeita.', 'Excluir')) return;
      if (await A().acao(() => A().api({ action: 'reuniao', op: 'excluir', id: d.id }), 'Documento excluído.')) { await A().recarregar(); m.fechar(); A().render(); }
    };
  }

  /* ======================= Mesa e secretarias ======================= */
  // A reunião ordinária elege a Mesa e designa os secretários de causa, os representantes ao SC, os tutores e os campos.
  const LISTAS_MESA = [
    ['secretarias', 'Secretarias de causa', 'Secretaria', 'Secretário(a)'],
    ['representantes', 'Representantes ao Supremo Concílio', 'Condição', 'Representante'],
    ['tutores', 'Tutores eclesiásticos', 'Seminarista ou candidato', 'Tutor'],
    ['campo', 'Distribuição de campo', 'Igreja ou congregação', 'Pastor']
  ];
  function telaMesa() {
    const { esc, shell, head, $ } = A();
    const ords = reunioes().filter(r => r.tipoReuniao !== 'E');
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Mesa');
    const pessoa = (c, n) => `<div class="mesa-pessoa ${n ? '' : 'vaga'}"><div class="c">${esc(c)}</div><b>${esc(n || 'vago')}</b></div>`;
    const mesa = CARGOS_MESA.map(c => { const m = (r.mesa || []).find(x => x.cargo === c) || {}; return pessoa(c, [m.tratamento, m.nome].filter(Boolean).join(' ')); }).join('');
    void ords;
    let html = head('Mesa e secretarias', `Diretoria eleita e designações na ${esc(r.codigo || r.nome || '')}${r.legislatura ? ' · ' + esc(r.legislatura) : ''}. Valem até a próxima reunião ordinária.`,
      seletorReuniao() + (isAdmin() ? '<button class="btn" id="mMesa">Editar a Mesa</button><button class="btn primary" id="mEd">Editar secretarias e designações</button>' : '')) + etapas('mesa', r);
    html += `<div class="card"><div class="section-title" style="margin-top:0">Mesa Executiva eleita</div><div class="mesa-grid">${mesa}</div></div>`;
    LISTAS_MESA.forEach(([k, t]) => {
      const ls = r[k] || [];
      html += `<div class="card"><div class="section-title" style="margin-top:0">${esc(t)}</div>${ls.length ? `<div class="mesa-grid">${ls.map(x => pessoa(x.cargo, x.nome)).join('')}</div>` : '<p class="muted small" style="margin:0">Não informado.</p>'}</div>`;
    });
    shell('reuniao', html);
    ligarSeletor();
    if (!isAdmin()) return;
    $('#mMesa').onclick = () => editarReuniao(r);
    $('#mEd').onclick = () => {
      const m = A().modal('Secretarias e designações · ' + (r.codigo || ''), `<p class="small muted" style="margin-top:0">Uma pessoa por linha, no formato <b>função: nome</b>. Deixe o nome em branco para marcar a função como vaga.</p>
        <div class="field"><label for="mLeg">Legislatura</label><input type="text" id="mLeg" value="${esc(r.legislatura || '')}" placeholder="ex.: XVII Legislatura"></div>
        ${LISTAS_MESA.map(([k, t, a, b]) => `<div class="field"><label for="mL_${k}">${esc(t)} <span class="help">${esc(a)}: ${esc(b)}</span></label><textarea id="mL_${k}" rows="${Math.max(3, (r[k] || []).length + 1)}">${esc((r[k] || []).map(x => x.cargo + ': ' + (x.nome || '')).join('\n'))}</textarea></div>`).join('')}`,
        '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="mOk">Salvar</button>', true);
      $('[data-x]', m.el).onclick = m.fechar;
      $('#mOk', m.el).onclick = async () => {
        const item = { id: r.id, legislatura: $('#mLeg', m.el).value.trim() };
        LISTAS_MESA.forEach(([k]) => {
          item[k] = $('#mL_' + k, m.el).value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.indexOf(':'); return i < 0 ? { cargo: l, nome: '' } : { cargo: l.slice(0, i).trim(), nome: l.slice(i + 1).trim() }; });
        });
        if (await salvarItem('reuniao', item, 'Designações salvas.')) { m.fechar(); A().render(); }
      };
    };
  }

  /* ======================= Membros das comissões ======================= */
  function telaDelegados() {
    const { esc, shell, head, $, $$ } = A();
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Membros das comissões');
    const foco = (location.hash.split('?c=')[1] || '').split('&')[0];
    const cs = comissoes();
    let html = head('Relatores e membros das comissões', subReuniao(r), '<a class="btn" href="#/comissoes">← Comissões</a>' + seletorReuniao() + (isAdmin() ? '<button class="btn" id="bCopiar">Copiar da reunião anterior</button><button class="btn primary" id="bNovoDel">+ Membro</button>' : '')) + etapas('comissoes', r);
    if (isAdmin()) html += '<p class="muted small" style="margin-top:-6px">Cada comissão tem um Relator, que escreve e conclui o parecer, e quantos Participantes precisar. Vincule o membro a um usuário do sistema para ele entrar no ambiente da comissão e editar o parecer.</p>';
    html += cs.map(c => {
      const ds = delegadosDe(c.id, r.id);
      return `<div class="card ${foco === c.id ? 'foco' : ''}" id="dc-${esc(c.id)}"><div class="row-wrap" style="justify-content:space-between"><div class="section-title" style="margin:0"><a href="#/comissao/${encodeURIComponent(c.id)}">${esc(c.nome)}</a> <span class="small muted">${esc(c.grupo || '')}</span></div>
        ${isAdmin() ? `<button class="btn sm" data-add="${esc(c.id)}">+ Membro</button>` : ''}</div>
        ${ds.length ? `<div class="tbl-wrap"><table><thead><tr><th>Membro</th><th>Igreja</th><th>Função</th><th>Acesso</th></tr></thead><tbody>${ds.map(d => `<tr class="${isAdmin() ? 'click' : ''}" data-del="${esc(d.id)}"><td>${esc(nomeDel(d))}</td><td class="small">${esc(d.igreja || '')}</td><td><span class="tag ${d.funcao === 'Relator' ? '' : 'gray'}">${esc(d.funcao)}</span></td><td class="small">${d.userId ? 'Usuário vinculado' : '<span class="muted">sem usuário</span>'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small" style="margin:6px 0 0">Nenhum membro.</p>'}
      </div>`;
    }).join('') || `<div class="card">${semComissoes()}</div>`;
    shell('reuniao', html);
    ligarSeletor();
    if (foco && $('#dc-' + CSS.escape(foco))) $('#dc-' + CSS.escape(foco)).scrollIntoView({ block: 'start' });
    if (!isAdmin()) return;
    $('#bNovoDel').onclick = () => editarDelegado(null, '');
    $('#bCopiar').onclick = copiarAnterior;
    $$('[data-add]').forEach(b => b.onclick = () => editarDelegado(null, b.getAttribute('data-add')));
    $$('tr[data-del]').forEach(tr => tr.onclick = () => editarDelegado(itens('delegado').find(d => d.id === tr.getAttribute('data-del'))));
    const b2 = $('#bPadrao2'); if (b2) b2.onclick = criarPadrao;
  }
  function editarDelegado(d, comId) {
    const { esc, modal, $ } = A();
    const r = reuniao();
    const novo = !d;
    d = d ? Object.assign({}, d) : { reuniaoId: r.id, comissaoId: comId, tratamento: 'Rev.', nome: '', igreja: '', funcao: delegadosDe(comId, r.id).some(x => x.funcao === 'Relator') || !comId ? 'Participante' : 'Relator', userId: '' };
    const users = (S().d.usuarios || []).filter(u => u.ativo !== false && u.role !== 'leitor');
    const m = modal(novo ? 'Novo membro' : 'Editar membro', `<div class="grid g3">
      <div class="field span3"><label for="gCom">Comissão</label><select id="gCom">${comissoes().map(c => `<option value="${esc(c.id)}" ${d.comissaoId === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
      <div class="field"><label for="gTra">Tratamento</label><select id="gTra">${['Rev.', 'Presb.', 'Diác.', 'Sr.', 'Sra.', ''].map(t => `<option value="${t}" ${d.tratamento === t ? 'selected' : ''}>${t || '(nenhum)'}</option>`).join('')}</select></div>
      <div class="field span2"><label for="gNom">Nome</label><input type="text" id="gNom" value="${esc(d.nome || '')}"></div>
      <div class="field span2"><label for="gIgr">Igreja</label><input type="text" id="gIgr" list="dlIg3" value="${esc(d.igreja || '')}"><datalist id="dlIg3">${igrejasCfg().map(i => `<option value="${esc(i)}">`).join('')}</datalist></div>
      <div class="field"><label for="gFun">Função</label><select id="gFun"><option ${d.funcao === 'Relator' ? 'selected' : ''}>Relator</option><option ${d.funcao !== 'Relator' ? 'selected' : ''}>Participante</option></select></div>
      <div class="field span3"><label for="gUsr">Usuário do sistema <span class="help">para entrar no ambiente da comissão e editar o parecer</span></label><select id="gUsr"><option value="">(sem usuário)</option>${users.map(u => `<option value="${esc(u.id)}" ${d.userId === u.id ? 'selected' : ''}>${esc(u.nome)}${u.cargo ? ' · ' + esc(u.cargo) : ''}</option>`).join('')}</select></div></div>
      <p class="small muted" style="margin:0">Se você marcar um novo Relator, o relator anterior desta comissão passa a Participante. No exame de livros de atas há um relator por igreja: informe a igreja.</p>`,
      `${!novo ? '<button class="btn danger" id="gDel" style="margin-right:auto">Remover</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="gOk">Salvar</button>`, true);
    $('[data-x]', m.el).onclick = m.fechar;
    $('#gUsr', m.el).onchange = e => { const u = users.find(x => x.id === e.target.value); if (u && !$('#gNom', m.el).value.trim()) $('#gNom', m.el).value = u.nome; };
    $('#gOk', m.el).onclick = async () => {
      const v = id => $('#' + id, m.el).value.trim();
      const item = { id: d.id, reuniaoId: d.reuniaoId, comissaoId: v('gCom'), tratamento: v('gTra'), nome: v('gNom'), igreja: v('gIgr'), funcao: v('gFun'), userId: v('gUsr') || null };
      if (await salvarItem('delegado', item, 'Membro salvo.')) { m.fechar(); A().render(); }
    };
    if ($('#gDel', m.el)) $('#gDel', m.el).onclick = async () => {
      if (await A().acao(() => A().api({ action: 'reuniao', op: 'excluir', id: d.id }), 'Membro removido.')) { await A().recarregar(); m.fechar(); A().render(); }
    };
  }
  async function copiarAnterior() {
    const r = reuniao();
    const ant = reunioes().filter(x => x.id !== r.id && (x.ano < r.ano || (x.ano === r.ano && String(x.dataInicio || '') < String(r.dataInicio || ''))))[0];
    if (!ant) return A().toast('Não há reunião anterior com membros.', true);
    const ds = itens('delegado').filter(d => d.reuniaoId === ant.id);
    if (!ds.length) return A().toast('A reunião ' + (ant.codigo || '') + ' não tem membros.', true);
    const ja = new Set(itens('delegado').filter(d => d.reuniaoId === r.id).map(d => d.comissaoId + '|' + d.nome));
    const novos = ds.filter(d => !ja.has(d.comissaoId + '|' + d.nome));
    if (!await A().confirmar(`Copiar ${novos.length} membro(s) da reunião ${A().esc(ant.codigo || '')}?`, 'Copiar')) return;
    for (const d of novos) { try { await A().api({ action: 'reuniao', op: 'salvar', tipo: 'delegado', item: { reuniaoId: r.id, comissaoId: d.comissaoId, tratamento: d.tratamento, nome: d.nome, igreja: d.igreja, funcao: d.funcao, userId: d.userId } }); } catch (e) { /* segue */ } }
    await A().recarregar(); A().toast('Membros copiados.'); A().render();
  }

  /* ======================= Histórico do presbitério ======================= */
  function valorAno(ano, k) {
    const doAno = itens('estatistica').filter(e => Number(e.ano) === ano);
    const t = doAno.find(e => e.igreja === TOTAL);
    if (t && t.valores && temValor(t.valores[k])) return numero(t.valores[k]);
    const vals = doAno.filter(e => e.igreja !== TOTAL && e.valores && temValor(e.valores[k]));
    if (!vals.length) return null;
    if (k === 'crescimentoPct') return null;
    return vals.reduce((a, e) => a + numero(e.valores[k]), 0);
  }
  function telaHistorico() {
    const { esc, shell, head, barras, hbarras, num, money, moneyK, $ } = A();
    const anosE = [...new Set(itens('estatistica').map(e => Number(e.ano)))].sort();
    const fins = itens('financa').sort((a, b) => a.ano - b.ano);
    const anosF = fins.map(f => Number(f.ano));
    const fmtN = (v, curto) => v == null ? '–' : (curto ? num(v) : num(v));
    let html = head('Histórico do ' + ORG().tipoMin, 'Números informados pelas comissões de Estatísticas e de Finanças em cada reunião. Os indicadores de cada igreja continuam em Indicadores.',
      isAdmin() ? '<button class="btn" id="bEst">Editar estatísticas</button><button class="btn" id="bFin">Editar finanças</button>' : '');
    if (!anosE.length && !fins.length) {
      html += '<div class="card"><p class="muted" style="margin:0">Ainda não há números. A Mesa pode digitá-los aqui ou importar o pacote das reuniões anteriores.</p></div>';
    } else {
      if (anosE.length) {
        const ult = anosE[anosE.length - 1], pen = anosE.length > 1 ? anosE[anosE.length - 2] : null;
        const kp = (k, l) => { const v = valorAno(ult, k), a = pen != null ? valorAno(pen, k) : null; const d = v != null && a != null ? v - a : null; return `<div class="kpi"><div class="l">${l} (${ult})</div><div class="v">${fmtN(v)}</div>${d != null ? `<div class="d" style="color:${d >= 0 ? 'var(--ok)' : 'var(--danger)'}">${d >= 0 ? '+' : ''}${num(d)} desde ${pen}</div>` : ''}</div>`; };
        html += `<div class="kpis">${kp('membros', 'Membros')}${kp('comungantes', 'Comungantes')}${kp('ministros', 'Ministros')}${kp('ebdAlunos', 'Alunos na EBD')}</div>`;
        const serie = (keys) => keys.map(([k, l], i) => ({ nome: l, cor: CORES[i % CORES.length], vals: anosE.map(a => valorAno(a, k) || 0) }));
        html += `<div class="grid g2">
          <div class="card"><div class="section-title" style="margin-top:0">Rol de membros</div>${barras(anosE.map(String), serie([['comungantes', 'Comungantes'], ['naoComungantes', 'Não comungantes']]), fmtN, { label: 'Membros por ano' })}</div>
          <div class="card"><div class="section-title" style="margin-top:0">Oficiais</div>${barras(anosE.map(String), serie([['ministros', 'Ministros'], ['presbiteros', 'Presbíteros'], ['diaconos', 'Diáconos']]), fmtN, { label: 'Oficiais por ano' })}</div>
          <div class="card"><div class="section-title" style="margin-top:0">Escola dominical e sociedades</div>${barras(anosE.map(String), serie([['ebdAlunos', 'Alunos EBD'], ['saf', 'SAF'], ['uph', 'UPH'], ['ump', 'UMP'], ['upa', 'UPA']]), fmtN, { label: 'EBD e sociedades por ano' })}</div>
          ${(() => {
            const cr = itens('estatistica').filter(e => Number(e.ano) === ult && e.igreja !== TOTAL && e.valores && temValor(e.valores.crescimentoPct)).map(e => ({ nome: e.igreja, v: numero(e.valores.crescimentoPct) })).sort((a, b) => b.v - a.v);
            return cr.length ? `<div class="card"><div class="section-title" style="margin-top:0">Crescimento por igreja em ${ult} (%)</div>${hbarras(cr.map(x => Object.assign(x, { cor: x.v >= 0 ? 'var(--brand)' : 'var(--danger)' })), v => (v > 0 ? '+' : '') + String(v).replace('.', ',') + '%', 'var(--brand)')}</div>` : '';
          })()}
        </div>`;
        html += `<div class="card"><div class="section-title" style="margin-top:0">Tabela histórica</div><div class="tbl-wrap"><table><thead><tr><th>Indicador</th>${anosE.map(a => `<th class="num">${a}</th>`).join('')}</tr></thead><tbody>
          ${CAMPOS_EST.filter(([k]) => anosE.some(a => valorAno(a, k) != null)).map(([k, l]) => `<tr><td>${esc(l)}</td>${anosE.map(a => `<td class="num">${fmtN(valorAno(a, k))}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div><p class="small muted" style="margin:8px 0 0">Fontes: ${[...new Set(itens('estatistica').map(e => e.fonte).filter(Boolean))].map(esc).join('; ') || 'digitado pela Mesa'}.</p></div>`;
      }
      if (fins.length) {
        const sf = [['resultado', 'Resultado do ano'], ['saldoAcumulado', 'Saldo acumulado'], ['verbaPrevista', 'Verba prevista']].filter(([k]) => fins.some(f => f.valores && temValor(f.valores[k])));
        html += `<div class="card"><div class="section-title" style="margin-top:0">Tesouraria do ${esc(ORG().tipoMin)}</div><div style="max-width:640px">${barras(anosF.map(String), sf.map(([k, l], i) => ({ nome: l, cor: CORES[i], vals: fins.map(f => numero((f.valores || {})[k])) })), (v, c) => c ? moneyK(v) : money(v), { label: 'Tesouraria por ano' })}</div>
          <div class="tbl-wrap"><table><thead><tr><th>Item</th>${anosF.map(a => `<th class="num">${a}</th>`).join('')}</tr></thead><tbody>${CAMPOS_FIN.filter(([k]) => fins.some(f => f.valores && temValor(f.valores[k]))).map(([k, l]) => `<tr><td>${esc(l)}</td>${fins.map(f => `<td class="num">${f.valores && temValor(f.valores[k]) ? money(numero(f.valores[k])) : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
          <p class="small muted" style="margin:8px 0 0">Fontes: ${[...new Set(fins.map(f => f.fonte).filter(Boolean))].map(esc).join('; ') || 'digitado pela Mesa'}.</p></div>`;
      }
    }
    shell('historico', html);
    A().ligarTips($('#main'));
    if (isAdmin()) { $('#bEst').onclick = editarEstatisticas; $('#bFin').onclick = editarFinancas; }
  }
  function editarEstatisticas() {
    const { esc, modal, $, $$ } = A();
    const anos = [...new Set(itens('estatistica').map(e => Number(e.ano)))].sort();
    const ano0 = anos.length ? anos[anos.length - 1] : new Date().getFullYear() - 1;
    const linhasDe = ano => [TOTAL].concat(igrejasCfg()).map(ig => ({ ig, e: itens('estatistica').find(x => Number(x.ano) === ano && x.igreja === ig) }));
    const m = modal('Estatísticas do ' + ORG().tipoMin, `<div class="row-wrap" style="align-items:end"><div class="field"><label for="eAno">Ano</label><input type="number" id="eAno" value="${ano0}"></div><div class="field" style="flex:1"><label for="eFon">Fonte</label><input type="text" id="eFon" placeholder="ex.: Relatório da Comissão de Estatísticas, Doc. 87/2026"></div></div>
      <p class="small muted">A primeira linha é o total do ${esc(ORG().tipoMin)} informado pela comissão; se ficar em branco, o gráfico soma as igrejas.</p><div id="eTab"></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="eOk">Salvar</button>', true);
    const desenhar = () => {
      const ano = Number($('#eAno', m.el).value);
      const ls = linhasDe(ano);
      const f0 = ls.map(l => l.e && l.e.fonte).find(Boolean); if (f0 && !$('#eFon', m.el).value) $('#eFon', m.el).value = f0;
      $('#eTab', m.el).innerHTML = `<div class="tbl-wrap est-tab"><table><thead><tr><th>Igreja</th>${CAMPOS_EST.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>${ls.map(({ ig, e }) => `<tr data-ig="${esc(ig)}"><td><b>${esc(ig === TOTAL ? 'Total do presbitério' : ig)}</b></td>${CAMPOS_EST.map(([k]) => `<td><input type="text" inputmode="decimal" data-k="${k}" value="${esc(e && e.valores && temValor(e.valores[k]) ? e.valores[k] : '')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    };
    desenhar();
    $('#eAno', m.el).onchange = desenhar;
    $('[data-x]', m.el).onclick = m.fechar;
    $('#eOk', m.el).onclick = async () => {
      const ano = Number($('#eAno', m.el).value), fonte = $('#eFon', m.el).value.trim();
      for (const tr of $$('tr[data-ig]', m.el)) {
        const ig = tr.getAttribute('data-ig');
        const valores = {};
        $$('input[data-k]', tr).forEach(i => { if (i.value.trim() !== '') valores[i.getAttribute('data-k')] = numero(i.value); });
        const ex = itens('estatistica').find(x => Number(x.ano) === ano && x.igreja === ig);
        if (!Object.keys(valores).length && !ex) continue;
        if (!Object.keys(valores).length && ex) { await A().api({ action: 'reuniao', op: 'excluir', id: ex.id }).catch(() => {}); continue; }
        await A().api({ action: 'reuniao', op: 'salvar', tipo: 'estatistica', item: { id: ex && ex.id, ano, igreja: ig, valores, fonte } }).catch(e => A().toast(e.message, true));
      }
      await A().recarregar(); A().toast('Estatísticas salvas.'); m.fechar(); A().render();
    };
  }
  function editarFinancas() {
    const { esc, modal, $, $$ } = A();
    const fins = itens('financa').sort((a, b) => a.ano - b.ano);
    const ult = fins[fins.length - 1];
    const m = modal('Finanças do ' + ORG().tipoMin, `<div class="row-wrap" style="align-items:end"><div class="field"><label for="fAno">Ano</label><input type="number" id="fAno" value="${ult ? ult.ano : new Date().getFullYear() - 1}"></div><div class="field" style="flex:1"><label for="fFon">Fonte</label><input type="text" id="fFon"></div></div><div class="grid g2" id="fCampos"></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="fOk">Salvar</button>', true);
    const desenhar = () => {
      const ano = Number($('#fAno', m.el).value);
      const f = itens('financa').find(x => Number(x.ano) === ano) || { valores: {} };
      $('#fFon', m.el).value = f.fonte || '';
      $('#fCampos', m.el).innerHTML = CAMPOS_FIN.map(([k, l]) => `<div class="field"><label>${esc(l)}</label><input type="text" inputmode="decimal" data-k="${k}" value="${esc(temValor((f.valores || {})[k]) ? String(f.valores[k]).replace('.', ',') : '')}"></div>`).join('');
    };
    desenhar();
    $('#fAno', m.el).onchange = desenhar;
    $('[data-x]', m.el).onclick = m.fechar;
    $('#fOk', m.el).onclick = async () => {
      const ano = Number($('#fAno', m.el).value);
      const valores = {};
      $$('input[data-k]', m.el).forEach(i => { if (i.value.trim() !== '') valores[i.getAttribute('data-k')] = numero(i.value); });
      const ex = itens('financa').find(x => Number(x.ano) === ano);
      if (await salvarItem('financa', { id: ex && ex.id, ano, valores, fonte: $('#fFon', m.el).value.trim() }, 'Finanças salvas.')) { m.fechar(); A().render(); }
    };
  }

  /* ======================= Reuniões do ano e convocações ======================= */
  const tipoNome = r => r.tipoReuniao === 'E' ? 'Extraordinária' : 'Ordinária';
  const nomeMesa = x => [x.tratamento, x.nome].filter(Boolean).join(' ');
  function convocacoesDe(rid) { return itens('documento').filter(d => d.reuniaoId === rid && /convoca/i.test((d.tipoDoc || '') + ' ' + (d.titulo || ''))); }
  function telaReunioes() {
    const { esc, shell, head, $$ } = A();
    const rs = reunioes();
    const anos = [...new Set(rs.map(r => r.ano))].sort((a, b) => b - a);
    let html = head('Reuniões e convocações', 'Todas as reuniões do ' + ORG().tipoMin + ', ordinárias e extraordinárias, com a convocação, a mesa e a ata de cada uma.', isAdmin() ? '<button class="btn primary" id="bNovaR">+ Nova reunião</button>' : '');
    if (!rs.length) html += '<div class="card"><p class="muted" style="margin:0">Nenhuma reunião cadastrada.</p></div>';
    anos.forEach(ano => {
      const doAno = rs.filter(r => r.ano === ano).sort((a, b) => String(a.dataInicio || '').localeCompare(String(b.dataInicio || '')));
      html += `<div class="section-title">${ano} <span class="small muted">${doAno.filter(r => r.tipoReuniao !== 'E').length} ordinária(s) · ${doAno.filter(r => r.tipoReuniao === 'E').length} extraordinária(s)</span></div><div class="reu-lista">`;
      html += doAno.map(r => {
        const conv = convocacoesDe(r.id);
        const ata = itens('ata').find(a => a.reuniaoId === r.id);
        const pres = (r.mesa || []).find(x => /^presidente$/i.test(x.cargo));
        return `<div class="card reu-card ${r.tipoReuniao === 'E' ? 'extra' : ''}">
          <div class="row-wrap" style="justify-content:space-between"><div><span class="tag ${r.tipoReuniao === 'E' ? 'gray' : ''}">${tipoNome(r)}</span> <b>${esc(r.codigo || '')}</b> <span class="small muted">${esc(periodo(r))}${r.local ? ' · ' + esc(r.local) : ''}</span></div>
            <div class="row-wrap"><button class="btn sm" data-usar="${esc(r.id)}">Abrir</button><a class="btn sm" href="#/acervo/${encodeURIComponent(r.ano)}/reuniao/${encodeURIComponent(r.id)}">Pasta</a><a class="btn sm" href="#/ata-geral/${encodeURIComponent(r.id)}">${ata ? 'Ata' : 'Ata (a lavrar)'}</a>${isAdmin() ? `<button class="btn sm ghost" data-edr="${esc(r.id)}">Editar</button>` : ''}</div></div>
          ${r.materia ? `<p style="margin:8px 0 0"><b>Assunto:</b> ${esc(r.materia)}</p>` : ''}
          ${r.dataConvocacao || r.convocadaPor ? `<p class="small" style="margin:6px 0 0">Convocada${r.dataConvocacao ? ' em ' + esc(dataBr(r.dataConvocacao)) : ''}${r.convocadaPor ? ' por ' + esc(r.convocadaPor) : ''}.</p>` : ''}
          ${linhas(r.pauta).length ? `<div class="small" style="margin-top:6px"><b>Pauta:</b><ol style="margin:4px 0 0;padding-left:20px">${linhas(r.pauta).map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
          <div class="small muted" style="margin-top:6px">${pres && pres.nome ? 'Presidente: ' + esc(nomeMesa(pres)) + ' · ' : ''}${documentos(r.id).length} documento(s) · ${pareceres(r.id).length} parecer(es)</div>
          <div class="row-wrap" style="margin-top:8px">${conv.map(d => `<button class="btn sm" data-pdf="${esc(d.id)}" ${d.arquivo ? '' : 'disabled'}>Convocação${d.numero ? ' (Doc ' + esc(d.numero) + ')' : ''}</button>`).join('') || '<span class="small muted">Sem convocação anexada.</span>'}
            ${isAdmin() ? `<button class="btn sm ghost" data-conv="${esc(r.id)}">+ Anexar convocação</button>` : ''}</div>
        </div>`;
      }).join('') + '</div>';
    });
    shell('reunioes', html);
    if (A().$('#bNovaR')) A().$('#bNovaR').onclick = () => editarReuniao(null);
    $$('[data-usar]').forEach(b => b.onclick = () => { lsSet(REU_KEY, b.getAttribute('data-usar')); A().ir('reuniao'); });
    $$('[data-edr]').forEach(b => b.onclick = () => editarReuniao(reuniao(b.getAttribute('data-edr'))));
    $$('[data-pdf]').forEach(b => b.onclick = () => abrirPdf(b.getAttribute('data-pdf')));
    $$('[data-conv]').forEach(b => b.onclick = () => {
      const r = reuniao(b.getAttribute('data-conv'));
      editarDocumento({ reuniaoId: r.id, numero: '', titulo: 'Convocação da ' + (r.codigo || 'reunião'), comissaoId: '', tipoDoc: 'Convocação', pasta: 'convocacao', origem: 'Secretaria Executiva do ' + sigla(), data: r.dataConvocacao || '', resumo: r.materia || '' }, { semNumero: true });
    });
  }

  /* ======================= Pareceres (etapa 4) ======================= */
  const FP = { st: '' };
  // números citados num texto ("031, 032 e 40") e documentos cobertos por um parecer
  const numsDe = t => (String(t || '').match(/\d+/g) || []).map(Number);
  function docsDoParecer(p, docs) {
    const ids = new Set(p.documentoIds || []);
    const ns = new Set([...numsDe(p.docNumero), ...numsDe(p.docsAnalisados)]);
    return docs.filter(d => ids.has(d.id) || (d.numero && ns.has(numero(d.numero)) && d.comissaoId === p.comissaoId));
  }
  function telaPareceres() {
    const { esc, $, $$ } = A();
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Pareceres');
    const docs = documentos(r.id), pars = pareceres(r.id);
    const cobertos = new Set(); pars.forEach(p => docsDoParecer(p, docs).forEach(d => cobertos.add(d.id)));
    const aguardando = docs.filter(d => d.comissaoId && !cobertos.has(d.id) && pastaAuto(d) === 'relatorio');
    const minhas = new Set(minhasComissoes(r.id));
    const lista = pars.filter(p => !FP.st || (FP.st === 'decididos' ? PLENARIO.includes(p.status) : p.status === FP.st));
    const nomeCom = id => (comissao(id) || {}).nome || '';
    let corpo = `<div class="card"><div class="section-title" style="margin-top:0">Documentos aguardando parecer <span class="muted small">(${aguardando.length})</span></div>
      ${aguardando.length ? `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Documento</th><th>Comissão</th><th></th></tr></thead><tbody>${aguardando.map(d => `<tr class="${minhas.has(d.comissaoId) ? 'minha' : ''}"><td class="num">${esc(d.numero || '')}</td><td>${esc(d.titulo)}${d.origem ? ` <span class="small muted">· ${esc(d.origem)}</span>` : ''}</td><td class="small"><a href="#/comissao/${encodeURIComponent(d.comissaoId)}">${esc(nomeCom(d.comissaoId))}</a></td>
        <td>${podeParecer(d.comissaoId, r.id) ? `<button class="btn sm primary" data-escr="${esc(d.id)}">Escrever parecer</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Todos os documentos encaminhados às comissões já têm parecer.</p>'}</div>`;
    const filtro = [['', 'Todos'], ['rascunho', 'Rascunhos'], ['concluido', 'Prontos para o plenário'], ['decididos', 'Decididos']];
    corpo += `<div class="card"><div class="row-wrap" style="justify-content:space-between"><div class="section-title" style="margin:0">Pareceres da reunião <span class="muted small">(${lista.length})</span></div>
      <div class="row-wrap">${filtro.map(([k, l]) => `<button class="btn sm ${FP.st === k ? 'primary' : ''}" data-fst="${k}">${l}</button>`).join('')}</div></div>
      ${lista.length ? `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Doc nº</th><th>Assunto</th><th>Comissão</th><th>Atualizado</th><th>Situação</th></tr></thead><tbody>
      ${lista.map(p => `<tr class="click" data-vp="${esc(p.id)}"><td class="num">${esc(p.docNumero || '–')}</td><td>${esc(p.assunto || '')}</td><td class="small">${esc(nomeCom(p.comissaoId))}</td><td class="small">${esc(A().dt(p.updatedAt))}</td><td>${chip(p.status)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" style="margin:10px 0 0">Nenhum parecer com esse filtro.</p>'}</div>`;
    telaRO('pareceres', 'Pareceres', subReuniao(r), seletorReuniao(), corpo, r);
    ligarSeletor();
    $$('[data-fst]').forEach(b => b.onclick = () => { FP.st = b.getAttribute('data-fst'); telaPareceres(); });
    $$('[data-vp]').forEach(tr => tr.onclick = () => A().ir('parecer/' + tr.getAttribute('data-vp')));
    $$('[data-escr]').forEach(b => b.onclick = () => { const d = docs.find(x => x.id === b.getAttribute('data-escr')); abrirEditor(null, d.comissaoId, d.id); });
    void $;
  }

  /* ======================= Plenário (etapa 5) ======================= */
  function telaPlenario() {
    const { esc, $$ } = A();
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Plenário');
    const pars = pareceres(r.id);
    const pauta = pars.filter(p => p.status === 'concluido');
    const decididos = pars.filter(p => PLENARIO.includes(p.status));
    const nomeCom = id => (comissao(id) || {}).nome || '';
    const linha = (p, dec) => `<tr><td class="num">${esc(p.docNumero || '–')}</td><td><a href="#/parecer/${encodeURIComponent(p.id)}">${esc(p.assunto || '')}</a><div class="small muted">${esc(nomeCom(p.comissaoId))}${p.emendas ? ' · ' + esc(p.emendas) : ''}</div></td>
      <td>${chip(p.status)}</td>${dec && isAdmin() ? `<td class="row-wrap" style="gap:6px"><button class="btn sm primary" data-dec="aprovado" data-p="${esc(p.id)}">Aprovar</button><button class="btn sm" data-dec="emendas" data-p="${esc(p.id)}">Com emendas</button><button class="btn sm ghost" data-dec="rejeitado" data-p="${esc(p.id)}">Rejeitar</button></td>` : (dec ? '<td></td>' : '')}</tr>`;
    let corpo = `<div class="card"><div class="section-title" style="margin-top:0">Pauta do plenário <span class="muted small">(${pauta.length} parecer(es) prontos)</span></div>
      ${isAdmin() ? '' : '<p class="small muted" style="margin-top:0">A Mesa registra a decisão do plenário.</p>'}
      ${pauta.length ? `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Parecer</th><th>Situação</th><th></th></tr></thead><tbody>${pauta.map(p => linha(p, true)).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Nenhum parecer aguardando o plenário. Os pareceres aparecem aqui quando o relator conclui.</p>'}</div>`;
    corpo += `<div class="card"><div class="section-title" style="margin-top:0">Decididos <span class="muted small">(${decididos.length})</span></div>
      ${decididos.length ? `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Parecer</th><th>Decisão</th></tr></thead><tbody>${decididos.map(p => linha(p, false)).join('')}</tbody></table></div>` : '<p class="muted" style="margin:0">Nenhuma decisão registrada ainda.</p>'}
      <p class="small muted" style="margin:10px 0 0">As decisões entram na ata da reunião (etapa 6).</p></div>`;
    telaRO('plenario', 'Plenário', subReuniao(r), seletorReuniao() + '<button class="btn" data-rel="consolidado">Imprimir situação dos pareceres</button>', corpo, r);
    ligarSeletor();
    A().$$('[data-rel]').forEach(b => b.onclick = () => relatorioReuniao(b.getAttribute('data-rel')));
    $$('[data-dec]').forEach(b => b.onclick = async () => {
      const st = b.getAttribute('data-dec');
      let emendas = '';
      if (st !== 'aprovado') {
        const m = A().modal(st === 'emendas' ? 'Aprovar com emendas' : 'Rejeitar o parecer', `<div class="field"><label for="plEm">${st === 'emendas' ? 'Emendas aprovadas pelo plenário' : 'Motivo ou encaminhamento'}</label><textarea id="plEm" rows="3"></textarea></div>`,
          '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="plOk">Registrar</button>');
        A().$('[data-x]', m.el).onclick = m.fechar;
        emendas = await new Promise(res => { A().$('#plOk', m.el).onclick = () => { const v = A().$('#plEm', m.el).value.trim(); m.fechar(); res(v); }; });
        if (st === 'emendas' && !emendas) return A().toast('Escreva as emendas.', true);
      }
      const res = await A().acao(() => A().api({ action: 'reuniao', op: 'decidir', id: b.getAttribute('data-p'), status: st, emendas }), 'Decisão registrada.');
      if (res) { await A().recarregar(); telaPlenario(); }
    });
  }

  /* ======================= Numeração dos documentos (2º Secretário) ======================= */
  // a numeração da reunião junta os documentos da reunião e os relatórios das igrejas com "Doc.NN/ano"
  function numeracao(r) {
    const docs = documentos(r.id);
    const rels = (S().d.relatorios || []).map(x => { const m = /doc\.?\s*(?:n[ºo°.]*\s*)?(\d+)\s*(?:\/\s*(\d{4}))?/i.exec(x.documento || ''); return m && (!m[2] || Number(m[2]) === Number(r.ano)) ? { rel: x, n: Number(m[1]) } : null; }).filter(Boolean);
    const usos = new Map();
    const add = (n, o) => { if (!n) return; if (!usos.has(n)) usos.set(n, []); usos.get(n).push(o); };
    docs.forEach(d => add(numero(d.numero), { tipo: 'doc', d }));
    rels.forEach(x => add(x.n, { tipo: 'rel', r: x.rel }));
    pareceres(r.id).forEach(p => { const n = numero(p.docNumero); if (n && !usos.has(n)) add(n, { tipo: 'par', p }); });
    const ns = [...usos.keys()].sort((a, b) => a - b);
    const max = ns.length ? ns[ns.length - 1] : 0;
    const lacunas = []; for (let i = 1; i < max; i++) if (!usos.has(i)) lacunas.push(i);
    const repetidos = ns.filter(n => usos.get(n).filter(o => o.tipo !== 'par').length > 1);
    const semNumero = docs.filter(d => !d.numero && pastaAuto(d) === 'relatorio');
    return { usos, ns, proximo: max + 1, lacunas, repetidos, semNumero, docs, rels };
  }
  function faixas(ns) {
    const out = []; let i = 0;
    while (i < ns.length) { let j = i; while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++; out.push(i === j ? String(ns[i]) : ns[i] + ' a ' + ns[j]); i = j + 1; }
    return out.join(', ');
  }
  function telaNumeracao() {
    const { esc, $, $$ } = A();
    const r = reuniao();
    if (!r) return semReuniao('reuniao', 'Numeração dos documentos');
    const N = numeracao(r);
    const pode = podeSecretaria();
    const sec = (r.mesa || []).find(m => /segundo secret|2º secret/i.test(m.cargo || ''));
    const pad = n => String(n).padStart(3, '0');
    const descr = o => o.tipo === 'doc' ? `${esc(o.d.titulo)}${o.d.origem ? ` <span class="small muted">· ${esc(o.d.origem)}</span>` : ''}`
      : o.tipo === 'rel' ? `${esc(o.r.titulo || 'Relatório')} <span class="small muted">· ${esc((S().d.igrejas || []).find(i => i.id === o.r.igrejaId)?.nome || '')} · relatório da igreja</span>`
      : `${esc(o.p.assunto || '')} <span class="small muted">· número usado só no parecer</span>`;
    const comDe = o => o.tipo === 'doc' && destinoDoc(o.d) ? esc(destinoDoc(o.d)) : (o.tipo === 'doc' && pode ? '<span class="small" style="color:var(--warn)">a definir</span>' : o.tipo === 'rel' ? '<span class="small muted">Exame de relatórios</span>' : '');
    const numerados = N.docs.filter(d => d.numero);
    const semDestino = numerados.filter(d => !destinoDoc(d));
    const semDespacho = numerados.filter(d => !d.despachadoEm);
    const despCel = o => o.tipo !== 'doc' ? '' : o.d.despachadoEm ? `<span class="tag" title="Despachado em ${esc(dataBr(o.d.despachadoEm))}">✓ ${esc(dataBr(o.d.despachadoEm).slice(0, 5))}</span>` : isAdmin() ? `<button class="btn sm" data-desp="${esc(o.d.id)}">Despachar</button>` : '<span class="small muted">pendente</span>';
    let corpo = `<div class="kpis">
      <div class="kpi"><div class="l">Próximo número</div><div class="v">${pad(N.proximo)}</div><div class="d muted">Doc nº ${pad(N.proximo)}/${esc(String(r.ano || ''))}</div></div>
      <div class="kpi"><div class="l">Números usados</div><div class="v">${N.ns.length}</div><div class="d muted">${N.docs.filter(d => d.numero).length} documentos · ${N.rels.length} relatórios das igrejas</div></div>
      <div class="kpi"><div class="l">Aguardando despacho</div><div class="v">${semDespacho.length}</div><div class="d muted">${semDestino.length} sem destino · ${N.semNumero.length} sem número</div></div>
      <div class="kpi"><div class="l">Lacunas e repetidos</div><div class="v">${N.lacunas.length + N.repetidos.length}</div><div class="d muted">${N.lacunas.length} lacuna(s) · ${N.repetidos.length} repetido(s)</div></div>
    </div>`;
    if (N.repetidos.length) corpo += `<div class="alert warn" style="margin-bottom:12px"><b>Números repetidos:</b> ${N.repetidos.map(pad).join(', ')}. Cada documento precisa de um número próprio.</div>`;
    if (N.lacunas.length) corpo += `<div class="alert" style="margin-bottom:12px"><b>Números ainda não usados:</b> ${esc(faixas(N.lacunas))}. Podem ser documentos que ainda não chegaram ou números pulados.</div>`;
    if (N.semNumero.length) corpo += `<div class="card"><div class="row-wrap" style="justify-content:space-between"><div class="section-title" style="margin:0">Documentos sem número <span class="muted small">(${N.semNumero.length})</span></div>
        ${pode ? `<button class="btn primary sm" id="bNumTodos">Numerar todos a partir do ${pad(N.proximo)}</button>` : ''}</div>
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Documento</th><th>Origem</th><th>Comissão</th>${pode ? '<th></th>' : ''}</tr></thead><tbody>${N.semNumero.map(d => `<tr><td>${esc(d.titulo)}</td><td class="small">${esc(d.origem || '')}</td><td class="small">${esc((comissao(d.comissaoId) || {}).nome || '')}</td>${pode ? `<td><button class="btn sm" data-num="${esc(d.id)}">Dar número</button></td>` : ''}</tr>`).join('')}</tbody></table></div></div>`;
    corpo += `<div class="card"><div class="section-title" style="margin-top:0">Registro de numeração</div>
      <p class="small muted" style="margin-top:0">Cada documento recebido ganha o carimbo da Secretaria Executiva: <b>Doc nº</b> (NN/${esc(String(r.ano || '').slice(-2))}), <b>Destino</b> (a comissão que examina, Arquivo, Plenário…), <b>Data</b> do protocolo e a <b>rubrica do Presidente</b> (despacho). Os relatórios das igrejas entram com o número Doc.NN/${esc(String(r.ano || ''))}.${pode ? ' Clique num documento para mudar o número, o destino ou a data.' : ''}</p>
      ${N.ns.length ? `<div class="tbl-wrap"><table><thead><tr><th>Doc nº</th><th>Documento</th><th>Destino</th><th>Protocolo</th><th>Despacho</th><th>PDF</th></tr></thead><tbody>
      ${N.ns.map(n => N.usos.get(n).map(o => `<tr class="${o.tipo === 'doc' && pode ? 'click' : ''} ${N.repetidos.includes(n) ? 'repetido' : ''}" ${o.tipo === 'doc' ? `data-ed="${esc(o.d.id)}"` : o.tipo === 'rel' ? `data-rl="${esc(o.r.id)}"` : `data-vp="${esc(o.p.id)}"`}><td class="num"><b>${pad(n)}</b>${o.tipo === 'doc' ? `<div class="small muted">${esc(numProtocolo(o.d, r))}</div>` : ''}</td><td>${descr(o)}</td><td class="small">${comDe(o)}</td>
        <td class="small">${o.tipo === 'doc' && (o.d.dataProtocolo || o.d.data) ? esc(dataBr(o.d.dataProtocolo || o.d.data)) : ''}</td><td>${despCel(o)}</td>
        <td>${o.tipo === 'doc' && o.d.arquivo ? `<button class="btn sm" data-pdf="${esc(o.d.id)}">Abrir</button>` : o.tipo === 'rel' && (o.r.anexos || []).length ? '<span class="small muted">no relatório</span>' : '<span class="small muted">–</span>'}</td></tr>`).join('')).join('')}
      </tbody></table></div>` : '<p class="muted" style="margin:0">Nenhum número usado nesta reunião.</p>'}</div>`;
    if (isAdmin()) corpo += `<div class="card"><div class="section-title" style="margin-top:0">Quem numera</div><p class="small muted" style="margin-top:0">${sec && sec.nome ? `2º Secretário desta reunião: <b>${esc(nomeMesa(sec))}</b>. ` : ''}A Mesa (administrador) sempre numera. Marque os usuários dos secretários para que eles também numerem e editem os documentos e a ata.</p>
      <p class="small" style="margin:0 0 8px">${(cfg().secretarios || []).map(id => (S().d.usuarios || []).find(u => u.id === id)).filter(Boolean).map(u => esc(u.nome)).join(', ') || '<span class="muted">Nenhum secretário marcado.</span>'}</p><button class="btn sm" id="bSecs">Escolher secretários</button></div>`;
    telaRO('documentos', 'Numeração dos documentos', subReuniao(r) + ' · controle do 2º Secretário', '<a class="btn" href="#/documentos">← Documentos</a>' + seletorReuniao() + (numerados.length ? '<button class="btn" id="bCarimbos">Imprimir carimbos</button>' : '') + (pode ? `<button class="btn primary" id="bNovoNum">+ Protocolar documento nº ${pad(N.proximo)}</button>` : ''), corpo, r, 'numeracao');
    if ($('#bCarimbos')) $('#bCarimbos').onclick = () => imprimirCarimbos((semDespacho.length ? semDespacho : numerados).slice().sort((a, b) => numero(a.numero) - numero(b.numero)), r);
    $$('[data-desp]').forEach(b => b.onclick = async e => {
      e.stopPropagation();
      const d = itens('documento').find(x => x.id === b.getAttribute('data-desp'));
      if (!destinoDoc(d)) return A().toast('Defina o destino do documento antes do despacho.', true);
      if (await salvarItem('documento', Object.assign({}, d, { despachadoEm: hoje() }), 'Documento ' + numProtocolo(d, r) + ' despachado para ' + destinoDoc(d) + '.')) telaNumeracao();
    });
    ligarSeletor();
    $$('[data-pdf]').forEach(b => b.onclick = e => { e.stopPropagation(); abrirPdf(b.getAttribute('data-pdf')); });
    $$('[data-vp]').forEach(tr => tr.onclick = () => A().ir('parecer/' + tr.getAttribute('data-vp')));
    $$('[data-rl]').forEach(tr => tr.onclick = () => A().ir('relatorio/' + tr.getAttribute('data-rl')));
    if ($('#bSecs')) $('#bSecs').onclick = escolherSecretarios;
    if (!pode) return;
    $$('tr[data-ed]').forEach(tr => tr.onclick = () => editarDocumento(itens('documento').find(d => d.id === tr.getAttribute('data-ed'))));
    $('#bNovoNum').onclick = () => editarDocumento({ reuniaoId: r.id, numero: String(N.proximo), titulo: '', comissaoId: '', tipoDoc: '', origem: '', resumo: '', pasta: 'relatorio', dataProtocolo: hoje() });
    const numerar = async lista => {
      let n = numeracao(reuniao(r.id)).proximo, ok = 0;
      for (const d of lista) { if (await A().acao(() => A().api({ action: 'reuniao', op: 'salvar', tipo: 'documento', item: Object.assign({}, d, { numero: String(n), dataProtocolo: d.dataProtocolo || hoje() }) }))) { ok++; n++; } }
      await A().recarregar(); A().toast(ok + ' documento(s) numerado(s).'); telaNumeracao();
    };
    $$('[data-num]').forEach(b => b.onclick = () => numerar([N.semNumero.find(d => d.id === b.getAttribute('data-num'))]));
    if ($('#bNumTodos')) $('#bNumTodos').onclick = async () => { if (await A().confirmar(`Dar números de ${pad(N.proximo)} a ${pad(N.proximo + N.semNumero.length - 1)} aos ${N.semNumero.length} documentos sem número, na ordem da lista?`, 'Numerar')) numerar(N.semNumero); };
  }
  function escolherSecretarios() {
    const { esc, modal, $, $$ } = A();
    const t = new Set(cfg().secretarios || []);
    const us = (S().d.usuarios || []).filter(u => u.ativo !== false && u.role !== 'leitor' && u.role !== 'admin');
    const m = modal('Secretários da Mesa', `<p class="small muted" style="margin-top:0">O administrador sempre pode. Marque quem mais numera e edita os documentos da reunião (2º Secretário) e redige a ata (1º Secretário).</p>
      ${us.length ? us.map(u => `<label class="chk"><input type="checkbox" value="${esc(u.id)}" ${t.has(u.id) ? 'checked' : ''}> ${esc(u.nome)}${u.cargo ? ' <span class="muted small">· ' + esc(u.cargo) + '</span>' : ''}</label>`).join('') : '<p class="muted">Nenhum usuário com perfil de editor ou analista. Cadastre os secretários em Usuários.</p>'}`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="scOk">Salvar</button>');
    $('[data-x]', m.el).onclick = m.fechar;
    $('#scOk', m.el).onclick = async () => {
      const ids = $$('input[type=checkbox]', m.el).filter(i => i.checked).map(i => i.value);
      if (await salvarItem('cfg', { secretarios: ids }, 'Secretários salvos.')) { m.fechar(); A().render(); }
    };
  }

  /* ======================= Ata geral da reunião ======================= */
  const CAMPOS_ATA = ['numero', 'livro', 'folhas', 'data', 'horaInicio', 'horaFim', 'presentesMinistros', 'presentesPresbiteros', 'ausencias', 'devocional', 'expediente', 'registros', 'encerramento'];
  function ataPadrao(r) {
    const dels = itens('delegado').filter(d => d.reuniaoId === r.id);
    const unicos = (pred) => [...new Set(dels.filter(pred).map(d => nomeDel(d) + (d.igreja ? ' (' + d.igreja + ')' : '')))].join('\n');
    return { reuniaoId: r.id, numero: '', livro: '', folhas: '', data: r.dataInicio || hoje(), horaInicio: '19:30', horaFim: '', presentesMinistros: unicos(d => /^rev/i.test(d.tratamento || '')), presentesPresbiteros: unicos(d => /^presb/i.test(d.tratamento || '')), ausencias: '', devocional: '', expediente: '', registros: '', encerramento: '', incluirPareceres: true, situacao: 'rascunho' };
  }
  const NUM_EXT = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte', 'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'];
  function diaExtenso(iso) { if (!iso) return '___ dias do mês de ________ do ano de ____'; const [y, m, d] = iso.split('-').map(Number); return `${d === 1 ? 'Ao primeiro dia' : 'Aos ' + NUM_EXT[d] + ' dias'} do mês de ${MESES[m - 1]} do ano de ${y}`; }
  function horaExtenso(h) { if (!h) return '__h__'; const [hh, mm] = h.split(':'); return `${Number(hh)}h${mm && mm !== '00' ? mm : ''}`; }
  function folhaAta(r, a) {
    const esc = A().esc;
    const mesa = (r.mesa || []).filter(x => x.nome);
    const pres = mesa.find(x => /^presidente$/i.test(x.cargo));
    const secs = mesa.filter(x => /secret/i.test(x.cargo));
    const min = linhas(a.presentesMinistros), presb = linhas(a.presentesPresbiteros);
    const quorum = min.length >= 3 && presb.length >= 2;
    const pars = a.incluirPareceres !== false ? pareceres(r.id).filter(p => p.status !== 'rascunho') : [];
    const extra = r.tipoReuniao === 'E';
    const corpo = `
      <p>${esc(diaExtenso(a.data))}, às ${esc(horaExtenso(a.horaInicio))}, ${r.local ? 'no(a) ' + esc(r.local) + ', ' : ''}reuniu-se ${extra ? 'extraordinariamente' : 'ordinariamente'} o ${esc(nomePresb())}${r.codigo ? ' (' + esc(r.codigo) + ')' : ''}, ${pres ? 'sob a presidência do ' + esc(nomeMesa(pres)) : 'sob a presidência de seu Presidente'}${extra && (r.dataConvocacao || r.convocadaPor) ? `, convocado${r.convocadaPor ? ' por ' + esc(r.convocadaPor) : ''}${r.dataConvocacao ? ' em ' + esc(dataBr(r.dataConvocacao)) : ''}` : ''}${extra && r.materia ? ', para tratar exclusivamente do seguinte assunto: ' + esc(r.materia) : ''}.</p>
      ${a.devocional ? `<p><b>Devocional:</b> ${esc(a.devocional)}</p>` : ''}
      <p><b>Verificação de quórum:</b> presentes os ministros ${min.length ? esc(min.join('; ')) : '________'}; e os presbíteros ${presb.length ? esc(presb.join('; ')) : '________'}. ${min.length || presb.length ? (quorum ? `Havendo quórum (${min.length} ministros e ${presb.length} presbíteros; CI/IPB art. 86), o Presidente declarou aberta a reunião.` : `<b>Atenção:</b> o quórum exige ao menos três ministros e dois presbíteros (CI/IPB art. 86); foram registrados ${min.length} e ${presb.length}.`) : ''}</p>
      ${a.ausencias ? `<p><b>Ausências justificadas:</b> ${esc(a.ausencias)}</p>` : ''}
      ${mesa.length ? `<p><b>${extra ? 'Mesa:' : 'Eleição e posse da Mesa:'}</b> ${extra ? 'A Mesa ficou assim composta' : 'Foi eleita e empossada a Mesa Diretora, assim composta'}: ${mesa.map(x => `${esc(x.cargo)}, ${esc(nomeMesa(x))}${x.igreja ? ' (' + esc(x.igreja) + ')' : ''}`).join('; ')}.</p>` : ''}
      ${linhas(r.pauta).length ? `<p><b>Pauta:</b></p>${ol(linhas(r.pauta))}` : ''}
      ${a.expediente ? `<p><b>Expediente:</b> ${esc(a.expediente)}</p>` : ''}
      ${pars.length ? `<p><b>Relatórios das comissões:</b> o plenário apreciou os seguintes documentos:</p><ol>${pars.map(p => `<li>Doc. ${esc(p.docNumero || 's/n')}, ${esc((comissao(p.comissaoId) || {}).nome || '')}: ${esc(p.assunto || '')}. ${PLENARIO.includes(p.status) ? esc(STATUS[p.status]) + (p.emendas ? ' (' + esc(p.emendas) + ')' : '') : 'Pendente de decisão'}.</li>`).join('')}</ol>` : ''}
      ${linhas(a.registros).length ? `<p><b>Outras deliberações e registros:</b></p>${ol(linhas(a.registros))}` : ''}
      <p>${a.encerramento ? esc(a.encerramento) + ' ' : ''}Nada mais havendo a tratar, às ${esc(horaExtenso(a.horaFim))}, o Presidente declarou encerrada a reunião. E, para constar, eu, ${secs[0] ? esc(nomeMesa(secs[0])) : '________________'}, ${secs[0] ? esc(secs[0].cargo) : 'Secretário'}, lavrei a presente ata que, lida e aprovada, vai por mim assinada e pelo Presidente.</p>`;
    const assin = [pres ? { nome: nomeMesa(pres), funcao: 'Presidente' } : { nome: '', funcao: 'Presidente' }].concat(secs.map(x => ({ nome: nomeMesa(x), funcao: x.cargo })));
    return `<div class="parecer-folha">${cabecalho(a.numero ? 'Ata ' + a.numero : '', 'Livro de Atas', a.data, r)}
      <h4>Ata da ${esc(r.numero || '')}ª Reunião ${tipoNome(r)} do ${esc(nomePresb())}</h4>
      ${a.livro || a.folhas ? `<p class="small" style="text-align:center">${a.livro ? 'Livro nº ' + esc(a.livro) : ''}${a.livro && a.folhas ? ' · ' : ''}${a.folhas ? 'folhas ' + esc(a.folhas) : ''}</p>` : ''}
      ${corpo}
      ${assinaturasHtml(assin)}
    </div>`;
  }
  function telaAtaGeral(rid) {
    const { esc, shell, head, $, $$ } = A();
    const r = reuniao(rid);
    if (!r) return semReuniao('reuniao', 'Ata da reunião');
    if (r.id !== reuniaoId()) lsSet(REU_KEY, r.id); // abrir a ata de uma reunião faz dela a reunião escolhida
    const ex = itens('ata').find(a => a.reuniaoId === r.id);
    const a = Object.assign(ataPadrao(r), ex || {});
    const pode = podeSecretaria();
    const campo = (id, l, tipo, extra) => `<div class="field ${extra || ''}"><label for="at_${id}">${l}</label>${tipo === 'area' ? `<textarea id="at_${id}" rows="${id.startsWith('presentes') ? 5 : 3}" ${pode ? '' : 'readonly'}>${esc(a[id] || '')}</textarea>` : `<input type="${tipo}" id="at_${id}" value="${esc(a[id] || '')}" ${pode ? '' : 'readonly'}>`}</div>`;
    let html = head('Ata da reunião', subReuniao(r) + ' · redigida pelo 1º Secretário', `<button class="btn" id="bAtaImp">Imprimir / PDF</button><button class="btn" id="bAtaDoc">Baixar Word</button>`) + etapas('ata', r);
    if (!(r.mesa || []).some(x => x.nome)) html += `<div class="alert warn" style="margin-bottom:12px">A mesa diretora desta reunião ainda não foi informada. ${pode ? 'Use Editar reunião para incluir nomes, títulos e cargos.' : ''}</div>`;
    html += `<div class="ata-grid"><div class="card">
      <div class="row-wrap" style="justify-content:space-between"><div class="section-title" style="margin:0">Dados da ata</div>${isAdmin() ? '<button class="btn sm" id="bMesa">Editar reunião e mesa</button>' : ''}</div>
      <div class="grid g3">${campo('numero', 'Ata nº', 'text')}${campo('livro', 'Livro nº', 'text')}${campo('folhas', 'Folhas', 'text')}
      ${campo('data', 'Data', 'date')}${campo('horaInicio', 'Início', 'time')}${campo('horaFim', 'Encerramento', 'time')}</div>
      <div class="grid g2" style="margin-top:12px">${campo('presentesMinistros', 'Ministros presentes <span class="help">um por linha</span>', 'area')}${campo('presentesPresbiteros', 'Presbíteros presentes <span class="help">um por linha, com a igreja</span>', 'area')}</div>
      <div class="grid" style="margin-top:12px">${campo('ausencias', 'Ausências justificadas', 'area')}${campo('devocional', 'Devocional (dirigente, texto bíblico, hinos)', 'area')}${campo('expediente', 'Expediente (correspondências, comunicações)', 'area')}
      ${campo('registros', 'Outras deliberações e registros <span class="help">um por linha</span>', 'area')}${campo('encerramento', 'Encerramento (oração, bênção, próxima reunião)', 'area')}</div>
      <label style="display:block;margin-top:10px"><input type="checkbox" id="at_incluirPareceres" ${a.incluirPareceres !== false ? 'checked' : ''} ${pode ? '' : 'disabled'}> Incluir na ata os pareceres das comissões e a decisão do plenário</label>
      ${pode ? `<div class="row-wrap" style="margin-top:12px"><label class="chk" style="margin-right:auto"><input type="checkbox" id="at_aprovada" ${a.situacao === 'aprovada' ? 'checked' : ''}> Ata lida e aprovada</label><button class="btn primary" id="bAtaSalvar">Salvar ata</button><span class="small muted" id="ataMsg"></span></div>` : ''}
    </div><div><div class="folha-wrap" id="ataPrev">${folhaAta(r, a)}</div></div></div>`;
    shell('reuniao', html);
    const ler = () => { const o = Object.assign({}, a); CAMPOS_ATA.forEach(k => { const el = $('#at_' + k); if (el) o[k] = el.value; }); o.incluirPareceres = $('#at_incluirPareceres').checked; if ($('#at_aprovada')) o.situacao = $('#at_aprovada').checked ? 'aprovada' : 'rascunho'; return o; };
    const atualizar = () => { $('#ataPrev').innerHTML = folhaAta(reuniao(r.id), ler()); };
    $$('[id^="at_"]').forEach(el => { el.addEventListener('input', atualizar); el.addEventListener('change', atualizar); });
    const nome = () => nomeArquivo('Ata ' + (r.codigo || ''));
    $('#bAtaImp').onclick = () => imprimir(nome(), folhaAta(r, ler()));
    $('#bAtaDoc').onclick = () => baixarWord(folhaAta(r, ler()), nome() + '.doc');
    if ($('#bMesa')) $('#bMesa').onclick = () => editarReuniao(r);
    if ($('#bAtaSalvar')) $('#bAtaSalvar').onclick = async () => {
      const item = Object.assign(ler(), { id: ex && ex.id, reuniaoId: r.id });
      if (await salvarItem('ata', item, 'Ata salva.')) A().render();
    };
  }

  /* ======================= entrada ======================= */
  function pendentes() {
    try {
      const rid = reuniaoId();
      if (!rid) return 0;
      if (isAdmin()) return pareceres(rid).filter(p => p.status === 'concluido').length;
      const minhas = new Set(minhasComissoes(rid));
      return pareceres(rid).filter(p => minhas.has(p.comissaoId) && p.status === 'rascunho').length;
    } catch (e) { return 0; }
  }
  function render(p, a) {
    if (!S().d.reuniao) S().d.reuniao = [];
    switch (p) {
      case 'reuniao': return telaReuniao();
      case 'comissoes': return telaComissoes();
      case 'comissao': return telaComissao(a[0]);
      case 'documentos': return telaDocumentos();
      case 'delegados': return telaDelegados();
      case 'historico': return window.IPB_GRAFICOS ? window.IPB_GRAFICOS.render(a || []) : telaHistorico();
      case 'mesa': return telaMesa();
      case 'parecer': return telaParecer(a[0]);
      case 'reunioes': return telaReunioes();
      case 'ata-geral': return telaAtaGeral(a[0] || reuniaoId());
      case 'pareceres': return telaPareceres();
      case 'plenario': return telaPlenario();
      case 'numeracao': return telaNumeracao();
      default: return telaReuniao();
    }
  }
  window.IPB_REUNIAO = { render, pendentes, camposComissao, lerCamposComissao, criarPadrao, COMISSOES_PADRAO, folhaParecer,
    // usados pelo acervo (acervo.js) e pela tesouraria (tesouraria.js)
    h: { chip, itens, cfg, sigla, nomePresb, reunioes, reuniao, comissoes, comissao, documentos, pareceres, abrirPdf, editarDocumento, enviarArquivoDoc, pastaAuto, salvarItem, dataBr, dataExtenso, periodo, tipoNome, nomeMesa, numero, lsGet, lsSet, isAdmin, pdfCache, MESES, PASTAS_DOC, SECOES_DOC, ACEITOS, imprimir, CSS_FOLHA, REU_KEY, editarEstatisticas, editarFinancas, numero, temValor, TOTAL, CAMPOS_EST, CAMPOS_FIN, igrejasCfg, CARGOS_MESA, TRATAMENTOS } };
})();
