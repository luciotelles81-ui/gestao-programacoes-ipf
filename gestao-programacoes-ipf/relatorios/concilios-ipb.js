/**
 * Concílios da Igreja Presbiteriana do Brasil: sínodos e seus presbitérios.
 * Fontes públicas consultadas em novembro de 2026:
 *  - "Sínodos da IPB e seus presbitérios" (ipbhistoriaeidentidade.com.br, publicado em 14/06/2024):
 *    nomes e agrupamento por sínodo.
 *  - Wikipédia, listas de sínodos e de presbitérios da IPB (situação de abril de 2024): as siglas
 *    que constam aqui e o Sínodo Anápolis.
 * As fontes públicas não trazem a sigla da maioria dos concílios. Onde a sigla está vazia, ela
 * pode ser informada na tela de entrada; para completar a lista, use a relação oficial da
 * Secretaria Executiva do Supremo Concílio.
 * 91 sínodos e 379 presbitérios.
 * Formato: n = nome, s = sigla, p = presbitérios do sínodo.
 */
window.IPB_CONCILIOS = [
  {"n": "Sínodo do Acre", "s": "SAC", "p": [{"n": "Presbitério Acre", "s": "PRAC"}, {"n": "Presbitério Rio Branco", "s": "PRRB"}, {"n": "Presbitério Vale do Juruá", "s": "PVJU"}]},
  {"n": "Sínodo Agreste Sul de Pernambuco", "s": "SAP", "p": [{"n": "Presbitério Agreste Pernambuco", "s": "PAPE"}, {"n": "Presbitério Caruaru", "s": "PRCR"}, {"n": "Presbitério Sul Pernambuco", "s": "PSPN"}]},
  {"n": "Sínodo Alagoas-Sergipe", "s": "", "p": [{"n": "Presbitério Alagoas", "s": ""}, {"n": "Presbitério Centro de Alagoas", "s": ""}, {"n": "Presbitério Maceió", "s": ""}, {"n": "Presbitério Sergipe", "s": ""}]},
  {"n": "Sínodo Anápolis", "s": "SAN", "p": [{"n": "Presbitério Anápolis", "s": "PANA"}, {"n": "Presbitério Norte de Anápolis", "s": "PNAN"}, {"n": "Presbitério Sul de Anápolis", "s": "PSAN"}]},
  {"n": "Sínodo Araguaia-Tocantins", "s": "", "p": [{"n": "Presbitério Centro Oeste Goiano", "s": ""}, {"n": "Presbitério Ceres", "s": ""}, {"n": "Presbitério Lago Serra da Mesa", "s": ""}, {"n": "Presbitério Norte Goiano", "s": ""}]},
  {"n": "Sínodo da Bahia", "s": "", "p": [{"n": "Presbitério Bahia", "s": ""}, {"n": "Presbitério Metropolitano da Bahia", "s": ""}, {"n": "Presbitério Recôncavo da Bahia", "s": ""}]},
  {"n": "Sínodo Baixada Fluminense", "s": "", "p": [{"n": "Presbitério Mesquita", "s": ""}, {"n": "Presbitério São João de Meriti", "s": ""}, {"n": "Presbitério Vilar dos Teles", "s": ""}]},
  {"n": "Sínodo Bandeirante de Brasília", "s": "", "p": [{"n": "Presbitério Bandeirantes de Brasília", "s": ""}, {"n": "Presbitério Guará", "s": ""}, {"n": "Presbitério Serrano do Distrito Federal", "s": ""}]},
  {"n": "Sínodo de Bauru", "s": "", "p": [{"n": "Presbitério Araçatuba", "s": ""}, {"n": "Presbitério Bauru", "s": ""}, {"n": "Presbitério Presidente Prudente", "s": ""}, {"n": "Presbitério São José do Rio Preto", "s": ""}, {"n": "Presbitério Votuporanga", "s": ""}]},
  {"n": "Sínodo de Belo Horizonte", "s": "", "p": [{"n": "Presbitério Alterosa", "s": ""}, {"n": "Presbitério Belo Horizonte", "s": ""}, {"n": "Presbitério Inconfidentes", "s": ""}, {"n": "Presbitério Sesquicentenário", "s": ""}, {"n": "Presbitério Sudoeste de Belo Horizonte", "s": ""}]},
  {"n": "Sínodo Brasil Central", "s": "", "p": [{"n": "Presbitério Goiânia", "s": ""}, {"n": "Presbitério Leste de Goiânia", "s": ""}, {"n": "Presbitério Metropolitano de Goiânia", "s": ""}, {"n": "Presbitério Oeste de Goiânia", "s": ""}, {"n": "Presbitério Sudoeste de Goiânia", "s": ""}, {"n": "Presbitério Sul de Goiânia", "s": ""}]},
  {"n": "Sínodo de Brasília", "s": "", "p": [{"n": "Presbitério Alto Noroeste Mineiro", "s": ""}, {"n": "Presbitério Alvorada", "s": ""}, {"n": "Presbitério Brasília", "s": ""}, {"n": "Presbitério Brasília Sul", "s": ""}, {"n": "Presbitério Vale do Paranã", "s": ""}]},
  {"n": "Sínodo de Campinas", "s": "", "p": [{"n": "Presbitério Americana", "s": ""}, {"n": "Presbitério Campinas", "s": ""}, {"n": "Presbitério Metropolitano de Campinas", "s": ""}, {"n": "Presbitério Santa Bárbara D'Oeste", "s": ""}]},
  {"n": "Sínodo Carajás", "s": "", "p": [{"n": "Presbitério Araguaia", "s": ""}, {"n": "Presbitério Carajás", "s": ""}, {"n": "Presbitério Centenário do Presbiterianismo no Pará", "s": ""}, {"n": "Presbitério Leste da Transamazônica", "s": ""}]},
  {"n": "Sínodo Carioca", "s": "", "p": [{"n": "Presbitério Carioca", "s": ""}, {"n": "Presbitério Novo Oeste Rio", "s": ""}, {"n": "Presbitério Oeste do Rio de Janeiro", "s": ""}]},
  {"n": "Sínodo Cearense Interiorano", "s": "", "p": [{"n": "Presbitério Central do Ceará", "s": ""}, {"n": "Presbitério Região dos Inhamuns", "s": ""}, {"n": "Presbitério Sul do Ceará", "s": ""}]},
  {"n": "Sínodo do Ceará", "s": "", "p": [{"n": "Presbitério Ceará", "s": ""}, {"n": "Presbitério Fortaleza", "s": ""}, {"n": "Presbitério Leste do Ceará", "s": ""}, {"n": "Presbitério Oeste de Fortaleza", "s": ""}]},
  {"n": "Sínodo Central da Bahia", "s": "", "p": [{"n": "Presbitério Central da Bahia", "s": ""}, {"n": "Presbitério Chapada Diamantina", "s": ""}, {"n": "Presbitério Dois de Julho", "s": ""}, {"n": "Presbitério Litorâneo do Salvador", "s": ""}, {"n": "Presbitério Soteropolitano", "s": ""}]},
  {"n": "Sínodo Central de Brasília", "s": "", "p": [{"n": "Presbitério Brasília Norte", "s": ""}, {"n": "Presbitério Noroeste de Minas", "s": ""}, {"n": "Presbitério Pioneiro de Brasília", "s": ""}]},
  {"n": "Sínodo Central Espiritossantense", "s": "", "p": [{"n": "Presbitério Centenário Espiritossantense", "s": ""}, {"n": "Presbitério Central do Espírito Santo", "s": ""}, {"n": "Presbitério Centro Capixaba", "s": ""}, {"n": "Presbitério Foz do Rio Doce", "s": ""}, {"n": "Presbitério Norte Litorâneo", "s": ""}, {"n": "Presbitério Serrano Espiritossantense", "s": ""}, {"n": "Presbitério Sudeste do Espírito Santo", "s": ""}, {"n": "Presbitério Sul Litorâneo", "s": ""}, {"n": "Presbitério Vila Velha", "s": ""}]},
  {"n": "Sínodo Central de Pernambuco", "s": "", "p": [{"n": "Presbitério Centro de Pernambuco", "s": ""}, {"n": "Presbitério Litoral Sul de Pernambuco", "s": ""}, {"n": "Presbitério Metropolitano da Cidade do Recife", "s": ""}, {"n": "Presbitério Novo Recife", "s": ""}]},
  {"n": "Sínodo Centro América", "s": "", "p": [{"n": "Presbitério Central de Mato Grosso", "s": ""}, {"n": "Presbitério Centro América", "s": ""}, {"n": "Presbitério Rondonópolis", "s": ""}, {"n": "Presbitério Várzea Grande", "s": ""}]},
  {"n": "Sínodo Centro Sul do Maranhão", "s": "", "p": [{"n": "Presbitério Maranhão", "s": ""}, {"n": "Presbitério Sudoeste do Maranhão", "s": ""}, {"n": "Presbitério Sul do Maranhão", "s": ""}]},
  {"n": "Sínodo Chapada Diamantina", "s": "", "p": [{"n": "Presbitério Alto da Chapada", "s": ""}, {"n": "Presbitério Central da Chapada", "s": ""}, {"n": "Presbitério Ponte Nova", "s": ""}]},
  {"n": "Sínodo Costa do Sol", "s": "", "p": [{"n": "Presbitério Cabo Frio", "s": ""}, {"n": "Presbitério Costa do Sol", "s": ""}, {"n": "Presbitério Macaé", "s": ""}, {"n": "Presbitério Serramar", "s": ""}]},
  {"n": "Sínodo de Curitiba", "s": "SCT", "p": [{"n": "Presbitério Araucárias", "s": "PARC"}, {"n": "Presbitério Curitiba", "s": "PCTB"}, {"n": "Presbitério Graciosa", "s": "PGRA"}, {"n": "Presbitério Metropolitano Norte de Curitiba", "s": "PMNC"}, {"n": "Presbitério Parque Iguaçu", "s": "PPIG"}, {"n": "Presbitério São José dos Pinhais", "s": "PSJP"}]},
  {"n": "Sínodo de Duque de Caxias", "s": "", "p": [{"n": "Presbitério Duque de Caxias", "s": ""}, {"n": "Presbitério Magé", "s": ""}, {"n": "Presbitério Metropolitano Oeste", "s": ""}, {"n": "Presbitério Noroeste Caxiense", "s": ""}, {"n": "Presbitério Norte Caxiense", "s": ""}]},
  {"n": "Sínodo Espírito Santo-Rio", "s": "", "p": [{"n": "Presbitério Bom Jesus do Itabapoana", "s": ""}, {"n": "Presbitério Itapemirim", "s": ""}, {"n": "Presbitério Portal do Caparaó", "s": ""}, {"n": "Presbitério Sul Capixaba", "s": ""}]},
  {"n": "Sínodo de Garanhuns", "s": "", "p": [{"n": "Presbitério Garanhuns", "s": ""}, {"n": "Presbitério Petrolina", "s": ""}, {"n": "Presbitério Vale do Pajeú", "s": ""}]},
  {"n": "Sínodo do Grande ABC", "s": "", "p": [{"n": "Presbitério Reformado de Diadema", "s": ""}, {"n": "Presbitério Santo André", "s": ""}, {"n": "Presbitério São Bernardo do Campo", "s": ""}, {"n": "Presbitério São Caetano do Sul", "s": ""}]},
  {"n": "Sínodo da Guanabara", "s": "", "p": [{"n": "Presbitério Bento Ribeiro", "s": ""}, {"n": "Presbitério Freguesia de Jacarepaguá", "s": ""}, {"n": "Presbitério Guanabara", "s": ""}, {"n": "Presbitério Jacarepaguá", "s": ""}, {"n": "Presbitério Madureira", "s": ""}]},
  {"n": "Sínodo Integração Catarinense", "s": "", "p": [{"n": "Presbitério Florianópolis", "s": ""}, {"n": "Presbitério Integração Catarinense", "s": ""}, {"n": "Presbitério Litoral Catarinense", "s": ""}, {"n": "Presbitério Litorâneo Sul de Santa Catarina", "s": ""}, {"n": "Presbitério Metropolitano Norte de Florianópolis", "s": ""}, {"n": "Presbitério Norte Catarinense", "s": ""}]},
  {"n": "Sínodo Leste Fluminense", "s": "", "p": [{"n": "Presbitério Central Fluminense", "s": ""}, {"n": "Presbitério Fluminense", "s": ""}, {"n": "Presbitério Niterói", "s": ""}]},
  {"n": "Sínodo Leste de Minas", "s": "", "p": [{"n": "Presbitério Leste de Minas", "s": ""}, {"n": "Presbitério Regional Vale do Manhuaçu", "s": ""}, {"n": "Presbitério Vale do Caparaó", "s": ""}]},
  {"n": "Sínodo Leste de São Paulo", "s": "", "p": [{"n": "Presbitério Extremo Leste Paulistano", "s": ""}, {"n": "Presbitério Leste Paulistano", "s": ""}, {"n": "Presbitério Leste de São Paulo", "s": ""}, {"n": "Presbitério Metropolitano de São Paulo", "s": ""}]},
  {"n": "Sínodo de Limeira", "s": "", "p": [{"n": "Presbitério Brotas", "s": ""}, {"n": "Presbitério Leme", "s": ""}, {"n": "Presbitério Limeira", "s": ""}, {"n": "Presbitério Rio Claro", "s": ""}, {"n": "Presbitério São Carlos", "s": ""}]},
  {"n": "Sínodo Litoral Paulista", "s": "", "p": [{"n": "Presbitério Santos", "s": ""}, {"n": "Presbitério São Vicente", "s": ""}, {"n": "Presbitério Vale do Ribeira", "s": ""}]},
  {"n": "Sínodo do Maranhão", "s": "", "p": [{"n": "Presbitério Central do Maranhão", "s": ""}, {"n": "Presbitério Centro Oeste do Maranhão", "s": ""}, {"n": "Presbitério Leste do Maranhão", "s": ""}, {"n": "Presbitério Norte do Maranhão", "s": ""}, {"n": "Presbitério São Luís", "s": ""}]},
  {"n": "Sínodo Marco Zero", "s": "", "p": [{"n": "Presbitério Amapá", "s": ""}, {"n": "Presbitério Marco Zero", "s": ""}, {"n": "Presbitério Nordeste do Pará", "s": ""}]},
  {"n": "Sínodo do Mato Grosso do Sul", "s": "", "p": [{"n": "Presbitério Campo Grande/MS", "s": ""}, {"n": "Presbitério Dourados", "s": ""}, {"n": "Presbitério Pantanal", "s": ""}]},
  {"n": "Sínodo Matogrossense", "s": "", "p": [{"n": "Presbitério Alta Floresta", "s": ""}, {"n": "Presbitério Centro Matogrossense", "s": ""}, {"n": "Presbitério Cuiabá", "s": ""}, {"n": "Presbitério Grande Morada da Serra", "s": ""}, {"n": "Presbitério Noroeste Matogrossense", "s": ""}, {"n": "Presbitério Oeste Matogrossense", "s": ""}, {"n": "Presbitério Sinop", "s": ""}, {"n": "Presbitério Tangará da Serra", "s": ""}]},
  {"n": "Sínodo Meridional", "s": "", "p": [{"n": "Presbitério Cascavel", "s": ""}, {"n": "Presbitério Iguaçu", "s": ""}, {"n": "Presbitério Itaipu", "s": ""}, {"n": "Presbitério Sudoeste Paranaense", "s": ""}]},
  {"n": "Sínodo Metropolitano de Belo Horizonte", "s": "", "p": [{"n": "Presbitério Centro Mineiro", "s": ""}, {"n": "Presbitério Leste de Belo Horizonte", "s": ""}, {"n": "Presbitério Região Venda Nova", "s": ""}]},
  {"n": "Sínodo Metropolitano de Londrina", "s": "", "p": [{"n": "Presbitério Cornélio Procópio", "s": ""}, {"n": "Presbitério Grande Londrina", "s": ""}, {"n": "Presbitério Londrina", "s": ""}]},
  {"n": "Sínodo Minas-Espírito Santo", "s": "", "p": [{"n": "Presbitério Noroeste Capixaba", "s": ""}, {"n": "Presbitério Norte do Espírito Santo", "s": ""}, {"n": "Presbitério Resplendor", "s": ""}, {"n": "Presbitério Vale do São Mateus", "s": ""}]},
  {"n": "Sínodo da Mogiana", "s": "", "p": [{"n": "Presbitério Baixa Mogiana", "s": ""}, {"n": "Presbitério São João da Boa Vista", "s": ""}, {"n": "Presbitério Vale do Rio Grande", "s": ""}, {"n": "Presbitério Vale do Rio Pardo", "s": ""}]},
  {"n": "Sínodo Noroeste da Bahia", "s": "", "p": [{"n": "Presbitério Campo Formoso", "s": ""}, {"n": "Presbitério Irecê", "s": ""}, {"n": "Presbitério João Dourado", "s": ""}, {"n": "Presbitério Noroeste de Bahia", "s": ""}]},
  {"n": "Sínodo Noroeste de Brasil", "s": "", "p": [{"n": "Presbitério Central de Rondônia", "s": ""}, {"n": "Presbitério Cone Sul de Rondônia", "s": ""}, {"n": "Presbitério Porto Velho", "s": ""}, {"n": "Presbitério Sul de Rondônia", "s": ""}, {"n": "Presbitério Vale do Rio Machado", "s": ""}]},
  {"n": "Sínodo Norte do Ceará", "s": "", "p": [{"n": "Presbitério Centro Oeste do Ceará", "s": ""}, {"n": "Presbitério Noroeste do Ceará", "s": ""}, {"n": "Presbitério Norte do Ceará", "s": ""}]},
  {"n": "Sínodo Norte Fluminense", "s": "", "p": [{"n": "Presbitério Campos", "s": ""}, {"n": "Presbitério Itaperuna", "s": ""}, {"n": "Presbitério Norte Fluminense", "s": ""}]},
  {"n": "Sínodo Norte de Minas", "s": "", "p": [{"n": "Presbitério Montes Claros", "s": ""}, {"n": "Presbitério Norte de Minas", "s": ""}, {"n": "Presbitério Salinas", "s": ""}, {"n": "Presbitério Vale do Jequitinhonha", "s": ""}]},
  {"n": "Sínodo Norte do Paraná", "s": "", "p": [{"n": "Presbitério Maringá", "s": ""}, {"n": "Presbitério Norte Novo do Paraná", "s": ""}, {"n": "Presbitério Vale do Ivaí", "s": ""}]},
  {"n": "Sínodo Norte Paulistano", "s": "", "p": [{"n": "Presbitério Centro Norte Paulistano", "s": ""}, {"n": "Presbitério Guarulhos", "s": ""}, {"n": "Presbitério Norte Paulistano", "s": ""}]},
  {"n": "Sínodo de Nova Iguaçu", "s": "", "p": [{"n": "Presbitério Nilópolis", "s": ""}, {"n": "Presbitério Nova Iguaçu", "s": ""}]},
  {"n": "Sínodo Oeste da Bahia", "s": "", "p": [{"n": "Presbitério Oeste de Bahia", "s": ""}, {"n": "Presbitério Rio Corrente", "s": ""}, {"n": "Presbitério Vale do Rio São Francisco", "s": ""}]},
  {"n": "Sínodo Oeste de Belo Horizonte", "s": "", "p": [{"n": "Presbitério Betim", "s": ""}, {"n": "Presbitério Central de Contagem", "s": ""}, {"n": "Presbitério Contagem", "s": ""}, {"n": "Presbitério Eldorado", "s": ""}, {"n": "Presbitério Oeste de Belo Horizonte", "s": ""}]},
  {"n": "Sínodo Oeste Fluminense", "s": "", "p": [{"n": "Presbitério Belford Roxo", "s": ""}, {"n": "Presbitério Central Nilopolitano", "s": ""}, {"n": "Presbitério Japeri", "s": ""}, {"n": "Presbitério Miguel Couto", "s": ""}, {"n": "Presbitério Queimados", "s": ""}, {"n": "Presbitério Serra Azul", "s": ""}]},
  {"n": "Sínodo Oeste de Minas", "s": "", "p": [{"n": "Presbitério Alto Rio Grande", "s": ""}, {"n": "Presbitério Oeste de Minas", "s": ""}, {"n": "Presbitério Região dos Lagos", "s": ""}]},
  {"n": "Sínodo Oeste do Rio de Janeiro", "s": "", "p": [{"n": "Presbitério Campo Grande - RJ", "s": ""}, {"n": "Presbitério Campo Grande Guaratiba", "s": ""}, {"n": "Presbitério Costa Verde", "s": ""}, {"n": "Presbitério Litoral Sul", "s": ""}, {"n": "Presbitério Mangaratiba", "s": ""}]},
  {"n": "Sínodo Oeste de São Paulo", "s": "", "p": [{"n": "Presbitério Araraquara", "s": ""}, {"n": "Presbitério Barretos", "s": ""}, {"n": "Presbitério Franca", "s": ""}, {"n": "Presbitério Ribeirão Preto", "s": ""}]},
  {"n": "Sínodo da Pampulha", "s": "", "p": [{"n": "Presbitério Centenário de Belo Horizonte", "s": ""}, {"n": "Presbitério Metropolitano de Belo Horizonte", "s": ""}, {"n": "Presbitério Norte de Belo Horizonte", "s": ""}, {"n": "Presbitério Ribeirão das Neves", "s": ""}]},
  {"n": "Sínodo da Paraíba", "s": "", "p": [{"n": "Presbitério Borborema", "s": ""}, {"n": "Presbitério Central da Paraíba", "s": ""}, {"n": "Presbitério João Pessoa", "s": ""}, {"n": "Presbitério Leste da Paraíba", "s": ""}, {"n": "Presbitério Metropolitano da Paraíba", "s": ""}, {"n": "Presbitério Oeste da Paraíba", "s": ""}, {"n": "Presbitério Paraíba", "s": ""}, {"n": "Presbitério Sul da Paraíba", "s": ""}]},
  {"n": "Sínodo Paulistano", "s": "", "p": [{"n": "Presbitério Central Paulistano", "s": ""}, {"n": "Presbitério Paulistano", "s": ""}, {"n": "Presbitério Suleste Paulistano", "s": ""}]},
  {"n": "Sínodo de Pernambuco", "s": "", "p": [{"n": "Presbitério Capibaribe", "s": ""}, {"n": "Presbitério Litoral Norte de Pernambuco", "s": ""}, {"n": "Presbitério Norte de Pernambuco", "s": ""}, {"n": "Presbitério Olinda", "s": ""}, {"n": "Presbitério Olinda Norte", "s": ""}, {"n": "Presbitério Paulista", "s": ""}, {"n": "Presbitério Pernambuco", "s": ""}]},
  {"n": "Sínodo do Piauí", "s": "", "p": [{"n": "Presbitério Centro Sul do Piauí", "s": ""}, {"n": "Presbitério Norte do Piauí", "s": ""}, {"n": "Presbitério Piauí", "s": ""}]},
  {"n": "Sínodo Piratininga", "s": "", "p": [{"n": "Presbitério Piratininga", "s": ""}, {"n": "Presbitério Sudeste Paulistano", "s": ""}, {"n": "Presbitério Sul Paulistano", "s": ""}]},
  {"n": "Sínodo do Planalto", "s": "", "p": [{"n": "Presbitério Distrito Federal", "s": ""}, {"n": "Presbitério Planalto", "s": ""}, {"n": "Presbitério Riacho Fundo", "s": ""}]},
  {"n": "Sínodo do Rio Doce", "s": "", "p": [{"n": "Presbitério Centenário Leste de Minas", "s": ""}, {"n": "Presbitério Governador Valadares", "s": ""}, {"n": "Presbitério Médio Rio Doce", "s": ""}, {"n": "Presbitério Norte Valadares", "s": ""}, {"n": "Presbitério Rio Doce", "s": ""}]},
  {"n": "Sínodo do Rio Grande do Norte", "s": "SRN", "p": [{"n": "Presbitério Alto Oeste Potiguar", "s": ""}, {"n": "Presbitério Litorâneo do Rio Grande do Norte", "s": "PLRN"}, {"n": "Presbitério Metropolitano de Natal", "s": ""}, {"n": "Presbitério Oeste Riograndense", "s": ""}, {"n": "Presbitério Potiguar", "s": ""}, {"n": "Presbitério Rumo ao Sertão", "s": ""}, {"n": "Presbitério Seridó do Rio Grande do Norte", "s": ""}]},
  {"n": "Sínodo do Rio de Janeiro", "s": "", "p": [{"n": "Presbitério Ilha do Governador", "s": ""}, {"n": "Presbitério Redentor", "s": ""}, {"n": "Presbitério Rio Norte", "s": ""}, {"n": "Presbitério Rio de Janeiro", "s": ""}]},
  {"n": "Sínodo de Sergipe", "s": "", "p": [{"n": "Presbitério Aracaju", "s": ""}, {"n": "Presbitério Filadélfia Leste de Sergipe", "s": ""}, {"n": "Presbitério Filadélfia Sudeste de Sergipe", "s": ""}, {"n": "Presbitério Sul de Sergipe", "s": ""}]},
  {"n": "Sínodo Serrano Fluminense", "s": "", "p": [{"n": "Presbitério Nova Friburgo", "s": ""}, {"n": "Presbitério Serrano", "s": ""}, {"n": "Presbitério Sul de Nova Friburgo", "s": ""}]},
  {"n": "Sínodo Sesquicentenário", "s": "", "p": [{"n": "Presbitério Centro do Recife", "s": ""}, {"n": "Presbitério Litorâneo de Pernambuco", "s": ""}, {"n": "Presbitério Recife", "s": ""}]},
  {"n": "Sínodo Setentrional", "s": "", "p": [{"n": "Presbitério Amazonas", "s": ""}, {"n": "Presbitério Amazonense", "s": ""}, {"n": "Presbitério Equatorial", "s": ""}, {"n": "Presbitério Estado de Roraima", "s": ""}, {"n": "Presbitério Manaus", "s": ""}, {"n": "Presbitério Missionário do Amazonas", "s": ""}, {"n": "Presbitério Setentrional", "s": ""}, {"n": "Presbitério Sul do Amazonas", "s": ""}]},
  {"n": "Sínodo de Sorocaba", "s": "", "p": [{"n": "Presbitério Indaiatuba", "s": ""}, {"n": "Presbitério Leste Sorocabano", "s": ""}, {"n": "Presbitério Metropolitano de Sorocaba", "s": ""}, {"n": "Presbitério Sorocaba", "s": ""}]},
  {"n": "Sínodo Sudoeste de Goiás", "s": "", "p": [{"n": "Presbitério Alto Araguaia", "s": ""}, {"n": "Presbitério Leste de Mato Grosso", "s": ""}, {"n": "Presbitério Oeste de Goiás", "s": ""}, {"n": "Presbitério Sudoeste de Goiás", "s": ""}, {"n": "Presbitério Sul Goiano", "s": ""}]},
  {"n": "Sínodo Sudoeste Paulista", "s": "", "p": [{"n": "Presbitério Botucatu", "s": ""}, {"n": "Presbitério Itapetininga", "s": ""}, {"n": "Presbitério Itapeva", "s": ""}, {"n": "Presbitério Médio Paranapanema", "s": ""}, {"n": "Presbitério Tatuí", "s": ""}]},
  {"n": "Sínodo Sul da Bahia", "s": "", "p": [{"n": "Presbitério Grapiúna", "s": ""}, {"n": "Presbitério Itabuna", "s": ""}, {"n": "Presbitério Itamaraju", "s": ""}, {"n": "Presbitério Sudoeste da Bahia", "s": ""}, {"n": "Presbitério Sul da Bahia", "s": ""}, {"n": "Presbitério Terra Mater", "s": ""}]},
  {"n": "Sínodo Sul do Brasil", "s": "", "p": [{"n": "Presbitério Gaúcho", "s": ""}, {"n": "Presbitério Oeste Catarinense", "s": ""}, {"n": "Presbitério Rio Grande do Sul", "s": ""}, {"n": "Presbitério Vale dos Sinos", "s": ""}]},
  {"n": "Sínodo Sul Fluminense", "s": "", "p": [{"n": "Presbitério Barra do Piraí", "s": ""}, {"n": "Presbitério Sul Fluminense", "s": ""}, {"n": "Presbitério Volta Redonda", "s": ""}]},
  {"n": "Sínodo Sul de Minas", "s": "", "p": [{"n": "Presbitério Circuito das Águas", "s": ""}, {"n": "Presbitério Itajubá", "s": ""}, {"n": "Presbitério Sul de Minas", "s": ""}]},
  {"n": "Sínodo de São Paulo", "s": "", "p": [{"n": "Presbitério Bandeirantes", "s": ""}, {"n": "Presbitério Cotia", "s": ""}, {"n": "Presbitério Oeste Paulistano", "s": ""}, {"n": "Presbitério Pinheiros", "s": ""}]},
  {"n": "Sínodo de Taguatinga", "s": "", "p": [{"n": "Presbitério Taguatinga", "s": ""}, {"n": "Presbitério Taguatinga Norte", "s": ""}, {"n": "Presbitério Águas Claras", "s": ""}]},
  {"n": "Sínodo de Tocantins", "s": "", "p": [{"n": "Presbitério Norte do Tocantins", "s": ""}, {"n": "Presbitério Sul do Tocantins", "s": ""}, {"n": "Presbitério Tocantins", "s": ""}]},
  {"n": "Sínodo Triângulo Mineiro", "s": "", "p": [{"n": "Presbitério Alto Paranaíba", "s": "PAPB"}, {"n": "Presbitério Leste Alto Paranaíba", "s": "PLAP"}, {"n": "Presbitério Nascente do Rio Paranaíba", "s": "PNAP"}, {"n": "Presbitério Pontal do Rio Grande", "s": ""}, {"n": "Presbitério Pontal do Triângulo Mineiro", "s": ""}, {"n": "Presbitério Portal do Cerrado Mineiro", "s": "PPCM"}, {"n": "Presbitério Triângulo Mineiro", "s": ""}, {"n": "Presbitério Triângulo Sul Goiano", "s": ""}]},
  {"n": "Sínodo Tropical", "s": "", "p": [{"n": "Presbitério Central da Transamazônica", "s": ""}, {"n": "Presbitério Metropolitano de Belém", "s": ""}, {"n": "Presbitério Sul do Pará", "s": ""}, {"n": "Presbitério Tapajós", "s": ""}]},
  {"n": "Sínodo Unido", "s": "", "p": [{"n": "Presbitério Aliança", "s": ""}, {"n": "Presbitério Bragantino", "s": ""}, {"n": "Presbitério Pirituba", "s": ""}, {"n": "Presbitério Unido", "s": ""}]},
  {"n": "Sínodo Vale do Aço", "s": "", "p": [{"n": "Presbitério Central Vale do Aço", "s": ""}, {"n": "Presbitério Leste Vale do Aço", "s": ""}, {"n": "Presbitério Regional de Timóteo", "s": ""}, {"n": "Presbitério Vale do Aço", "s": ""}]},
  {"n": "Sínodo Vale do Paraíba", "s": "", "p": [{"n": "Presbitério Alto Tietê", "s": ""}, {"n": "Presbitério Centro Paulistano", "s": ""}, {"n": "Presbitério Médio Vale do Paraíba", "s": ""}, {"n": "Presbitério São José dos Campos", "s": ""}, {"n": "Presbitério Vale do Paraíba", "s": ""}]},
  {"n": "Sínodo Vale do Tibagi", "s": "", "p": [{"n": "Presbitério Castro", "s": ""}, {"n": "Presbitério Imbituva", "s": ""}, {"n": "Presbitério Norte Pioneiro", "s": ""}, {"n": "Presbitério Ponta Grossa", "s": ""}, {"n": "Presbitério Telêmaco Borba", "s": ""}]},
  {"n": "Sínodo da Zona da Mata Mineira", "s": "", "p": [{"n": "Presbitério Juiz de Fora", "s": ""}, {"n": "Presbitério Juizforano", "s": ""}, {"n": "Presbitério Zona da Mata Norte", "s": ""}]}
];

