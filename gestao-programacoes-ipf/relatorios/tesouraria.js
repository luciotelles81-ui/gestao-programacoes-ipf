/* Tesouraria do presbitério: controle de caixa administrativo, mês a mês.
 * Segue os relatórios do tesoureiro do PLRN: dízimo dos pastores, contribuição das igrejas (3%)
 * e despesas e compromissos. Cada conta tem o previsto anual e mensal, o que restou do ano anterior
 * e os lançamentos (dia e valor) de cada mês. Lançamento marcado "ano anterior" quita o que restou
 * do ano passado: entra no caixa do mês, mas não conta no realizado do ano.
 * Itens do tipo 'tesouraria' (servidor-local.js e supabase/relatorios.sql). O saldo anterior de cada ano
 * fica em cfg.tesouraria[ano].saldoAnterior. Só a Mesa (administrador) altera. */
(function () {
  'use strict';
  const A = () => window.IPB_APP;
  const H = () => window.IPB_REUNIAO.h;
  const GRUPOS = [
    { id: 'pastores', nome: 'Dízimo dos pastores', curto: 'Pastores', rec: true, col: 'Pastor ou seminarista' },
    { id: 'igrejas', nome: 'Contribuição das igrejas (3%)', curto: 'Igrejas', rec: true, col: 'Igreja ou congregação' },
    { id: 'despesas', nome: 'Despesas e compromissos', curto: 'Despesas', rec: false, col: 'Despesa' }
  ];
  const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const T = { aba: 'resumo', ate: {} };
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fm = v => nf2.format(Number(v) || 0);
  // aceita "1.348,63", "1348,63" e "1348.63"
  function valor(s) {
    s = String(s == null ? '' : s).replace(/[R$\s]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (!/^-?\d+(\.\d{1,2})?$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  const r2 = v => Math.round(v * 100) / 100;

  const contas = ano => H().itens('tesouraria').filter(c => Number(c.ano) === Number(ano)).sort((a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const doGrupo = (ano, g) => contas(ano).filter(c => c.grupo === g);
  const saldoAnterior = ano => { const t = H().cfg().tesouraria || {}; return Number((t[ano] || {}).saldoAnterior) || 0; };
  function anosTes() {
    const s = new Set(H().itens('tesouraria').map(c => Number(c.ano)));
    (window.IPB_ACERVO ? window.IPB_ACERVO.anos() : []).forEach(a => s.add(a));
    s.add(new Date().getFullYear());
    return [...s].filter(a => a > 1900).sort((a, b) => b - a);
  }
  function ultimoMes(ano) {
    let m = 0;
    contas(ano).forEach(c => (c.lancamentos || []).forEach(l => { if (Number(l.mes) > m) m = Number(l.mes); }));
    const y = new Date().getFullYear();
    if (ano < y) return 12;
    return m || (ano === y ? new Date().getMonth() + 1 : 1);
  }
  const ate = ano => T.ate[ano] || ultimoMes(ano);

  function calc(c, mAte) {
    const ls = c.lancamentos || [];
    const mes = Array.from({ length: 12 }, (_, i) => ls.filter(l => Number(l.mes) === i + 1));
    const realMes = mes.map(x => r2(x.filter(l => !l.ref).reduce((s, l) => s + (Number(l.valor) || 0), 0)));
    const caixaMes = mes.map(x => r2(x.reduce((s, l) => s + (Number(l.valor) || 0), 0)));
    const refAnt = r2(ls.filter(l => l.ref).reduce((s, l) => s + (Number(l.valor) || 0), 0));
    const realizado = r2(realMes.slice(0, mAte).reduce((s, v) => s + v, 0));
    const previsto = r2((Number(c.mensal) || 0) * mAte);
    return { mes, realMes, caixaMes, refAnt, realizado, previsto, dif: r2(realizado - previsto), pct: previsto ? realizado / previsto : null, resta: r2(Math.max(0, (Number(c.restoAnterior) || 0) - refAnt)) };
  }
  function pctPill(p, despesa) {
    if (p === null) return '<span class="muted">–</span>';
    const pc = Math.round(p * 1000) / 10;
    // receita: abaixo do previsto é alerta; despesa: acima do previsto é alerta
    const cls = despesa ? (p > 1.05 ? 'bad' : p >= .95 ? 'ok' : 'warn') : (p >= .95 ? 'ok' : p >= .75 ? 'warn' : 'bad');
    return `<span class="tes-pill ${cls}">${pc.toLocaleString('pt-BR')}%</span>`;
  }
  function resumoAno(ano, mAte) {
    const meses = Array.from({ length: 12 }, () => ({ pastores: 0, igrejas: 0, despesas: 0 }));
    const tot = { previstoRec: 0, realRec: 0, previstoDesp: 0, realDesp: 0 };
    contas(ano).forEach(c => {
      const k = calc(c, mAte);
      k.caixaMes.forEach((v, i) => { meses[i][c.grupo] = r2(meses[i][c.grupo] + v); });
      if (c.grupo === 'despesas') { tot.previstoDesp += k.previsto; tot.realDesp += k.realizado; } else { tot.previstoRec += k.previsto; tot.realRec += k.realizado; }
    });
    let saldo = saldoAnterior(ano);
    const linhas = meses.map((m, i) => { const ent = r2(m.pastores + m.igrejas); const res = r2(ent - m.despesas); saldo = r2(saldo + res); return { mes: i + 1, pastores: m.pastores, igrejas: m.igrejas, ent, sai: m.despesas, res, saldo }; });
    const ateM = linhas.slice(0, mAte);
    return { linhas, ent: r2(ateM.reduce((s, l) => s + l.ent, 0)), sai: r2(ateM.reduce((s, l) => s + l.sai, 0)), saldo: ateM.length ? ateM[ateM.length - 1].saldo : saldoAnterior(ano), tot };
  }

  /* ======================= tela ======================= */
  function tela(ano, aba) {
    const { esc, shell, head, $, $$ } = A();
    if (aba) T.aba = aba;
    const mAte = ate(ano);
    const adm = H().isAdmin();
    const res = resumoAno(ano, mAte);
    const nContas = contas(ano).length;
    const acoes = `<div class="row-wrap tes-acoes"><select id="tAno" aria-label="Ano">${anosTes().map(a => `<option ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <select id="tAte" aria-label="Até o mês">${MES3.map((m, i) => `<option value="${i + 1}" ${i + 1 === mAte ? 'selected' : ''}>até ${m}</option>`).join('')}</select>
      <button class="btn" id="tImp">Imprimir</button>${adm ? '<button class="btn primary" id="tLan">+ Lançamento</button>' : ''}</div>`;
    let html = head('Tesouraria', `Controle de caixa administrativo do ${esc(H().sigla())} em ${ano}, de janeiro até ${H().MESES[mAte - 1]}.`, acoes);
    html += `<div class="kpis">
      <div class="kpi"><div class="l">Saldo anterior</div><div class="v">${fm(saldoAnterior(ano))}</div>${adm ? '<button class="btn sm ghost" id="tSaldo">Alterar</button>' : '<div class="s">Restos de ' + (ano - 1) + '</div>'}</div>
      <div class="kpi"><div class="l">Entradas no período</div><div class="v">${fm(res.ent)}</div><div class="s">Arrecadado ${pctTxt(res.tot.realRec, res.tot.previstoRec)} do previsto</div></div>
      <div class="kpi"><div class="l">Saídas no período</div><div class="v">${fm(res.sai)}</div><div class="s">Gasto ${pctTxt(res.tot.realDesp, res.tot.previstoDesp)} do previsto</div></div>
      <div class="kpi"><div class="l">Saldo calculado</div><div class="v ${res.saldo < 0 ? 'neg' : ''}">${fm(res.saldo)}</div><div class="s">Saldo anterior + entradas − saídas</div></div></div>`;
    html += `<div class="tabs" role="tablist">${[['resumo', 'Resumo do ano']].concat(GRUPOS.map(g => [g.id, g.nome])).map(([k, n]) => `<button type="button" role="tab" data-aba="${k}" class="${T.aba === k ? 'on' : ''}" aria-selected="${T.aba === k}">${n}</button>`).join('')}</div>`;
    if (!nContas) {
      html += `<div class="card"><p style="margin-top:0">Ainda não há contas em ${ano}.</p>${adm ? `<div class="row-wrap">${contas(ano - 1).length ? `<button class="btn primary" id="tCopiar">Copiar as contas de ${ano - 1}</button>` : ''}<button class="btn" data-nova="pastores">+ Conta</button></div><p class="small muted">Ao copiar, o sistema traz as mesmas contas, com o previsto anual e mensal, e calcula o que restou de ${ano - 1} em cada uma.</p>` : '<p class="small muted">O tesoureiro ou a Mesa cadastra as contas do ano.</p>'}</div>`;
    } else if (T.aba === 'resumo') html += telaResumo(ano, mAte, res);
    else html += telaGrupo(ano, GRUPOS.find(g => g.id === T.aba) || GRUPOS[0], mAte);
    html += `<p class="small muted">Relatórios do tesoureiro em PDF ficam no <a href="#/acervo/${ano}/secao/tesouraria">Acervo › ${ano} › Tesouraria</a>.${adm ? '' : ' Só a Mesa altera os lançamentos.'}</p>`;
    shell('tesouraria', html);
    A().ligarTips(A().$('#main') || document.body);
    $('#tAno').onchange = e => A().ir('tesouraria/' + e.target.value);
    $('#tAte').onchange = e => { T.ate[ano] = Number(e.target.value); tela(ano); };
    $('#tImp').onclick = () => imprimir(ano);
    $$('[data-aba]').forEach(b => b.onclick = () => { T.aba = b.getAttribute('data-aba'); tela(ano); });
    if (!adm) return;
    $('#tLan').onclick = () => lancamento(ano, null, null);
    if ($('#tSaldo')) $('#tSaldo').onclick = () => editarSaldo(ano);
    if ($('#tCopiar')) $('#tCopiar').onclick = () => copiarAno(ano);
    $$('[data-nova]').forEach(b => b.onclick = () => editarConta(ano, { grupo: b.getAttribute('data-nova') }));
    $$('[data-conta]').forEach(b => b.onclick = () => editarConta(ano, contas(ano).find(c => c.id === b.getAttribute('data-conta'))));
    $$('td[data-cel]').forEach(td => td.onclick = () => { const [id, m] = td.getAttribute('data-cel').split('|'); lancamento(ano, contas(ano).find(c => c.id === id), Number(m)); });
  }
  const pctTxt = (r, p) => p ? (Math.round(r / p * 1000) / 10).toLocaleString('pt-BR') + '%' : '–';

  function telaResumo(ano, mAte, res) {
    const esc = A().esc;
    const ls = res.linhas.slice(0, Math.max(mAte, 1));
    const graf = A().barras(ls.map(l => MES3[l.mes - 1]), [{ nome: 'Entradas', cor: '#2c5234', vals: ls.map(l => l.ent) }, { nome: 'Saídas', cor: '#58595b', vals: ls.map(l => l.sai) }], (v, k) => k ? A().moneyK(v) : A().money(v), { label: 'Entradas e saídas por mês', h: 220 });
    const igs = doGrupo(ano, 'igrejas').map(c => { const k = calc(c, mAte); return { nome: c.nome, v: Math.round((k.pct || 0) * 1000) / 10, extra: `${fm(k.realizado)} de ${fm(k.previsto)}`, cor: (k.pct || 0) >= .95 ? '#2c5234' : (k.pct || 0) >= .75 ? '#c9902b' : '#b42318' }; });
    const pas = doGrupo(ano, 'pastores').filter(c => Number(c.mensal) > 0).map(c => { const k = calc(c, mAte); return { nome: c.nome, v: Math.round((k.pct || 0) * 1000) / 10, extra: `${fm(k.realizado)} de ${fm(k.previsto)}`, cor: (k.pct || 0) >= .95 ? '#2c5234' : (k.pct || 0) >= .75 ? '#c9902b' : '#b42318' }; });
    const pf = v => v.toLocaleString('pt-BR') + '%';
    return `<div class="tes-resumo">
      <div class="card"><div class="section-title" style="margin-top:0">Entradas e saídas por mês</div><div style="max-width:620px">${graf}</div></div>
      <div class="card"><div class="section-title" style="margin-top:0">Mês a mês</div><div class="tbl-wrap"><table class="tes-tbl"><thead><tr><th>Mês</th><th class="num">Pastores</th><th class="num">Igrejas</th><th class="num">Saídas</th><th class="num">Resultado</th><th class="num">Saldo</th></tr></thead><tbody>
        <tr class="muted"><td>Saldo anterior</td><td colspan="4"></td><td class="num">${fm(saldoAnterior(ano))}</td></tr>
        ${ls.map(l => `<tr><td>${esc(H().MESES[l.mes - 1])}</td><td class="num">${fm(l.pastores)}</td><td class="num">${fm(l.igrejas)}</td><td class="num">${fm(l.sai)}</td><td class="num ${l.res < 0 ? 'neg' : ''}">${fm(l.res)}</td><td class="num ${l.saldo < 0 ? 'neg' : ''}">${fm(l.saldo)}</td></tr>`).join('')}
      </tbody></table></div><p class="small muted" style="margin:6px 0 0">Conta tudo o que entrou e saiu no caixa, inclusive o que quitou o ano anterior.</p></div></div>
      <div class="grid g2">
        <div class="card"><div class="section-title" style="margin-top:0">Contribuição das igrejas: realizado sobre o previsto</div>${igs.length ? A().hbarras(igs, pf) : '<div class="list-empty">Sem igrejas.</div>'}</div>
        <div class="card"><div class="section-title" style="margin-top:0">Dízimo dos pastores: realizado sobre o previsto</div>${pas.length ? A().hbarras(pas, pf) : '<div class="list-empty">Sem pastores.</div>'}</div></div>`;
  }

  function tabelaGrupo(ano, g, mAte, paraImprimir) {
    const esc = A().esc;
    const cs = doGrupo(ano, g.id);
    const adm = H().isAdmin() && !paraImprimir;
    const tot = { anual: 0, mensal: 0, resto: 0, mes: Array(12).fill(0), real: 0, prev: 0 };
    const linhas = cs.map((c, i) => {
      const k = calc(c, mAte);
      tot.anual += Number(c.previstoAnual) || 0; tot.mensal += Number(c.mensal) || 0; tot.resto += Number(c.restoAnterior) || 0; tot.real += k.realizado; tot.prev += k.previsto;
      k.caixaMes.forEach((v, j) => { tot.mes[j] += v; });
      const cels = k.mes.slice(0, mAte).map((ls, j) => {
        const tip = ls.map(l => `Dia ${l.dia || '?'}: ${fm(l.valor)}${l.ref ? ' (ref. ' + (ano - 1) + ')' : ''}`).join('<br>');
        const ref = ls.some(l => l.ref);
        return `<td class="num tes-mes ${j + 1 > mAte ? 'fora' : ''} ${adm ? 'click' : ''}" ${adm ? `data-cel="${esc(c.id)}|${j + 1}"` : ''} ${tip ? `data-tip="${esc('<b>' + esc(c.nome) + ' · ' + MES3[j] + '</b><br>' + tip)}"` : ''}>${k.caixaMes[j] ? fm(k.caixaMes[j]) + (ref ? '<sup>*</sup>' : '') : ''}</td>`;
      }).join('');
      return `<tr><td class="num muted">${i + 1}</td><td class="tes-nome">${adm ? `<button type="button" class="lnk" data-conta="${esc(c.id)}">${esc(c.nome)}</button>` : esc(c.nome)}${c.obs ? `<div class="small muted">${esc(c.obs)}</div>` : ''}</td>
        <td class="num">${fm(c.previstoAnual)}</td><td class="num">${fm(c.mensal)}</td><td class="num">${c.restoAnterior ? fm(k.resta) + (k.refAnt ? `<div class="small muted">de ${fm(c.restoAnterior)}</div>` : '') : ''}</td>${cels}
        <td class="num"><b>${fm(k.realizado)}</b></td><td class="num">${fm(k.previsto)}</td><td class="num ${k.dif < 0 && g.rec ? 'neg' : ''}">${fm(k.dif)}</td><td class="num">${pctPill(k.pct, !g.rec)}</td></tr>`;
    }).join('');
    return `<div class="tbl-wrap"><table class="tes-tbl grande"><thead><tr><th>#</th><th>${g.col}</th><th class="num">Anual</th><th class="num">Mensal</th><th class="num">Resta ${ano - 1}</th>${MES3.slice(0, mAte).map(m => `<th class="num">${m}</th>`).join('')}<th class="num">Realizado</th><th class="num">Previsto p/ período</th><th class="num">Diferença</th><th class="num">%</th></tr></thead>
      <tbody>${linhas || `<tr><td colspan="${9 + mAte}" class="list-empty">Nenhuma conta neste grupo.</td></tr>`}</tbody>
      ${cs.length ? `<tfoot><tr><td></td><td><b>Total</b></td><td class="num">${fm(tot.anual)}</td><td class="num">${fm(tot.mensal)}</td><td class="num">${fm(tot.resto)}</td>${tot.mes.slice(0, mAte).map(v => `<td class="num">${v ? fm(v) : ''}</td>`).join('')}<td class="num"><b>${fm(tot.real)}</b></td><td class="num">${fm(tot.prev)}</td><td class="num">${fm(tot.real - tot.prev)}</td><td class="num">${pctPill(tot.prev ? tot.real / tot.prev : null, !g.rec)}</td></tr></tfoot>` : ''}
    </table></div>`;
  }
  function telaGrupo(ano, g, mAte) {
    return `<div class="card"><div class="row-wrap" style="justify-content:space-between;margin-bottom:8px"><div class="small muted">Valores do mês somam todos os lançamentos; <sup>*</sup> quita ${ano - 1} e não conta no realizado de ${ano}. ${H().isAdmin() ? 'Clique num mês para lançar e no nome para editar a conta. Para ver mais meses, mude o "até" no alto.' : ''}</div>
      ${H().isAdmin() ? `<button class="btn sm" data-nova="${g.id}">+ Conta</button>` : ''}</div>${tabelaGrupo(ano, g, mAte)}</div>`;
  }

  /* ======================= edição ======================= */
  async function salvar(item, msg) { return H().salvarItem('tesouraria', item, msg); }
  function editarConta(ano, c) {
    const { esc, modal, $ } = A();
    const novo = !c || !c.id;
    c = Object.assign({ grupo: 'pastores', nome: '', previstoAnual: '', mensal: '', restoAnterior: '', obs: '' }, c || {});
    const m = modal(novo ? 'Nova conta' : 'Conta: ' + esc(c.nome), `<div class="grid g2">
      <div class="field"><label for="cGr">Grupo</label><select id="cGr">${GRUPOS.map(g => `<option value="${g.id}" ${c.grupo === g.id ? 'selected' : ''}>${g.nome}</option>`).join('')}</select></div>
      <div class="field"><label for="cNo">Nome</label><input type="text" id="cNo" value="${esc(c.nome)}" placeholder="ex.: IP Maanaim, Rev. Fulano, Aluguel"></div>
      <div class="field"><label for="cAn">Previsto no ano (R$)</label><input type="text" inputmode="decimal" id="cAn" value="${c.previstoAnual !== '' ? fm(c.previstoAnual) : ''}"></div>
      <div class="field"><label for="cMe">Previsto por mês (R$)</label><input type="text" inputmode="decimal" id="cMe" value="${c.mensal !== '' ? fm(c.mensal) : ''}"><span class="help">Em branco: o anual dividido por 12.</span></div>
      <div class="field"><label for="cRe">Restou de ${ano - 1} (R$)</label><input type="text" inputmode="decimal" id="cRe" value="${c.restoAnterior ? fm(c.restoAnterior) : ''}"></div>
      <div class="field"><label for="cOr">Ordem na lista</label><input type="number" id="cOr" value="${esc(c.ordem || '')}"></div>
      <div class="field span2"><label for="cOb">Observação</label><input type="text" id="cOb" value="${esc(c.obs || '')}"></div></div>`,
      `${!novo ? '<button class="btn danger" id="cDel" style="margin-right:auto">Excluir</button>' : ''}<button class="btn" data-x>Cancelar</button><button class="btn primary" id="cOk">Salvar</button>`);
    $('[data-x]', m.el).onclick = m.fechar;
    $('#cOk', m.el).onclick = async () => {
      const an = valor($('#cAn', m.el).value), me = $('#cMe', m.el).value.trim() ? valor($('#cMe', m.el).value) : r2(an / 12);
      const ordem = Number($('#cOr', m.el).value) || (novo ? doGrupo(ano, $('#cGr', m.el).value).length + 1 : c.ordem);
      const ok = await salvar({ id: c.id, ano, grupo: $('#cGr', m.el).value, nome: $('#cNo', m.el).value.trim(), previstoAnual: an, mensal: me, restoAnterior: valor($('#cRe', m.el).value), ordem, obs: $('#cOb', m.el).value.trim(), lancamentos: c.lancamentos || [] }, 'Conta salva.');
      if (ok) { m.fechar(); A().render(); }
    };
    if ($('#cDel', m.el)) $('#cDel', m.el).onclick = async () => {
      if (!await A().confirmar(`Excluir a conta "${c.nome}" e todos os lançamentos dela em ${ano}?`, 'Excluir')) return;
      if (await A().acao(() => A().api({ action: 'reuniao', op: 'excluir', id: c.id }), 'Conta excluída.')) { await A().recarregar(); m.fechar(); A().render(); }
    };
  }
  function lancamento(ano, c, mes) {
    const { esc, modal, $, $$ } = A();
    const cs = contas(ano);
    if (!cs.length) return A().toast('Cadastre as contas do ano primeiro.', true);
    c = c || cs[0]; mes = mes || ate(ano);
    const linha = l => `<div class="tes-lan"><input type="number" min="1" max="31" class="lDia" value="${esc(l.dia || '')}" aria-label="Dia" placeholder="dia"><input type="text" inputmode="decimal" class="lVal" value="${l.valor ? fm(l.valor) : ''}" aria-label="Valor" placeholder="0,00"><label class="chk small"><input type="checkbox" class="lRef" ${l.ref ? 'checked' : ''}> ref. ${ano - 1}</label><button type="button" class="btn sm ghost lTira" aria-label="Tirar">×</button></div>`;
    const lista = (cc, mm) => { const ls = (cc.lancamentos || []).filter(l => Number(l.mes) === mm); return (ls.length ? ls : [{}]).map(linha).join(''); };
    const m = modal('Lançamentos', `<div class="grid g2">
      <div class="field"><label for="lCo">Conta</label><select id="lCo">${GRUPOS.map(g => `<optgroup label="${g.nome}">${doGrupo(ano, g.id).map(x => `<option value="${esc(x.id)}" ${x.id === c.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="field"><label for="lMe">Mês</label><select id="lMe">${H().MESES.map((n, i) => `<option value="${i + 1}" ${i + 1 === mes ? 'selected' : ''}>${n} de ${ano}</option>`).join('')}</select></div></div>
      <div class="lbl" style="margin-top:10px">Dia e valor de cada entrada ou pagamento no mês</div><div id="lLis">${lista(c, mes)}</div>
      <button type="button" class="btn sm" id="lMais" style="margin-top:6px">+ Outro lançamento no mês</button>
      <p class="small muted">Marque "ref. ${ano - 1}" quando o valor quita o que ficou do ano anterior.</p>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="lOk">Salvar</button>');
    const ligarTira = () => $$('.lTira', m.el).forEach(b => b.onclick = () => b.parentElement.remove());
    const recarregarLista = () => { const cc = cs.find(x => x.id === $('#lCo', m.el).value); $('#lLis', m.el).innerHTML = lista(cc, Number($('#lMe', m.el).value)); ligarTira(); };
    $('#lCo', m.el).onchange = recarregarLista; $('#lMe', m.el).onchange = recarregarLista;
    $('#lMais', m.el).onclick = () => { $('#lLis', m.el).insertAdjacentHTML('beforeend', linha({})); ligarTira(); };
    ligarTira();
    $('[data-x]', m.el).onclick = m.fechar;
    $('#lOk', m.el).onclick = async () => {
      const cc = cs.find(x => x.id === $('#lCo', m.el).value), mm = Number($('#lMe', m.el).value);
      const novos = $$('.tes-lan', m.el).map(el => ({ mes: mm, dia: Number($('.lDia', el).value) || '', valor: valor($('.lVal', el).value), ref: $('.lRef', el).checked })).filter(l => l.valor);
      if (novos.some(l => l.dia && (l.dia < 1 || l.dia > 31))) return A().toast('Dia inválido.', true);
      const lancamentos = (cc.lancamentos || []).filter(l => Number(l.mes) !== mm).concat(novos).sort((a, b) => a.mes - b.mes || (a.dia || 0) - (b.dia || 0));
      if (await salvar(Object.assign({}, cc, { lancamentos }), 'Lançamentos salvos.')) { m.fechar(); A().render(); }
    };
  }
  function editarSaldo(ano) {
    const { modal, $ } = A();
    const m = modal('Saldo anterior de ' + ano, `<div class="field"><label for="sVa">Saldo que passou de ${ano - 1} (R$)</label><input type="text" inputmode="decimal" id="sVa" value="${fm(saldoAnterior(ano))}"></div>`, '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="sOk">Salvar</button>');
    $('[data-x]', m.el).onclick = m.fechar;
    $('#sOk', m.el).onclick = async () => {
      const t = Object.assign({}, H().cfg().tesouraria || {}); t[ano] = Object.assign({}, t[ano] || {}, { saldoAnterior: valor($('#sVa', m.el).value) });
      if (await H().salvarItem('cfg', { tesouraria: t }, 'Saldo salvo.')) { m.fechar(); A().render(); }
    };
  }
  async function copiarAno(ano) {
    const ant = contas(ano - 1);
    if (!await A().confirmar(`Criar em ${ano} as ${ant.length} contas de ${ano - 1}, com o mesmo previsto e o que restou de cada uma?`, 'Copiar')) return;
    const itens = ant.map(c => { const k = calc(c, 12); return { tipo: 'tesouraria', id: 'te_' + ano + '_' + c.id.replace(/^te_(\d{4}_)?/, ''), ano, grupo: c.grupo, nome: c.nome, ordem: c.ordem, previstoAnual: c.previstoAnual, mensal: c.mensal, restoAnterior: c.grupo === 'despesas' ? 0 : r2(Math.max(0, (Number(c.previstoAnual) || 0) - k.realizado) + k.resta), lancamentos: [], obs: '' }; });
    const r = await A().acao(() => A().api({ action: 'reuniao', op: 'importar', itens }), itens.length + ' contas criadas.');
    if (r) { await A().recarregar(); A().render(); }
  }
  function imprimir(ano) {
    const mAte = ate(ano), res = resumoAno(ano, mAte), esc = A().esc;
    const corpo = `<h2 style="text-align:center;margin:0">ANO ${ano} · CONTROLE DE CAIXA ADMINISTRATIVO DO ${esc(H().sigla())}</h2><p style="text-align:center;margin:4px 0 12px">De janeiro até ${H().MESES[mAte - 1]} · Saldo anterior: ${fm(saldoAnterior(ano))} · Entradas: ${fm(res.ent)} · Saídas: ${fm(res.sai)} · Saldo: ${fm(res.saldo)}</p>` +
      GRUPOS.map(g => `<h3>${g.nome}</h3>${tabelaGrupo(ano, g, mAte, true)}`).join('');
    H().imprimir('Tesouraria ' + ano, `<style>@page{size:A4 landscape;margin:10mm}table{border-collapse:collapse;width:100%;font-size:8pt}th,td{border:1px solid #999;padding:2px 3px}.num{text-align:right;white-space:nowrap}.fora{color:#aaa}.tes-pill{font-weight:bold}h3{margin:14px 0 4px;color:#2c5234}</style>${corpo}`);
  }

  function render(a) {
    if (!A().S.d.reuniao) A().S.d.reuniao = [];
    const ano = Number(a[0]) || (window.IPB_ACERVO ? window.IPB_ACERVO.anoPadrao() : new Date().getFullYear());
    return tela(ano, a[1]);
  }
  window.IPB_TESOURARIA = { render, calc, valor };
})();
