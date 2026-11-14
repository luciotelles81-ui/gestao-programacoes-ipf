# Gestão de Programações · Igreja Presbiteriana Filadélfia

Aplicação web de arquivo único (`index.html`) para organizar as programações, os ministérios e os usuários da igreja. Funciona direto no navegador, sem servidor e sem instalação.

## Como usar

1. Abra o `index.html` no navegador (ou publique pelo GitHub Pages).
2. Entre com o acesso de demonstração: usuário `admin`, senha `admin123`.
3. Troque a senha do administrador em **Usuários → Redefinir senha**.

## Funcionalidades

- **Dashboard**: indicadores por status, barra de distribuição, calendário mensal e próximas programações, com filtros por período, ministério e responsável.
- **Programações**: lista com busca (ignora acentos), filtros por status e por "somente futuras", ordenação por data, título ou status, fluxo de status (Pendente → Em andamento → Concluída), duplicação e exclusão.
- **Ministérios**: cadastro com cor, responsável e barra de progresso das programações concluídas.
- **Usuários** (apenas administradores): perfis, e-mail e WhatsApp, ativação e desativação, e redefinição de senha.
- **Permissões**: cada participante só altera, muda o status ou exclui as programações que ele mesmo cadastrou. As dos outros abrem só para consulta (é possível duplicá-las). Administradores alteram todas e podem trocar o dono de uma programação. Ministérios podem ser cadastrados por todos, mas só administradores os editam ou excluem.
- **Registro de ações** (apenas administradores): tudo o que cada login fez (entradas, senhas erradas, cadastros, edições com o "antes → depois", mudanças de status, exclusões e lembretes enviados), com filtros por login, tipo de ação e "somente alertas".
- **Alertas**: quando alguém altera ou exclui a programação de outro login, a linha fica em vermelho no registro, o menu mostra um contador e os demais administradores com e-mail cadastrado recebem um e-mail.
- **Lembretes 48h antes**: o responsável de cada programação recebe um e-mail e, se configurado, uma mensagem de WhatsApp.
- **Backup**: exportação e importação dos dados em JSON.
- Tema claro, escuro ou automático, layout responsivo para celular e atalhos de teclado (`N` cria uma nova programação, `/` abre a busca e `Esc` fecha janelas).

## Banco de dados (Supabase)

Os dados ficam no Supabase (Postgres), compartilhados por todos os usuários. O arquivo [`supabase/schema.sql`](supabase/schema.sql) cria tudo o que o sistema usa:

- Tabelas com prefixo `ipf_` (`ipf_users`, `ipf_ministries`, `ipf_events`, `ipf_log`, além de sessões, tentativas de login, fila de e-mails e configurações). Elas não interferem em outras tabelas do mesmo projeto.
- Todas as tabelas têm RLS ligado e nenhuma política: ninguém lê nem grava nelas direto pela chave pública. O site só chama a função `ipf_api`, que aplica as mesmas regras de antes (login, sessão de 7 dias, bloqueio após 5 erros, dono de cada programação, só administradores gerenciam usuários).
- As senhas continuam guardadas só como hash SHA-256 com o mesmo sal (`ipf::`), então as senhas da planilha antiga continuam valendo.
- O `config.js` tem a URL do projeto e a chave **pública** (`sb_publishable_...`). Nunca coloque a chave secreta no site.

Para recriar o banco num projeto novo: abra **SQL Editor** no Supabase, cole o `schema.sql` e rode. Depois, entre com um administrador (importando um backup JSON, por exemplo) e ajuste o `config.js`.

O site busca as alterações de outros usuários a cada 60 segundos. Clique em "Banco conectado" para atualizar na hora.

### E-mails e WhatsApp (Apps Script como "carteiro")

O Supabase não envia e-mails sozinho, então o Apps Script continua com essa tarefa, usando a conta Google dona do script (limite de cerca de 100 e-mails por dia em contas gratuitas). A cada 5 minutos ele pergunta ao Supabase o que precisa sair e envia:

- **Lembretes 48h antes** ao responsável de cada programação (e-mail e, se configurado, WhatsApp). O lembrete sai uma vez por programação (concluídas não recebem); se a data ou o horário mudar, sai um novo.
- **Alertas** aos administradores com e-mail quando alguém altera ou exclui a programação de outro login.

Instalação:

1. No editor do Apps Script, apague o conteúdo e cole o arquivo [`apps-script/Code.gs`](apps-script/Code.gs).
2. Em **Configurações do projeto → Propriedades do script**, crie `CARTEIRO_SENHA` com o valor da linha `carteiro_secret` da tabela `ipf_settings` no Supabase.
3. Escolha a função **`instalarLembretes`** no menu do topo e clique em **Executar** (uma vez só). Aceite as autorizações que o Google pedir.
4. Confira em **Registro de ações** se os lembretes aparecem como ativos.

WhatsApp: precisa de um serviço pago; configure nas mesmas **Propriedades do script**:

| Propriedade | Valor |
| --- | --- |
| `WHATSAPP_PROVIDER` | `meta` (WhatsApp oficial da Meta) ou `twilio` |
| `META_PHONE_NUMBER_ID`, `META_TOKEN`, `META_TEMPLATE` | dados do WhatsApp Business. O modelo aprovado deve ter 5 variáveis: responsável, título, data, horário e local. Ex.: `Olá, {{1}}! Lembrete da IP Filadélfia: {{2}} acontece em {{3}} às {{4}}, em {{5}}.` |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | dados da conta Twilio (`TWILIO_CONTENT_SID` opcional, com as mesmas 5 variáveis) |

Sem `WHATSAPP_PROVIDER`, só o e-mail é enviado.

Com `supabaseUrl` vazio no `config.js`, o site funciona em **modo local**: os dados ficam só no navegador (`localStorage`). Nesse modo, use **Exportar backup** com frequência. O mesmo backup pode ser importado depois para o banco de dados.
