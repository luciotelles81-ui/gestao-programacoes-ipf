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
