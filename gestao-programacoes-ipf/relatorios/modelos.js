/**
 * Modelos de relatório da Igreja Presbiteriana do Brasil.
 * Os dois primeiros reproduzem os formulários oficiais (CSM-IPB 2021 v8.0) usados
 * pelo Presbitério: "Informações Cadastrais e Estatísticas de Comunidade Presbiteriana"
 * e "Relatório do Conselho ou Mesa Administrativa". Os demais são modelos de apoio.
 * O administrador pode editar tudo isso no sistema (Administração → Modelos).
 *
 * Tipos de campo: text, textarea, number, money, date, select, yesno, checks, table, calc
 *  - select / checks: opcoes: ['A', 'B']  (checks = várias opções marcáveis)
 *  - table: colunas: [{ id, label, tipo }], linhas: ['fixa 1', ...] (opcional; sem linhas = o usuário adiciona)
 *           coluna tipo calc: formula com ids de outras colunas da mesma linha (ex.: "m + f")
 *  - calc: formula com ids de outros campos, ex.: "a + b - c" ou "sum(tabela.coluna)"
 *  - origem: 'igreja.campo' preenche o campo com o cadastro da igreja ao criar o relatório
 *  - obrigatorio: true, ajuda: 'texto de apoio', indicador: true (aparece na comparação anual)
 * verificacoes: [{ se: 'expressão verdadeira = problema', msg, nivel: 'erro' | 'alerta' }]
 * continuidade: compara com o relatório do mesmo modelo do ano anterior
 *   [{ atual: 'expressão neste ano', anterior: 'expressão no ano anterior', msg }]
 */

