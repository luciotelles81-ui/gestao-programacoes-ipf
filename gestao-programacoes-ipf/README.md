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

---

## Relatórios IPB (pasta `relatorios/`)

Sistema separado para o Presbitério receber, registrar e analisar os relatórios das igrejas, no padrão da Igreja Presbiteriana do Brasil. Endereço: `/relatorios/` (por exemplo, https://gestao-programacoes-ipf.vercel.app/relatorios/).

**O que tem**

- **Login por igreja**: cada usuário entra escolhendo a igreja, com usuário e senha. Usuários sem igreja são do Presbitério (comissões e administração) e veem todas as igrejas.
- **Formulários oficiais** (CSM-IPB 2021 v8.0) reproduzidos campo a campo: *Informações Cadastrais e Estatísticas* e *Relatório do Conselho ou Mesa Administrativa*, com totais calculados sozinhos. Há modelos de apoio (pastor, tesouraria, sociedade interna, escola dominical). Todo modelo é editável em **Administração → Modelos**.
- **Histórico importado**: 12 igrejas e congregações do PLRN e 42 relatórios de 2023 a 2025, lidos dos PDFs enviados ao Presbitério, cada um com o PDF original anexado. Como o repositório é público, esses dados ficam **criptografados** em `relatorios/dados/` (AES-256-GCM, chave derivada da *senha dos dados* com PBKDF2). Sem a senha, os arquivos não podem ser lidos. Para gerar de novo: `IPB_SENHA_PACOTE='...' node ferramentas/gerar-pacote.js relatorios/dados-historicos.js <pasta-dos-pdfs>`. O SQL para o Supabase (`relatorios-historico.sql`) fica só nos arquivos do projeto. Os de 2025 entram como *Enviado* (aguardando a comissão); os anteriores como *Aprovado*, com a nota de que o exame foi feito fora do sistema.
- **Layout do papel**: os dois formulários oficiais podem ser preenchidos e vistos como no relatório físico (`relatorios/folha.js`), ou em lista. **Imprimir formulário** gera o A4 no mesmo layout do impresso.
- **Original e anexos**: cada relatório aceita PDF ou imagem do relatório feito à mão, com comparação lado a lado entre o original e o que foi digitado.
- **Indicadores**: evolução de uma igreja ano a ano (membros, liderança, finanças, atividades do Conselho) e comparação de um indicador entre as igrejas, com ranking, matriz igrejas × anos e CSV.
- **Celular**: telas adaptadas, barra de navegação inferior e instalação na tela inicial (manifest e service worker).
- **Painel** com membros, finanças, dízimo ao Supremo Concílio, profissões de fé, situação das igrejas no Relatório do Conselho e tabela por igreja (com download em CSV).
- **Verificações automáticas**: campos obrigatórios, regras de cada modelo e comparação com o relatório do ano anterior (por exemplo, comungantes do ano anterior e saldo que não conferem).
- **Análise da comissão**: proposta inicial escrita pela IA, análises dos membros, **parecer final escrito pelo relator** (só ele ou o administrador edita), decisão e assinaturas.
- **Assinatura eletrônica**: cada membro assina com a própria senha, ou assina à mão na tela na presença de outro membro da comissão. Cada assinatura gera um código de verificação; a página **Verificar assinatura** mostra se o conteúdo foi alterado depois.
- **Exame de atas**: a igreja ou a comissão envia as imagens das páginas; a IA confere 41 regras do *Regulamento para Confecção de Atas* e da Constituição (`relatorios/regras-atas.js`) e marca cada uma como conforme, não conforme ou não verificável, com a evidência; o relator ajusta e escreve o parecer.
- **Perfis de acesso**: administrador, editor (preenche relatórios da sua igreja), analista (comissão) e somente leitura.

**Modo demonstração**: com `relatorios/config.js` vazio, tudo roda no navegador (dados só naquele navegador), com usuários de exemplo (`admin`/`admin123`). Para carregar o histórico e os PDFs originais, entre como `admin` (igreja: Presbitério) com a **senha dos dados**; a partir daí essa é a senha do admin naquele navegador. A IA não funciona nesse modo: a proposta de análise é montada pelas verificações automáticas e a conferência de atas é manual.

### Reunião do concílio (comissões, delegados, pareceres e ata)

Módulo `relatorios/reunioes.js`, no menu **Reunião do concílio**. Segue a Constituição da IPB: reuniões ordinária e extraordinária (arts. 73 e 74), quórum de três ministros e dois presbíteros (art. 86), comissões (art. 99) e relatório dos secretários de causa (art. 106, § 1º).

- **Reunião**: painel da reunião escolhida no topo, com as comissões, os delegados, os documentos e os pareceres. A Mesa (perfil administrador: Presidente e Secretário Executivo) cadastra os dados do presbitério e as reuniões.
- **Reuniões e convocações**: todas as reuniões de cada ano, ordinárias e extraordinárias, com a convocação (data, quem convocou, assunto e pauta, PDF anexado), a mesa diretora e a ata.
- **Mesa diretora**: em cada reunião, nome, título e cargo de quem foi eleito (Presidente, Vice, Secretário Executivo, secretários, tesoureiro).
- **Ata da reunião**: formulário com número, livro, folhas, horários, ministros e presbíteros presentes (o sistema confere o quórum), devocional, expediente e deliberações. A ata já traz a mesa, a pauta e os pareceres com a decisão do plenário. Imprime ou baixa para o Word.
- **Comissões**: cada comissão tem o seu ambiente, com a atribuição, os delegados, os documentos encaminhados a ela (com o PDF) e os pareceres desta e das reuniões anteriores. Em **Administração → Comissões** ficam o grupo, o modelo de parecer, a ordem e a base legal; o botão *Criar comissões do concílio* cria as de costume.
- **Delegados**: a Mesa define, por reunião, quem está em cada comissão e a função (**Relator** ou **Participante**), e pode vincular o delegado a um usuário. Só um relator por comissão; "Copiar da reunião anterior" adianta o cadastro.
- **Pareceres**: três modelos, iguais aos papéis usados no presbitério: exame de livro de atas, relatório final (apontamentos, recomendações, determinações) e relatório de secretaria. O cabeçalho sai pronto (Secretaria Executiva, código da reunião, período, local, Doc nº, destino, data) e termina com *Sala de Sessões* e as assinaturas. Delegados escrevem; o relator conclui e envia ao plenário; a Mesa registra a decisão (aprovado, com emendas ou rejeitado).
- **Documentos**: lista numerada da reunião, com busca, comissão responsável e PDF original.
- **Histórico do presbitério**: gráficos e tabela de membros, oficiais, EBD, sociedades, crescimento por igreja e tesouraria, a partir dos relatórios das comissões de Estatísticas e de Finanças.
- **Identidade visual**: verde Pantone 350C e cinza K70, logotipo oficial em `relatorios/img/`, letra Zapf Humanist (ou Optima, o mesmo desenho) nas telas e títulos e Times New Roman no texto dos documentos, como pede o Programa de Identidade Visual da IPB.
- **Outros presbitérios**: *Exportar estrutura* gera um arquivo com os dados da Mesa e as comissões, para importar em outro presbitério.

- **Acervo de documentos** (`relatorios/acervo.js`): tudo organizado por ano e por seção. Os anos 2025, 2026 e 2027 já vêm prontos e a Mesa cria qualquer outro, passado ou futuro, com *+ Ano*. Em cada ano:
  - **Reuniões do concílio**, em ordem histórica: a ordinária e depois cada extraordinária. Cada reunião é uma pasta com *Convocação e pauta*, *Atas*, *Relatórios e documentos*, *Anexos* e os pareceres das comissões, com setas para a reunião anterior e a seguinte.
  - **Comissão Executiva**, **Tesouraria**, **Sínodo e Supremo Concílio**, **Correspondência** e **Outros**.
  - **Permanentes**: estatuto, regimento e normas, que valem para todos os anos.
  - Ver em **Ícones** ou **Lista** (a escolha fica no navegador), ordenar por data, nome ou Doc nº e buscar em todo o acervo.
  - Clicar num arquivo abre a prévia ao lado dos dados (local, tipo, data, origem, quem enviou e quando, SHA-256), sem baixar. Word e Excel são baixados.
  - A Mesa envia vários arquivos de uma vez, ou arrasta para a pasta. Aceita PDF, imagem, Word e Excel até 15 MB. *Editar ou mover* troca a pasta, a seção ou a reunião.
  - **Segurança**: só usuários cadastrados veem o acervo; só a Mesa envia, edita ou exclui; exclusão pede confirmação; cada envio grava quem enviou, quando e a impressão digital SHA-256, e entra no registro de ações. Um documento pode ser marcado como **restrito à Mesa** (dados pessoais sensíveis, LGPD), e o servidor recusa o arquivo para os demais.
- **Tesouraria** (`relatorios/tesouraria.js`): o controle de caixa administrativo, no formato dos relatórios do tesoureiro.
  - Três grupos: **dízimo dos pastores**, **contribuição das igrejas (3%)** e **despesas e compromissos**.
  - Cada conta tem o previsto anual e mensal, o que restou do ano anterior e os lançamentos de cada mês (dia e valor). O lançamento marcado *ref. ano anterior* entra no caixa do mês, mas não conta no realizado do ano.
  - A tabela mostra o realizado, o previsto até o mês escolhido, a diferença e o percentual (verde, amarelo ou vermelho).
  - O resumo traz o saldo anterior, as entradas, as saídas e o saldo mês a mês, com gráficos por igreja e por pastor.
  - *Copiar as contas do ano anterior* abre o novo ano já com as contas e o que restou de cada uma.
  - Imprime em A4 deitado. Só a Mesa altera.

**Dados das reuniões anteriores**: como o repositório é público, os números, os resumos e os PDFs das reuniões do PLRN não ficam aqui. Entre como administrador, vá em **Reunião → Configuração da Mesa**, use *Importar pacote (.json)* e depois *Enviar PDFs dos documentos* (selecione todos os PDFs de uma vez; cada um encontra o seu documento pelo nome do arquivo).

No Supabase, rode de novo `supabase/relatorios.sql`: ele cria as tabelas `ipb_reuniao_itens` e `ipb_reuniao_arquivos` e a ação `reuniao` da API (inclusive o tipo `tesouraria` e os campos do acervo), sem mexer no que já existe.

### Ligar ao Supabase

1. No SQL Editor do Supabase, execute `supabase/relatorios.sql`, depois `supabase/relatorios-dados.sql` (modelos) e por fim `relatorios-historico.sql` (igrejas e relatórios históricos, entregue fora do repositório). As tabelas têm prefixo `ipb_` e não mexem em outras tabelas do projeto.
2. Publique a função `supabase/functions/ipb-analise` com **verify_jwt desligado** (ela confere a sessão do próprio sistema) e cadastre o segredo `ANTHROPIC_API_KEY` em *Edge Functions → Secrets*.
3. Preencha `relatorios/config.js` com a URL do projeto e a chave *anon* (pública).
4. No primeiro acesso, o sistema pede para criar o administrador. Ele cadastra os usuários das igrejas e as comissões.

Se os modelos ou os dados históricos mudarem, gere o SQL de novo com `node ferramentas/gerar-sql-dados.js`.
