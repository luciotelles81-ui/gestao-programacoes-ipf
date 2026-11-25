/* Acervo de documentos do presbitério.
 * Organiza tudo por ano e por seção. Em "Reuniões do concílio" cada reunião é uma pasta, em ordem
 * histórica (a ordinária e depois cada extraordinária), com a convocação, as atas, os relatórios e os
 * anexos juntos. O usuário escolhe ver em lista ou em ícones; a escolha fica guardada no navegador.
 * Usa as funções do app (window.IPB_APP) e do módulo da reunião (window.IPB_REUNIAO.h). */
(function () {
  'use strict';
  const A = () => window.IPB_APP;
  const H = () => window.IPB_REUNIAO.h;
  const VISTA_KEY = 'ipb-acervo-vista';
  const ORDEM_KEY = 'ipb-acervo-ordem';
  const ANOS_PADRAO = [2025, 2026, 2027];
  const SECOES = [
    { id: 'reunioes', nome: 'Reuniões do concílio', desc: 'A ordinária e as extraordinárias, em ordem. Cada uma com convocação, atas, relatórios e anexos.' },
    { id: 'executiva', nome: 'Comissão Executiva', desc: 'Atas e resoluções da Comissão Executiva entre as reuniões.' },
    { id: 'tesouraria', nome: 'Tesouraria', desc: 'Movimento financeiro, balancetes e exame de contas.' },
    { id: 'concilios', nome: 'Sínodo e Supremo Concílio', desc: 'Convocações e decisões dos concílios superiores.' },
    { id: 'correspondencia', nome: 'Correspondência', desc: 'Ofícios recebidos e enviados.' },
    { id: 'outros', nome: 'Outros documentos', desc: 'O que não se encaixa nas outras seções.' }
  ];
  const PERM = { id: 'institucional', nome: 'Estatuto, regimento e normas', desc: 'Documentos permanentes, que valem para todos os anos.' };
  const Q = { busca: '' };
  const urls = {}; // id -> { url, nome, tipo }

  const vista = () => H().lsGet(VISTA_KEY) === 'lista' ? 'lista' : 'icones';
  const ordem = () => H().lsGet(ORDEM_KEY) || 'data';
  const docs = () => H().itens('documento');
  function anoDoc(d) { if (d.reuniaoId) { const r = H().reuniao(d.reuniaoId); return r ? Number(r.ano) : null; } return d.ano ? Number(d.ano) : null; }
  function secaoDoc(d) { return d.reuniaoId ? 'reunioes' : (d.secao || 'outros'); }
  function anos() {
    const c = H().cfg();
    const s = new Set((Array.isArray(c.anos) && c.anos.length ? c.anos : ANOS_PADRAO).map(Number));
    H().reunioes().forEach(r => s.add(Number(r.ano)));
    docs().forEach(d => { const a = anoDoc(d); if (a && secaoDoc(d) !== 'institucional') s.add(a); });
    return [...s].filter(a => a > 1900).sort((a, b) => b - a);
  }
  function anoPadrao() { const as = anos(); const y = new Date().getFullYear(); return as.includes(y) ? y : as[0] || y; }
  // reuniões do ano em ordem histórica: data de início, depois ordinária antes de extraordinária, depois número
  function reunioesDoAno(ano) {
    return H().reunioes().filter(r => Number(r.ano) === Number(ano)).sort((a, b) =>
      String(a.dataInicio || '9999').localeCompare(String(b.dataInicio || '9999')) || ((a.tipoReuniao === 'E') - (b.tipoReuniao === 'E')) || (a.numero - b.numero));
  }
  function nomeCurto(r) { return r.tipoReuniao === 'E' ? `${r.numero}ª Extraordinária` : `${r.numero}ª Ordinária`; }
  function ordenar(lista) {
    const o = ordem(), n = H().numero;
    const dataDe = d => d.data || (d.arquivo && d.arquivo.em) || d.createdAt || '';
    return lista.slice().sort((a, b) => o === 'nome' ? String(a.titulo).localeCompare(String(b.titulo), 'pt-BR')
      : o === 'numero' ? (n(a.numero) || 1e9) - (n(b.numero) || 1e9) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR')
      : String(dataDe(a)).localeCompare(String(dataDe(b))) || (n(a.numero) || 1e9) - (n(b.numero) || 1e9) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));
  }

  /* ---------- ícones e itens ---------- */
  function extensao(d) {
    const t = (d.arquivo && (d.arquivo.tipo + ' ' + d.arquivo.nome)) || '';
    if (!d.arquivo) return '';
    if (/pdf/i.test(t)) return 'PDF';
    if (/image\//.test(t)) return 'IMG';
    if (/word|msword|\.docx?$/i.test(t)) return 'DOC';
    if (/sheet|excel|\.xlsx?$/i.test(t)) return 'XLS';
    return 'ARQ';
  }
  const SVG_PASTA = '<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M2 8a4 4 0 0 1 4-4h12l5 5h19a4 4 0 0 1 4 4v21a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="currentColor" opacity=".18"/><path d="M2 14h44v20a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="currentColor"/></svg>';
  function iconeArq(d) {
    const e = extensao(d);
    return `<span class="acv-ic ${e ? 'ext-' + e.toLowerCase() : 'vazio'}" aria-hidden="true"><svg viewBox="0 0 36 44"><path d="M3 3h20l10 10v28H3z" fill="var(--surface)" stroke="currentColor" stroke-width="2"/><path d="M23 3v10h10" fill="none" stroke="currentColor" stroke-width="2"/></svg><b>${e || '—'}</b>${d.restrito ? '<i class="acv-lock" title="Acesso restrito">🔒</i>' : ''}</span>`;
  }
  function metaDoc(d) {
    const p = [];
    if (d.numero) p.push('Doc ' + d.numero);
    if (d.data) p.push(H().dataBr(d.data));
    if (d.origem) p.push(d.origem);
    return p.join(' · ');
  }
  function itemDoc(d, comLocal) {
    const esc = A().esc;
    const loc = comLocal ? `<span class="acv-loc">${esc(caminhoDoc(d))}</span>` : '';
    return `<button type="button" class="acv-item" data-doc="${esc(d.id)}" title="${esc(d.titulo)}">${iconeArq(d)}<span class="acv-t">${esc(d.titulo)}</span><span class="acv-m">${esc(metaDoc(d))}</span>${loc}</button>`;
  }
  function linhaDoc(d, comLocal) {
    const esc = A().esc;
    return `<tr class="click" data-doc="${esc(d.id)}"><td><div class="acv-nome">${iconeArq(d)}<div><b>${esc(d.titulo)}</b>${d.resumo ? `<div class="small muted acv-res">${esc(d.resumo)}</div>` : ''}${comLocal ? `<div class="small muted">${esc(caminhoDoc(d))}</div>` : ''}</div></div></td>
      <td class="small">${esc(d.tipoDoc || '')}</td><td class="small nowrap">${esc(d.data ? H().dataBr(d.data) : '')}</td><td class="num small">${esc(d.numero || '')}</td><td class="small nowrap">${d.arquivo ? esc(A().tamanho(d.arquivo.tamanho || 0)) : '<span class="muted">sem arquivo</span>'}</td></tr>`;
  }
  function listaDocs(lista, comLocal, vazio) {
    if (!lista.length) return `<div class="acv-vazio">${vazio || 'Nenhum arquivo aqui.'}</div>`;
    if (vista() === 'lista') return `<div class="tbl-wrap"><table class="acv-tbl"><thead><tr><th>Nome</th><th>Tipo</th><th>Data</th><th>Doc nº</th><th>Tamanho</th></tr></thead><tbody>${lista.map(d => linhaDoc(d, comLocal)).join('')}</tbody></table></div>`;
    return `<div class="acv-grid">${lista.map(d => itemDoc(d, comLocal)).join('')}</div>`;
  }
  function caminhoDoc(d) {
    if (d.reuniaoId) { const r = H().reuniao(d.reuniaoId); const p = (H().PASTAS_DOC.find(x => x[0] === H().pastaAuto(d)) || [])[1]; return `${r ? r.ano + ' › ' + nomeCurto(r) : 'Reunião'} › ${p || ''}`; }
    if (d.secao === 'institucional') return PERM.nome;
    const s = SECOES.find(x => x.id === secaoDoc(d));
    return `${d.ano || ''} › ${s ? s.nome : 'Outros'}`;
  }
  function pastaCard(href, titulo, sub, n, extra) {
    const esc = A().esc;
    if (vista() === 'lista') return `<tr class="click" data-href="${esc(href)}"><td><div class="acv-nome"><span class="acv-pasta-ic">${SVG_PASTA}</span><div><b>${esc(titulo)}</b>${sub ? `<div class="small muted">${esc(sub)}</div>` : ''}</div></div></td><td class="small">${extra || ''}</td><td class="num small">${n} arquivo(s)</td></tr>`;
    return `<a class="acv-pasta" href="#/${esc(href)}"><span class="acv-pasta-ic">${SVG_PASTA}</span><span class="acv-t">${esc(titulo)}</span><span class="acv-m">${esc(sub || '')}</span><span class="acv-m">${n} arquivo(s)${extra ? ' · ' + extra : ''}</span></a>`;
  }
  const envolvePastas = cards => vista() === 'lista' ? `<div class="tbl-wrap"><table class="acv-tbl"><tbody>${cards}</tbody></table></div>` : `<div class="acv-grid pastas">${cards}</div>`;

  /* ---------- moldura comum (anos à esquerda, barra de ferramentas) ---------- */
  function moldura(ano, migalhas, corpo, ctx) {
    const { esc, shell, head } = A();
    const as = anos();
    const rail = `<nav class="acv-rail" aria-label="Anos do acervo">
      <div class="lbl">Anos</div>
      ${as.map(a => `<a href="#/acervo/${a}" class="${Number(ano) === a ? 'on' : ''}">${SVG_PASTA}<span>${a}</span><small>${contarAno(a)}</small></a>`).join('')}
      ${H().isAdmin() ? '<button class="btn sm ghost" id="acvAno" type="button">+ Ano</button>' : ''}
      <div class="lbl" style="margin-top:12px">Permanentes</div>
      <a href="#/acervo/permanentes" class="${ano === 'permanentes' ? 'on' : ''}">${SVG_PASTA}<span>Estatuto e normas</span><small>${docs().filter(d => !d.reuniaoId && d.secao === 'institucional').length}</small></a>
      <div class="lbl" style="margin-top:12px">Ambientes</div>
      <a href="#/tesouraria/${typeof ano === 'number' ? ano : anoPadrao()}">$ <span>Tesouraria</span></a>
    </nav>`;
    const v = vista();
    const tools = `<div class="acv-tools">
      <nav class="acv-bc" aria-label="Caminho">${migalhas.map((m, i) => i < migalhas.length - 1 ? `<a href="#/${esc(m[1])}">${esc(m[0])}</a><span>›</span>` : `<b>${esc(m[0])}</b>`).join('')}</nav>
      <div class="row-wrap">
        <input type="search" id="acvBusca" placeholder="Buscar em todo o acervo" value="${esc(Q.busca)}" aria-label="Buscar no acervo">
        <select id="acvOrd" aria-label="Ordenar">${[['data', 'Ordem: data'], ['nome', 'Ordem: nome'], ['numero', 'Ordem: Doc nº']].map(([k, n]) => `<option value="${k}" ${ordem() === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Forma de ver"><button type="button" data-vista="icones" class="${v === 'icones' ? 'on' : ''}" aria-pressed="${v === 'icones'}">▦ Ícones</button><button type="button" data-vista="lista" class="${v === 'lista' ? 'on' : ''}" aria-pressed="${v === 'lista'}">☰ Lista</button></div>
        ${ctx && H().isAdmin() ? `<label class="btn primary sm">⇪ Enviar arquivos<input type="file" id="acvUp" multiple accept="${esc(H().ACEITOS)}" hidden></label>` : ''}
      </div></div>`;
    const busca = Q.busca.trim() ? resultadosBusca() : '';
    shell('acervo', head('Acervo de documentos', 'Todos os documentos do presbitério, por ano e por seção. Clique num arquivo para ver sem baixar.') +
      `<div class="acv">${rail}<section class="acv-main ${ctx && H().isAdmin() ? 'acv-drop' : ''}" id="acvMain">${tools}${busca || corpo}
      ${ctx && H().isAdmin() ? '<div class="acv-dz small muted">Arraste arquivos para cá para guardar nesta pasta (PDF, imagem, Word ou Excel, até 15 MB cada).</div>' : ''}
      <p class="small muted acv-seg">Acesso só para usuários cadastrados. Cada envio guarda quem enviou, quando e a impressão digital do arquivo (SHA-256), e fica no registro de ações.</p></section></div>`);
    ligar(ctx);
  }
  function contarAno(a) { return docs().filter(d => anoDoc(d) === a && secaoDoc(d) !== 'institucional').length; }
  function resultadosBusca() {
    const q = Q.busca.trim().toLowerCase();
    const l = ordenar(docs().filter(d => [d.titulo, d.resumo, d.origem, d.tipoDoc, d.numero, d.arquivo && d.arquivo.nome].join(' ').toLowerCase().includes(q)));
    return `<div class="section-title">Resultado da busca <span class="small muted">${l.length} documento(s) para "${A().esc(Q.busca.trim())}"</span></div>${listaDocs(l, true, 'Nada encontrado.')}`;
  }

  /* ---------- telas ---------- */
  function telaAno(ano) {
    const esc = A().esc;
    const rs = reunioesDoAno(ano);
    const reuCards = rs.map(r => {
      const ds = docs().filter(d => d.reuniaoId === r.id);
      const temConv = ds.some(d => H().pastaAuto(d) === 'convocacao');
      const temAta = ds.some(d => H().pastaAuto(d) === 'ata') || H().itens('ata').some(a => a.reuniaoId === r.id);
      const sub = [H().periodo(r), r.local].filter(Boolean).join(' · ');
      return pastaCard(`acervo/${ano}/reuniao/${encodeURIComponent(r.id)}`, nomeCurto(r) + (r.codigo ? ' · ' + r.codigo : ''), sub, ds.length,
        `${temConv ? 'convocação ✓' : 'sem convocação'} · ${temAta ? 'ata ✓' : 'sem ata'}`);
    }).join('');
    const secCards = SECOES.slice(1).map(s => pastaCard(`acervo/${ano}/secao/${s.id}`, s.nome, s.desc, docs().filter(d => !d.reuniaoId && secaoDoc(d) === s.id && anoDoc(d) === ano).length)).join('');
    const corpo = `<div class="section-title">Reuniões do concílio <span class="small muted">em ordem histórica</span></div>
      ${rs.length ? `<div class="acv-linha">${envolvePastas(reuCards)}</div>` : `<div class="acv-vazio">Nenhuma reunião em ${ano}. ${H().isAdmin() ? '<a href="#/reunioes">Cadastrar reunião</a>' : ''}</div>`}
      <div class="section-title">Seções de ${ano}</div>${envolvePastas(secCards)}`;
    moldura(ano, [['Acervo', 'acervo'], [String(ano), 'acervo/' + ano]], corpo, null);
    void esc;
  }
  function telaSecao(ano, sec) {
    const s = SECOES.find(x => x.id === sec) || SECOES[SECOES.length - 1];
    const l = ordenar(docs().filter(d => !d.reuniaoId && secaoDoc(d) === s.id && anoDoc(d) === ano));
    const extra = s.id === 'tesouraria' ? `<p style="margin:0 0 12px"><a class="btn sm" href="#/tesouraria/${ano}">Abrir a tesouraria de ${ano}</a></p>` : '';
    moldura(ano, [['Acervo', 'acervo'], [String(ano), 'acervo/' + ano], [s.nome, '']], `<p class="muted small" style="margin:0 0 10px">${A().esc(s.desc)}</p>${extra}${listaDocs(l, false, 'Nenhum arquivo nesta seção.' + (H().isAdmin() ? ' Use "Enviar arquivos" ou arraste para cá.' : ''))}`, { secao: s.id, ano });
  }
  function telaPermanentes() {
    const l = ordenar(docs().filter(d => !d.reuniaoId && d.secao === 'institucional'));
    moldura('permanentes', [['Acervo', 'acervo'], [PERM.nome, '']], `<p class="muted small" style="margin:0 0 10px">${PERM.desc}</p>${listaDocs(l, false, 'Nenhum documento permanente ainda.')}`, { secao: 'institucional' });
  }
  function telaPastaReuniao(ano, rid) {
    const { esc } = A();
    const r = H().reuniao(rid);
    if (!r) return telaAno(ano);
    const seq = reunioesDoAno(r.ano), i = seq.findIndex(x => x.id === r.id);
    const ant = seq[i - 1], prox = seq[i + 1];
    const ds = docs().filter(d => d.reuniaoId === r.id);
    const ata = H().itens('ata').find(a => a.reuniaoId === r.id);
    const pres = (r.mesa || []).find(x => /^presidente$/i.test(x.cargo));
    const pauta = String(r.pauta || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    let corpo = `<div class="card acv-reu ${r.tipoReuniao === 'E' ? 'extra' : ''}">
      <div class="row-wrap" style="justify-content:space-between"><div><span class="tag ${r.tipoReuniao === 'E' ? 'gray' : ''}">${H().tipoNome(r)}</span> <b>${esc(r.nome || r.codigo || '')}</b>
        <div class="small muted">${esc([H().periodo(r), r.local].filter(Boolean).join(' · '))}</div></div>
        <div class="row-wrap"><a class="btn sm" href="#/ata-geral/${encodeURIComponent(r.id)}">${ata ? 'Ata no sistema' : 'Lavrar ata'}</a><button class="btn sm" type="button" id="acvUsar">Abrir a reunião</button>${H().isAdmin() ? '<a class="btn sm ghost" href="#/reunioes">Editar</a>' : ''}</div></div>
      ${r.dataConvocacao || r.convocadaPor ? `<p class="small" style="margin:8px 0 0">Convocada${r.dataConvocacao ? ' em ' + esc(H().dataBr(r.dataConvocacao)) : ''}${r.convocadaPor ? ' por ' + esc(r.convocadaPor) : ''}.</p>` : ''}
      ${pauta.length ? `<details class="small" style="margin-top:6px"><summary><b>Pauta</b> (${pauta.length} ${pauta.length > 1 ? 'itens' : 'item'})</summary><ol style="margin:4px 0 0;padding-left:20px">${pauta.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>` : ''}
      ${pres && pres.nome ? `<p class="small muted" style="margin:6px 0 0">Presidente: ${esc(H().nomeMesa(pres))}</p>` : ''}
      <div class="acv-seq">${ant ? `<a href="#/acervo/${ano}/reuniao/${encodeURIComponent(ant.id)}">← ${esc(nomeCurto(ant))}</a>` : '<span></span>'}<span class="small muted">${i + 1} de ${seq.length} em ${r.ano}</span>${prox ? `<a href="#/acervo/${ano}/reuniao/${encodeURIComponent(prox.id)}">${esc(nomeCurto(prox))} →</a>` : '<span></span>'}</div></div>`;
    H().PASTAS_DOC.forEach(([k, nome]) => {
      const l = ordenar(ds.filter(d => H().pastaAuto(d) === k));
      corpo += `<div class="section-title">${esc(nome)} <span class="small muted">${l.length}</span>${H().isAdmin() ? `<label class="btn sm ghost" style="margin-left:auto">+ Enviar<input type="file" data-up-pasta="${k}" multiple accept="${esc(H().ACEITOS)}" hidden></label>` : ''}</div>${listaDocs(l, false, k === 'ata' && ata ? 'Ata lavrada no sistema: use "Ata no sistema". Para guardar a ata assinada, envie o PDF.' : 'Nenhum arquivo.')}`;
    });
    const ps = H().pareceres(r.id);
    if (ps.length) corpo += `<div class="section-title">Pareceres das comissões <span class="small muted">${ps.length}</span></div><div class="tbl-wrap"><table class="acv-tbl"><tbody>${ps.map(p => `<tr class="click" data-href="parecer/${esc(p.id)}"><td><b>${esc(p.assunto || p.titulo || '')}</b><div class="small muted">${esc((H().comissao(p.comissaoId) || {}).nome || '')}${p.docNumero ? ' · Doc ' + esc(p.docNumero) : ''}</div></td><td class="small">${H().chip(p.status)}</td></tr>`).join('')}</tbody></table></div>`;
    moldura(Number(r.ano), [['Acervo', 'acervo'], [String(r.ano), 'acervo/' + r.ano], ['Reuniões', 'acervo/' + r.ano], [nomeCurto(r), '']], corpo, { reuniaoId: r.id });
    const b = A().$('#acvUsar'); if (b) b.onclick = () => { H().lsSet(H().REU_KEY, r.id); A().ir('reuniao'); };
  }

  /* ---------- interação ---------- */
  function ligar(ctx) {
    const { $, $$ } = A();
    $$('[data-vista]').forEach(b => b.onclick = () => { H().lsSet(VISTA_KEY, b.getAttribute('data-vista')); A().render(); });
    $('#acvOrd').onchange = e => { H().lsSet(ORDEM_KEY, e.target.value); A().render(); };
    let t; $('#acvBusca').oninput = e => { clearTimeout(t); t = setTimeout(() => { Q.busca = e.target.value; A().render(); const b = $('#acvBusca'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 250); };
    $$('[data-doc]').forEach(el => el.onclick = () => verDoc(el.getAttribute('data-doc')));
    $$('tr[data-href]').forEach(el => el.onclick = () => A().ir(el.getAttribute('data-href')));
    if ($('#acvAno')) $('#acvAno').onclick = novoAno;
    if (!ctx || !H().isAdmin()) return;
    if ($('#acvUp')) $('#acvUp').onchange = e => enviar(Array.from(e.target.files || []), ctx);
    $$('[data-up-pasta]').forEach(inp => inp.onchange = e => enviar(Array.from(e.target.files || []), Object.assign({}, ctx, { pasta: inp.getAttribute('data-up-pasta') })));
    const zona = $('#acvMain');
    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); zona.classList.add('sobre'); } }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { if (ev === 'dragleave' && zona.contains(e.relatedTarget)) return; zona.classList.remove('sobre'); }));
    zona.addEventListener('drop', e => { e.preventDefault(); const fs = Array.from((e.dataTransfer && e.dataTransfer.files) || []); if (fs.length) enviar(fs, ctx); });
  }
  const tituloDe = nome => String(nome).replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  async function enviar(files, ctx) {
    if (!files.length) return;
    let ok = 0, ult = null;
    for (const f of files) {
      const base = { titulo: tituloDe(f.name), arquivoNome: '', resumo: '', origem: '', tipoDoc: '', comissaoId: '', numero: '' };
      const item = ctx.reuniaoId ? Object.assign(base, { reuniaoId: ctx.reuniaoId, pasta: ctx.pasta || H().pastaAuto(base), ano: (H().reuniao(ctx.reuniaoId) || {}).ano || '' })
        : Object.assign(base, { reuniaoId: '', secao: ctx.secao, ano: ctx.secao === 'institucional' ? '' : ctx.ano });
      A().toast(`Enviando ${ok + 1} de ${files.length}: ${f.name}`);
      const r = await A().acao(() => A().api({ action: 'reuniao', op: 'salvar', tipo: 'documento', item }));
      if (!r) continue;
      if (await H().enviarArquivoDoc(r.item.id, f)) { ok++; ult = r.item.id; }
    }
    await A().recarregar();
    A().toast(`${ok} arquivo(s) guardado(s).`, ok < files.length);
    A().render();
    if (files.length === 1 && ult) H().editarDocumento(docs().find(d => d.id === ult));
  }
  function novoAno() {
    const { modal, $ } = A();
    const m = modal('Novo ano no acervo', `<div class="field"><label for="nAno">Ano</label><input type="number" id="nAno" min="1900" max="2200" value="${Math.max(...anos(), new Date().getFullYear()) + 1}"><span class="help">Pode ser um ano futuro ou passado. As seções do ano são criadas na hora.</span></div>`,
      '<button class="btn" data-x>Cancelar</button><button class="btn primary" id="nOk">Criar</button>');
    $('[data-x]', m.el).onclick = m.fechar;
    $('#nOk', m.el).onclick = async () => {
      const a = Number($('#nAno', m.el).value);
      if (!(a > 1900 && a < 2200)) return A().toast('Informe um ano válido.', true);
      const lista = [...new Set(anos().concat(a))].sort((x, y) => x - y);
      if (await H().salvarItem('cfg', { anos: lista }, 'Ano ' + a + ' criado.')) { m.fechar(); A().ir('acervo/' + a); }
    };
  }
  async function obter(id) {
    if (urls[id]) return urls[id];
    const x = await A().api({ action: 'reuniao', op: 'arquivo', id });
    const raw = x.blob || await (await fetch(x.dados)).blob();
    const blob = raw.type ? raw : new Blob([raw], { type: x.tipo || 'application/pdf' });
    urls[id] = { url: URL.createObjectURL(blob), nome: x.nome || 'documento', tipo: x.tipo || blob.type };
    return urls[id];
  }
  function baixarDoc(o) { const a = document.createElement('a'); a.href = o.url; a.download = o.nome; document.body.appendChild(a); a.click(); a.remove(); }
  async function verDoc(id) {
    const { esc, modal, $ } = A();
    const d = docs().find(x => x.id === id);
    if (!d) return;
    const r = d.reuniaoId ? H().reuniao(d.reuniaoId) : null;
    const c = d.comissaoId ? H().comissao(d.comissaoId) : null;
    const ar = d.arquivo || {};
    const det = [['Local', caminhoDoc(d)], ['Tipo', d.tipoDoc], ['Doc nº', d.numero], ['Data', d.data ? H().dataBr(d.data) : ''], ['Origem', d.origem], ['Reunião', r ? r.codigo || r.nome : ''], ['Comissão', c ? c.nome : ''],
      ['Arquivo', ar.nome ? `${ar.nome} (${A().tamanho(ar.tamanho || 0)})` : 'Nenhum arquivo enviado'], ['Enviado', ar.em ? A().dt(ar.em, true) + (ar.por ? ' por ' + ar.por : '') : ''], ['SHA-256', ar.sha256 || ''], ['Acesso', d.restrito ? 'Restrito à Mesa' : 'Usuários cadastrados']].filter(x => x[1]);
    const m = modal(esc(d.titulo), `<div class="acv-prev"><div class="acv-prev-doc" id="pvDoc">${d.arquivo ? '<div class="acv-vazio">Abrindo…</div>' : '<div class="acv-vazio">Este documento ainda não tem arquivo.</div>'}</div>
      <aside class="acv-prev-info">${d.resumo ? `<p style="margin-top:0">${esc(d.resumo)}</p>` : ''}<dl>${det.map(([k, v]) => `<dt>${esc(k)}</dt><dd class="${k === 'SHA-256' ? 'hash' : ''}">${esc(v)}</dd>`).join('')}</dl></aside></div>`,
      `${H().isAdmin() ? '<button class="btn" id="pvEd" style="margin-right:auto">Editar ou mover</button>' : ''}${d.arquivo ? '<button class="btn" id="pvAba">Abrir em nova aba</button><button class="btn primary" id="pvBx">Baixar</button>' : ''}<button class="btn" data-x>Fechar</button>`, true);
    m.el.querySelector('.modal').classList.add('xl');
    $('[data-x]', m.el).onclick = m.fechar;
    if ($('#pvEd', m.el)) $('#pvEd', m.el).onclick = () => { m.fechar(); H().editarDocumento(d); };
    if (!d.arquivo) return;
    try {
      const o = await obter(id);
      const box = $('#pvDoc', m.el); if (!box) return;
      if (/pdf/.test(o.tipo)) box.innerHTML = `<iframe src="${esc(o.url)}" title="${esc(d.titulo)}"></iframe>`;
      else if (/^image\//.test(o.tipo)) box.innerHTML = `<img src="${esc(o.url)}" alt="${esc(d.titulo)}">`;
      else box.innerHTML = '<div class="acv-vazio">Este tipo de arquivo não abre aqui. Use "Baixar" para abrir no Word ou no Excel.</div>';
      $('#pvAba', m.el).onclick = () => window.open(o.url, '_blank');
      $('#pvBx', m.el).onclick = () => baixarDoc(o);
    } catch (e) { const box = $('#pvDoc', m.el); if (box) box.innerHTML = `<div class="acv-vazio">${esc(e.message || String(e))}</div>`; }
  }

  function render(a) {
    if (!A().S.d.reuniao) A().S.d.reuniao = [];
    if (a[0] === 'permanentes') return telaPermanentes();
    const ano = Number(a[0]) || anoPadrao();
    if (a[1] === 'reuniao' && a[2]) return telaPastaReuniao(ano, a[2]);
    if (a[1] === 'secao' && a[2]) return telaSecao(ano, a[2]);
    return telaAno(ano);
  }
  window.IPB_ACERVO = { render, anos, anoPadrao, verDoc };
})();