// Modelos de apoio (não oficiais), editáveis pelo administrador
window.IPB_MODELOS_APOIO = [
  {
    id: 'pastor',
    nome: 'Relatório do Ministro ao Presbitério',
    categoria: 'Ministro',
    descricao: 'Relatório anual de atividades do pastor ao Presbitério ao qual está jurisdicionado.',
    secoes: [
      {
        titulo: 'Identificação',
        campos: [
          { id: 'ministro', label: 'Nome do ministro', tipo: 'text', obrigatorio: true },
          { id: 'situacao', label: 'Situação', tipo: 'select', obrigatorio: true,
            opcoes: ['Pastor efetivo', 'Pastor auxiliar', 'Pastor evangelista', 'Missionário', 'Em disponibilidade', 'Jubilado', 'Outra'] },
          { id: 'campo', label: 'Campo (igreja, congregações e pontos)', tipo: 'textarea' },
          { id: 'data_posse', label: 'Data da posse no campo', tipo: 'date' }
        ]
      },
      {
        titulo: 'Atividades do ano',
        campos: [
          { id: 'sermoes', label: 'Sermões pregados', tipo: 'number', indicador: true },
          { id: 'estudos', label: 'Estudos bíblicos', tipo: 'number' },
          { id: 'visitas', label: 'Visitas pastorais', tipo: 'number', indicador: true },
          { id: 'aconselhamentos', label: 'Aconselhamentos', tipo: 'number' },
          { id: 'batismos_adultos', label: 'Batismos de adultos', tipo: 'number' },
          { id: 'batismos_infantis', label: 'Batismos infantis', tipo: 'number' },
          { id: 'profissoes_fe', label: 'Profissões de fé', tipo: 'number' },
          { id: 'ceias', label: 'Santas Ceias ministradas', tipo: 'number' },
          { id: 'casamentos', label: 'Casamentos', tipo: 'number' },
          { id: 'funerais', label: 'Ofícios fúnebres', tipo: 'number' }
        ]
      },
      {
        titulo: 'Atividades conciliares e formação',
        campos: [
          { id: 'cargos', label: 'Cargos e comissões nos concílios', tipo: 'textarea' },
          { id: 'reunioes_presbiterio', label: 'Reuniões do Presbitério a que compareceu', tipo: 'number' },
          { id: 'formacao', label: 'Cursos, leituras e formação continuada', tipo: 'textarea' }
        ]
      },
      {
        titulo: 'Avaliação do campo',
        campos: [
          { id: 'positivos', label: 'Pontos positivos', tipo: 'textarea' },
          { id: 'dificuldades', label: 'Dificuldades', tipo: 'textarea' },
          { id: 'planos', label: 'Planos', tipo: 'textarea' }
        ]
      }
    ],
    verificacoes: [
      { se: 'sermoes == 0', msg: 'Nenhum sermão informado no ano.' }
    ]
  },
  {
    id: 'tesouraria',
    nome: 'Relatório da Tesouraria (Prestação de Contas)',
    categoria: 'Finanças',
    descricao: 'Prestação de contas do tesoureiro ao Conselho, com receitas, despesas e conferência de saldo, para exame da comissão de contas.',
    secoes: [
      {
        titulo: 'Identificação',
        campos: [
          { id: 'tesoureiro', label: 'Tesoureiro', tipo: 'text', obrigatorio: true },
          { id: 'periodo', label: 'Período', tipo: 'select', obrigatorio: true, opcoes: ['Anual', 'Semestral', 'Trimestral', 'Mensal'] },
          { id: 'referencia', label: 'Referência (ex.: 1º semestre)', tipo: 'text' },
          { id: 'saldo_anterior', label: 'Saldo anterior', tipo: 'money', obrigatorio: true }
        ]
      },
      {
        titulo: 'Receitas',
        campos: [
          { id: 'rec_dizimos', label: 'Dízimos', tipo: 'money', obrigatorio: true },
          { id: 'rec_ofertas', label: 'Ofertas dos cultos', tipo: 'money' },
          { id: 'rec_missoes', label: 'Ofertas para missões', tipo: 'money' },
          { id: 'rec_outras', label: 'Outras receitas', tipo: 'money' },
          { id: 'rec_total', label: 'Total de receitas', tipo: 'calc', formato: 'money', indicador: true,
            formula: 'rec_dizimos + rec_ofertas + rec_missoes + rec_outras' }
        ]
      },
      {
        titulo: 'Despesas',
        campos: [
          { id: 'desp_pessoal', label: 'Côngruas, salários e encargos', tipo: 'money' },
          { id: 'desp_sc', label: 'Dízimo ao Supremo Concílio', tipo: 'money' },
          { id: 'desp_presbiterio', label: 'Contribuição ao Presbitério', tipo: 'money' },
          { id: 'desp_missoes', label: 'Missões', tipo: 'money' },
          { id: 'desp_manutencao', label: 'Manutenção e conservação', tipo: 'money' },
          { id: 'desp_consumo', label: 'Água, luz, telefone e internet', tipo: 'money' },
          { id: 'desp_social', label: 'Ação social', tipo: 'money' },
          { id: 'desp_outras', label: 'Outras despesas', tipo: 'money' },
          { id: 'desp_total', label: 'Total de despesas', tipo: 'calc', formato: 'money', indicador: true,
            formula: 'desp_pessoal + desp_sc + desp_presbiterio + desp_missoes + desp_manutencao + desp_consumo + desp_social + desp_outras' }
        ]
      },
      {
        titulo: 'Conferência',
        campos: [
          { id: 'saldo_final', label: 'Saldo final calculado', tipo: 'calc', formato: 'money', formula: 'saldo_anterior + rec_total - desp_total' },
          { id: 'contas', label: 'Contas bancárias', tipo: 'table',
            colunas: [ { id: 'banco', label: 'Banco / conta', tipo: 'text' }, { id: 'saldo', label: 'Saldo no extrato', tipo: 'money' } ] },
          { id: 'saldo_extratos', label: 'Saldo conferido nos extratos e caixa', tipo: 'money', obrigatorio: true },
          { id: 'comprovantes', label: 'Todos os comprovantes estão arquivados', tipo: 'yesno', obrigatorio: true },
          { id: 'observacoes', label: 'Observações', tipo: 'textarea' }
        ]
      }
    ],
    verificacoes: [
      { se: 'abs(saldo_final - saldo_extratos) > 0.009', msg: 'O saldo final calculado não confere com o saldo dos extratos e do caixa.' },
      { se: 'saldo_final < 0', msg: 'O saldo final calculado é negativo.' },
      { se: 'rec_dizimos > 0 && desp_sc == 0', msg: 'Há dízimos recebidos, mas nenhum repasse ao Supremo Concílio.' }
    ]
  },
  {
    id: 'sociedade',
    nome: 'Relatório Anual de Sociedade Interna',
    categoria: 'Sociedades internas',
    descricao: 'Relatório da SAF, UPH, UMP, UPA ou UCP ao Conselho, com diretoria, sócios, atividades e tesouraria.',
    secoes: [
      {
        titulo: 'Sociedade e diretoria',
        campos: [
          { id: 'sociedade', label: 'Sociedade', tipo: 'select', obrigatorio: true, opcoes: ['SAF', 'UPH', 'UMP', 'UPA', 'UCP'] },
          { id: 'presidente', label: 'Presidente', tipo: 'text', obrigatorio: true },
          { id: 'secretario', label: 'Secretário(a)', tipo: 'text' },
          { id: 'tesoureiro', label: 'Tesoureiro(a)', tipo: 'text' },
          { id: 'conselheiro', label: 'Conselheiro(a) nomeado pelo Conselho', tipo: 'text' }
        ]
      },
      {
        titulo: 'Sócios e reuniões',
        campos: [
          { id: 'socios_ativos', label: 'Sócios ativos', tipo: 'number', obrigatorio: true, indicador: true },
          { id: 'socios_cooperadores', label: 'Sócios cooperadores', tipo: 'number' },
          { id: 'reunioes', label: 'Reuniões plenárias', tipo: 'number' },
          { id: 'reunioes_diretoria', label: 'Reuniões da diretoria', tipo: 'number' },
          { id: 'presenca_media', label: 'Presença média', tipo: 'number' }
        ]
      },
      {
        titulo: 'Atividades',
        campos: [
          { id: 'atividades', label: 'Principais atividades', tipo: 'table',
            colunas: [ { id: 'atividade', label: 'Atividade', tipo: 'text' }, { id: 'data', label: 'Data', tipo: 'date' }, { id: 'participantes', label: 'Participantes', tipo: 'number' } ] },
          { id: 'espiritualidade', label: 'Espiritualidade e estudos', tipo: 'textarea' },
          { id: 'acao_social', label: 'Ação social e evangelização', tipo: 'textarea' },
          { id: 'federacao', label: 'Participou das atividades da Federação', tipo: 'yesno' }
        ]
      },
      {
        titulo: 'Tesouraria',
        campos: [
          { id: 'saldo_anterior', label: 'Saldo anterior', tipo: 'money' },
          { id: 'receitas', label: 'Receitas', tipo: 'money' },
          { id: 'despesas', label: 'Despesas', tipo: 'money' },
          { id: 'saldo_final', label: 'Saldo final', tipo: 'calc', formato: 'money', formula: 'saldo_anterior + receitas - despesas' },
          { id: 'observacoes', label: 'Observações', tipo: 'textarea' }
        ]
      }
    ],
    verificacoes: [
      { se: 'saldo_final < 0', msg: 'O saldo final da tesouraria é negativo.' },
      { se: 'presenca_media > socios_ativos + socios_cooperadores', msg: 'A presença média é maior que o número de sócios.' }
    ]
  },
  {
    id: 'escola_dominical',
    nome: 'Relatório da Escola Dominical',
    categoria: 'Educação cristã',
    descricao: 'Relatório do superintendente ao Conselho sobre classes, professores, matrículas e frequência.',
    secoes: [
      {
        titulo: 'Escola Dominical',
        campos: [
          { id: 'superintendente', label: 'Superintendente', tipo: 'text', obrigatorio: true },
          { id: 'classes', label: 'Classes', tipo: 'table',
            colunas: [
              { id: 'classe', label: 'Classe', tipo: 'text' },
              { id: 'professor', label: 'Professor(a)', tipo: 'text' },
              { id: 'matriculados', label: 'Matriculados', tipo: 'number' },
              { id: 'frequencia', label: 'Frequência média', tipo: 'number' }
            ] },
          { id: 'total_matriculados', label: 'Total de matriculados', tipo: 'calc', formula: 'sum(classes.matriculados)', indicador: true },
          { id: 'total_frequencia', label: 'Frequência média total', tipo: 'calc', formula: 'sum(classes.frequencia)', indicador: true },
          { id: 'revistas', label: 'Material usado (revistas, currículo)', tipo: 'text' },
          { id: 'eventos', label: 'Eventos e treinamentos de professores', tipo: 'textarea' },
          { id: 'desafios', label: 'Desafios', tipo: 'textarea' }
        ]
      }
    ],
    verificacoes: [
      { se: 'total_frequencia > total_matriculados', msg: 'A frequência média é maior que o total de matriculados.' }
    ]
  }
];

