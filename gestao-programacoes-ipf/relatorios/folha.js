/* Formulários no layout do relatório físico (CSM-IPB 2021 v8.0).
 * Servem para preencher e para imprimir. Usam os mesmos atributos de ligação do
 * formulário comum (data-f, data-t, data-yn, data-ck) e data-expr para totais. */
(function () {
  'use strict';
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function fmt(v, f) {
    v = Number(v);
    if (!isFinite(v)) return '–';
    if (f === 'money') return nf2.format(v);
    if (f === 'pct') return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    return nf0.format(v);
  }
  window.IPB_FOLHA_FMT = fmt;

  function kit(r, ro, C) {
    const d = r.dados || {};
    const K = {};
    K.v = (id, cls) => {
      const c = C.defs[id] || { tipo: 'text' };
      const val = d[id];
      if (c.tipo === 'calc') return K.x(id, c.formato === 'money' ? 'money' : 'num');
      if (['number', 'money'].includes(c.tipo)) {
        if (ro) return `<span class="fv num ${cls || ''}">${val === '' || val == null ? '' : fmt(val, c.tipo === 'money' ? 'money' : 'num')}</span>`;
        return `<input class="fi num ${cls || ''}" type="number" step="${c.tipo === 'money' ? '0.01' : '1'}" data-f="${esc(id)}" value="${val == null ? '' : esc(val)}" aria-label="${esc(c.label || id)}">`;
      }
      if (c.tipo === 'textarea') return ro ? `<div class="fv pre">${esc(val || '')}</div>` : `<textarea class="fi" data-f="${esc(id)}" aria-label="${esc(c.label || id)}">${esc(val || '')}</textarea>`;
      if (c.tipo === 'date') return ro ? `<span class="fv">${val ? esc(val.split('-').reverse().join('/')) : ''}</span>` : `<input class="fi" type="date" data-f="${esc(id)}" value="${esc(val || '')}" aria-label="${esc(c.label || id)}">`;
      return ro ? `<span class="fv">${esc(val || '')}</span>` : `<input class="fi" type="text" data-f="${esc(id)}" value="${esc(val || '')}" aria-label="${esc(c.label || id)}">`;
    };
    K.x = (expr, f) => `<span class="fc num" data-expr="${esc(expr)}" data-fmt="${f || 'num'}">${fmt(C.eval(expr), f)}</span>`;
    K.yn = id => {
      const v = d[id];
      const b = (val, l) => `<button type="button" class="fb ${v === val ? 'on' : ''} ${val === 'nao' && v === 'nao' ? 'no' : ''}" data-yn="${esc(id)}" data-v="${val}" ${ro ? 'disabled' : ''} aria-label="${esc((C.defs[id] || {}).label || id)}: ${l}"><i></i>${l}</button>`;
      return `<span class="fyn">${b('sim', 'Sim')}${b('nao', 'Não')}</span>`;
    };
    K.ck = (id, op, label) => {
      const arr = Array.isArray(d[id]) ? d[id] : [];
      return `<label class="fck"><input type="checkbox" data-ck="${esc(id)}" value="${esc(op)}" ${arr.includes(op) ? 'checked' : ''} ${ro ? 'disabled' : ''}><i></i>${esc(label || op)}</label>`;
    };
    K.t = (tab, i, col) => {
      const rows = Array.isArray(d[tab]) ? d[tab] : [];
      const val = (rows[i] || {})[col];
      if (ro) return `<span class="fv num">${val === '' || val == null ? '' : fmt(val)}</span>`;
      return `<input class="fi num" type="number" step="1" data-t="${esc(tab)}" data-r="${i}" data-c="${esc(col)}" value="${val == null ? '' : esc(val)}" aria-label="${esc(tab + ' ' + (i + 1) + ' ' + col)}">`;
    };
    return K;
  }
  function logo() {
    // marca oficial da IPB (Programa de Identidade Visual)
    return `<div class="f-logo"><img src="img/logo-ipb.png" alt="Igreja Presbiteriana do Brasil"></div>`;
  }
  function cabecalho(titulo, r, ig) {
    return `<div class="f-cab">${logo()}<div class="f-tit"><div class="t1">${titulo}</div>
      <table class="f-ano"><tr><td class="l">ANO:</td><td class="c"><b>${esc(r.ano)}</b></td><td class="s">SIGLAS</td></tr>
      <tr><td class="l">SÍNODO:</td><td class="c">${esc((ig.sinodo || '').replace(/\s*\(.*\)$/, '').toUpperCase())}</td><td class="s">${esc(((ig.sinodo || '').match(/\((\w+)\)/) || [])[1] || '')}</td></tr>
      <tr><td class="l">PRESBITÉRIO:</td><td class="c">${esc((ig.presbiterio || '').replace(/\s*\(.*\)$/, '').toUpperCase())}</td><td class="s">${esc(((ig.presbiterio || '').match(/\((\w+)\)/) || [])[1] || '')}</td></tr></table>
      ${r.documento ? `<div class="f-doc">${esc(r.documento)}</div>` : ''}</div></div>`;
  }
  function ident(K, titulo) {
    return `<div class="f-bar">${titulo}</div><table class="f-t f-id">
      <tr><td class="l">Nome (Igreja/Congregação):</td><td colspan="5">${K.v('id_nome')}</td></tr>
      <tr><td class="l">Endereço:</td><td colspan="3">${K.v('id_endereco')}</td><td class="l">Bairro:</td><td>${K.v('id_bairro')}</td></tr>
      <tr><td class="l">Cidade:</td><td>${K.v('id_cidade')}</td><td class="l">UF:</td><td>${K.v('id_uf')}</td><td class="l">CEP:</td><td>${K.v('id_cep')}</td></tr>
      <tr><td class="l">Telefones:</td><td>${K.v('id_telefone')}</td><td class="l">E-mail:</td><td colspan="3">${K.v('id_email')}</td></tr>
      <tr><td class="l">Data de organização:</td><td>${K.v('id_data_org')}</td><td class="l">CNPJ:</td><td>${K.v('id_cnpj')}</td><td class="l">Site:</td><td>${K.v('id_site')}</td></tr></table>`;
  }
  function rodape(K, quem) {
    return `<table class="f-t f-fim"><tr><td class="l">Local:</td><td>${K.v('local')}</td><td class="l">Data:</td><td>${K.v('data')}</td></tr></table>
      <div class="f-ass"><div>${K.v('secretario')}</div><span>${quem}</span></div>
      <div class="f-obs"><span class="l">Observações:</span>${K.v('observacoes')}</div>
      <div class="f-rod">CSM-IPB - 2021 - v 8.0</div>`;
  }

  /* ---------------- Informações Cadastrais e Estatísticas ---------------- */
  function estatistico(r, ro, C, ig) {
    const K = kit(r, ro, C);
    const linhas = (tab, rotulos, lado) => rotulos.map((l, i) => `<tr>${i === 0 ? `<td class="vert" rowspan="${rotulos.length}">${lado.split('').join('<br>')}</td>` : ''}<td class="l">${esc(l)}:</td><td>${K.t(tab, i, 'm')}</td><td>${K.t(tab, i, 'f')}</td><td class="tt">${K.x(`sum(${tab}.t, ${i}, ${i})`)}</td></tr>`).join('');
    const vazias = n => Array.from({ length: n }, () => '<tr><td class="vazio" colspan="5">&nbsp;</td></tr>').join('');
    const LID = [['lid_pastores', 'Pastores'], ['lid_licenciados', 'Licenciados'], ['lid_presbiteros', 'Presbíteros'], ['lid_diaconos', 'Diáconos'], ['lid_evangelistas', 'Evangelistas'], ['lid_missionarios', 'Missionários'], ['lid_candidatos', 'Candidatos']];
    const EST = [['est_congregacoes', 'Congregações da Igreja'], ['est_pontos', 'Pontos de Pregação'], ['est_escolas', 'Escolas Dominicais'], ['est_professores', 'Professores da Escola Dominical'], ['est_alunos', 'Alunos Escola Dominical (ano atual)'], ['est_alunos_ant', 'Alunos Escola Dominical (ano anterior)']];
    const DEP = ['UCP', 'UPA', 'UMP', 'SAF', 'UPH', 'Outras'];
    const REC = [['dizimos', 'Dízimos'], ['ofertas', 'Ofertas'], ['of_missionarias', 'Ofertas Missionárias'], ['of_especificas', 'Ofertas Específicas'], ['rec_financeiras', 'Receitas Financeiras'], ['rec_emprestimos', 'Empréstimos IPB / JPEF'], ['parcerias', 'Parcerias'], ['rec_outras', 'Outras Receitas']];
    const DESP = [['patrimonio', 'Patrimônio'], ['causas_locais', 'Causas Locais'], ['evangelismo', 'Evangelismo Local'], ['missoes', 'Missões'], ['acao_social', 'Ação Social'], ['sustento', 'Sustento Pastoral'], ['verba_presb', 'Verba Presbiterial'], ['dizimo_sc', 'Dízimo ao Supremo Concílio'], ['desp_emprestimos', 'Empréstimos IPB / JPEF'], ['desp_outras', 'Outras Despesas']];
    const fin = (p, titulo) => `<table class="f-t f-fin"><tr><th colspan="4" class="cab2">${titulo}</th></tr>
      <tr><th>ITENS</th><th></th><th>Valores</th><th>%</th></tr>
      <tr class="b"><td class="l">Saldo - Ano anterior:</td><td class="rs">R$</td><td>${K.v(p + 'saldo_ant')}</td><td class="pc">${K.x(p + 'saldo_ant / ' + p + 'rec_total', 'pct')}</td></tr>
      <tr><td class="l b" colspan="4">RECEITAS:</td></tr>
      ${REC.map(([k, l]) => `<tr><td class="l">${l}:</td><td class="rs">R$</td><td>${K.v(p + k)}</td><td class="pc">${K.x(p + k + ' / ' + p + 'rec_total', 'pct')}</td></tr>`).join('')}
      <tr class="b"><td class="l">Total da Receita Anual:</td><td class="rs">R$</td><td>${K.x(p + 'rec_total', 'money')}</td><td class="pc">${K.x(p + 'rec_total / ' + p + 'rec_total', 'pct')}</td></tr>
      <tr class="b"><td class="l">Grande Total:</td><td class="rs">R$</td><td>${K.x(p + 'grande_total', 'money')}</td><td class="pc">${K.x(p + 'grande_total / ' + p + 'grande_total', 'pct')}</td></tr>
      <tr><td class="l b" colspan="4">DESPESAS:</td></tr>
      ${DESP.map(([k, l]) => `<tr><td class="l">${l}:</td><td class="rs">R$</td><td>${K.v(p + k)}</td><td class="pc">${K.x(p + k + ' / ' + p + 'grande_total', 'pct')}</td></tr>`).join('')}
      <tr class="b"><td class="l">Total da Despesa Anual:</td><td class="rs">R$</td><td>${K.x(p + 'desp_total', 'money')}</td><td class="pc">${K.x(p + 'desp_total / ' + p + 'grande_total', 'pct')}</td></tr>
      <tr class="b"><td class="l">Saldo - Ano seguinte:</td><td class="rs">R$</td><td>${K.x(p + 'saldo_seguinte', 'money')}</td><td class="pc">${K.x(p + 'saldo_seguinte / ' + p + 'grande_total', 'pct')}</td></tr>
      <tr class="b"><td class="l">Grande Total:</td><td class="rs">R$</td><td>${K.x(p + 'grande_total', 'money')}</td><td class="pc">${K.x(p + 'grande_total / ' + p + 'grande_total', 'pct')}</td></tr></table>`;
    return `<div class="folha">
      ${cabecalho('INFORMAÇÕES CADASTRAIS E ESTATÍSTICAS<br>DE COMUNIDADE PRESBITERIANA', r, ig)}
      ${ident(K, 'I - Identificação da Igreja ou Congregação Presbiterial')}
      <div class="f-bar">II - Estrutura da Comunidade Presbiteriana</div>
      <div class="f-cols c3">
        <table class="f-t"><tr><th colspan="2">LIDERANÇA FORMAL:</th></tr>${LID.map(([k, l]) => `<tr><td class="l">${l}:</td><td class="n">${K.v(k)}</td></tr>`).join('')}</table>
        <table class="f-t"><tr><th colspan="2">ESTRUTURA DO TRABALHO:</th></tr>${EST.map(([k, l]) => `<tr><td class="l">${l}:</td><td class="n">${K.v(k)}</td></tr>`).join('')}</table>
        <table class="f-t"><tr><th colspan="3">DEPARTAMENTOS INTERNOS:</th></tr><tr><th></th><th>Nº Deptos.</th><th>Nº de Membros</th></tr>
          ${DEP.map((l, i) => `<tr><td class="l">${l}:</td><td>${K.t('dep', i, 'deptos')}</td><td>${K.t('dep', i, 'membros')}</td></tr>`).join('')}
          <tr class="b"><td class="l">TOTAIS:</td><td class="tt">${K.x('sum(dep.deptos)')}</td><td class="tt">${K.x('sum(dep.membros)')}</td></tr></table>
      </div>
      <div class="f-bar">III - Rol de Membros</div>
      <div class="f-cols c2">
        <table class="f-t f-rol"><tr><th colspan="2">COMUNGANTES</th><th>MASC.</th><th>FEM.</th><th>TOTAL</th></tr>
          ${linhas('com_adm', ['Profissão de Fé', 'Profissão de Fé e Batismo', 'Transferência', 'Jurisdição', 'Restauração', 'Designação do Presbitério'], 'ADMISSÃO')}
          ${linhas('com_dem', ['Transferência', 'Falecimento', 'Exclusão', 'Ordenação'], 'DEMISSÃO')}
          <tr class="b"><td colspan="2" class="l">Rol Separado:</td><td>${K.v('rs_m')}</td><td>${K.v('rs_f')}</td><td class="tt">${K.x('rs_m + rs_f')}</td></tr>
          <tr class="b"><td colspan="2" class="l">DIFERENÇA (Admissão - Demissão):</td><td class="tt">${K.x('sum(com_adm.m) - sum(com_dem.m)')}</td><td class="tt">${K.x('sum(com_adm.f) - sum(com_dem.f)')}</td><td class="tt">${K.x('com_dif')}</td></tr>
          <tr class="b"><td colspan="2" class="l">Comungantes Ano Anterior:</td><td>${K.v('com_ant_m')}</td><td>${K.v('com_ant_f')}</td><td class="tt">${K.x('com_ant_m + com_ant_f')}</td></tr>
          <tr class="b hl"><td colspan="2" class="l">Comungantes Ano Atual:</td><td class="tt">${K.x('com_atual_m')}</td><td class="tt">${K.x('com_atual_f')}</td><td class="tt">${K.x('com_atual')}</td></tr></table>
        <table class="f-t f-rol"><tr><th colspan="2">NÃO-COMUNGANTES</th><th>MASC.</th><th>FEM.</th><th>TOTAL</th></tr>
          ${linhas('nc_adm', ['Batismo', 'Transferência', 'Jurisdição ex-officio'], 'ADMISSÃO')}${vazias(3)}
          ${linhas('nc_dem', ['Profissão de Fé', 'Transferência', 'Falecimento', 'Exclusão'], 'DEMISSÃO')}
          <tr class="b"><td colspan="2" class="l">DIFERENÇA (Admissão - Demissão):</td><td class="tt">${K.x('sum(nc_adm.m) - sum(nc_dem.m)')}</td><td class="tt">${K.x('sum(nc_adm.f) - sum(nc_dem.f)')}</td><td class="tt">${K.x('sum(nc_adm.t) - sum(nc_dem.t)')}</td></tr>
          <tr class="b"><td colspan="2" class="l">Não-Comungantes Ano anterior:</td><td>${K.v('nc_ant_m')}</td><td>${K.v('nc_ant_f')}</td><td class="tt">${K.x('nc_ant_m + nc_ant_f')}</td></tr>
          <tr class="b"><td colspan="2" class="l">Não-Comungantes Ano atual:</td><td class="tt">${K.x('nc_atual_m')}</td><td class="tt">${K.x('nc_atual_f')}</td><td class="tt">${K.x('nc_atual')}</td></tr>
          <tr class="b hl"><td colspan="2" class="l">ROL ATUAL <small>(Comungantes + Não Comungantes)</small>:</td><td class="tt">${K.x('com_atual_m + nc_atual_m')}</td><td class="tt">${K.x('com_atual_f + nc_atual_f')}</td><td class="tt">${K.x('rol_atual')}</td></tr></table>
      </div>
      <div class="f-quebra"></div>
      <div class="f-bar f-pg2">IPB - Informações Cadastrais e Estatísticas de Comunidade Presbiteriana - 2</div>
      <div class="f-bar">IV - Informações Financeiras</div>
      <div class="f-cols c2">${fin('fin_', 'MOVIMENTO FINANCEIRO<br>DO ANO ANTERIOR')}${fin('prev_', 'PREVISÃO ORÇAMENTÁRIA<br>AO PRÓXIMO EXERCÍCIO')}</div>
      <div class="f-bar">VI - Informações Finais</div>
      ${rodape(K, 'Assinatura do Secretário do Conselho')}
    </div>`;
  }

  /* ---------------- Relatório do Conselho ou Mesa Administrativa ---------------- */
  function conselho(r, ro, C, ig) {
    const K = kit(r, ro, C);
    const sec = t => `<tr><td colspan="4" class="f-sub">${t}</td></tr>`;
    const lin = (a, b) => `<tr><td class="l">${a[0]}</td><td class="op">${a[1]}</td><td class="l">${b ? b[0] : ''}</td><td class="op">${b ? b[1] : ''}</td></tr>`;
    const n = id => `<span class="fn">${K.v(id)}</span>`;
    const ehMesa = /congrega/i.test(ig.tipo || '') && !/presbiterial/i.test(ig.tipo || '') ? false : /presbiterial/i.test(ig.tipo || '');
    return `<div class="folha">
      ${cabecalho(ehMesa ? 'RELATÓRIO DO CONSELHO<br><small>ou MESA ADMINISTRATIVA</small>' : 'RELATÓRIO DO CONSELHO<br><small>ou MESA ADMINISTRATIVA</small>', r, ig)}
      ${ident(K, 'I - Identificação da Igreja / Congregação Presbiterial')}
      <div class="f-bar">II - Informações do Trabalho</div>
      <table class="f-t f-cons">
        ${sec('1. ORGANIZAÇÃO')}
        ${lin(['1.1. Os imóveis estão documentados?', K.yn('imoveis_doc')], ['1.4. Apresentou declarações do ano anterior?', K.ck('declaracoes', 'IRenda') + K.ck('declaracoes', 'RAIS') + K.ck('declaracoes', 'DIRF')])}
        ${lin(['1.2. Há inventário dos móveis e utensílios?', K.yn('inventario')], ['1.5. Inventário atualizado?', K.yn('inventario_atualizado')])}
        ${lin(['1.3. Os Róis de Membros estão atualizados?', K.yn('rois_atualizados')], ['1.6. Quantas Congregações da Igreja?', n('congregacoes')])}
        ${sec('2. SUPERVISÃO ESPIRITUAL')}
        <tr><td colspan="4" class="f-sub2">2.1. Adoração e Comunhão</td></tr>
        <tr><td class="l">2.1.1. Nº de celebrações da Santa Ceia em grupos:</td><td class="op">${n('ceia_grupos')}</td><td class="l">Nº de ministrações Ceia a indivíduos: ${n('ceia_individuos')}</td><td class="op">TOTAL GERAL: <b>${K.x('ceia_grupos + ceia_individuos')}</b></td></tr>
        <tr><td colspan="4" class="f-sub2">2.2. Evangelização e Missões</td></tr>
        <tr><td class="l">2.2.1. Nº de atividades evangelísticas:*</td><td class="op">${n('ativ_evang')}</td><td class="l" colspan="2"><small>(* Em templos e residências; recintos públicos e ao ar livre; pela imprensa escrita, rádio e TV etc.)</small></td></tr>
        <tr><td class="l" colspan="4">2.2.2. Textos distribuídos: Bíblias ${n('biblias')} Novos Testamentos ${n('nt')} Folhetos ${n('folhetos')} Outras Literaturas ${n('outras_lit')} TOTAL GERAL: <b>${K.x('biblias + nt + folhetos + outras_lit')}</b></td></tr>
        <tr><td class="l" colspan="4">2.2.3. Trabalho missionário com: ${K.ck('missionario', 'JMN')} ${K.ck('missionario', 'APMT')} ${K.ck('missionario', 'Parceria com o PMC')} ${K.ck('missionario', 'Plantação de Igrejas')}</td></tr>
        <tr><td class="l">2.2.4. Outra participação missionária:</td><td colspan="3">${K.v('outra_missao')}</td></tr>
        <tr><td colspan="4" class="f-sub2">2.3. Educação e Aperfeiçoamento</td></tr>
        ${lin(['2.3.1. Para professores de Escola Dominical:', K.yn('trein_ed')], ['2.3.5. Nº de Grupos Corais:', n('grupos_corais')])}
        ${lin(['2.3.2. Para Equipe de Música:', K.yn('trein_musica')], ['2.3.6. Nº de Conjuntos Musicais:', n('conjuntos')])}
        ${lin(['2.3.3. Para Oficiais (Presbíteros e Diáconos):', K.yn('trein_oficiais')], ['2.3.7. Nº de Discipulados Realizados:', n('discipulados')])}
        ${lin(['2.3.4. Para Liderança:', K.yn('trein_lideranca')], null)}
        <tr><td colspan="4" class="f-sub2">2.4. Ação Social e Visitação</td></tr>
        <tr><td class="l">2.4.1. Nº de atos beneficentes realizados pela Junta Diaconal:</td><td class="op">${n('atos_jd')}</td><td class="l">Por outros departamentos: ${n('atos_outros')}</td><td class="op">Total Geral: <b>${K.x('atos_jd + atos_outros')}</b></td></tr>
        <tr><td class="l">2.4.2. Nº de visitas feitas por presbíteros e diáconos:</td><td class="op">${n('visitas_oficiais')}</td><td class="l">Por outros departamentos: ${n('visitas_outros')}</td><td class="op">Total Geral: <b>${K.x('visitas_oficiais + visitas_outros')}</b></td></tr>
        ${sec('3. SUPERVISÃO ADMINISTRATIVA')}
        <tr><td class="l" colspan="3">3.1. A Igreja enviou fielmente os Dízimos dos Dízimos à Tesouraria IPB:</td><td class="op">${K.yn('dizimo_sc')}</td></tr>
        <tr><td class="l">REUNIÕES · 3.2. Conselho: <small>[1]</small></td><td class="op">${n('reun_conselho')}</td><td class="l" colspan="2" rowspan="5"><small>(Preenchimento: [1] Igreja; [2] Congregação Presbiterial; [3] Ambas)</small></td></tr>
        <tr><td class="l">3.3. Junta Diaconal: <small>[1]</small></td><td class="op">${n('reun_jd')}</td></tr>
        <tr><td class="l">3.4. Assembleia Geral: <small>[1]</small></td><td class="op">${n('reun_ag')}</td></tr>
        <tr><td class="l">3.5. Mesa Administrativa da Cong. Presbiterial: <small>[2]</small></td><td class="op">${n('reun_mesa')}</td></tr>
        <tr><td class="l">3.6. Comissão de Exame de Contas da Tesouraria: <small>[3]</small></td><td class="op">${n('reun_contas')}</td></tr>
        ${lin(['3.7. Houve exame/aprovação balancetes da tesouraria?', K.yn('exame_balancetes')], ['3.8. Há oficiais com mandato a vencer no ano a seguir?', K.yn('mandato_vencer') + ' Presbíteros: nº ' + n('mandato_presb') + ' Diáconos: nº ' + n('mandato_diac')])}
        ${lin(['3.9. Idem, dos livros e relatórios das sociedades?', K.yn('exame_livros_soc')], ['Quais?', K.v('quais')])}
        ${lin(['3.10. Houve nomeação de conselheiros às Sociedades?', K.yn('conselheiros_soc')], null)}
        ${lin(['3.11. Houve contribuição para causas extra-locais?', K.yn('causas_extra')], null)}
        ${lin(['3.12. Contribuiu com Previdência Social do(s) pastor(es)?', K.yn('previdencia')], ['FAP? ' + K.yn('fap'), 'IPB-PREV? ' + K.yn('ipbprev')])}
        <tr><td class="l" colspan="2"><div>3.13. Reforma e/ou Construção <i>em projeto</i>:</div>${K.v('reforma_projeto')}</td><td class="l" colspan="2"><div>3.14. Reforma e/ou Construção <i>em andamento</i>:</div>${K.v('reforma_andamento')}</td></tr>
        ${sec('4. PLANEJAMENTO ESTRATÉGICO')}
        <tr><td class="l" colspan="3">4.1. A Igreja tem Planejamento Estratégico?</td><td class="op">${K.yn('plan_estrategico')}</td></tr>
        <tr><td class="l" colspan="4"><div>4.2. Quais os objetivos propostos e alcançados?</div>${K.v('obj_alcancados')}</td></tr>
        <tr><td class="l" colspan="4"><div>4.3. Quais os objetivos propostos e NÃO alcançados? Identificar as dificuldades.</div>${K.v('obj_nao_alcancados')}</td></tr>
        ${sec('5. PATRIMÔNIO')}
        ${lin(['5.1. A Igreja tem Seguro do bem patrimonial?', K.yn('seguro')], ['5.3. Tem Licença do Corpo de Bombeiros em dia?', K.yn('avcb')])}
        ${lin(['5.2. Tem Alvará de Funcionamento?', K.yn('alvara')], ['5.4. Tem Certificado Digital?', K.yn('cert_digital')])}
      </table>
      ${rodape(K, 'Assinatura do Secretário do Conselho')}
    </div>`;
  }

  window.IPB_FOLHA = {
    disponivel(r) {
      const ids = new Set((r.modelo.secoes || []).flatMap(s => (s.campos || []).map(c => c.id)));
      if (r.modeloId === 'estatistico') return ['com_adm', 'com_dem', 'nc_adm', 'nc_dem', 'dep', 'fin_dizimos', 'prev_dizimos', 'com_atual', 'rol_atual'].every(x => ids.has(x));
      if (r.modeloId === 'conselho') return ['dizimo_sc', 'imoveis_doc', 'ceia_grupos', 'reun_conselho', 'seguro'].every(x => ids.has(x));
      return false;
    },
    render(r, ro, C, ig) { return r.modeloId === 'estatistico' ? estatistico(r, ro, C, ig || {}) : conselho(r, ro, C, ig || {}); }
  };
})();
