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

## Importante

Os dados ficam salvos no **navegador** (`localStorage`). Por isso, cada computador ou navegador tem os próprios dados. Use **Exportar backup** com frequência e **Importar backup** para levar os dados a outro dispositivo.

As senhas são guardadas como hash SHA-256. Mesmo assim, como tudo roda no navegador, este sistema não substitui uma autenticação feita em servidor.
