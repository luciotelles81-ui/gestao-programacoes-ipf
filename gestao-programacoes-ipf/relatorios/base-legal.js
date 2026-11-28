/**
 * Índice da base legal: em que página do Manual Presbiteriano (edição 2025, IPB) começa cada artigo.
 * Só números de página (o texto do Manual não está aqui). Gerado a partir do PDF do Manual.
 * Usado para citar a fonte nos pareceres: documento, artigo, parágrafo, inciso e página.
 */
window.IPB_BASE_LEGAL = (function () {
  const EDICAO = 'Manual Presbiteriano, ed. 2025';
  const DOCS = {
    'CI/IPB': { nome: 'Constituição da IPB', paginas: [13, 156], art: '1:16,2:16,3:16,4:17,5:20,6:20,7:22,8:23,9:23,10:27,11:28,12:28,13:28,14:30,15:34,16:34,17:40,18:41,19:42,20:42,21:43,22:43,23:44,24:46,25:47,26:48,27:49,28:49,29:50,30:50,31:51,32:55,33:55,34:58,35:62,36:66,37:66,38:67,39:67,40:67,41:68,42:69,43:71,44:71,45:72,46:73,47:73,48:74,49:76,50:79,51:79,52:80,53:80,54:80,55:82,56:82,57:84,58:85,59:85,60:85,61:85,62:85,63:86,64:87,65:88,66:88,67:90,68:95,69:97,70:97,71:102,72:102,73:104,74:105,75:106,76:107,77:109,78:109,79:110,80:110,81:110,82:111,83:111,84:114,85:115,86:115,87:115,88:115,89:123,90:124,91:124,92:126,93:126,94:126,95:128,96:128,97:128,98:130,99:130,100:131,101:132,102:132,103:133,104:134,105:135,106:135,107:136,108:136,109:136,110:138,111:139,112:140,113:140,114:140,115:141,116:142,117:143,118:143,119:147,120:148,121:148,122:148,123:148,124:149,125:149,126:149,127:149,128:150,129:150,130:150,131:150,132:150,133:151,134:151,135:151,136:151,137:152,138:152,139:153,140:153,141:153,142:154,143:154,144:154,145:155,146:156,147:156,148:156,149:156,150:156,151:156,152:156' },
    'CD/IPB': { nome: 'Código de Disciplina', paginas: [165, 212], art: '1:168,2:168,3:168,4:168,5:169,6:169,7:169,8:170,9:171,10:173,11:173,12:173,13:173,14:174,15:176,16:176,17:176,18:177,19:177,20:178,21:178,22:179,23:181,24:182,25:182,26:182,27:182,28:182,29:183,30:183,31:183,32:183,33:183,34:183,35:184,36:184,37:184,38:184,39:184,40:184,41:184,42:185,43:187,44:189,45:189,46:189,47:189,48:189,49:190,50:190,51:190,52:190,53:190,54:190,55:190,56:191,57:191,58:191,59:191,60:191,61:191,62:192,63:192,64:192,65:192,66:193,67:193,68:193,69:194,70:194,71:194,72:194,73:195,74:195,75:195,76:195,77:195,78:195,79:195,80:195,81:195,82:196,83:196,84:196,85:196,86:197,87:197,88:197,89:197,90:197,91:197,92:197,93:198,94:198,95:198,96:198,97:199,98:201,99:201,100:201,101:201,102:201,103:201,104:201,105:201,106:202,107:202,108:202,109:202,110:202,111:202,112:202,113:203,114:203,115:203,116:203,117:204,118:204,119:204,120:204,121:205,122:205,123:205,124:205,125:205,126:206,127:206,128:206,129:207,130:207,131:207,132:208,133:208,134:208,135:212' },
    'PL/IPB': { nome: 'Princípios de Liturgia', paginas: [219, 264], art: '1:222,2:223,3:225,4:225,5:225,6:225,7:226,8:233,9:238,10:238,11:238,12:243,13:243,14:243,15:244,16:246,17:246,18:247,19:250,20:250,21:253,22:254,23:254,24:255,25:255,26:256,27:257,28:257,29:257,30:257,31:259,32:259,33:259,34:260,35:260,36:260,37:260,38:260,39:260,40:263,41:263,42:263,43:263,44:264' },
    'Modelo de Estatuto de Presbitério': { nome: 'Modelo de Estatuto – Presbitério', paginas: [419, 450], art: '1:421,2:422,3:422,4:422,5:423,6:423,7:423,8:424,9:425,10:425,11:426,12:427,13:427,14:427,15:428,16:428,17:429,18:429,19:430,20:430,21:430,22:431,23:433,24:434,25:435,26:435,27:438,28:438,29:439,30:439,31:439,32:439,33:440,34:440,35:441,36:441,37:442,38:442,39:442,40:442,41:442,42:442,43:442,44:443,45:443,46:443,47:444,48:444,49:445,50:445,51:445,52:445,53:446,54:446,55:447,56:447,57:447,58:447,59:447,60:448,61:448,62:448' },
    'Modelo de RI de Presbitério': { nome: 'Modelo de Regimento Interno – Presbitério', paginas: [451, 508], art: '1:453,2:453,3:454,4:455,5:455,6:455,7:456,8:456,9:457,10:457,11:458,12:458,13:459,14:459,15:460,16:461,17:461,18:461,19:461,20:462,21:462,22:462,23:463,24:463,25:464,26:464,27:464,28:464,29:464,30:465,31:466,32:467,33:467,34:468,35:468,36:470,37:470,38:471,39:471,40:472,41:472,42:472,43:474,44:474,45:475,46:475,47:476,48:476,49:479,50:480,51:480,52:481,53:481,54:483,55:483,56:484,57:485,58:486,59:486,60:488,61:488,62:489,63:489,64:490,65:490,66:490,67:490,68:491,69:491,70:492,71:492,72:492,73:493,74:493,75:493,76:494,77:494,78:495,79:497,80:497,81:498,82:498,83:499,84:499,85:500,86:501,87:501,88:501,89:502,90:503,91:504,92:504,93:506,94:506,95:507,96:507,97:508,98:508,99:508' },
    'Modelo de Estatuto de Igreja': { nome: 'Modelo de Estatuto – Igreja local', paginas: [509, 532], art: '1:511,2:513,3:513,4:513,5:514,6:514,7:515,8:515,9:515,10:516,11:516,12:516,15:516,16:518,17:518,18:518,19:519,20:519,21:519,22:520,23:520,24:520,25:521,26:521,27:521,28:522,29:522,30:523,31:524,32:524,33:524,34:525,35:526,36:526,37:526,38:526,39:526,40:527,41:527,42:527,43:527,44:527,45:527,46:528,47:528,48:529,49:529,50:529,51:530,52:530,53:530,54:531,55:531,56:531,57:531' },
    'Regulamento de Atas': { nome: 'Regulamento para Confecção de Atas dos Concílios', paginas: [547, 560], art: '1:549,2:549,3:550,4:550,5:551,6:551,7:553,8:553,9:554,10:555,11:557,12:557,13:558,14:558,15:558,16:558,17:558,18:558,19:559,20:559,21:559,22:559,23:559,24:559' },
    'Estatuto da IPB': { nome: 'Estatuto da IPB', paginas: [267, 286], art: '1:269,2:270,3:270,4:270,5:270,6:271,7:271,8:271,9:272,10:272,11:272,12:272,13:272,14:273,15:274,16:274,17:274,18:274,19:274,20:274,21:275,22:276,23:277,24:278,25:278,26:279,27:279,28:279,29:280,30:281,31:281,32:281,33:281,34:282,35:282,36:282,37:284,38:284,39:284,40:285,41:285,42:285,43:285,44:286,46:286,47:286' },
    'RI/SC': { nome: 'Regimento Interno do Supremo Concílio', paginas: [287, 354], art: '1:289,2:289,3:290,4:291,5:291,6:291,7:292,8:292,9:293,10:293,11:294,12:294,13:296,14:296,15:297,16:297,17:298,18:298,19:298,20:299,21:299,22:299,23:300,24:300,25:301,26:301,27:301,28:302,29:303,30:303,31:303,32:303,33:305,34:305,35:306,36:307,37:307,38:309,39:309,40:310,41:310,42:310,43:312,44:312,45:313,46:313,47:313,48:315,49:316,50:316,51:317,52:317,53:318,54:318,55:319,56:320,57:320,58:320,59:321,60:321,61:321,62:322,63:322,64:323,65:323,66:324,67:325,68:326,69:326,70:327,71:327,72:327,73:327,74:329,75:329,76:330,77:331,78:333,79:333,80:334,81:334,82:334' }
  };
  const ART = {};
  Object.keys(DOCS).forEach(k => { ART[k] = {}; DOCS[k].art.split(',').forEach(x => { const [n, p] = x.split(':'); ART[k][n] = Number(p); }); });
  // apelidos usados nos textos ("Regulamento de Atas", "CI/IPB", "Constituição"...)
  const APELIDOS = [[/regulamento (para confec[çc][ãa]o )?de atas|reg\.? de atas/i, 'Regulamento de Atas'], [/\bCI\/IPB\b|constitui[çc][ãa]o( da IPB)?/i, 'CI/IPB'],
    [/\bCD\/IPB\b|c[óo]digo de disciplina/i, 'CD/IPB'], [/\bPL\/IPB\b|princ[íi]pios de liturgia/i, 'PL/IPB'], [/estatuto do presbit[ée]rio|modelo de estatuto.*presbit/i, 'Modelo de Estatuto de Presbitério'],
    [/regimento interno do presbit[ée]rio|RI do presbit|modelo de RI.*presbit/i, 'Modelo de RI de Presbitério'], [/estatuto da igreja local|modelo de estatuto.*igreja/i, 'Modelo de Estatuto de Igreja'],
    [/RI\/SC|regimento interno do supremo/i, 'RI/SC'], [/estatuto da IPB/i, 'Estatuto da IPB']];
  function doc(nome) { if (DOCS[nome]) return nome; const a = APELIDOS.find(([re]) => re.test(String(nome || ''))); return a ? a[1] : ''; }
  function pagina(nome, artigo) { const k = doc(nome); const n = parseInt(String(artigo || '').replace(/\D+/g, ' ').trim(), 10); return k && n && ART[k][n] ? ART[k][n] : null; }
  // acha a página de uma citação em texto livre, ex.: "Regulamento de Atas, art. 10, § 1º; CI/IPB, art. 86"
  function paginasDoTexto(txt) {
    const out = [];
    String(txt || '').split(';').forEach(parte => {
      const k = doc(parte) || (out.length ? out[out.length - 1].doc : '');
      const m = /arts?\.?\s*(\d+)/i.exec(parte);
      if (k && m && ART[k][m[1]]) out.push({ doc: k, artigo: Number(m[1]), pagina: ART[k][m[1]] });
    });
    return out;
  }
  // separa uma citação em partes: "Regulamento de Atas, art. 10, § 1º; CI/IPB, art. 88, i"
  function partes(txt) {
    const out = [];
    String(txt || '').split(';').forEach(parte => {
      const k = doc(parte) || (out.length ? out[out.length - 1].documento : '');
      const a = /arts?\.?\s*(\d+)/i.exec(parte);
      if (!k || !a) return;
      const par = /(§\s*\d+\s*º?|par[áa]grafo [úu]nico)/i.exec(parte);
      const inc = /inciso\s+([IVXL]+)|,\s*([IVXL]+)\b/.exec(parte.slice(a.index + a[0].length));
      const ali = /[Aa]l[íi]nea\s+"?([a-z])"?|^\s*,\s*([a-z])\b/.exec(parte.slice(a.index + a[0].length));
      out.push({ documento: k, artigo: a[1], paragrafo: par ? par[1].replace(/\s+/g, ' ') : '', inciso: inc ? inc[1] || inc[2] : '', alinea: ali ? ali[1] || ali[2] : '', pagina: (ART[k] || {})[a[1]] || null });
    });
    return out;
  }
  function citar(c) {
    const k = doc(c.documento || c.doc) || c.documento || c.doc || '';
    const p = c.pagina || pagina(k, c.artigo);
    return [k, c.artigo ? 'art. ' + String(c.artigo).replace(/^art\.?\s*/i, '') : '', c.paragrafo ? (/^§|par[áa]grafo/i.test(c.paragrafo) ? c.paragrafo : '§ ' + c.paragrafo) : '', c.inciso ? 'inciso ' + String(c.inciso).replace(/^inciso\s*/i, '') : '', c.alinea ? 'alínea ' + String(c.alinea).replace(/^al[íi]nea\s*/i, '') : '']
      .filter(Boolean).join(', ') + (p ? ` — ${EDICAO}, p. ${p}` : '');
  }
  // índice compacto para a IA: "CI/IPB (p. 13-156): art. 1 p.16; ..."
  function indiceTexto(lista) { return (lista || Object.keys(DOCS)).map(k => `${k} — ${DOCS[k].nome} (p. ${DOCS[k].paginas[0]}-${DOCS[k].paginas[1]}): ` + Object.entries(ART[k]).map(([n, p]) => n + '→' + p).join(' ')).join('\n'); }
  return { EDICAO, DOCS, ART, doc, pagina, paginasDoTexto, partes, citar, indiceTexto };
})();