/**
 * Concílio em uso. O padrão é o de config.js (IPB_ORG). No modo demonstração, quem entra
 * pode escolher outro sínodo ou presbitério na tela de entrada: a identidade do sistema
 * passa a ser a dele e os dados ficam separados, só neste navegador. Com o servidor
 * (Supabase) configurado, vale sempre o concílio de config.js.
 */
(function () {
  const ORG = window.IPB_ORG || (window.IPB_ORG = {});
  const CHAVE = 'ipb-concilio';
  ORG.padrao = { tipo: ORG.tipo, nome: ORG.nome, sigla: ORG.sigla, sinodo: ORG.sinodo };
  ORG.podeEscolher = !(window.IPB_CONFIG && window.IPB_CONFIG.supabaseUrl);
  const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  window.IPB_CONCILIO = {
    lido() { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } },
    // c = { tipo, nome, sigla, sinodo } ou null para voltar ao padrão
    escolher(c) {
      try {
        if (!c || (ORG.padrao.sigla && c.sigla === ORG.padrao.sigla) || c.nome === ORG.padrao.nome) localStorage.removeItem(CHAVE);
        else localStorage.setItem(CHAVE, JSON.stringify({ tipo: c.tipo, nome: c.nome, sigla: c.sigla || '', sinodo: c.sinodo || '' }));
      } catch (e) { /* sem armazenamento */ }
    },
    slug
  };
  const c = ORG.podeEscolher ? window.IPB_CONCILIO.lido() : null;
  if (c && c.nome && c.nome !== ORG.padrao.nome) {
    const sin = c.tipo === 'Sínodo';
    Object.assign(ORG, {
      tipo: sin ? 'Sínodo' : 'Presbitério', nome: c.nome, sigla: c.sigla || '', sinodo: sin ? '' : (c.sinodo || ''),
      unidade: sin ? 'presbitério' : 'igreja', unidades: sin ? 'presbitérios' : 'igrejas',
      outro: true, chaveDados: slug((sin ? 's-' : 'p-') + c.nome)
    });
  }
})();
