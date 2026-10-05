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
- **Usuários** (apenas administradores): perfis, ativação e desativação, e redefinição de senha.
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

Com `apiUrl` vazio, o site funciona em **modo local**: os dados ficam só no navegador (`localStorage`). Nesse modo, use **Exportar backup** com frequência. O mesmo backup pode ser importado depois para a planilha.