(function () {
  const MF = [
    { id: 'm', label: 'Masc.', tipo: 'number' },
    { id: 'f', label: 'Fem.', tipo: 'number' },
    { id: 't', label: 'Total', tipo: 'calc', formula: 'm + f' }
  ];
  const ident = (titulo) => ({
    titulo,
    campos: [
      { id: 'id_nome', label: 'Nome (Igreja/Congregação)', tipo: 'text', origem: 'igreja.nome', obrigatorio: true },
      { id: 'id_endereco', label: 'Endereço (rua, nº, complemento)', tipo: 'text', origem: 'igreja.endereco' },
      { id: 'id_bairro', label: 'Bairro', tipo: 'text', origem: 'igreja.bairro' },
      { id: 'id_cidade', label: 'Cidade', tipo: 'text', origem: 'igreja.cidade' },
      { id: 'id_uf', label: 'UF', tipo: 'text', origem: 'igreja.uf' },
      { id: 'id_cep', label: 'CEP', tipo: 'text', origem: 'igreja.cep' },
      { id: 'id_telefone', label: 'Telefone', tipo: 'text', origem: 'igreja.telefone' },
      { id: 'id_email', label: 'E-mail', tipo: 'text', origem: 'igreja.email' },
      { id: 'id_data_org', label: 'Data de organização', tipo: 'text', origem: 'igreja.dataOrg' },
      { id: 'id_cnpj', label: 'CNPJ', tipo: 'text', origem: 'igreja.cnpj' },
      { id: 'id_site', label: 'Site', tipo: 'text', origem: 'igreja.site' }
    ]
  });
  const final = () => ({
    titulo: 'Informações finais',
    campos: [
      { id: 'secretario', label: 'Secretário do Conselho', tipo: 'text', origem: 'igreja.secretario', obrigatorio: true },
      { id: 'local', label: 'Local', tipo: 'text', origem: 'igreja.cidade' },
      { id: 'data', label: 'Data', tipo: 'date' },
      { id: 'observacoes', label: 'Observações', tipo: 'textarea' }
    ]
  });

  // Itens financeiros do formulário de estatística (mesma ordem do formulário)
  const REC = [['dizimos', 'Dízimos'], ['ofertas', 'Ofertas'], ['of_missionarias', 'Ofertas Missionárias'], ['of_especificas', 'Ofertas Específicas'],
    ['rec_financeiras', 'Receitas Financeiras'], ['rec_emprestimos', 'Empréstimos IPB / JPEF'], ['parcerias', 'Parcerias'], ['rec_outras', 'Outras Receitas']];
  const DESP = [['patrimonio', 'Patrimônio'], ['causas_locais', 'Causas Locais'], ['evangelismo', 'Evangelismo Local'], ['missoes', 'Missões'],
    ['acao_social', 'Ação Social'], ['sustento', 'Sustento Pastoral'], ['verba_presb', 'Verba Presbiterial'], ['dizimo_sc', 'Dízimo ao Supremo Concílio'],
    ['desp_emprestimos', 'Empréstimos IPB / JPEF'], ['desp_outras', 'Outras Despesas']];
  const fin = (p, titulo, saldoLabel, ind) => ({
    titulo,
    campos: [
      { id: p + 'saldo_ant', label: saldoLabel, tipo: 'money', indicador: ind },
      ...REC.map(([k, l]) => ({ id: p + k, label: 'Receita: ' + l, tipo: 'money', indicador: ind && k === 'dizimos' })),
      { id: p + 'rec_total', label: 'Total da Receita Anual', tipo: 'calc', formato: 'money', indicador: ind, formula: REC.map(([k]) => p + k).join(' + ') },
      { id: p + 'grande_total', label: 'Grande Total (saldo + receitas)', tipo: 'calc', formato: 'money', formula: p + 'saldo_ant + ' + p + 'rec_total' },
      ...DESP.map(([k, l]) => ({ id: p + k, label: 'Despesa: ' + l, tipo: 'money', indicador: ind && ['dizimo_sc', 'missoes', 'sustento'].includes(k) })),
      { id: p + 'desp_total', label: 'Total da Despesa Anual', tipo: 'calc', formato: 'money', indicador: ind, formula: DESP.map(([k]) => p + k).join(' + ') },
      { id: p + 'saldo_seguinte', label: 'Saldo para o ano seguinte', tipo: 'calc', formato: 'money', indicador: ind, formula: p + 'grande_total - ' + p + 'desp_total' }
    ]
  });

  const estatistico = {
    id: 'estatistico',
    nome: 'Informações Cadastrais e Estatísticas',
    categoria: 'Formulário oficial',
    descricao: 'Reprodução do formulário "Informações Cadastrais e Estatísticas de Comunidade Presbiteriana" (CSM-IPB 2021 v8.0): liderança, estrutura, rol de membros, movimento financeiro e previsão orçamentária.',
    secoes: [
      ident('I. Identificação da Igreja ou Congregação Presbiterial'),
      {
        titulo: 'II. Estrutura da Comunidade Presbiteriana',
        campos: [
          { id: 'lid_pastores', label: 'Liderança formal: Pastores', tipo: 'number', indicador: true },
          { id: 'lid_licenciados', label: 'Licenciados', tipo: 'number' },
          { id: 'lid_presbiteros', label: 'Presbíteros', tipo: 'number', indicador: true },
          { id: 'lid_diaconos', label: 'Diáconos', tipo: 'number', indicador: true },
          { id: 'lid_evangelistas', label: 'Evangelistas', tipo: 'number' },
          { id: 'lid_missionarios', label: 'Missionários', tipo: 'number' },
          { id: 'lid_candidatos', label: 'Candidatos', tipo: 'number' },
          { id: 'est_congregacoes', label: 'Estrutura do trabalho: Congregações da Igreja', tipo: 'number' },
          { id: 'est_pontos', label: 'Pontos de Pregação', tipo: 'number' },
          { id: 'est_escolas', label: 'Escolas Dominicais', tipo: 'number' },
          { id: 'est_professores', label: 'Professores da Escola Dominical', tipo: 'number' },
          { id: 'est_alunos', label: 'Alunos da Escola Dominical (ano atual)', tipo: 'number', indicador: true },
          { id: 'est_alunos_ant', label: 'Alunos da Escola Dominical (ano anterior)', tipo: 'number' },
          { id: 'dep', label: 'Departamentos internos', tipo: 'table', linhas: ['UCP', 'UPA', 'UMP', 'SAF', 'UPH', 'Outras'],
            colunas: [{ id: 'deptos', label: 'Nº Deptos.', tipo: 'number' }, { id: 'membros', label: 'Nº de Membros', tipo: 'number' }] },
          { id: 'dep_total', label: 'Total de membros nos departamentos', tipo: 'calc', formula: 'sum(dep.membros)', indicador: true }
        ]
      },
      {
        titulo: 'III. Rol de Membros: Comungantes',
        campos: [
          { id: 'com_adm', label: 'Admissão', tipo: 'table', colunas: MF,
            linhas: ['Profissão de Fé', 'Profissão de Fé e Batismo', 'Transferência', 'Jurisdição', 'Restauração', 'Designação do Presbitério'] },
          { id: 'com_dem', label: 'Demissão', tipo: 'table', colunas: MF, linhas: ['Transferência', 'Falecimento', 'Exclusão', 'Ordenação'] },
          { id: 'rs_m', label: 'Rol Separado (masc.)', tipo: 'number' },
          { id: 'rs_f', label: 'Rol Separado (fem.)', tipo: 'number' },
          { id: 'com_ant_m', label: 'Comungantes ano anterior (masc.)', tipo: 'number', obrigatorio: true },
          { id: 'com_ant_f', label: 'Comungantes ano anterior (fem.)', tipo: 'number', obrigatorio: true },
          { id: 'com_dif', label: 'Diferença (Admissão − Demissão)', tipo: 'calc', formula: 'sum(com_adm.m) + sum(com_adm.f) - sum(com_dem.m) - sum(com_dem.f)' },
          { id: 'com_atual_m', label: 'Comungantes ano atual (masc.)', tipo: 'calc', formula: 'com_ant_m + sum(com_adm.m) - sum(com_dem.m)' },
          { id: 'com_atual_f', label: 'Comungantes ano atual (fem.)', tipo: 'calc', formula: 'com_ant_f + sum(com_adm.f) - sum(com_dem.f)' },
          { id: 'com_atual', label: 'Comungantes ano atual (total)', tipo: 'calc', indicador: true, formula: 'com_atual_m + com_atual_f' },
          { id: 'com_profissoes', label: 'Novos membros por profissão de fé', tipo: 'calc', indicador: true, formula: 'sum(com_adm.t, 0, 1)' }
        ]
      },
      {
        titulo: 'III. Rol de Membros: Não comungantes',
        campos: [
          { id: 'nc_adm', label: 'Admissão', tipo: 'table', colunas: MF, linhas: ['Batismo', 'Transferência', 'Jurisdição ex-officio'] },
          { id: 'nc_dem', label: 'Demissão', tipo: 'table', colunas: MF, linhas: ['Profissão de Fé', 'Transferência', 'Falecimento', 'Exclusão'] },
          { id: 'nc_ant_m', label: 'Não comungantes ano anterior (masc.)', tipo: 'number' },
          { id: 'nc_ant_f', label: 'Não comungantes ano anterior (fem.)', tipo: 'number' },
          { id: 'nc_atual_m', label: 'Não comungantes ano atual (masc.)', tipo: 'calc', formula: 'nc_ant_m + sum(nc_adm.m) - sum(nc_dem.m)' },
          { id: 'nc_atual_f', label: 'Não comungantes ano atual (fem.)', tipo: 'calc', formula: 'nc_ant_f + sum(nc_adm.f) - sum(nc_dem.f)' },
          { id: 'nc_atual', label: 'Não comungantes ano atual (total)', tipo: 'calc', indicador: true, formula: 'nc_atual_m + nc_atual_f' },
          { id: 'rol_atual', label: 'Rol atual (comungantes + não comungantes)', tipo: 'calc', indicador: true, formula: 'com_atual + nc_atual' }
        ]
      },
      fin('fin_', 'IV. Movimento financeiro do ano', 'Saldo do ano anterior', true),
      fin('prev_', 'V. Previsão orçamentária para o próximo exercício', 'Saldo do ano anterior (previsto)', false),
      final()
    ],
    verificacoes: [
      { se: 'fin_dizimos > 0 && fin_dizimo_sc == 0', msg: 'Houve receita de dízimos, mas nenhum repasse do dízimo ao Supremo Concílio.', nivel: 'erro' },
      { se: 'fin_dizimo_sc > 0 && abs(fin_dizimo_sc - fin_dizimos * 0.1) > fin_dizimos * 0.01', msg: 'O dízimo ao Supremo Concílio não corresponde a 10% dos dízimos recebidos. Conferir a base de cálculo.', nivel: 'alerta' },
      { se: 'fin_saldo_seguinte < 0', msg: 'O saldo para o ano seguinte ficou negativo.', nivel: 'erro' },
      { se: 'fin_desp_total > fin_rec_total', msg: 'A despesa do ano foi maior que a receita do ano (o saldo anterior cobriu a diferença).', nivel: 'alerta' },
      { se: 'prev_desp_total > prev_grande_total', msg: 'A previsão de despesas é maior que a receita prevista somada ao saldo.', nivel: 'alerta' },
      { se: 'est_escolas > est_congregacoes + est_pontos + 1', msg: 'Há mais Escolas Dominicais do que sede, congregações e pontos de pregação. Provável erro de preenchimento.', nivel: 'alerta' },
      { se: 'est_alunos > 0 && est_professores == 0', msg: 'Há alunos na Escola Dominical, mas nenhum professor informado.', nivel: 'alerta' },
      { se: 'lid_pastores == 0', msg: 'Nenhum pastor informado.', nivel: 'alerta' },
      { se: 'sum(com_dem.t, 3, 3) > 0', msg: 'Há demissões por Ordenação. Confirmar se não houve confusão com o Rol Separado.', nivel: 'alerta' },
      { se: 'com_atual_m < 0 || com_atual_f < 0 || nc_atual_m < 0 || nc_atual_f < 0', msg: 'O rol ficou negativo: as demissões superam o rol anterior somado às admissões.', nivel: 'erro' }
    ],
    continuidade: [
      { atual: 'com_ant_m + com_ant_f', anterior: 'com_atual', msg: 'Comungantes do ano anterior não conferem com o total de comungantes informado no relatório anterior.' },
      { atual: 'nc_ant_m + nc_ant_f', anterior: 'nc_atual', msg: 'Não comungantes do ano anterior não conferem com o total do relatório anterior.' },
      { atual: 'fin_saldo_ant', anterior: 'fin_saldo_seguinte', msg: 'O saldo do ano anterior não confere com o saldo para o ano seguinte do relatório anterior.' },
      { atual: 'est_alunos_ant', anterior: 'est_alunos', msg: 'Alunos da Escola Dominical do ano anterior não conferem com o relatório anterior.' }
    ]
  };

  const sn = (id, label, extra) => Object.assign({ id, label, tipo: 'yesno' }, extra || {});
  const nu = (id, label, extra) => Object.assign({ id, label, tipo: 'number' }, extra || {});
  const conselho = {
    id: 'conselho',
    nome: 'Relatório do Conselho ou Mesa Administrativa',
    categoria: 'Formulário oficial',
    descricao: 'Reprodução do formulário "Relatório do Conselho ou Mesa Administrativa" (CSM-IPB 2021 v8.0): organização, supervisão espiritual e administrativa, planejamento estratégico e patrimônio.',
    secoes: [
      ident('I. Identificação da Igreja / Congregação Presbiterial'),
      {
        titulo: '1. Organização',
        campos: [
          sn('imoveis_doc', '1.1. Os imóveis estão documentados?'),
          sn('inventario', '1.2. Há inventário dos móveis e utensílios?'),
          sn('rois_atualizados', '1.3. Os Róis de Membros estão atualizados?'),
          { id: 'declaracoes', label: '1.4. Apresentou declarações do ano anterior?', tipo: 'checks', opcoes: ['IRenda', 'RAIS', 'DIRF'] },
          sn('inventario_atualizado', '1.5. Inventário atualizado?'),
          nu('congregacoes', '1.6. Quantas Congregações da Igreja?')
        ]
      },
      {
        titulo: '2. Supervisão Espiritual',
        campos: [
          nu('ceia_grupos', '2.1.1. Nº de celebrações da Santa Ceia em grupos', { indicador: true }),
          nu('ceia_individuos', 'Nº de ministrações da Ceia a indivíduos'),
          { id: 'ceia_total', label: 'Santa Ceia: total geral', tipo: 'calc', formula: 'ceia_grupos + ceia_individuos' },
          nu('ativ_evang', '2.2.1. Nº de atividades evangelísticas', { indicador: true, ajuda: 'Em templos e residências; recintos públicos e ao ar livre; pela imprensa escrita, rádio e TV etc.' }),
          nu('biblias', '2.2.2. Textos distribuídos: Bíblias'),
          nu('nt', 'Novos Testamentos'),
          nu('folhetos', 'Folhetos'),
          nu('outras_lit', 'Outras literaturas'),
          { id: 'textos_total', label: 'Textos distribuídos: total geral', tipo: 'calc', indicador: true, formula: 'biblias + nt + folhetos + outras_lit' },
          { id: 'missionario', label: '2.2.3. Trabalho missionário com', tipo: 'checks', opcoes: ['JMN', 'APMT', 'Parceria com o PMC', 'Plantação de Igrejas'] },
          { id: 'outra_missao', label: '2.2.4. Outra participação missionária', tipo: 'text' },
          sn('trein_ed', '2.3.1. Treinamento para professores de Escola Dominical'),
          sn('trein_musica', '2.3.2. Treinamento para Equipe de Música'),
          sn('trein_oficiais', '2.3.3. Treinamento para Oficiais (Presbíteros e Diáconos)'),
          sn('trein_lideranca', '2.3.4. Treinamento para Liderança'),
          nu('grupos_corais', '2.3.5. Nº de Grupos Corais'),
          nu('conjuntos', '2.3.6. Nº de Conjuntos Musicais'),
          nu('discipulados', '2.3.7. Nº de Discipulados Realizados'),
          nu('atos_jd', '2.4.1. Nº de atos beneficentes realizados pela Junta Diaconal'),
          nu('atos_outros', 'Atos beneficentes por outros departamentos'),
          { id: 'atos_total', label: 'Atos beneficentes: total geral', tipo: 'calc', indicador: true, formula: 'atos_jd + atos_outros' },
          nu('visitas_oficiais', '2.4.2. Nº de visitas feitas por presbíteros e diáconos'),
          nu('visitas_outros', 'Visitas por outros departamentos'),
          { id: 'visitas_total', label: 'Visitas: total geral', tipo: 'calc', indicador: true, formula: 'visitas_oficiais + visitas_outros' }
        ]
      },
      {
        titulo: '3. Supervisão Administrativa',
        campos: [
          sn('dizimo_sc', '3.1. A Igreja enviou fielmente os Dízimos dos Dízimos à Tesouraria IPB?', { obrigatorio: true }),
          nu('reun_conselho', '3.2. Reuniões do Conselho [1]', { indicador: true }),
          nu('reun_jd', '3.3. Reuniões da Junta Diaconal [1]'),
          nu('reun_ag', '3.4. Reuniões da Assembleia Geral [1]'),
          nu('reun_mesa', '3.5. Reuniões da Mesa Administrativa da Cong. Presbiterial [2]'),
          nu('reun_contas', '3.6. Reuniões da Comissão de Exame de Contas da Tesouraria [3]', { ajuda: 'Preenchimento: [1] Igreja; [2] Congregação Presbiterial; [3] Ambas.' }),
          sn('exame_balancetes', '3.7. Houve exame/aprovação dos balancetes da tesouraria?'),
          sn('mandato_vencer', '3.8. Há oficiais com mandato a vencer no ano a seguir?'),
          nu('mandato_presb', 'Presbíteros com mandato a vencer'),
          nu('mandato_diac', 'Diáconos com mandato a vencer'),
          sn('exame_livros_soc', '3.9. Idem, dos livros e relatórios das sociedades?'),
          sn('conselheiros_soc', '3.10. Houve nomeação de conselheiros às Sociedades?'),
          { id: 'quais', label: 'Quais sociedades?', tipo: 'text' },
          sn('causas_extra', '3.11. Houve contribuição para causas extra-locais?'),
          sn('previdencia', '3.12. Contribuiu com Previdência Social do(s) pastor(es)?'),
          sn('fap', 'FAP?'),
          sn('ipbprev', 'IPB-PREV?'),
          { id: 'reforma_projeto', label: '3.13. Reforma e/ou Construção em projeto', tipo: 'textarea' },
          { id: 'reforma_andamento', label: '3.14. Reforma e/ou Construção em andamento', tipo: 'textarea' }
        ]
      },
      {
        titulo: '4. Planejamento Estratégico',
        campos: [
          sn('plan_estrategico', '4.1. A Igreja tem Planejamento Estratégico?'),
          { id: 'obj_alcancados', label: '4.2. Quais os objetivos propostos e alcançados?', tipo: 'textarea' },
          { id: 'obj_nao_alcancados', label: '4.3. Quais os objetivos propostos e NÃO alcançados? Identificar as dificuldades.', tipo: 'textarea' }
        ]
      },
      {
        titulo: '5. Patrimônio',
        campos: [
          sn('seguro', '5.1. A Igreja tem Seguro do bem patrimonial?'),
          sn('alvara', '5.2. Tem Alvará de Funcionamento?'),
          sn('avcb', '5.3. Tem Licença do Corpo de Bombeiros em dia?'),
          sn('cert_digital', '5.4. Tem Certificado Digital?')
        ]
      },
      final()
    ],
    verificacoes: [
      { se: "dizimo_sc == 'nao'", msg: 'Informou que NÃO enviou os Dízimos dos Dízimos à Tesouraria da IPB (3.1).', nivel: 'erro' },
      { se: "rois_atualizados == 'nao'", msg: 'Os Róis de Membros não estão atualizados (1.3).', nivel: 'erro' },
      { se: "imoveis_doc == 'nao'", msg: 'Os imóveis não estão documentados (1.1).', nivel: 'alerta' },
      { se: "exame_balancetes == 'nao'", msg: 'Não houve exame/aprovação dos balancetes da tesouraria (3.7).', nivel: 'erro' },
      { se: 'reun_conselho + reun_mesa < 4', msg: 'Menos de 4 reuniões do Conselho/Mesa no ano: verificar se houve ao menos uma reunião ordinária por trimestre.', nivel: 'alerta' },
      { se: 'reun_ag + reun_mesa == 0', msg: 'Nenhuma reunião de Assembleia Geral informada no ano.', nivel: 'alerta' },
      { se: 'ceia_grupos < 4', msg: 'Poucas celebrações da Santa Ceia no ano.', nivel: 'alerta' },
      { se: "previdencia == 'nao'", msg: 'Não contribuiu com a Previdência Social do(s) pastor(es) (3.12).', nivel: 'alerta' },
      { se: "mandato_vencer == 'sim' && mandato_presb + mandato_diac == 0", msg: 'Marcou oficiais com mandato a vencer, mas não informou quantos.', nivel: 'alerta' },
      { se: "plan_estrategico == 'nao'", msg: 'A igreja não tem Planejamento Estratégico (4.1).', nivel: 'alerta' },
      { se: "seguro == 'nao' || alvara == 'nao' || avcb == 'nao'", msg: 'Pendências de patrimônio: seguro, alvará ou licença do Corpo de Bombeiros (5.1 a 5.3).', nivel: 'alerta' }
    ],
    continuidade: []
  };

  window.IPB_MODELOS_PADRAO = [estatistico, conselho].concat(window.IPB_MODELOS_APOIO || []);
})();
