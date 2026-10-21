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

## Banco de dados (Google Planilhas)

O site pode guardar os dados numa planilha do Google, compartilhada por todos os usuários. A configuração é esta:

1. Na planilha, abra **Extensões → Apps Script**, apague o conteúdo e cole o arquivo [`apps-script/Code.gs`](apps-script/Code.gs).
2. Clique em **Implantar → Nova implantação → App da Web**, com **Executar como: Eu** e **Quem pode acessar: Qualquer pessoa**. Autorize o acesso.
3. Copie a URL gerada (termina em `/exec`) para o campo `apiUrl` do arquivo `config.js`.

Na primeira chamada, o script cria as abas `Usuarios`, `Ministerios` e `Programacoes` e um administrador com usuário `admin` e senha `admin123`. **Troque essa senha logo no primeiro acesso.**

- As senhas são verificadas no servidor e guardadas apenas como hash SHA-256. O site nunca recebe esses hashes.
- Cada login gera uma sessão válida por 7 dias. Depois de 5 tentativas erradas, o login fica bloqueado por 5 minutos.
- O site busca as alterações de outros usuários a cada 60 segundos. Clique em "Planilha conectada" para atualizar na hora.
- Evite editar as abas diretamente na planilha. Se editar, mantenha a primeira linha (os cabeçalhos) e a coluna `id`.

### Atualizar o Apps Script depois de uma mudança no `Code.gs`

1. Cole o novo `Code.gs` no editor do Apps Script e salve.
2. **Implantar → Gerenciar implantações → ✏️ (editar) → Versão: Nova versão → Implantar.** Assim a URL do `/exec` continua a mesma.
3. Se o Google pedir novas autorizações (envio de e-mail, acesso externo, gatilhos), aceite.

Na próxima chamada o script cria a aba `Registro` e acrescenta as colunas novas nas abas existentes, sem apagar nada.

### Lembretes 48h antes (e-mail e WhatsApp)

1. No editor do Apps Script, escolha a função **`instalarLembretes`** no menu do topo e clique em **Executar** (uma vez só). Ela cria um gatilho que roda a cada hora.
2. Em **Configurações do projeto**, confira se o fuso horário é `(GMT-03:00) São Paulo`.
3. Cada programação tem os campos **E-mail do responsável** e **WhatsApp do responsável**. Eles são preenchidos sozinhos quando o responsável já tem contato numa programação anterior ou no cadastro de usuários.
4. O lembrete sai uma vez por programação (programações concluídas não recebem). Se a data ou o horário mudar, um novo lembrete é enviado.

O e-mail sai pela conta Google dona da planilha (limite de cerca de 100 e-mails por dia em contas gratuitas). O WhatsApp precisa de um serviço pago; configure em **Configurações do projeto → Propriedades do script**:

| Propriedade | Valor |
| --- | --- |
| `WHATSAPP_PROVIDER` | `meta` (WhatsApp oficial da Meta) ou `twilio` |
| `META_PHONE_NUMBER_ID`, `META_TOKEN`, `META_TEMPLATE` | dados do WhatsApp Business. O modelo aprovado deve ter 5 variáveis: responsável, título, data, horário e local. Ex.: `Olá, {{1}}! Lembrete da IP Filadélfia: {{2}} acontece em {{3}} às {{4}}, em {{5}}.` |
| `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM` | dados da conta Twilio (`TWILIO_CONTENT_SID` opcional, com as mesmas 5 variáveis) |

Sem `WHATSAPP_PROVIDER`, só o e-mail é enviado. A tela **Registro de ações** mostra se os lembretes e o WhatsApp estão ativos.

Com `apiUrl` vazio, o site funciona em **modo local**: os dados ficam só no navegador (`localStorage`). Nesse modo, use **Exportar backup** com frequência. O mesmo backup pode ser importado depois para a planilha.
