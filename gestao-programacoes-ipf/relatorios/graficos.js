/* Gráficos do presbitério: caixa da tesouraria, rol de membros, sociedades internas e finanças das igrejas.
 * Cada gráfico deixa escolher a forma (colunas, barras, linhas, área, pizza, rosca, empilhadas ou tabela)
 * e mostra os números nas marcas. Os dados vêm dos relatórios de estatística das igrejas (formulário oficial
 * da IPB), dos números informados pela Comissão de Estatísticas e dos lançamentos da tesouraria. */
(function () {
  'use strict';
  const A = () => window.IPB_APP;
  const H = () => window.IPB_REUNIAO.h;
  const TS = () => window.IPB_TESOURARIA;
  // paleta categórica conferida para daltonismo (ordem fixa; a cor segue a entidade, nunca a posição no ranking)
  const PAL = ['#257de0', '#f47230', '#00b894', '#f2a600', '#ee7fac', '#2f8a50', '#6a4ce2', '#ec4647'];
  const CINZA = '#9aa39e';
  const UNICA = '#2c5234'; // uma série só: verde IPB
  const TIPOS = [['colunas', 'Colunas'], ['empilhadas', 'Colunas empilhadas'], ['barras', 'Barras'], ['linhas', 'Linhas'], ['area', 'Área'], ['pizza', 'Pizza'], ['rosca', 'Rosca'], ['tabela', 'Tabela']];
  const SOC = ['UPH', 'SAF', 'UMP', 'UPA', 'UCP'];
  const SOC_NOME = { UPH: 'UPH (homens)', SAF: 'SAF (mulheres)', UMP: 'UMP (mocidade)', UPA: 'UPA (adolescentes)', UCP: 'UCP (crianças)' };
  const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const LS = 'ipb-graficos';
  const G = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (e) { o = {}; } return Object.assign({ aba: 'tesouraria', tipos: {}, ano: null, igs: null, rubR: null, rubD: null, rubT: null, socIg: null }, o, { aba: o.aba || 'tesouraria' }); })();
  const guardar = () => { try { localStorage.setItem(LS, JSON.stringify({ aba: G.aba, tipos: G.tipos, igs: G.igs, rubR: G.rubR, rubD: G.rubD, rubT: G.rubT })); } catch (e) { /* sem armazenamento */ } };

  /* ======================= formatos ======================= */
  const nf = new Intl.NumberFormat('pt-BR');
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const FMT = {
    num: { l: v => nf.format(Math.round(v)), c: v => nf.format(Math.round(v)) },
    money: { l: v => 'R$ ' + new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v), c: v => curtoR(v) }
  };
  function curtoR(v) {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (a >= 1e3) return s + 'R$ ' + (a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e5 ? 0 : 1 }) + ' mil';
    return s + 'R$ ' + nf0.format(a);
  }
  const pctF = v => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

  /* ======================= motor de gráficos (SVG) ======================= */
  // spec: { cats: [], series: [{ nome, vals: [], cor? }], fmt: 'num' | 'money' }
  function cores(series) { return series.map((s, i) => s.cor || (series.length === 1 ? UNICA : PAL[i % PAL.length])); }
  function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
  function tip(t) { return A().esc(t); }
  function legenda(series, cs) { return series.length > 1 ? `<div class="legend">${series.map((s, i) => `<span><i style="background:${cs[i]}"></i>${A().esc(s.nome)}</span>`).join('')}</div>` : ''; }
  function rotulo(cat, n) { n = n || 16; const s = String(cat); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  function colunas(sp, empilhar) {
    const esc = A().esc, f = FMT[sp.fmt], cs = cores(sp.series);
    const n = sp.cats.length, ns = sp.series.length;
    const W = Math.max(640, Math.min(1100, n * (empilhar ? 70 : 34 * ns + 26))), Hh = sp.h || 280, L = 70, R = 12, T = 22, B = n > 6 ? 58 : 36;
    const tots = sp.cats.map((_, j) => empilhar ? sp.series.reduce((a, s) => a + Math.max(0, Number(s.vals[j]) || 0), 0) : 0);
    const vmax = empilhar ? Math.max(0, ...tots) : Math.max(0, ...sp.series.flatMap(s => s.vals.map(v => Number(v) || 0)));
    const vmin = empilhar ? 0 : Math.min(0, ...sp.series.flatMap(s => s.vals.map(v => Number(v) || 0)));
    const top = vmax > 0 ? niceMax(vmax) : 0, bot = vmin < 0 ? -niceMax(-vmin) : 0, span = top - bot || 1;
    const y = v => T + (Hh - T - B) * (top - v) / span;
    const gw = (W - L - R) / n;
    const bw = empilhar ? Math.min(46, gw - 18) : Math.max(6, Math.min(40, (gw - 14) / ns - 2));
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = bot + span * i / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-dasharray="${v === 0 ? '' : '2 4'}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="ax">${esc(f.c(v))}</text>`; }
    sp.cats.forEach((c, j) => {
      const cx = L + gw * j + gw / 2;
      g += n > 6 ? `<text x="${cx}" y="${Hh - B + 14}" text-anchor="end" transform="rotate(-35 ${cx} ${Hh - B + 14})" class="ax">${esc(rotulo(c))}</text>` : `<text x="${cx}" y="${Hh - B + 18}" text-anchor="middle" class="ax">${esc(rotulo(c))}</text>`;
      if (empilhar) {
        let acc = 0;
        sp.series.forEach((s, i) => {
          const v = Math.max(0, Number(s.vals[j]) || 0); if (!v) return;
          const y1 = y(acc + v), y0 = y(acc); acc += v;
          const h = Math.max(1, y0 - y1 - 2);
          g += `<rect x="${cx - bw / 2}" y="${y1}" width="${bw}" height="${h}" rx="3" fill="${cs[i]}" data-tip="${tip('<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + esc(f.l(v)) + (tots[j] ? ' (' + pctF(v / tots[j]) + ')' : ''))}"/>`;
          if (h >= 15 && bw >= 30) g += `<text x="${cx}" y="${y1 + h / 2 + 4}" text-anchor="middle" class="vl in">${esc(f.c(v))}</text>`;
        });
        if (tots[j]) g += `<text x="${cx}" y="${y(tots[j]) - 6}" text-anchor="middle" class="vl">${esc(f.c(tots[j]))}</text>`;
      } else {
        sp.series.forEach((s, i) => {
          const v = Number(s.vals[j]); if (s.vals[j] == null || !isFinite(v)) return;
          const x = cx - (ns * (bw + 2)) / 2 + i * (bw + 2);
          const yt = Math.min(y(v), y(0)), h = Math.max(1, Math.abs(y(v) - y(0)));
          g += `<rect x="${x}" y="${yt}" width="${bw}" height="${h}" rx="3" fill="${cs[i]}" data-tip="${tip('<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + esc(f.l(v)))}"/>`;
          const lx = x + bw / 2, ly = v >= 0 ? yt - 5 : yt + h + 12;
          g += bw >= 26 ? `<text x="${lx}" y="${ly}" text-anchor="middle" class="vl">${esc(f.c(v))}</text>`
            : `<text x="${lx + 3}" y="${v >= 0 ? yt - 4 : yt + h + 4}" text-anchor="${v >= 0 ? 'start' : 'end'}" transform="rotate(-90 ${lx + 3} ${v >= 0 ? yt - 4 : yt + h + 4})" class="vl">${esc(f.c(v))}</text>`;
        });
      }
    });
    const Tt = T + (empilhar ? 0 : 0);
    return `<div class="chart gf-svg"><svg viewBox="0 0 ${W} ${Hh}" style="min-width:${Math.min(W, 520)}px" role="img" aria-label="${esc(sp.titulo || '')}">${g}</svg>${legenda(sp.series, cs)}</div>` + (Tt ? '' : '');
  }

  function barras(sp) {
    const esc = A().esc, f = FMT[sp.fmt], cs = cores(sp.series);
    const n = sp.cats.length, ns = sp.series.length, bh = ns > 1 ? 14 : 18, gh = ns * (bh + 2) + 10;
    const W = 640, L = 170, R = 96, T = 6, Hh = T + n * gh + 6;
    const vmax = Math.max(0, ...sp.series.flatMap(s => s.vals.map(v => Number(v) || 0)));
    const vmin = Math.min(0, ...sp.series.flatMap(s => s.vals.map(v => Number(v) || 0)));
    const span = (niceMax(vmax) - (vmin < 0 ? -niceMax(-vmin) : 0)) || 1, x0 = L + (W - L - R) * (vmin < 0 ? niceMax(-vmin) : 0) / span;
    const x = v => x0 + (W - L - R) * v / span;
    let g = `<line x1="${x0}" x2="${x0}" y1="${T}" y2="${Hh - 4}" stroke="var(--border-strong)"/>`;
    sp.cats.forEach((c, j) => {
      const y0 = T + j * gh;
      g += `<text x="${L - 8}" y="${y0 + gh / 2 + 2}" text-anchor="end" class="ax"><title>${esc(c)}</title>${esc(rotulo(c, 24))}</text>`;
      sp.series.forEach((s, i) => {
        const v = Number(s.vals[j]); if (s.vals[j] == null || !isFinite(v)) return;
        const yy = y0 + 4 + i * (bh + 2), xa = Math.min(x(v), x0), w = Math.max(1, Math.abs(x(v) - x0));
        g += `<rect x="${xa}" y="${yy}" width="${w}" height="${bh}" rx="3" fill="${cs[i]}" data-tip="${tip('<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + esc(f.l(v)))}"/>`;
        g += `<text x="${v >= 0 ? xa + w + 5 : xa - 5}" y="${yy + bh / 2 + 4}" text-anchor="${v >= 0 ? 'start' : 'end'}" class="vl">${esc(f.c(v))}</text>`;
      });
    });
    return `<div class="chart gf-svg"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(sp.titulo || '')}">${g}</svg>${legenda(sp.series, cs)}</div>`;
  }

  function linhas(sp, area) {
    const esc = A().esc, f = FMT[sp.fmt], cs = cores(sp.series);
    const n = sp.cats.length, W = 640, Hh = sp.h || 280, L = 70, R = 24, T = 24, B = n > 8 ? 52 : 34;
    const vals = sp.series.flatMap(s => s.vals.filter(v => v != null).map(Number));
    const top = Math.max(0, ...vals) > 0 ? niceMax(Math.max(...vals)) : 0, bot = Math.min(0, ...vals) < 0 ? -niceMax(-Math.min(...vals)) : 0, span = top - bot || 1;
    const y = v => T + (Hh - T - B) * (top - v) / span;
    const xs = j => n === 1 ? (L + W - R) / 2 : L + 10 + (W - L - R - 20) * j / (n - 1);
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = bot + span * i / 4; g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--border)" stroke-dasharray="${v === 0 ? '' : '2 4'}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="ax">${esc(f.c(v))}</text>`; }
    sp.cats.forEach((c, j) => { g += n > 8 ? `<text x="${xs(j)}" y="${Hh - B + 14}" text-anchor="end" transform="rotate(-35 ${xs(j)} ${Hh - B + 14})" class="ax">${esc(rotulo(c))}</text>` : `<text x="${xs(j)}" y="${Hh - B + 18}" text-anchor="middle" class="ax">${esc(rotulo(c))}</text>`; });
    // rótulos de valor: todos quando há poucas séries; com muitas, só o último ponto de cada série
    const todos = sp.series.length <= 3;
    sp.series.forEach((s, i) => {
      const pts = s.vals.map((v, j) => v == null ? null : [xs(j), y(Number(v)), Number(v), j]).filter(Boolean);
      if (!pts.length) return;
      const d = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (area) g += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${y(Math.max(bot, 0))} L${pts[0][0].toFixed(1)} ${y(Math.max(bot, 0))} Z" fill="${cs[i]}" opacity="${sp.series.length > 1 ? .18 : .28}"/>`;
      g += `<path d="${d}" fill="none" stroke="${cs[i]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach((p, k) => {
        g += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${cs[i]}" stroke="var(--surface)" stroke-width="2" data-tip="${tip('<b>' + esc(sp.cats[p[3]]) + '</b><br>' + esc(s.nome) + ': ' + esc(f.l(p[2])))}"/>`;
        if (todos || k === pts.length - 1) g += `<text x="${p[0]}" y="${p[1] - 9 - (sp.series.length > 1 ? i * 0 : 0)}" text-anchor="middle" class="vl">${esc(f.c(p[2]))}</text>`;
      });
    });
    return `<div class="chart gf-svg"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(sp.titulo || '')}">${g}</svg>${legenda(sp.series, cs)}</div>`;
  }

  // pizza ou rosca: uma por série (até 3), fatias = categorias; acima de 8 fatias, as menores viram "Outras"
  function pizza(sp, rosca) {
    const esc = A().esc, f = FMT[sp.fmt];
    const ser = sp.series.slice(0, 3);
    const corCat = sp.cats.map((_, j) => PAL[j % PAL.length]);
    const um = s => {
      let fat = sp.cats.map((c, j) => ({ c, v: Math.max(0, Number(s.vals[j]) || 0), j })).filter(x => x.v > 0);
      fat.forEach((x, k) => { x.cor = sp.cats.length <= PAL.length ? corCat[x.j] : PAL[k % PAL.length]; });
      const tot = fat.reduce((a, x) => a + x.v, 0);
      if (!tot) return `<div class="gf-pie"><b>${esc(s.nome)}</b><div class="list-empty">Sem valores.</div></div>`;
      if (fat.length > PAL.length) {
        const ord = fat.slice().sort((a, b) => b.v - a.v);
        const fica = new Set(ord.slice(0, PAL.length - 1).map(x => x.j));
        const outras = fat.filter(x => !fica.has(x.j));
        fat = fat.filter(x => fica.has(x.j)).map((x, k) => Object.assign(x, { cor: PAL[k] }));
        fat.push({ c: 'Outras (' + outras.length + ')', v: outras.reduce((a, x) => a + x.v, 0), cor: CINZA, lista: outras });
      }
      const R = 92, r0 = rosca ? 52 : 0, cx = 110, cy = 110;
      let a0 = -Math.PI / 2, g = '';
      fat.forEach(x => {
        const ang = x.v / tot * Math.PI * 2, a1 = a0 + ang, big = ang > Math.PI ? 1 : 0;
        const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        const [x1, y1] = p(R, a0), [x2, y2] = p(R, a1);
        let d;
        if (fat.length === 1) d = `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - .01} ${cy - R} Z` + (r0 ? ` M${cx} ${cy - r0} A${r0} ${r0} 0 1 0 ${cx + .01} ${cy - r0} Z` : '');
        else if (r0) { const [x3, y3] = p(r0, a1), [x4, y4] = p(r0, a0); d = `M${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} L${x3} ${y3} A${r0} ${r0} 0 ${big} 0 ${x4} ${y4} Z`; }
        else d = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${big} 1 ${x2} ${y2} Z`;
        const extra = x.lista ? '<br>' + x.lista.map(o => esc(o.c) + ': ' + esc(f.l(o.v))).join('<br>') : '';
        g += `<path d="${d}" fill="${x.cor}" stroke="var(--surface)" stroke-width="2" fill-rule="evenodd" data-tip="${tip('<b>' + esc(x.c) + '</b><br>' + esc(f.l(x.v)) + ' · ' + pctF(x.v / tot) + extra)}"/>`;
        if (x.v / tot >= .05) { const [lx, ly] = p(r0 ? (R + r0) / 2 : R * .64, a0 + ang / 2); g += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" class="vl in">${pctF(x.v / tot).replace(/,\d%$/, '%')}</text>`; }
        a0 = a1;
      });
      if (rosca) g += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" class="vl">${esc(f.c(tot))}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" class="ax">total</text>`;
      const leg = `<table class="gf-leg"><tbody>${fat.map(x => `<tr><td><i style="background:${x.cor}"></i>${esc(x.c)}</td><td class="num">${esc(f.l(x.v))}</td><td class="num"><b>${pctF(x.v / tot)}</b></td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="num">${esc(f.l(tot))}</td><td class="num">100%</td></tr></tbody></table>`;
      return `<div class="gf-pie">${ser.length > 1 ? `<b>${esc(s.nome)}</b>` : ''}<div class="gf-pie-in"><svg viewBox="0 0 220 220" width="200" height="200" role="img" aria-label="${esc((sp.titulo || '') + ' ' + s.nome)}">${g}</svg>${leg}</div></div>`;
    };
    return `<div class="gf-pies">${ser.map(um).join('')}</div>${sp.series.length > 3 ? '<p class="small muted">A pizza mostra até três séries; veja as demais em colunas ou na tabela.</p>' : ''}`;
  }

  function tabela(sp) {
    const esc = A().esc, f = FMT[sp.fmt];
    const somaCol = sp.series.length > 1 && sp.somaSeries !== false;
    return `<div class="tbl-wrap"><table class="gf-tbl"><thead><tr><th>${esc(sp.eixo || '')}</th>${sp.series.map(s => `<th class="num">${esc(s.nome)}</th>`).join('')}${somaCol ? '<th class="num">Total</th>' : ''}</tr></thead><tbody>
      ${sp.cats.map((c, j) => `<tr><td>${esc(c)}</td>${sp.series.map(s => `<td class="num">${s.vals[j] == null ? '–' : esc(f.l(Number(s.vals[j])))}</td>`).join('')}${somaCol ? `<td class="num"><b>${esc(f.l(sp.series.reduce((a, s) => a + (Number(s.vals[j]) || 0), 0)))}</b></td>` : ''}</tr>`).join('')}
      ${sp.somaCats ? `<tr class="tot"><td>Total</td>${sp.series.map(s => `<td class="num">${esc(f.l(s.vals.reduce((a, v) => a + (Number(v) || 0), 0)))}</td>`).join('')}${somaCol ? `<td class="num">${esc(f.l(sp.series.reduce((a, s) => a + s.vals.reduce((b, v) => b + (Number(v) || 0), 0), 0)))}</td>` : ''}</tr>` : ''}
    </tbody></table></div>`;
  }

  function desenhar(tipo, sp) {
    if (!sp.cats.length || !sp.series.length) return '<div class="list-empty">Sem dados para este gráfico.</div>';
    switch (tipo) {
      case 'empilhadas': return colunas(sp, true);
      case 'barras': return barras(sp);
      case 'linhas': return linhas(sp, false);
      case 'area': return linhas(sp, true);
      case 'pizza': return pizza(sp, false);
      case 'rosca': return pizza(sp, true);
      case 'tabela': return tabela(sp);
      default: return colunas(sp, false);
    }
  }
  // card com título, seletor do tipo de gráfico e o gráfico
  function card(id, titulo, sub, sp, padrao, extra) {
    const esc = A().esc;
    const tipo = G.tipos[id] || padrao || 'colunas';
    sp.titulo = titulo;
    return `<div class="card gf-card"><div class="card-head gf-head"><div><h2>${esc(titulo)}</h2>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>
      <label class="gf-tipo"><span class="sr-only">Tipo de gráfico</span><select data-gtipo="${esc(id)}" aria-label="Tipo de gráfico: ${esc(titulo)}">${TIPOS.map(([k, l]) => `<option value="${k}" ${k === tipo ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      ${extra || ''}${desenhar(tipo, sp)}</div>`;
  }

  /* ======================= dados das igrejas ======================= */
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // chave de igreja: primeira palavra significativa ("Igreja Presbiteriana Filadélfia" e "IP Filadélfia" → filadelfia)
  function chave(nome) {
    const t = semAcento(nome).replace(/\(.*?\)/g, ' ').replace(/igreja presbiteriana|congregacao presbiterial|congregacao|presbiteriana/g, ' ').split(/[^a-z0-9]+/)
      .filter(w => w && !['ip', 'cp', 'de', 'do', 'da', 'dos', 'das', 'em', 'e'].includes(w));
    return t[0] || semAcento(nome);
  }
  function curto(nome) {
    return String(nome || '').replace(/^Igreja Presbiteriana( d[aoe]s?| em)? /i, 'IP ').replace(/^Congrega[çc][ãa]o Presbiterial( d[aoe]s?| em)? /i, 'CP ').replace(/\s*\(.*\)$/, '');
  }
  // rubricas financeiras do formulário (seguem o modelo: incluir ou excluir uma rubrica no modelo muda os gráficos)
  function rubricasModelo() {
    const m = A().modelo('estatistico') || (window.IPB_MODELOS_PADRAO || []).find(x => x.id === 'estatistico');
    const rec = [], desp = [];
    ((m && m.secoes) || []).forEach(s => (s.campos || []).forEach(c => {
      if (!/^fin_/.test(c.id)) return;
      if (/^Receita: /.test(c.label)) rec.push([c.id, c.label.replace(/^Receita: /, '')]);
      if (/^Despesa: /.test(c.label)) desp.push([c.id, c.label.replace(/^Despesa: /, '')]);
    }));
    return { rec, desp };
  }
  let cache = null;
  function dadosIgrejas() {
    const S = A().S;
    const sig = (S.d.relatorios || []).length + '|' + H().itens('estatistica').length + '|' + (S.d.relatorios || []).reduce((a, r) => a + (r.updatedAt || ''), '').length;
    if (cache && cache.sig === sig) return cache;
    const RB = rubricasModelo();
    const D = {}; // D[ano][chave] = { nome, campos... }
    const nomes = {};
    const put = (ano, k, nome, o, fonte) => {
      const a = (D[ano] = D[ano] || {});
      const e = (a[k] = a[k] || { nome: curto(nome), fonte });
      for (const [c, v] of Object.entries(o)) if (v != null && isFinite(v) && e[c] == null) e[c] = v;
      if (!nomes[k] || /^IP |^CP /.test(curto(nome))) nomes[k] = curto(nome);
    };
    (S.d.relatorios || []).forEach(r => {
      if (r.modeloId !== 'estatistico' || r.status === 'Rascunho') return;
      const ig = (S.d.igrejas || []).find(i => i.id === r.igrejaId);
      if (!ig) return;
      const C = A().ctx(r.modelo || A().modelo(r.modeloId) || {}, r.dados || {});
      const o = { membros: C.V('rol_atual'), comungantes: C.V('com_atual'), naoComungantes: C.V('nc_atual'), ministros: C.V('lid_pastores'), presbiteros: C.V('lid_presbiteros'), diaconos: C.V('lid_diaconos'), alunos: C.V('est_alunos'),
        rec_total: C.V('fin_rec_total'), desp_total: C.V('fin_desp_total') };
      const lin = ((C.defs.dep || {}).linhas) || ['UCP', 'UPA', 'UMP', 'SAF', 'UPH', 'Outras'];
      const mem = C.T('dep', 'membros');
      SOC.forEach(s => { const i = lin.indexOf(s); if (i >= 0) o['soc_' + s] = Number(mem[i]) || 0; });
      RB.rec.concat(RB.desp).forEach(([id]) => { o[id] = C.V(id); });
      put(Number(r.ano), chave(ig.nome), ig.nome, o, 'relatório da igreja');
    });
    const MAP = { membros: 'membros', comungantes: 'comungantes', naoComungantes: 'naoComungantes', ministros: 'ministros', presbiteros: 'presbiteros', diaconos: 'diaconos', ebdAlunos: 'alunos', saf: 'soc_SAF', uph: 'soc_UPH', ump: 'soc_UMP', upa: 'soc_UPA', ucp: 'soc_UCP' };
    const totCom = {};
    H().itens('estatistica').forEach(e => {
      const o = {};
      Object.entries(MAP).forEach(([k, c]) => { if (e.valores && H().temValor(e.valores[k])) o[c] = H().numero(e.valores[k]); });
      if (e.igreja === H().TOTAL) totCom[Number(e.ano)] = o;
      else if (Object.keys(o).length) put(Number(e.ano), chave(e.igreja), e.igreja, o, 'Comissão de Estatísticas');
    });
    const anos = [...new Set(Object.keys(D).concat(Object.keys(totCom)).map(Number))].sort((a, b) => a - b);
    const igs = Object.keys(nomes).sort((a, b) => nomes[a].localeCompare(nomes[b], 'pt-BR')).map(k => ({ k, nome: nomes[k] }));
    // total do presbitério: o informado pela Comissão de Estatísticas, quando há; senão, a soma das igrejas
    const total = (ano, campo) => {
      const t = totCom[ano];
      if (t && t[campo] != null) return t[campo];
      const vs = Object.values(D[ano] || {}).map(e => e[campo]).filter(v => v != null);
      return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
    };
    const fonteTotal = (ano, campo) => totCom[ano] && totCom[ano][campo] != null ? 'Comissão de Estatísticas' : 'soma das igrejas';
    const v = (ano, k, campo) => { const e = (D[ano] || {})[k]; return e && e[campo] != null ? e[campo] : null; };
    cache = { sig, D, anos, igs, total, fonteTotal, v, RB };
    return cache;
  }

  /* ======================= tela ======================= */
  function chips(nome, itens, sel, rot) {
    const esc = A().esc;
    return `<div class="gf-chips" role="group" aria-label="${esc(rot)}"><span class="small muted">${esc(rot)}:</span>${itens.map(([k, l]) => `<label class="gf-chip"><input type="checkbox" data-chip="${esc(nome)}" value="${esc(k)}" ${sel.includes(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</div>`;
  }
  function kpi(l, v, ant, anoAnt, fmt, sub) {
    const f = FMT[fmt || 'num'];
    const d = v != null && ant != null ? v - ant : null;
    return `<div class="kpi"><div class="l">${A().esc(l)}</div><div class="v">${v == null ? '–' : A().esc(f.l(v))}</div>${d != null ? `<div class="d ${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲ +' : '▼ −'}${A().esc(f.l(Math.abs(d)))} desde ${anoAnt}</div>` : `<div class="s">${sub || ''}</div>`}</div>`;
  }

  function tela() {
    const { esc, shell, head, $, $$ } = A();
    const DI = dadosIgrejas();
    const anosI = DI.anos;
    const anoI = anosI.includes(G.ano) ? G.ano : anosI[anosI.length - 1];
    const ant = anosI.filter(a => a < anoI).pop();
    const tot = (c, a) => a == null ? null : DI.total(a, c);
    const abas = [['tesouraria', 'Tesouraria do presbitério'], ['rol', 'Rol de membros'], ['sociedades', 'Sociedades internas'], ['financas', 'Finanças das igrejas']];
    if (!abas.some(x => x[0] === G.aba)) G.aba = 'tesouraria';
    const acoes = H().isAdmin() ? '<button class="btn" id="gEst">Editar estatísticas</button><button class="btn" id="gFin">Editar finanças</button>' : '';
    let html = head('Gráficos do presbitério', `Caixa da tesouraria, membros, sociedades internas e finanças das igrejas${anoI ? ' · dados de ' + anosI.join(', ') : ''}. Em cada gráfico, escolha a forma no seletor ao lado do título.`, acoes);
    // quadros principais
    html += `<div class="gf-top row-wrap"><label class="small muted" for="gAno">Ano das igrejas</label><select id="gAno">${anosI.map(a => `<option ${a === anoI ? 'selected' : ''}>${a}</option>`).join('')}</select></div>`;
    html += `<div class="kpis gf-kpis">${kpi('Membros (rol)', tot('membros', anoI), tot('membros', ant), ant)}${kpi('Membros comungantes', tot('comungantes', anoI), tot('comungantes', ant), ant)}${kpi('Ministros', tot('ministros', anoI), tot('ministros', ant), ant)}${kpi('Presbíteros', tot('presbiteros', anoI), tot('presbiteros', ant), ant)}${kpi('Diáconos', tot('diaconos', anoI), tot('diaconos', ant), ant)}</div>`;
    html += `<div class="tabs" role="tablist">${abas.map(([k, n]) => `<button type="button" role="tab" data-gaba="${k}" class="${G.aba === k ? 'on' : ''}" aria-selected="${G.aba === k}">${n}</button>`).join('')}</div>`;
    html += G.aba === 'tesouraria' ? abaTesouraria() : G.aba === 'rol' ? abaRol(DI, anoI, ant) : G.aba === 'sociedades' ? abaSociedades(DI, anoI) : abaFinancas(DI, anoI, ant);
    shell('historico', html);
    A().ligarTips($('#main') || document.body);
    $$('[data-gaba]').forEach(b => b.onclick = () => { G.aba = b.getAttribute('data-gaba'); guardar(); tela(); });
    $$('[data-gtipo]').forEach(s => s.onchange = () => { G.tipos[s.getAttribute('data-gtipo')] = s.value; guardar(); tela(); });
    if ($('#gAno')) $('#gAno').onchange = e => { G.ano = Number(e.target.value); tela(); };
    if ($('#gTAno')) $('#gTAno').onchange = e => { G.tAno = Number(e.target.value); tela(); };
    $$('[data-chip]').forEach(i => i.onchange = () => {
      const k = i.getAttribute('data-chip');
      G[k] = $$(`[data-chip="${k}"]`).filter(x => x.checked).map(x => x.value);
      guardar(); tela();
    });
    $$('[data-soc]').forEach(b => b.onclick = () => { G.socSel = b.getAttribute('data-soc'); tela(); });
    if ($('#gEst')) $('#gEst').onclick = H().editarEstatisticas;
    if ($('#gFin')) $('#gFin').onclick = H().editarFinancas;
  }

  /* ---------- Tesouraria do presbitério (caixa) ---------- */
  function abaTesouraria() {
    const esc = A().esc, T = TS();
    if (!T) return '<div class="card list-empty">Tesouraria indisponível.</div>';
    const comDado = T.anosTes().filter(a => T.contas(a).length).sort((a, b) => a - b);
    const fins = H().itens('financa').sort((a, b) => a.ano - b.ano);
    let html = '';
    if (!comDado.length && !fins.length) return `<div class="card"><p class="muted" style="margin:0">Ainda não há lançamentos da tesouraria. ${T.podeEditar() ? '<a href="#/tesouraria">Abrir a tesouraria</a> para lançar.' : ''}</p></div>`;
    if (comDado.length) {
      const ano = comDado.includes(G.tAno) ? G.tAno : comDado[comDado.length - 1];
      const mAte = T.ultimoMes(ano);
      const res = T.resumoAno(ano, mAte);
      const meses = res.linhas.slice(0, mAte);
      const igs = T.contas(ano).filter(c => c.grupo === 'igrejas'), pas = T.contas(ano).filter(c => c.grupo === 'pastores'), des = T.contas(ano).filter(c => c.grupo === 'despesas');
      const real = c => T.calc(c, mAte).realizado;
      html += `<div class="card gf-faixa"><div class="row-wrap" style="justify-content:space-between;align-items:center"><div class="row-wrap" style="align-items:center"><label class="small muted" for="gTAno">Ano do caixa</label><select id="gTAno">${comDado.map(a => `<option ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select><span class="small muted">de janeiro até ${H().MESES[mAte - 1]}</span></div>
        ${T.podeEditar() ? `<a class="btn sm" href="#/tesouraria/${ano}">Lançar na tesouraria</a>` : '<span class="small muted">Só o tesoureiro e o administrador lançam.</span>'}</div>
        <div class="kpis" style="margin:10px 0 0">${kpi('Saldo anterior', T.saldoAnterior(ano), null, null, 'money', 'restos de ' + (ano - 1))}${kpi('Entradas', res.ent, null, null, 'money', pctF(res.tot.previstoRec ? res.tot.realRec / res.tot.previstoRec : 0) + ' do previsto')}${kpi('Saídas', res.sai, null, null, 'money', pctF(res.tot.previstoDesp ? res.tot.realDesp / res.tot.previstoDesp : 0) + ' do previsto')}${kpi('Saldo em caixa', res.saldo, null, null, 'money', 'anterior + entradas − saídas')}</div></div>`;
      html += '<div class="grid g2">';
      html += card('t-mes', 'Entradas e saídas por mês', esc(String(ano)), { cats: meses.map(l => MES3[l.mes - 1]), series: [{ nome: 'Entradas', vals: meses.map(l => l.ent), cor: PAL[0] }, { nome: 'Saídas', vals: meses.map(l => l.sai), cor: PAL[1] }], fmt: 'money', eixo: 'Mês' }, 'colunas');
      html += card('t-saldo', 'Saldo em caixa ao fim de cada mês', esc(String(ano)), { cats: meses.map(l => MES3[l.mes - 1]), series: [{ nome: 'Saldo', vals: meses.map(l => l.saldo) }], fmt: 'money', eixo: 'Mês' }, 'area');
      html += card('t-origem', 'De onde vem a receita', 'realizado no período', { cats: ['Dízimo dos pastores', 'Contribuição das igrejas'], series: [{ nome: 'Receita', vals: [pas.reduce((a, c) => a + real(c), 0), igs.reduce((a, c) => a + real(c), 0)] }], fmt: 'money', eixo: 'Origem' }, 'rosca');
      html += card('t-igrejas', 'Contribuição de cada igreja', 'participação no total recebido das igrejas', { cats: igs.map(c => c.nome), series: [{ nome: 'Contribuição', vals: igs.map(real) }], fmt: 'money', eixo: 'Igreja' }, 'pizza');
      html += card('t-desp', 'Despesas por rubrica', 'realizado no período', { cats: des.map(c => c.nome), series: [{ nome: 'Despesa', vals: des.map(real) }], fmt: 'money', eixo: 'Rubrica' }, 'barras');
      // evolução das rubricas, mês a mês
      const todas = T.contas(ano);
      const selT = (G.rubT || []).filter(id => todas.some(c => c.id === id));
      const sel = selT.length ? selT : des.slice().sort((a, b) => real(b) - real(a)).slice(0, 3).map(c => c.id);
      html += card('t-rub', 'Evolução das rubricas', 'mês a mês; marque as rubricas para comparar (até 8)', { cats: meses.map(l => MES3[l.mes - 1]), series: todas.filter(c => sel.includes(c.id)).slice(0, 8).map(c => ({ nome: c.nome, vals: T.calc(c, mAte).caixaMes.slice(0, mAte) })), fmt: 'money', eixo: 'Mês' }, 'linhas',
        `<details class="gf-det"><summary class="small">Escolher rubricas (${sel.length})</summary>${chips('rubT', todas.map(c => [c.id, c.nome]), sel, 'Rubricas')}</details>`);
      html += '</div>';
      if (comDado.length > 1) {
        const anosR = comDado.map(a => ({ a, r: T.resumoAno(a, T.ultimoMes(a)) }));
        html += card('t-anos', 'Comparar anos do caixa', 'entradas, saídas e saldo', { cats: anosR.map(x => String(x.a)), series: [{ nome: 'Entradas', vals: anosR.map(x => x.r.ent), cor: PAL[0] }, { nome: 'Saídas', vals: anosR.map(x => x.r.sai), cor: PAL[1] }, { nome: 'Saldo', vals: anosR.map(x => x.r.saldo), cor: PAL[2] }], fmt: 'money', eixo: 'Ano' }, 'colunas');
      }
    }
    if (fins.length) {
      const C = H().CAMPOS_FIN.filter(([k]) => fins.some(f => f.valores && H().temValor(f.valores[k])));
      html += card('t-hist', 'Histórico informado pela Comissão de Finanças', esc(fins.map(f => f.ano).join(', ')), { cats: fins.map(f => String(f.ano)), series: C.map(([k, l], i) => ({ nome: l.replace(/ \(R\$\)$/, ''), vals: fins.map(f => f.valores && H().temValor(f.valores[k]) ? H().numero(f.valores[k]) : null), cor: PAL[i % PAL.length] })), fmt: 'money', eixo: 'Ano' }, 'colunas');
    }
    return html;
  }

  /* ---------- Rol de membros ---------- */
  function selIgs(DI) { const t = DI.igs.map(i => i.k); const s = (G.igs || []).filter(k => t.includes(k)); return s.length ? s : t; }
  function abaRol(DI, ano, ant) {
    const esc = A().esc;
    if (!ano) return semDados();
    const anos = DI.anos;
    const sel = selIgs(DI), igs = DI.igs.filter(i => sel.includes(i.k));
    const comIg = igs.filter(i => DI.v(ano, i.k, 'membros') != null || DI.v(ano, i.k, 'comungantes') != null);
    let html = chips('igs', DI.igs.map(i => [i.k, i.nome]), sel, 'Igrejas nos gráficos');
    html += '<div class="grid g2">';
    html += card('r-anos', 'Rol de membros do presbitério', 'comungantes e não comungantes, por ano', { cats: anos.map(String), series: [{ nome: 'Comungantes', vals: anos.map(a => DI.total(a, 'comungantes')) }, { nome: 'Não comungantes', vals: anos.map(a => DI.total(a, 'naoComungantes')) }], fmt: 'num', eixo: 'Ano', somaCats: false }, 'empilhadas');
    html += card('r-pizza', 'Participação de cada igreja no rol', `membros em ${ano}`, { cats: comIg.map(i => i.nome), series: [{ nome: 'Membros', vals: comIg.map(i => DI.v(ano, i.k, 'membros') != null ? DI.v(ano, i.k, 'membros') : DI.v(ano, i.k, 'comungantes')) }], fmt: 'num', eixo: 'Igreja', somaCats: true }, 'pizza');
    html += card('r-ig', 'Membros por igreja', `${ano}${ant ? ' comparado a ' + ant : ''}`, { cats: comIg.map(i => i.nome), series: (ant ? [ant, ano] : [ano]).map(a => ({ nome: String(a), vals: comIg.map(i => DI.v(a, i.k, 'membros')) })), fmt: 'num', eixo: 'Igreja', somaCats: true, somaSeries: false }, 'barras');
    html += card('r-com', 'Comungantes por igreja ao longo dos anos', 'compare as igrejas marcadas', { cats: anos.map(String), series: comIg.slice(0, 8).map(i => ({ nome: i.nome, vals: anos.map(a => DI.v(a, i.k, 'comungantes')) })), fmt: 'num', eixo: 'Ano', somaSeries: false }, 'linhas');
    html += card('r-of', 'Oficiais por igreja', String(ano), { cats: comIg.map(i => i.nome), series: [['ministros', 'Ministros'], ['presbiteros', 'Presbíteros'], ['diaconos', 'Diáconos']].map(([k, l]) => ({ nome: l, vals: comIg.map(i => DI.v(ano, i.k, k)) })), fmt: 'num', eixo: 'Igreja', somaCats: true }, 'colunas');
    html += card('r-of-anos', 'Oficiais do presbitério por ano', 'ministros, presbíteros e diáconos', { cats: anos.map(String), series: [['ministros', 'Ministros'], ['presbiteros', 'Presbíteros'], ['diaconos', 'Diáconos']].map(([k, l]) => ({ nome: l, vals: anos.map(a => DI.total(a, k)) })), fmt: 'num', eixo: 'Ano' }, 'colunas');
    html += '</div>';
    html += quadro('Quadro: rol de membros por igreja', anos, igs, DI, [['membros', 'Membros'], ['comungantes', 'Comungantes'], ['naoComungantes', 'Não comungantes']], 'num');
    return html + nota(DI, ano);
  }

  /* ---------- Sociedades internas ---------- */
  function abaSociedades(DI, ano) {
    const esc = A().esc;
    if (!ano) return semDados();
    const anos = DI.anos;
    const sel = selIgs(DI), igs = DI.igs.filter(i => sel.includes(i.k));
    const comIg = igs.filter(i => SOC.some(s => DI.v(ano, i.k, 'soc_' + s) != null));
    let html = chips('igs', DI.igs.map(i => [i.k, i.nome]), sel, 'Igrejas nos gráficos');
    html += `<div class="kpis">${SOC.map(s => kpi(SOC_NOME[s], DI.total(ano, 'soc_' + s), null, null, 'num', 'sócios em ' + ano)).join('')}</div>`;
    html += '<div class="grid g2">';
    html += card('s-anos', 'Sócios de cada sociedade por ano', 'total do presbitério', { cats: anos.map(String), series: SOC.map(s => ({ nome: s, vals: anos.map(a => DI.total(a, 'soc_' + s)) })), fmt: 'num', eixo: 'Ano' }, 'colunas');
    html += card('s-pizza', 'Peso de cada sociedade', `sócios em ${ano}`, { cats: SOC.map(s => SOC_NOME[s]), series: [{ nome: 'Sócios', vals: SOC.map(s => DI.total(ano, 'soc_' + s)) }], fmt: 'num', eixo: 'Sociedade', somaCats: true }, 'rosca');
    html += card('s-ig', 'Sociedades em cada igreja', String(ano), { cats: comIg.map(i => i.nome), series: SOC.map(s => ({ nome: s, vals: comIg.map(i => DI.v(ano, i.k, 'soc_' + s)) })), fmt: 'num', eixo: 'Igreja', somaCats: true }, 'empilhadas');
    const socSel = SOC.includes(G.socSel) ? G.socSel : 'SAF';
    html += card('s-uma', `${SOC_NOME[socSel]}: participação de cada igreja`, String(ano), { cats: comIg.map(i => i.nome), series: [{ nome: socSel, vals: comIg.map(i => DI.v(ano, i.k, 'soc_' + socSel)) }], fmt: 'num', eixo: 'Igreja', somaCats: true }, 'pizza',
      `<div class="seg gf-seg" role="group" aria-label="Sociedade">${SOC.map(s => `<button type="button" data-soc="${s}" class="${s === socSel ? 'on' : ''}">${s}</button>`).join('')}</div>`);
    html += '</div>';
    html += quadro('Quadro: sociedades internas por igreja', [ano], igs, DI, SOC.map(s => ['soc_' + s, s]), 'num', true);
    return html + nota(DI, ano);
  }

  /* ---------- Finanças das igrejas ---------- */
  function abaFinancas(DI, ano, ant) {
    const esc = A().esc;
    if (!ano) return semDados();
    const anos = DI.anos.filter(a => Object.values(DI.D[a] || {}).some(e => e.rec_total != null));
    if (!anos.length) return `<div class="card"><p class="muted" style="margin:0">Ainda não há relatórios financeiros das igrejas (formulário de Informações Cadastrais e Estatísticas, parte IV). Quando as igrejas enviarem, os gráficos aparecem aqui.</p></div>`;
    const a1 = anos.includes(ano) ? ano : anos[anos.length - 1], a0 = anos.filter(a => a < a1).pop();
    const sel = selIgs(DI), igs = DI.igs.filter(i => sel.includes(i.k) && DI.v(a1, i.k, 'rec_total') != null);
    const RB = DI.RB;
    const somaIg = (a, campo) => igs.reduce((s, i) => s + (DI.v(a, i.k, campo) || 0), 0);
    let html = chips('igs', DI.igs.map(i => [i.k, i.nome]), sel, 'Igrejas nos gráficos');
    html += `<div class="kpis">${kpi('Receita total das igrejas', somaIg(a1, 'rec_total'), a0 ? somaIg(a0, 'rec_total') : null, a0, 'money')}${kpi('Despesa total das igrejas', somaIg(a1, 'desp_total'), a0 ? somaIg(a0, 'desp_total') : null, a0, 'money')}${kpi('Resultado (receita − despesa)', somaIg(a1, 'rec_total') - somaIg(a1, 'desp_total'), a0 ? somaIg(a0, 'rec_total') - somaIg(a0, 'desp_total') : null, a0, 'money')}${kpi('Igrejas com relatório', igs.length, null, null, 'num', 'em ' + a1)}</div>`;
    html += '<div class="grid g2">';
    html += card('f-anos', 'Receita e despesa das igrejas por ano', 'soma das igrejas marcadas', { cats: anos.map(String), series: [{ nome: 'Receita', vals: anos.map(a => somaIg(a, 'rec_total')), cor: PAL[0] }, { nome: 'Despesa', vals: anos.map(a => somaIg(a, 'desp_total')), cor: PAL[1] }], fmt: 'money', eixo: 'Ano' }, 'colunas');
    html += card('f-ig', 'Receita e despesa por igreja', String(a1), { cats: igs.map(i => i.nome), series: [{ nome: 'Receita', vals: igs.map(i => DI.v(a1, i.k, 'rec_total')), cor: PAL[0] }, { nome: 'Despesa', vals: igs.map(i => DI.v(a1, i.k, 'desp_total')), cor: PAL[1] }], fmt: 'money', eixo: 'Igreja', somaCats: true, somaSeries: false }, 'barras');
    html += card('f-prec', 'Quanto cada igreja representa na receita', `${a1} · % do total`, { cats: igs.map(i => i.nome), series: [{ nome: 'Receita', vals: igs.map(i => DI.v(a1, i.k, 'rec_total')) }], fmt: 'money', eixo: 'Igreja', somaCats: true }, 'pizza');
    html += card('f-pdesp', 'Quanto cada igreja representa na despesa', `${a1} · % do total`, { cats: igs.map(i => i.nome), series: [{ nome: 'Despesa', vals: igs.map(i => DI.v(a1, i.k, 'desp_total')) }], fmt: 'money', eixo: 'Igreja', somaCats: true }, 'pizza');
    html += card('f-rrub', 'Receita por rubrica', `${a1} · todas as igrejas marcadas`, { cats: RB.rec.map(r => r[1]), series: [{ nome: 'Receita', vals: RB.rec.map(([id]) => somaIg(a1, id)) }], fmt: 'money', eixo: 'Rubrica', somaCats: true }, 'barras');
    html += card('f-drub', 'Despesa por rubrica', `${a1} · todas as igrejas marcadas`, { cats: RB.desp.map(r => r[1]), series: [{ nome: 'Despesa', vals: RB.desp.map(([id]) => somaIg(a1, id)) }], fmt: 'money', eixo: 'Rubrica', somaCats: true }, 'barras');
    const todas = RB.rec.map(r => [r[0], 'Receita: ' + r[1]]).concat(RB.desp.map(r => [r[0], 'Despesa: ' + r[1]]));
    const selR = (G.rubR || []).filter(id => todas.some(t => t[0] === id));
    const usar = selR.length ? selR : ['fin_dizimos', 'fin_ofertas', 'fin_missoes'].filter(id => todas.some(t => t[0] === id));
    html += card('f-evol', 'Evolução das rubricas', 'soma das igrejas marcadas, por ano', { cats: anos.map(String), series: todas.filter(t => usar.includes(t[0])).slice(0, 8).map(([id, l]) => ({ nome: l, vals: anos.map(a => somaIg(a, id)) })), fmt: 'money', eixo: 'Ano' }, anos.length > 1 ? 'linhas' : 'colunas',
      `<details class="gf-det"><summary class="small">Escolher rubricas (${usar.length})</summary>${chips('rubR', todas, usar, 'Rubricas')}</details>`);
    const r1 = usar[0];
    html += card('f-comp', 'Comparar igrejas numa rubrica', `${(todas.find(t => t[0] === r1) || [, ''])[1]} · ${a0 ? a0 + ' e ' : ''}${a1}`, { cats: igs.map(i => i.nome), series: (a0 ? [a0, a1] : [a1]).map(a => ({ nome: String(a), vals: igs.map(i => DI.v(a, i.k, r1)) })), fmt: 'money', eixo: 'Igreja', somaCats: true, somaSeries: false }, 'colunas');
    html += '</div>';
    // quadro detalhado no modelo do Relatório Financeiro da IPB
    const linhasQ = [['_sec', 'Receitas']].concat(RB.rec, [['rec_total', 'Total da receita']], [['_sec', 'Despesas']], RB.desp, [['desp_total', 'Total da despesa']]);
    html += `<div class="card"><div class="card-head"><h2>Quadro financeiro detalhado das igrejas</h2><span class="muted small">${a1} · rubricas do formulário oficial da IPB</span></div><div class="tbl-wrap"><table class="gf-tbl gf-quadro"><thead><tr><th>Rubrica</th>${igs.map(i => `<th class="num">${esc(i.nome)}</th>`).join('')}<th class="num">Presbitério</th><th class="num">%</th></tr></thead><tbody>
      ${linhasQ.map(([id, l]) => {
        if (id === '_sec') return `<tr class="tot"><td colspan="${igs.length + 3}"><b>${esc(l)}</b></td></tr>`;
        const tt = somaIg(a1, id), base = /^fin_(dizimos|ofertas|of_|rec_|parcerias)|rec_total/.test(id) && RB.rec.some(r => r[0] === id) ? somaIg(a1, 'rec_total') : somaIg(a1, 'desp_total');
        const ehTot = id === 'rec_total' || id === 'desp_total';
        return `<tr class="${ehTot ? 'tot' : ''}"><td>${esc(l)}</td>${igs.map(i => `<td class="num">${DI.v(a1, i.k, id) == null ? '–' : esc(FMT.money.l(DI.v(a1, i.k, id)))}</td>`).join('')}<td class="num"><b>${esc(FMT.money.l(tt))}</b></td><td class="num">${ehTot ? '100%' : base ? pctF(tt / base) : '–'}</td></tr>`;
      }).join('')}
    </tbody></table></div><p class="small muted" style="margin:8px 0 0">As rubricas seguem o modelo de relatório "Informações Cadastrais e Estatísticas". Para incluir ou excluir uma rubrica, o administrador edita o modelo em Administração → Modelos de relatório; os gráficos acompanham.</p></div>`;
    return html;
  }

  function quadro(titulo, anos, igs, DI, campos, fmt, soAno) {
    const esc = A().esc, f = FMT[fmt];
    const cols = soAno ? campos.map(([k, l]) => ({ a: anos[0], k, l })) : anos.flatMap(a => campos.map(([k, l]) => ({ a, k, l: campos.length > 1 ? l + ' ' + a : String(a) })));
    const linhas = igs.filter(i => cols.some(c => DI.v(c.a, i.k, c.k) != null));
    return `<div class="card"><div class="card-head"><h2>${esc(titulo)}</h2><span class="muted small">total e por igreja</span></div><div class="tbl-wrap"><table class="gf-tbl"><thead><tr><th>Igreja</th>${cols.map(c => `<th class="num">${esc(c.l)}</th>`).join('')}${soAno ? '<th class="num">Total</th>' : ''}</tr></thead><tbody>
      ${linhas.map(i => `<tr><td>${esc(i.nome)}</td>${cols.map(c => { const v = DI.v(c.a, i.k, c.k); return `<td class="num">${v == null ? '–' : esc(f.l(v))}</td>`; }).join('')}${soAno ? `<td class="num"><b>${esc(f.l(cols.reduce((s, c) => s + (DI.v(c.a, i.k, c.k) || 0), 0)))}</b></td>` : ''}</tr>`).join('')}
      <tr class="tot"><td>Presbitério</td>${cols.map(c => { const v = DI.total(c.a, c.k); return `<td class="num" title="${esc(DI.fonteTotal(c.a, c.k))}">${v == null ? '–' : esc(f.l(v))}</td>`; }).join('')}${soAno ? `<td class="num">${esc(f.l(cols.reduce((s, c) => s + (DI.total(c.a, c.k) || 0), 0)))}</td>` : ''}</tr>
    </tbody></table></div></div>`;
  }
  function nota(DI, ano) {
    const fontes = [...new Set(Object.values(DI.D[ano] || {}).map(e => e.fonte))];
    return `<p class="small muted">Fontes de ${ano}: ${A().esc(fontes.join(' e ') || 'sem relatórios das igrejas')}. A linha "Presbitério" usa o total da Comissão de Estatísticas quando ele existe; senão, soma as igrejas.</p>`;
  }
  function semDados() { return '<div class="card"><p class="muted" style="margin:0">Ainda não há números das igrejas. Eles vêm dos relatórios de estatística enviados pelas igrejas ou da Comissão de Estatísticas (botão Editar estatísticas).</p></div>'; }

  function render() { cache = null; tela(); }
  window.IPB_GRAFICOS = { render, grafico: desenhar, dadosIgrejas };
})();
