/**
 * Configuração do servidor (Supabase).
 * Sem estes dois valores o sistema roda em modo demonstração, com os dados
 * guardados apenas no navegador de quem está usando.
 * A chave "anon" é pública por natureza; os dados ficam protegidos porque as
 * tabelas só são acessadas pela função ipb_api, que confere usuário e permissões.
 */
window.IPB_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: ''
};

/**
 * Identidade do concílio. Para usar o sistema em outro presbitério ou num sínodo,
 * troque só estes valores (veja "Usar em outro concílio" no README).
 *   tipo: 'Presbitério' ou 'Sínodo'
 *   unidades: quem manda relatórios ao concílio ('igrejas' num presbitério, 'presbitérios' num sínodo)
 */
window.IPB_ORG = {
  sistema: 'Sistema de Gestão PLRN',
  tipo: 'Presbitério',
  nome: 'Presbitério Litorâneo do RN',
  sigla: 'PLRN',
  sinodo: 'Sínodo do Rio Grande do Norte',
  unidade: 'igreja',
  unidades: 'igrejas'
};
