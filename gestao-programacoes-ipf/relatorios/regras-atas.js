/**
 * Regras para exame de atas, extraídas do Manual Presbiteriano (edição 2025):
 * Regulamento para Confecção de Atas dos Concílios da IPB (CE-SC/IPB 2015, DOC. CXV,
 * com alterações do SC 2022 e da CE 2025) e Constituição da IPB.
 * aplica: 'todas' | 'manuscrito' | 'digital' | 'conselho' | 'livro' (capa, termos, encadernação)
 * Usado tanto na conferência manual quanto como base da análise feita pela IA.
 */
window.IPB_REGRAS_ATAS = [
  // Conteúdo obrigatório (Art. 10)
  { id: 'c01', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 1º', aplica: 'todas', texto: 'Traz o número da ata (no Conselho) ou o número ordinário da reunião (concílio superior), com hora, data e local da reunião.' },
  { id: 'c02', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 1º; SC-2022 DOC. V', aplica: 'todas', texto: 'Em reunião on-line ou mista, registra o endereço da sede como local e o link da plataforma usada.' },
  { id: 'c03', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 2º', aplica: 'todas', texto: 'Relaciona os membros presentes e os ausentes.' },
  { id: 'c04', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 2º', aplica: 'todas', texto: 'Indica quem presidiu e quem dirigiu a oração inicial.' },
  { id: 'c05', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 3º', aplica: 'todas', texto: 'Os nomes aparecem completos na primeira vez em que são citados.' },
  { id: 'c06', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 4º', aplica: 'todas', texto: 'Valores monetários relevantes vêm também por extenso.' },
  { id: 'c07', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 6º', aplica: 'todas', texto: 'Registra a leitura e aprovação da ata anterior, ou o adiamento com o motivo.' },
  { id: 'c08', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 7º', aplica: 'todas', texto: 'Registra as resoluções tomadas, sem relatar meras sugestões ou propostas não aprovadas.' },
  { id: 'c09', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 8º', aplica: 'todas', texto: 'Declara o encerramento, com a hora e o nome de quem dirigiu a oração final.' },
  { id: 'c10', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 10, § 9º', aplica: 'todas', texto: 'Termina com o nome do secretário que a redigiu, o registro de quem a transcreveu e a assinatura (e a do presidente, quando necessária).' },
  { id: 'c11', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 16', aplica: 'conselho', texto: 'Se o presidente secretariou, assina como "Presidente-Secretário" ou "Presidente e Secretário ad-hoc".' },
  { id: 'c12', grupo: 'Conteúdo da ata', artigo: 'Regulamento de Atas, art. 18', aplica: 'todas', texto: 'O texto está dividido em itens (sugestão: ASSUNTOS INTERNOS e ASSUNTOS EXTERNOS).' },
  { id: 'c13', grupo: 'Conteúdo da ata', artigo: 'CI/IPB, art. 76', aplica: 'conselho', texto: 'Há quórum: o pastor e um terço dos presbíteros, nunca menos de dois (em urgência, pastor e um presbítero, ad referendum).' },

  // Atas do Conselho (Art. 12)
  { id: 'k01', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 1º', aplica: 'conselho', texto: 'Candidatos à profissão de fé: nome e registro do exame sobre fé, conhecimento do Evangelho e prática da vida cristã, e se foi aceito.' },
  { id: 'k02', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 2º, I; CI/IPB, art. 36', aplica: 'conselho', texto: 'Relatório dos atos pastorais com as celebrações da Santa Ceia: datas, locais e ministros celebrantes.' },
  { id: 'k03', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 2º, II', aplica: 'conselho', texto: 'Admissão de comungantes com os dados exigidos (nascimento, sexo, procedência, estado civil, profissão, endereço, modo de recepção e celebrante).' },
  { id: 'k04', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 2º, III', aplica: 'conselho', texto: 'Arrolamento de não comungantes com nome, nascimento, sexo, pais, celebrante, data e local do batismo.' },
  { id: 'k05', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 2º, IV; CI/IPB, art. 31', aplica: 'conselho', texto: 'Falecimentos, casamentos (com o número do registro em livro próprio) e mudanças de membros.' },
  { id: 'k06', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 3º', aplica: 'conselho', texto: 'Transcrição da ata da Assembleia que elegeu oficiais ou pastor, quando houve eleição.' },
  { id: 'k07', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 12, § 4º', aplica: 'conselho', texto: 'Assuntos disciplinares não aparecem nesta ata: devem estar em ata e livro específicos.' },
  { id: 'k08', grupo: 'Atas do Conselho', artigo: 'Regulamento de Atas, art. 17', aplica: 'conselho', texto: 'Após a última ata antes da reunião ordinária do Presbitério, há o registro da estatística do movimento espiritual e financeiro do ano.' },

  // Forma de lavrar (Arts. 13 a 15, 20)
  { id: 'f01', grupo: 'Forma de lavrar', artigo: 'Regulamento de Atas, art. 13', aplica: 'todas', texto: 'Sem entrelinhas, emendas ou rasuras.' },
  { id: 'f02', grupo: 'Forma de lavrar', artigo: 'Regulamento de Atas, art. 15', aplica: 'todas', texto: 'Correções feitas apenas por AUTO DE CORREÇÃO, EMENDA ou ACRÉSCIMO lavrado em seguida.' },
  { id: 'f03', grupo: 'Forma de lavrar', artigo: 'Regulamento de Atas, art. 14', aplica: 'todas', texto: 'Só abreviações consagradas (Rev., Presb., Diác., CI/IPB etc.).' },
  { id: 'f04', grupo: 'Forma de lavrar', artigo: 'Regulamento de Atas, art. 20', aplica: 'todas', texto: 'Páginas numeradas em sequência no canto superior ou inferior direito, em negrito.' },
  { id: 'f05', grupo: 'Forma de lavrar', artigo: 'Regulamento de Atas, art. 2º, § 2º e § 3º', aplica: 'todas', texto: 'Folhas rubricadas pelo presidente e pelo secretário que exerceram as funções.' },

  // Livro manuscrito (Art. 5º)
  { id: 'm01', grupo: 'Livro manuscrito', artigo: 'Regulamento de Atas, art. 5º, § 2º e § 3º', aplica: 'manuscrito', texto: 'Margens de 3 cm, com os assuntos anotados na margem externa.' },
  { id: 'm02', grupo: 'Livro manuscrito', artigo: 'Regulamento de Atas, art. 5º, § 4º', aplica: 'manuscrito', texto: 'Escrita em tinta preta ou azul.' },
  { id: 'm03', grupo: 'Livro manuscrito', artigo: 'Regulamento de Atas, art. 5º, § 5º e § 6º', aplica: 'manuscrito', texto: 'Texto justificado, em uma única coluna.' },
  { id: 'm04', grupo: 'Livro manuscrito', artigo: 'Regulamento de Atas, art. 5º, § 7º', aplica: 'manuscrito', texto: 'Cada ata começa na primeira linha da página, em parágrafo único, e as linhas que sobram são inutilizadas com linha sinuosa.' },

  // Livro digital (Art. 6º e 7º)
  { id: 'd01', grupo: 'Livro digital', artigo: 'Regulamento de Atas, art. 6º, § 1º a § 5º', aplica: 'digital', texto: 'Folha Carta, A4 ou Ofício, cor clara, margens de 3 cm, retrato e impressa só de um lado.' },
  { id: 'd02', grupo: 'Livro digital', artigo: 'Regulamento de Atas, art. 6º, § 7º, I', aplica: 'digital', texto: 'Fonte legível de 12 a 14 pontos (Arial, Times New Roman, Courier ou similar).' },
  { id: 'd03', grupo: 'Livro digital', artigo: 'Regulamento de Atas, art. 6º, § 7º, II', aplica: 'digital', texto: 'Maiúsculas, negrito, sublinhado e itálico só para títulos, ênfases e citações.' },
  { id: 'd04', grupo: 'Livro digital', artigo: 'Regulamento de Atas, art. 6º, § 8º', aplica: 'digital', texto: 'Parágrafo único, sem recuo, justificado (ou à esquerda), em uma coluna, começando na primeira linha da página; as linhas que sobram são preenchidas com hífens.' },
  { id: 'd05', grupo: 'Livro digital', artigo: 'Regulamento de Atas, art. 6º, § 9º; art. 7º', aplica: 'digital', texto: 'Notas de rodapé numeradas com: nº da ata, data e hora de início; presentes e ausentes; leitura e aprovação da ata; assuntos tratados; data e hora do término.' },
  { id: 'd06', grupo: 'Livro digital', artigo: 'CE-2025 DOC. CLXXXIV', aplica: 'digital', texto: 'Se assinada digitalmente, a assinatura segue a legislação nacional (por exemplo, gov.br ou certificado ICP-Brasil).' },

  // Livro (capa, termos, encadernação)
  { id: 'l01', grupo: 'Livro de atas', artigo: 'Regulamento de Atas, art. 2º, § 1º', aplica: 'livro', texto: 'Capa com ATAS, nome do concílio, localidade, número do livro, datas de abertura e encerramento e sede.' },
  { id: 'l02', grupo: 'Livro de atas', artigo: 'Regulamento de Atas, art. 3º', aplica: 'livro', texto: 'Termo de Abertura na primeira página, assinado pelo presidente, conforme o modelo (e Termo de Encerramento só quando o livro termina).' },
  { id: 'l03', grupo: 'Livro de atas', artigo: 'Regulamento de Atas, art. 8º', aplica: 'livro', texto: 'Livro com 50 a 100 folhas, encadernado em brochura (espiral não é permitido).' },
  { id: 'l04', grupo: 'Livro de atas', artigo: 'Regulamento de Atas, art. 12, § 5º; art. 11', aplica: 'livro', texto: 'Observações e termo de aprovação do Presbitério seguem o mesmo padrão e numeração do livro, assinados pelo presidente do Presbitério.' }
];
