-- =====================================================================
-- Relatórios IPB: banco no Supabase
-- Tabelas com prefixo ipb_ (não mexe nas tabelas de outros sistemas).
-- RLS ligado e sem políticas: ninguém lê as tabelas direto pela API.
-- Todo acesso passa pela função ipb_api(req jsonb), que confere a sessão
-- e as permissões (mesmas regras do servidor-local.js do modo demonstração).
-- Pode ser executado mais de uma vez (idempotente).
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists ipb_igrejas (
  id text primary key,
  doc jsonb not null
);
create table if not exists ipb_usuarios (
  id text primary key,
  igreja_id text references ipb_igrejas(id),
  username text not null,
  senha_hash text not null,
  falhas int not null default 0,
  bloqueado_ate timestamptz,
  nome text not null,
  role text not null check (role in ('admin', 'editor', 'analista', 'leitor')),
  ativo boolean not null default true,
  email text default '',
  cargo text default '',
  created_at timestamptz not null default now()
);
create unique index if not exists ipb_usuarios_login on ipb_usuarios (lower(username), coalesce(igreja_id, ''));
create table if not exists ipb_modelos (
  id text primary key,
  doc jsonb not null
);
create table if not exists ipb_comissoes (
  id text primary key,
  doc jsonb not null
);
create table if not exists ipb_relatorios (
  id text primary key,
  igreja_id text not null references ipb_igrejas(id),
  doc jsonb not null
);
create index if not exists ipb_relatorios_igreja on ipb_relatorios (igreja_id);
create table if not exists ipb_atas (
  id text primary key,
  igreja_id text not null references ipb_igrejas(id),
  doc jsonb not null,
  paginas jsonb not null default '[]'::jsonb
);
-- arquivos anexados aos relatórios (PDF ou imagem do relatório feito à mão); os metadados ficam em doc->'anexos'
create table if not exists ipb_anexos (
  id text primary key,
  relatorio_id text not null references ipb_relatorios(id) on delete cascade,
  tipo text not null,
  dados text not null
);
create index if not exists ipb_anexos_rel on ipb_anexos (relatorio_id);
create table if not exists ipb_sessoes (
  token text primary key,
  usuario_id text not null references ipb_usuarios(id) on delete cascade,
  expira timestamptz not null
);
create table if not exists ipb_log (
  id bigserial primary key,
  em timestamptz not null default now(),
  usuario_id text,
  usuario text,
  acao text,
  entidade text,
  entidade_id text,
  detalhes text
);

-- reunião do concílio: dados do presbitério, reuniões, delegados por comissão, documentos, pareceres e históricos
create table if not exists ipb_reuniao_itens (
  id text primary key,
  tipo text not null check (tipo in ('cfg', 'reuniao', 'delegado', 'documento', 'parecer', 'estatistica', 'financa', 'ata')),
  doc jsonb not null
);
create index if not exists ipb_reuniao_itens_tipo on ipb_reuniao_itens (tipo);
-- PDF de cada documento da reunião (o metadado fica em doc->'arquivo')
create table if not exists ipb_reuniao_arquivos (
  id text primary key references ipb_reuniao_itens(id) on delete cascade,
  tipo text not null,
  dados text not null
);
alter table ipb_reuniao_itens enable row level security;
alter table ipb_reuniao_arquivos enable row level security;
revoke all on ipb_reuniao_itens, ipb_reuniao_arquivos from anon, authenticated;

alter table ipb_igrejas enable row level security;
alter table ipb_usuarios enable row level security;
alter table ipb_modelos enable row level security;
alter table ipb_comissoes enable row level security;
alter table ipb_relatorios enable row level security;
alter table ipb_atas enable row level security;
alter table ipb_sessoes enable row level security;
alter table ipb_anexos enable row level security;
alter table ipb_log enable row level security;
revoke all on ipb_igrejas, ipb_usuarios, ipb_modelos, ipb_comissoes, ipb_relatorios, ipb_atas, ipb_sessoes, ipb_log, ipb_anexos from anon, authenticated;

-- ---------------------------------------------------------------------
-- utilidades
-- ---------------------------------------------------------------------
create or replace function ipb_fail(msg text, code text default 'ERRO') returns void
language plpgsql as $$ begin raise exception using message = msg, detail = code, errcode = 'P0001'; end $$;

create or replace function ipb_iso(t timestamptz default now()) returns text
language sql immutable as $$ select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

create or replace function ipb_uid(p text) returns text
language sql volatile as $$ select p || substr(md5(random()::text || clock_timestamp()::text), 1, 14) $$;

create or replace function ipb_pub(u ipb_usuarios) returns jsonb
language sql stable as $$
  select jsonb_build_object('id', u.id, 'nome', u.nome, 'username', u.username, 'igrejaId', u.igreja_id, 'role', u.role,
    'ativo', u.ativo, 'email', coalesce(u.email, ''), 'cargo', coalesce(u.cargo, ''), 'createdAt', ipb_iso(u.created_at))
$$;

create or replace function ipb_registrar(u ipb_usuarios, acao text, detalhes text, entidade text default '', entidade_id text default '') returns void
language sql as $$
  insert into ipb_log (usuario_id, usuario, acao, entidade, entidade_id, detalhes)
  values (u.id, coalesce(u.nome, 'Sistema'), acao, coalesce(entidade, ''), coalesce(entidade_id, ''), coalesce(detalhes, ''))
$$;

create or replace function ipb_sessao(tok text) returns ipb_usuarios
language plpgsql as $$
declare u ipb_usuarios;
begin
  select us.* into u from ipb_sessoes s join ipb_usuarios us on us.id = s.usuario_id
   where s.token = tok and s.expira > now() and us.ativo;
  if u.id is null then perform ipb_fail('Sessão expirada. Entre novamente.', 'AUTH'); end if;
  return u;
end $$;

create or replace function ipb_ve(u ipb_usuarios, igreja text) returns boolean
language sql stable as $$ select u.role = 'admin' or u.igreja_id is null or u.igreja_id = igreja $$;

create or replace function ipb_snapshot(m jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object('nome', m->'nome', 'categoria', m->'categoria', 'versao', coalesce(m->'versao', '1'::jsonb),
    'secoes', coalesce(m->'secoes', '[]'::jsonb), 'verificacoes', coalesce(m->'verificacoes', '[]'::jsonb), 'continuidade', coalesce(m->'continuidade', '[]'::jsonb))
$$;

create or replace function ipb_nova_analise() returns jsonb
language sql immutable as $$
  select '{"comissaoId":null,"comissaoNome":"","membros":[],"pareceres":[],"ia":null,"final":null,"assinaturas":[]}'::jsonb
$$;

create or replace function ipb_sha(t text) returns text
language sql immutable as $$ select encode(extensions.digest(convert_to(t, 'UTF8'), 'sha256'), 'hex') $$;

create or replace function ipb_conteudo_hash(r jsonb) returns text
language sql immutable as $$
  select ipb_sha(jsonb_build_object('dados', coalesce(r->'dados', '{}'::jsonb), 'final', coalesce(r->'analise'->'final', 'null'::jsonb))::text)
$$;

create or replace function ipb_hist(r jsonb, por text, acao text) returns jsonb
language sql volatile as $$
  select jsonb_set(r, '{historico}', coalesce(r->'historico', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('em', ipb_iso(), 'por', por, 'acao', acao)))
$$;

-- ---------------------------------------------------------------------
-- reunião do concílio: utilidades
-- ---------------------------------------------------------------------
create or replace function ipb_pick(j jsonb, ks text[]) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(k, j->k) filter (where j ? k), '{}'::jsonb) from unnest(ks) k
$$;

create or replace function ipb_r_campos(tipo text) returns text[]
language sql immutable as $$
  select case tipo
    when 'cfg' then array['nome', 'sigla', 'cidade', 'uf', 'sinodo', 'presidente', 'secretario', 'tesoureiro', 'igrejas', 'reuniaoAtual']
    when 'reuniao' then array['tipoReuniao', 'numero', 'ano', 'dataInicio', 'dataFim', 'local', 'cidade', 'materia', 'codigo', 'nome', 'presidente', 'secretario', 'mesa', 'dataConvocacao', 'convocadaPor', 'pauta']
    when 'delegado' then array['reuniaoId', 'comissaoId', 'tratamento', 'nome', 'igreja', 'funcao', 'userId']
    when 'documento' then array['reuniaoId', 'comissaoId', 'numero', 'titulo', 'tipoDoc', 'origem', 'resumo', 'arquivoNome']
    when 'parecer' then array['reuniaoId', 'comissaoId', 'modelo', 'data', 'destino', 'cidade', 'docNumero', 'titulo', 'assunto', 'docsAnalisados', 'origens', 'documentoIds', 'campos', 'assinaturas']
    when 'estatistica' then array['ano', 'igreja', 'valores', 'fonte']
    when 'financa' then array['ano', 'valores', 'fonte']
    when 'ata' then array['reuniaoId', 'numero', 'livro', 'folhas', 'data', 'horaInicio', 'horaFim', 'presentesMinistros', 'presentesPresbiteros', 'ausencias', 'devocional', 'expediente', 'registros', 'encerramento', 'incluirPareceres', 'situacao']
    else array[]::text[] end
$$;

-- quem escreve o parecer de uma comissão naquela reunião: a Mesa (admin), os delegados vinculados a um usuário
-- e, se a comissão ainda não tem delegado vinculado, qualquer analista
create or replace function ipb_r_pode_parecer(u ipb_usuarios, com text, reu text) returns boolean
language sql stable as $$
  select u.role = 'admin' or (u.role <> 'leitor' and (
    exists (select 1 from ipb_reuniao_itens where tipo = 'delegado' and doc->>'comissaoId' = com and doc->>'reuniaoId' = reu and doc->>'userId' = u.id)
    or (u.role = 'analista' and not exists (select 1 from ipb_reuniao_itens where tipo = 'delegado' and doc->>'comissaoId' = com and doc->>'reuniaoId' = reu and coalesce(doc->>'userId', '') <> ''))))
$$;

-- quem conclui o parecer: a Mesa ou o relator (se o relator não tem usuário, quem pode escrever)
create or replace function ipb_r_relator(u ipb_usuarios, com text, reu text) returns boolean
language sql stable as $$
  select u.role = 'admin' or coalesce(
    (select doc->>'userId' = u.id from ipb_reuniao_itens where tipo = 'delegado' and doc->>'comissaoId' = com and doc->>'reuniaoId' = reu
       and doc->>'funcao' = 'Relator' and coalesce(doc->>'userId', '') <> '' limit 1),
    ipb_r_pode_parecer(u, com, reu))
$$;

create or replace function ipb_r_validar(p_tipo text, m jsonb) returns void
language plpgsql stable as $$
begin
  if p_tipo = 'reuniao' and not (coalesce((m->>'ano')::int, 0) > 1900 and coalesce((m->>'numero')::int, 0) > 0) then perform ipb_fail('Informe o número e o ano da reunião.'); end if;
  if p_tipo in ('delegado', 'documento', 'parecer', 'ata') and not exists (select 1 from ipb_reuniao_itens where id = m->>'reuniaoId' and tipo = 'reuniao') then perform ipb_fail('Escolha a reunião.'); end if;
  if p_tipo in ('delegado', 'parecer') and not exists (select 1 from ipb_comissoes where id = m->>'comissaoId') then perform ipb_fail('Escolha a comissão.'); end if;
  if p_tipo = 'delegado' then
    if coalesce(trim(m->>'nome'), '') = '' and coalesce(m->>'userId', '') = '' then perform ipb_fail('Informe o nome do delegado.'); end if;
    if coalesce(m->>'funcao', '') not in ('Relator', 'Participante') then perform ipb_fail('A função deve ser Relator ou Participante.'); end if;
  end if;
  if p_tipo = 'documento' and coalesce(trim(m->>'titulo'), '') = '' then perform ipb_fail('Informe o título do documento.'); end if;
  if p_tipo = 'parecer' and coalesce(trim(m->>'assunto'), '') = '' then perform ipb_fail('Informe o assunto do parecer.'); end if;
  if p_tipo in ('estatistica', 'financa') and not (coalesce((m->>'ano')::int, 0) > 1900) then perform ipb_fail('Informe o ano.'); end if;
end $$;

-- ---------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------
create or replace function ipb_api(req jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  act text := req->>'action';
  u ipb_usuarios;
  x ipb_usuarios;
  it jsonb;
  r jsonb;
  ex jsonb;
  a jsonb;
  m jsonb;
  t text := ipb_iso();
  v_id text;
  v_ig text;
  v_txt text;
  v_acao text;
  v_op text;
  v_idx int;
  v_n int;
  v_tipo text;
  v_ch text;
  v_hash text;
  v_cod text;
  v_rel jsonb;
  pags jsonb;
  dec jsonb := '{"Aprovar":"Aprovado","Aprovar com ressalvas":"Aprovado com ressalvas","Devolver para correção":"Devolvido"}';
  v_msg text;
  v_code text;
begin
  -- ===== públicas =====
  if act = 'publico' then
    return jsonb_build_object('modo', 'servidor',
      'primeiroAcesso', not exists (select 1 from ipb_usuarios),
      'igrejas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'nome', doc->>'nome', 'sigla', doc->>'sigla') order by doc->>'nome')
                           from ipb_igrejas where coalesce((doc->>'ativo')::boolean, true)), '[]'::jsonb));
  end if;

  if act = 'primeiro_admin' then
    if exists (select 1 from ipb_usuarios) then perform ipb_fail('O administrador já foi criado.', 'FORBIDDEN'); end if;
    if coalesce(req->>'nome', '') = '' or coalesce(req->>'username', '') = '' then perform ipb_fail('Informe nome e usuário.'); end if;
    if length(coalesce(req->>'senha', '')) < 8 then perform ipb_fail('A senha do administrador precisa ter pelo menos 8 caracteres.'); end if;
    insert into ipb_usuarios (id, igreja_id, username, senha_hash, nome, role, cargo)
    values ('us_admin', null, req->>'username', crypt(req->>'senha', gen_salt('bf')), req->>'nome', 'admin', 'Administrador do sistema')
    returning * into u;
    perform ipb_registrar(u, 'criar', 'Primeiro administrador criado', 'usuario', u.id);
    return '{}'::jsonb;
  end if;

  if act = 'login' then
    select * into u from ipb_usuarios
     where lower(username) = lower(trim(coalesce(req->>'username', ''))) and coalesce(igreja_id, '') = coalesce(req->>'igrejaId', '');
    if u.id is null or not u.ativo then perform ipb_fail('Usuário, igreja ou senha incorretos.', 'LOGIN'); end if;
    if u.bloqueado_ate is not null and u.bloqueado_ate > now() then perform ipb_fail('Muitas tentativas. Aguarde 5 minutos.', 'LOCKED'); end if;
    if u.senha_hash <> crypt(coalesce(req->>'senha', ''), u.senha_hash) then
      -- registra a falha fora da exceção: retorna erro sem desfazer
      update ipb_usuarios set falhas = case when falhas + 1 >= 5 then 0 else falhas + 1 end,
             bloqueado_ate = case when falhas + 1 >= 5 then now() + interval '5 minutes' else bloqueado_ate end where id = u.id;
      perform ipb_registrar(u, 'login_falhou', 'Senha incorreta', 'usuario', u.id);
      return jsonb_build_object('erro', 'Usuário, igreja ou senha incorretos.', 'code', 'LOGIN');
    end if;
    update ipb_usuarios set falhas = 0, bloqueado_ate = null where id = u.id;
    delete from ipb_sessoes where expira < now();
    v_id := encode(gen_random_bytes(24), 'hex');
    insert into ipb_sessoes (token, usuario_id, expira) values (v_id, u.id, now() + interval '7 days');
    perform ipb_registrar(u, 'login', '', 'usuario', u.id);
    return jsonb_build_object('token', v_id, 'usuario', ipb_pub(u));
  end if;

  if act = 'verificar' then
    v_cod := upper(trim(coalesce(req->>'codigo', '')));
    if v_cod = '' then return '{"encontrado":false}'; end if;
    select rl.doc, s.sig into r, a from ipb_relatorios rl, jsonb_array_elements(rl.doc->'analise'->'assinaturas') s(sig)
     where s.sig->>'codigo' = v_cod limit 1;
    if r is null then return '{"encontrado":false}'; end if;
    return jsonb_build_object('encontrado', true, 'integro', ipb_conteudo_hash(r) = a->>'conteudoHash',
      'assinatura', jsonb_build_object('nome', a->'nome', 'funcao', a->'funcao', 'em', a->'em', 'tipo', a->'tipo', 'codigo', a->'codigo'),
      'relatorio', jsonb_build_object('titulo', r->'titulo', 'ano', r->'ano', 'status', r->'status',
        'igreja', (select doc->>'nome' from ipb_igrejas where id = r->>'igrejaId'), 'comissao', r->'analise'->'comissaoNome'));
  end if;

  -- ===== daqui para baixo precisa de sessão =====
  u := ipb_sessao(req->>'token');

  if act = 'logout' then delete from ipb_sessoes where token = req->>'token'; return '{}'; end if;
  if act = 'quem' then return jsonb_build_object('usuario', ipb_pub(u)); end if;

  if act = 'dados' then
    return jsonb_build_object(
      'usuario', ipb_pub(u),
      'igrejas', coalesce((select jsonb_agg(doc order by doc->>'nome') from ipb_igrejas), '[]'),
      'usuarios', coalesce((select jsonb_agg(case when u.role = 'admin' then ipb_pub(z)
                              else jsonb_build_object('id', z.id, 'nome', z.nome, 'igrejaId', z.igreja_id, 'role', z.role, 'cargo', z.cargo) end order by z.nome)
                            from ipb_usuarios z where u.role = 'admin' or z.ativo), '[]'),
      'modelos', coalesce((select jsonb_agg(doc order by (doc->>'ordem')::int nulls last, id) from ipb_modelos), '[]'),
      'comissoes', coalesce((select jsonb_agg(doc order by doc->>'nome') from ipb_comissoes), '[]'),
      'relatorios', coalesce((select jsonb_agg(doc) from ipb_relatorios where ipb_ve(u, igreja_id)), '[]'),
      'atas', coalesce((select jsonb_agg(doc || jsonb_build_object('nPaginas', jsonb_array_length(paginas))) from ipb_atas where ipb_ve(u, igreja_id)), '[]'),
      'reuniao', coalesce((select jsonb_agg(doc) from ipb_reuniao_itens), '[]'),
      'log', case when u.role = 'admin' then coalesce((select jsonb_agg(jsonb_build_object('id', id, 'em', ipb_iso(em), 'usuarioId', usuario_id, 'usuario', usuario,
                   'acao', acao, 'entidade', entidade, 'entidadeId', entidade_id, 'detalhes', detalhes) order by id desc)
                   from (select * from ipb_log order by id desc limit 500) l), '[]') else '[]'::jsonb end);
  end if;

  if act = 'senha' then
    if u.senha_hash <> crypt(coalesce(req->>'atual', ''), u.senha_hash) then perform ipb_fail('Senha atual incorreta.'); end if;
    if length(coalesce(req->>'nova', '')) < 6 then perform ipb_fail('A nova senha precisa ter pelo menos 6 caracteres.'); end if;
    update ipb_usuarios set senha_hash = crypt(req->>'nova', gen_salt('bf')) where id = u.id;
    perform ipb_registrar(u, 'senha', 'Trocou a própria senha', 'usuario', u.id);
    return '{}';
  end if;

  -- ===== salvar =====
  if act = 'salvar' then
    it := coalesce(req->'item', '{}');
    if req->>'entidade' = 'relatorio' then
      select doc into ex from ipb_relatorios where id = it->>'id';
      if ex is not null then
        if not ipb_ve(u, ex->>'igrejaId') then perform ipb_fail('Relatório não encontrado.', 'NOTFOUND'); end if;
        if not ((u.role in ('admin', 'editor')) and ex->>'status' in ('Rascunho', 'Devolvido')) then perform ipb_fail('Este relatório não pode ser editado por você agora.', 'FORBIDDEN'); end if;
        ex := ex || jsonb_build_object('dados', coalesce(it->'dados', '{}'), 'updatedAt', t);
        if coalesce(it->>'titulo', '') <> '' then ex := ex || jsonb_build_object('titulo', it->'titulo'); end if;
        if it ? 'documento' then ex := ex || jsonb_build_object('documento', coalesce(it->>'documento', '')); end if;
        if coalesce((it->>'atualizarModelo')::boolean, false) then
          select doc into m from ipb_modelos where id = ex->>'modeloId';
          if m is not null then ex := ex || jsonb_build_object('modelo', ipb_snapshot(m)); end if;
        end if;
        ex := ipb_hist(ex, u.nome, 'Dados editados');
        update ipb_relatorios set doc = ex where id = ex->>'id';
        perform ipb_registrar(u, 'editar', ex->>'titulo', 'relatorio', ex->>'id');
        return jsonb_build_object('item', ex);
      end if;
      if u.role not in ('admin', 'editor') then perform ipb_fail('Seu perfil não pode criar relatórios.', 'FORBIDDEN'); end if;
      v_ig := case when u.role = 'admin' or u.igreja_id is null then it->>'igrejaId' else u.igreja_id end;
      if v_ig is null or not exists (select 1 from ipb_igrejas where id = v_ig) then perform ipb_fail('Escolha a igreja.'); end if;
      select doc into m from ipb_modelos where id = it->>'modeloId' and coalesce((doc->>'ativo')::boolean, true);
      if m is null then perform ipb_fail('Escolha um modelo de relatório.'); end if;
      if coalesce((it->>'ano')::int, 0) not between 1901 and 2199 then perform ipb_fail('Ano inválido.'); end if;
      v_id := ipb_uid('re_');
      r := jsonb_build_object('id', v_id, 'modeloId', m->>'id', 'igrejaId', v_ig, 'ano', (it->>'ano')::int, 'documento', coalesce(it->>'documento', ''),
        'titulo', coalesce(nullif(it->>'titulo', ''), (m->>'nome') || ' ' || (it->>'ano')), 'status', 'Rascunho', 'dados', coalesce(it->'dados', '{}'),
        'modelo', ipb_snapshot(m), 'criadoPor', u.id, 'criadoPorNome', u.nome, 'createdAt', t, 'updatedAt', t, 'enviadoEm', null,
        'analise', ipb_nova_analise(), 'historico', jsonb_build_array(jsonb_build_object('em', t, 'por', u.nome, 'acao', 'Relatório criado')));
      insert into ipb_relatorios (id, igreja_id, doc) values (v_id, v_ig, r);
      perform ipb_registrar(u, 'criar', r->>'titulo', 'relatorio', v_id);
      return jsonb_build_object('item', r);
    end if;

    if u.role <> 'admin' then perform ipb_fail('Apenas o administrador pode fazer isso.', 'FORBIDDEN'); end if;

    if req->>'entidade' = 'igreja' then
      if coalesce(it->>'nome', '') = '' then perform ipb_fail('Informe o nome da igreja.'); end if;
      select doc into ex from ipb_igrejas where id = it->>'id';
      v_id := coalesce(ex->>'id', ipb_uid('ig_'));
      r := coalesce(ex, jsonb_build_object('id', v_id, 'ativo', true))
        || (select coalesce(jsonb_object_agg(k, it->k), '{}') from unnest(array['nome','sigla','tipo','igrejaMae','endereco','bairro','cidade','uf','cep','telefone','email','site','cnpj','dataOrg','secretario','pastor','presbiterio','sinodo','ativo']) k where it ? k);
      insert into ipb_igrejas (id, doc) values (v_id, r) on conflict (id) do update set doc = excluded.doc;
      perform ipb_registrar(u, case when ex is null then 'criar' else 'editar' end, r->>'nome', 'igreja', v_id);
      return jsonb_build_object('item', r);
    end if;

    if req->>'entidade' = 'usuario' then
      if coalesce(it->>'nome', '') = '' or coalesce(it->>'username', '') = '' then perform ipb_fail('Informe nome e usuário.'); end if;
      if coalesce(it->>'role', '') not in ('admin', 'editor', 'analista', 'leitor') then perform ipb_fail('Perfil inválido.'); end if;
      v_ig := nullif(it->>'igrejaId', '');
      if exists (select 1 from ipb_usuarios where id <> coalesce(it->>'id', '') and lower(username) = lower(it->>'username') and coalesce(igreja_id, '') = coalesce(v_ig, '')) then
        perform ipb_fail('Já existe esse usuário nessa igreja.'); end if;
      select * into x from ipb_usuarios where id = it->>'id';
      if x.id = u.id and (it->>'role' <> 'admin' or coalesce((it->>'ativo')::boolean, true) = false) then perform ipb_fail('Você não pode tirar o seu próprio acesso de administrador.'); end if;
      if coalesce(it->>'senha', '') <> '' and length(it->>'senha') < 6 then perform ipb_fail('A senha precisa ter pelo menos 6 caracteres.'); end if;
      if x.id is null then
        if coalesce(it->>'senha', '') = '' then perform ipb_fail('Defina uma senha com pelo menos 6 caracteres.'); end if;
        insert into ipb_usuarios (id, igreja_id, username, senha_hash, nome, role, ativo, email, cargo)
        values (ipb_uid('us_'), v_ig, trim(it->>'username'), crypt(it->>'senha', gen_salt('bf')), it->>'nome', it->>'role', coalesce((it->>'ativo')::boolean, true), coalesce(it->>'email', ''), coalesce(it->>'cargo', ''))
        returning * into x;
        perform ipb_registrar(u, 'criar', x.nome || ' (' || x.role || ')', 'usuario', x.id);
      else
        update ipb_usuarios set igreja_id = v_ig, username = trim(it->>'username'), nome = it->>'nome', role = it->>'role', ativo = coalesce((it->>'ativo')::boolean, true),
          email = coalesce(it->>'email', ''), cargo = coalesce(it->>'cargo', ''),
          senha_hash = case when coalesce(it->>'senha', '') <> '' then crypt(it->>'senha', gen_salt('bf')) else senha_hash end
        where id = x.id returning * into x;
        if not x.ativo then delete from ipb_sessoes where usuario_id = x.id; end if;
        perform ipb_registrar(u, 'editar', x.nome || ' (' || x.role || ')' || case when coalesce(it->>'senha', '') <> '' then ' · senha redefinida' else '' end, 'usuario', x.id);
      end if;
      return jsonb_build_object('item', ipb_pub(x));
    end if;

    if req->>'entidade' = 'modelo' then
      if coalesce(it->>'nome', '') = '' then perform ipb_fail('Informe o nome do modelo.'); end if;
      if jsonb_typeof(it->'secoes') <> 'array' then perform ipb_fail('Modelo sem seções.'); end if;
      select doc into ex from ipb_modelos where id = it->>'id';
      v_id := coalesce(ex->>'id', nullif(it->>'id', ''), ipb_uid('mo_'));
      r := coalesce(ex, jsonb_build_object('id', v_id))
        || (select coalesce(jsonb_object_agg(k, it->k), '{}') from unnest(array['nome','categoria','descricao','secoes','verificacoes','continuidade']) k where it ? k)
        || jsonb_build_object('ativo', coalesce((it->>'ativo')::boolean, true), 'updatedAt', t, 'versao', coalesce((ex->>'versao')::int, 0) + 1);
      insert into ipb_modelos (id, doc) values (v_id, r) on conflict (id) do update set doc = excluded.doc;
      perform ipb_registrar(u, case when ex is null then 'criar' else 'editar' end, (r->>'nome') || ' · versão ' || (r->>'versao'), 'modelo', v_id);
      return jsonb_build_object('item', r);
    end if;

    if req->>'entidade' = 'comissao' then
      if coalesce(it->>'nome', '') = '' then perform ipb_fail('Informe o nome da comissão.'); end if;
      select doc into ex from ipb_comissoes where id = it->>'id';
      v_id := coalesce(ex->>'id', ipb_uid('co_'));
      a := coalesce((select jsonb_agg(jsonb_build_object('userId', z.id, 'nome', coalesce(z.nome, mb->>'nome'), 'funcao', coalesce(nullif(mb->>'funcao', ''), 'Membro')))
                     from jsonb_array_elements(coalesce(it->'membros', '[]')) mb left join ipb_usuarios z on z.id = mb->>'userId'
                     where coalesce(mb->>'nome', '') <> '' or z.id is not null), '[]');
      r := coalesce(ex, jsonb_build_object('id', v_id)) || ipb_pick(it, array['grupo', 'modelo', 'ordem', 'base', 'titulo'])
           || jsonb_build_object('nome', it->'nome', 'tipo', coalesce(it->'tipo', '""'), 'ano', it->'ano', 'membros', a, 'ativa', coalesce((it->>'ativa')::boolean, true));
      insert into ipb_comissoes (id, doc) values (v_id, r) on conflict (id) do update set doc = excluded.doc;
      perform ipb_registrar(u, case when ex is null then 'criar' else 'editar' end, r->>'nome', 'comissao', v_id);
      return jsonb_build_object('item', r);
    end if;
    perform ipb_fail('Entidade desconhecida.');
  end if;

  -- ===== excluir =====
  if act = 'excluir' then
    v_id := req->>'id';
    if req->>'entidade' = 'relatorio' then
      select doc into r from ipb_relatorios where id = v_id;
      if r is null or not ipb_ve(u, r->>'igrejaId') then perform ipb_fail('Relatório não encontrado.', 'NOTFOUND'); end if;
      if not (u.role = 'admin' or (u.role = 'editor' and r->>'status' = 'Rascunho')) then perform ipb_fail('Você não pode excluir este relatório.', 'FORBIDDEN'); end if;
      delete from ipb_relatorios where id = v_id;
      perform ipb_registrar(u, 'excluir', r->>'titulo', 'relatorio', v_id);
      return '{}';
    end if;
    if u.role <> 'admin' then perform ipb_fail('Apenas o administrador pode fazer isso.', 'FORBIDDEN'); end if;
    if req->>'entidade' = 'usuario' then
      if v_id = u.id then perform ipb_fail('Você não pode excluir o seu próprio usuário.'); end if;
      delete from ipb_usuarios where id = v_id returning nome into v_txt;
    elsif req->>'entidade' = 'igreja' then
      if exists (select 1 from ipb_relatorios where igreja_id = v_id) then perform ipb_fail('Esta igreja tem relatórios. Desative-a em vez de excluir.'); end if;
      if exists (select 1 from ipb_usuarios where igreja_id = v_id) then perform ipb_fail('Esta igreja tem usuários. Desative-a em vez de excluir.'); end if;
      if exists (select 1 from ipb_atas where igreja_id = v_id) then perform ipb_fail('Esta igreja tem atas enviadas. Desative-a em vez de excluir.'); end if;
      delete from ipb_igrejas where id = v_id returning doc->>'nome' into v_txt;
    elsif req->>'entidade' = 'modelo' then
      delete from ipb_modelos where id = v_id returning doc->>'nome' into v_txt;
    elsif req->>'entidade' = 'comissao' then
      delete from ipb_comissoes where id = v_id returning doc->>'nome' into v_txt;
    else perform ipb_fail('Entidade desconhecida.'); end if;
    if v_txt is null then perform ipb_fail('Registro não encontrado.', 'NOTFOUND'); end if;
    perform ipb_registrar(u, 'excluir', v_txt, req->>'entidade', v_id);
    return '{}';
  end if;

  -- ===== fluxo do relatório =====
  if act = 'relatorio' then
    select doc into r from ipb_relatorios where id = req->>'id' for update;
    if r is null or not ipb_ve(u, r->>'igrejaId') then perform ipb_fail('Relatório não encontrado.', 'NOTFOUND'); end if;
    a := coalesce(r->'analise', ipb_nova_analise());
    v_op := req->>'op';
    -- permissões base
    if v_op in ('atribuir', 'parecer', 'ia', 'final', 'concluir') and not (u.role in ('admin', 'analista') and r->>'status' in ('Enviado', 'Em análise')) then
      perform ipb_fail('Você não pode analisar este relatório.', 'FORBIDDEN'); end if;
    if v_op = 'enviar' then
      if not (u.role in ('admin', 'editor') and r->>'status' in ('Rascunho', 'Devolvido')) then perform ipb_fail('Este relatório não pode ser enviado por você agora.', 'FORBIDDEN'); end if;
      a := a || '{"final":null,"assinaturas":[]}';
      r := r || jsonb_build_object('status', case when a->>'comissaoId' is not null then 'Em análise' else 'Enviado' end, 'enviadoEm', t);
      v_acao := 'Enviado para análise';
    elsif v_op = 'atribuir' then
      select doc into m from ipb_comissoes where id = req->>'comissaoId';
      if m is null then perform ipb_fail('Escolha a comissão.'); end if;
      a := a || jsonb_build_object('comissaoId', m->'id', 'comissaoNome', m->'nome', 'membros', coalesce(m->'membros', '[]'), 'assinaturas', '[]'::jsonb);
      r := r || '{"status":"Em análise"}';
      v_acao := 'Encaminhado à ' || (m->>'nome');
    elsif v_op = 'parecer' then
      v_txt := trim(coalesce(req->>'texto', ''));
      if v_txt = '' then perform ipb_fail('Escreva a análise.'); end if;
      select ordinality - 1 into v_idx from jsonb_array_elements(a->'pareceres') with ordinality p where p.value->>'id' = req->>'parecerId';
      if v_idx is not null then
        if a->'pareceres'->v_idx->>'autorId' <> u.id and u.role <> 'admin' then perform ipb_fail('Só o autor pode alterar esta análise.', 'FORBIDDEN'); end if;
        a := jsonb_set(a, array['pareceres', v_idx::text], (a->'pareceres'->v_idx) || jsonb_build_object('texto', v_txt, 'recomendacao', coalesce(req->>'recomendacao', ''), 'editadoEm', t));
      else
        a := jsonb_set(a, '{pareceres}', coalesce(a->'pareceres', '[]') || jsonb_build_array(jsonb_build_object('id', ipb_uid('pa_'), 'autorId', u.id, 'autorNome', u.nome,
          'autorCargo', coalesce(u.cargo, ''), 'texto', v_txt, 'recomendacao', coalesce(req->>'recomendacao', ''), 'em', t)));
      end if;
      if r->>'status' = 'Enviado' then r := r || '{"status":"Em análise"}'; end if;
      v_acao := 'Análise registrada por ' || u.nome;
    elsif v_op = 'excluir_parecer' then
      select p.value into ex from jsonb_array_elements(a->'pareceres') p where p.value->>'id' = req->>'parecerId';
      if ex is null then perform ipb_fail('Análise não encontrada.'); end if;
      if ex->>'autorId' <> u.id and u.role <> 'admin' then perform ipb_fail('Só o autor pode excluir esta análise.', 'FORBIDDEN'); end if;
      a := jsonb_set(a, '{pareceres}', coalesce((select jsonb_agg(p.value) from jsonb_array_elements(a->'pareceres') p where p.value->>'id' <> req->>'parecerId'), '[]'));
      v_acao := 'Análise excluída';
    elsif v_op = 'ia' then
      if coalesce(req->>'texto', '') = '' then perform ipb_fail('Proposta vazia.'); end if;
      a := a || jsonb_build_object('ia', jsonb_build_object('texto', req->>'texto', 'modelo', coalesce(req->>'modelo', ''), 'em', t, 'porNome', u.nome));
      v_acao := 'Proposta de análise gerada' || case when coalesce(req->>'modelo', '') <> '' then ' (' || (req->>'modelo') || ')' else '' end;
    elsif v_op = 'final' then
      if a->>'comissaoId' is null then perform ipb_fail('Encaminhe o relatório a uma comissão antes do parecer final.'); end if;
      if not dec ? coalesce(req->>'decisao', '') then perform ipb_fail('Escolha a decisão do parecer.'); end if;
      select mb into ex from jsonb_array_elements(a->'membros') mb where mb->>'funcao' ilike '%relator%' and mb->>'userId' is not null limit 1;
      if ex is not null and ex->>'userId' <> u.id and u.role <> 'admin' then
        perform ipb_fail('O texto final do parecer é do relator da comissão (' || (ex->>'nome') || ').', 'FORBIDDEN'); end if;
      v_txt := trim(coalesce(req->>'texto', ''));
      if v_txt = '' then perform ipb_fail('Escreva o parecer da comissão.'); end if;
      if (a->'final') is not null and jsonb_typeof(a->'final') = 'object' and (a->'final'->>'texto' <> v_txt or a->'final'->>'decisao' <> req->>'decisao')
         and jsonb_array_length(coalesce(a->'assinaturas', '[]')) > 0 then
        a := a || '{"assinaturas":[]}'; v_acao := 'Parecer final alterado (assinaturas anteriores anuladas)';
      else v_acao := 'Parecer final registrado'; end if;
      a := a || jsonb_build_object('final', jsonb_build_object('texto', v_txt, 'decisao', req->>'decisao', 'porId', u.id, 'porNome', u.nome, 'em', t));
    elsif v_op = 'assinar' then
      if r->>'status' <> 'Em análise' or jsonb_typeof(a->'final') <> 'object' then perform ipb_fail('Não há parecer final para assinar.'); end if;
      v_idx := (req->>'membroIdx')::int;
      ex := a->'membros'->v_idx;
      if ex is null then perform ipb_fail('Membro da comissão não encontrado.'); end if;
      if exists (select 1 from jsonb_array_elements(a->'assinaturas') s where (s->>'membroIdx')::int = v_idx) then perform ipb_fail('Este membro já assinou.'); end if;
      if ex->>'userId' = u.id then
        if u.senha_hash <> crypt(coalesce(req->>'senha', ''), u.senha_hash) then perform ipb_fail('Senha incorreta. A assinatura não foi registrada.'); end if;
        v_tipo := 'Eletrônica (login e senha)';
      elsif coalesce((req->>'presencial')::boolean, false) and (u.role = 'admin' or (u.role = 'analista' and exists (select 1 from jsonb_array_elements(a->'membros') mb where mb->>'userId' = u.id))) then
        if coalesce(req->>'desenho', '') not like 'data:image/png;base64,%' then perform ipb_fail('Colha a assinatura desenhada do membro.'); end if;
        if u.senha_hash <> crypt(coalesce(req->>'senha', ''), u.senha_hash) then perform ipb_fail('Confirme com a sua senha para registrar a assinatura presencial.'); end if;
        v_tipo := 'Presencial, colhida por ' || u.nome;
      else perform ipb_fail('Só o próprio membro pode assinar.', 'FORBIDDEN'); end if;
      r := r || jsonb_build_object('analise', a);
      v_ch := ipb_conteudo_hash(r);
      v_hash := ipb_sha(concat_ws('|', r->>'id', ex->>'nome', ex->>'funcao', t, v_ch));
      v_cod := upper(substr(v_hash, 1, 4) || '-' || substr(v_hash, 5, 4) || '-' || substr(v_hash, 9, 4));
      a := jsonb_set(a, '{assinaturas}', coalesce(a->'assinaturas', '[]') || jsonb_build_array(jsonb_build_object('membroIdx', v_idx, 'nome', ex->'nome', 'funcao', ex->'funcao',
        'userId', ex->'userId', 'em', t, 'tipo', v_tipo, 'desenho', nullif(req->>'desenho', ''), 'conteudoHash', v_ch, 'hash', v_hash, 'codigo', v_cod)));
      v_acao := 'Assinado por ' || (ex->>'nome') || ' (' || v_cod || ')';
    elsif v_op = 'concluir' then
      if r->>'status' <> 'Em análise' then perform ipb_fail('Você não pode concluir este relatório.', 'FORBIDDEN'); end if;
      if jsonb_typeof(a->'final') <> 'object' then perform ipb_fail('Falta o parecer final.'); end if;
      select string_agg(mb.value->>'nome', ', ') into v_txt from jsonb_array_elements(a->'membros') with ordinality mb
       where not exists (select 1 from jsonb_array_elements(a->'assinaturas') s where (s->>'membroIdx')::int = mb.ordinality - 1);
      if jsonb_array_length(coalesce(a->'membros', '[]')) = 0 or v_txt is not null then perform ipb_fail('Faltam assinaturas: ' || coalesce(v_txt, 'comissão sem membros')); end if;
      r := r || jsonb_build_object('status', dec->>(a->'final'->>'decisao'));
      v_acao := 'Análise concluída: ' || (r->>'status');
    elsif v_op = 'reabrir' then
      if u.role <> 'admin' then perform ipb_fail('Apenas o administrador pode reabrir.', 'FORBIDDEN'); end if;
      a := a || '{"final":null,"assinaturas":[]}';
      r := r || '{"status":"Rascunho"}';
      v_acao := 'Reaberto pelo administrador';
    else perform ipb_fail('Operação desconhecida.'); end if;
    r := ipb_hist(r || jsonb_build_object('analise', a, 'updatedAt', t), u.nome, v_acao);
    update ipb_relatorios set doc = r where id = r->>'id';
    perform ipb_registrar(u, v_op, (r->>'titulo') || ' · ' || v_acao, 'relatorio', r->>'id');
    return jsonb_build_object('item', r);
  end if;

  -- ===== anexos do relatório =====
  if act = 'anexo' then
    select doc into r from ipb_relatorios where id = req->>'relatorioId' for update;
    if r is null or not ipb_ve(u, r->>'igrejaId') then perform ipb_fail('Relatório não encontrado.', 'NOTFOUND'); end if;
    v_op := req->>'op';
    select x2 into a from jsonb_array_elements(coalesce(r->'anexos', '[]')) x2 where x2->>'id' = req->>'anexoId';
    if v_op = 'abrir' then
      if a is null then perform ipb_fail('Anexo não encontrado.', 'NOTFOUND'); end if;
      select dados into v_txt from ipb_anexos where id = a->>'id' and relatorio_id = r->>'id';
      if v_txt is null then perform ipb_fail('O arquivo deste anexo não está no servidor. Anexe-o de novo.', 'NOTFOUND'); end if;
      return jsonb_build_object('nome', a->>'nome', 'tipo', a->>'tipo', 'dados', v_txt);
    elsif v_op = 'salvar' then
      if u.role not in ('admin', 'editor') then perform ipb_fail('Seu perfil não pode anexar arquivos.', 'FORBIDDEN'); end if;
      v_txt := req->>'dados';
      v_tipo := substring(v_txt from '^data:([A-Za-z0-9/.+-]+);base64,');
      if v_tipo is null then perform ipb_fail('Arquivo inválido.'); end if;
      if not (v_tipo = 'application/pdf' or v_tipo like 'image/%') then perform ipb_fail('Anexe um PDF ou uma imagem.'); end if;
      v_n := (length(v_txt) - length('data:' || v_tipo || ';base64,')) * 3 / 4;
      if v_n > 15000000 then perform ipb_fail('O arquivo passa de 15 MB.'); end if;
      v_id := ipb_uid('an_');
      insert into ipb_anexos (id, relatorio_id, tipo, dados) values (v_id, r->>'id', v_tipo, v_txt);
      r := jsonb_set(r, '{anexos}', coalesce(r->'anexos', '[]') || jsonb_build_array(jsonb_build_object('id', v_id, 'nome', coalesce(nullif(req->>'nome', ''), 'arquivo'), 'tipo', v_tipo, 'tamanho', v_n,
        'em', t, 'porId', u.id, 'porNome', u.nome, 'origem', 'servidor', 'original', coalesce((req->>'original')::boolean, false))));
      v_acao := 'Arquivo anexado: ' || coalesce(req->>'nome', 'arquivo');
    elsif v_op = 'excluir' then
      if a is null then perform ipb_fail('Anexo não encontrado.', 'NOTFOUND'); end if;
      if not (u.role = 'admin' or a->>'porId' = u.id) then perform ipb_fail('Só quem anexou ou o administrador pode excluir.', 'FORBIDDEN'); end if;
      delete from ipb_anexos where id = a->>'id';
      r := jsonb_set(r, '{anexos}', coalesce((select jsonb_agg(x2) from jsonb_array_elements(r->'anexos') x2 where x2->>'id' <> a->>'id'), '[]'));
      v_acao := 'Anexo excluído: ' || (a->>'nome');
    else perform ipb_fail('Operação desconhecida.'); end if;
    r := ipb_hist(r || jsonb_build_object('updatedAt', t), u.nome, v_acao);
    update ipb_relatorios set doc = r where id = r->>'id';
    perform ipb_registrar(u, 'anexo', (r->>'titulo') || ' · ' || v_acao, 'relatorio', r->>'id');
    return jsonb_build_object('item', r);
  end if;

  -- ===== exame de atas =====
  if act = 'ata' then
    v_op := req->>'op';
    if v_op = 'salvar' then
      it := coalesce(req->'item', '{}');
      if u.role not in ('admin', 'editor', 'analista') then perform ipb_fail('Seu perfil não pode enviar atas.', 'FORBIDDEN'); end if;
      select doc, paginas into ex, pags from ipb_atas where id = it->>'id';
      if it->>'id' is not null and (ex is null or not ipb_ve(u, ex->>'igrejaId')) then perform ipb_fail('Ata não encontrada.', 'NOTFOUND'); end if;
      v_ig := coalesce(ex->>'igrejaId', case when u.role = 'admin' or u.igreja_id is null then it->>'igrejaId' else u.igreja_id end);
      if v_ig is null or not exists (select 1 from ipb_igrejas where id = v_ig) then perform ipb_fail('Escolha a igreja.'); end if;
      if ex is not null and ex->>'status' = 'Analisada' and u.role <> 'admin' then perform ipb_fail('Esta ata já foi analisada.', 'FORBIDDEN'); end if;
      if jsonb_typeof(it->'paginas') = 'array' then
        pags := coalesce((select jsonb_agg(p) from jsonb_array_elements(it->'paginas') p where jsonb_typeof(p) = 'string' and p->>0 like 'data:image/%'), '[]');
      end if;
      pags := coalesce(pags, '[]');
      v_n := jsonb_array_length(pags);
      if v_n = 0 then perform ipb_fail('Anexe pelo menos uma imagem da ata.'); end if;
      if v_n > 20 then perform ipb_fail('Envie no máximo 20 páginas por exame.'); end if;
      v_id := coalesce(ex->>'id', ipb_uid('at_'));
      r := coalesce(ex, jsonb_build_object('id', v_id, 'status', 'Enviada', 'ia', null, 'conferencia', '{}'::jsonb, 'final', null, 'criadoPor', u.id, 'criadoPorNome', u.nome, 'createdAt', t, 'historico', '[]'::jsonb))
        || (select coalesce(jsonb_object_agg(k, it->k), '{}') from unnest(array['livro','numeros','dataReuniao','tipoReuniao','formato','observacoes']) k where it ? k)
        || jsonb_build_object('igrejaId', v_ig, 'updatedAt', t);
      if ex is not null then r := r || '{"ia":null,"final":null}'; end if;
      r := ipb_hist(r, u.nome, case when ex is null then 'Ata enviada para exame (' || v_n || ' página(s))' else 'Imagens/dados da ata atualizados' end);
      insert into ipb_atas (id, igreja_id, doc, paginas) values (v_id, v_ig, r, pags) on conflict (id) do update set doc = excluded.doc, paginas = excluded.paginas;
      perform ipb_registrar(u, case when ex is null then 'criar' else 'editar' end, 'Ata ' || coalesce(r->>'numeros', '') || ' · livro ' || coalesce(r->>'livro', ''), 'ata', v_id);
      return jsonb_build_object('item', r || jsonb_build_object('paginas', pags));
    end if;
    select doc, paginas into r, pags from ipb_atas where id = req->>'id' for update;
    if r is null or not ipb_ve(u, r->>'igrejaId') then perform ipb_fail('Ata não encontrada.', 'NOTFOUND'); end if;
    if v_op = 'abrir' then return jsonb_build_object('item', r || jsonb_build_object('paginas', pags)); end if;
    if v_op = 'excluir' then
      if not (u.role = 'admin' or (r->>'criadoPor' = u.id and r->>'status' = 'Enviada')) then perform ipb_fail('Você não pode excluir esta ata.', 'FORBIDDEN'); end if;
      delete from ipb_atas where id = r->>'id';
      perform ipb_registrar(u, 'excluir', 'Ata ' || coalesce(r->>'numeros', ''), 'ata', r->>'id');
      return '{}';
    end if;
    if u.role not in ('admin', 'analista') then perform ipb_fail('Você não pode analisar esta ata.', 'FORBIDDEN'); end if;
    if v_op = 'ia' then
      if jsonb_typeof(req->'resultado'->'itens') <> 'array' then perform ipb_fail('Resultado da IA inválido.'); end if;
      r := r || jsonb_build_object('ia', jsonb_build_object('resultado', req->'resultado', 'modelo', coalesce(req->>'modelo', ''), 'em', t, 'porNome', u.nome));
      if r->>'status' = 'Enviada' then r := r || '{"status":"Em análise"}'; end if;
      v_acao := 'Proposta de análise gerada pela IA';
    elsif v_op = 'conferencia' then
      r := r || jsonb_build_object('conferencia', coalesce(req->'itens', '{}'));
      if r->>'status' = 'Enviada' then r := r || '{"status":"Em análise"}'; end if;
      v_acao := 'Conferência das regras atualizada';
    elsif v_op = 'final' then
      v_txt := trim(coalesce(req->>'texto', ''));
      if v_txt = '' then perform ipb_fail('Escreva o parecer.'); end if;
      if coalesce(req->>'conclusao', '') not in ('Conforme', 'Conforme com observações', 'Não conforme') then perform ipb_fail('Escolha a conclusão.'); end if;
      r := r || jsonb_build_object('final', jsonb_build_object('texto', v_txt, 'conclusao', req->>'conclusao', 'porId', u.id, 'porNome', u.nome, 'em', t), 'status', 'Analisada');
      v_acao := 'Parecer do relator registrado: ' || (req->>'conclusao');
    elsif v_op = 'reabrir' then
      if u.role <> 'admin' and jsonb_typeof(r->'final') = 'object' and r->'final'->>'porId' <> u.id then perform ipb_fail('Só o relator ou o administrador pode reabrir.', 'FORBIDDEN'); end if;
      r := r || '{"status":"Em análise"}';
      v_acao := 'Exame reaberto';
    else perform ipb_fail('Operação desconhecida.'); end if;
    r := ipb_hist(r || jsonb_build_object('updatedAt', t), u.nome, v_acao);
    update ipb_atas set doc = r where id = r->>'id';
    perform ipb_registrar(u, 'ata_' || v_op, 'Ata ' || coalesce(r->>'numeros', '') || ' · ' || v_acao, 'ata', r->>'id');
    return jsonb_build_object('item', r || jsonb_build_object('paginas', pags));
  end if;

  -- ===== reunião do concílio =====
  if act = 'reuniao' then
    v_op := req->>'op';
    if v_op = 'arquivo' then
      select doc into r from ipb_reuniao_itens where id = req->>'id' and tipo = 'documento';
      if r is null or jsonb_typeof(r->'arquivo') is distinct from 'object' then perform ipb_fail('Este documento não tem arquivo.', 'NOTFOUND'); end if;
      select dados into v_txt from ipb_reuniao_arquivos where id = r->>'id';
      if v_txt is null then perform ipb_fail('O arquivo deste documento não está no servidor. Envie-o de novo.', 'NOTFOUND'); end if;
      return jsonb_build_object('nome', r->'arquivo'->>'nome', 'tipo', r->'arquivo'->>'tipo', 'dados', v_txt);
    end if;

    if v_op = 'enviar_arquivo' then
      if u.role <> 'admin' then perform ipb_fail('Apenas a Mesa (administrador) envia documentos.', 'FORBIDDEN'); end if;
      select doc into r from ipb_reuniao_itens where id = req->>'id' and tipo = 'documento' for update;
      if r is null then perform ipb_fail('Documento não encontrado.', 'NOTFOUND'); end if;
      v_txt := req->>'dados';
      v_tipo := substring(v_txt from '^data:([A-Za-z0-9/.+-]+);base64,');
      if v_tipo is null or not (v_tipo = 'application/pdf' or v_tipo like 'image/%') then perform ipb_fail('Envie um PDF ou uma imagem.'); end if;
      v_n := (length(v_txt) - length('data:' || v_tipo || ';base64,')) * 3 / 4;
      if v_n > 15000000 then perform ipb_fail('O arquivo passa de 15 MB.'); end if;
      insert into ipb_reuniao_arquivos (id, tipo, dados) values (r->>'id', v_tipo, v_txt)
        on conflict (id) do update set tipo = excluded.tipo, dados = excluded.dados;
      r := r || jsonb_build_object('arquivo', jsonb_build_object('nome', coalesce(nullif(req->>'nome', ''), 'documento.pdf'), 'tipo', v_tipo, 'tamanho', v_n, 'em', t), 'updatedAt', t);
      update ipb_reuniao_itens set doc = r where id = r->>'id';
      perform ipb_registrar(u, 'documento', 'Arquivo do documento ' || coalesce(r->>'numero', '') || ' enviado', 'documento', r->>'id');
      return jsonb_build_object('item', r);
    end if;

    if v_op = 'importar' then
      if u.role <> 'admin' then perform ipb_fail('Apenas o administrador importa dados.', 'FORBIDDEN'); end if;
      if jsonb_typeof(req->'itens') is distinct from 'array' then perform ipb_fail('Arquivo inválido.'); end if;
      v_n := 0;
      for it in select e from jsonb_array_elements(req->'itens') e loop
        v_tipo := it->>'tipo';
        if coalesce(it->>'id', '') = '' then continue; end if;
        if v_tipo = 'comissao' then
          if coalesce(it->>'nome', '') = '' then continue; end if;
          select doc into ex from ipb_comissoes where id = it->>'id';
          r := coalesce(ex, jsonb_build_object('id', it->>'id', 'membros', '[]'::jsonb, 'ativa', true))
               || ipb_pick(it, array['nome', 'tipo', 'ano', 'grupo', 'modelo', 'ordem', 'base', 'titulo']);
          insert into ipb_comissoes (id, doc) values (r->>'id', r) on conflict (id) do update set doc = excluded.doc;
          v_n := v_n + 1;
        elsif v_tipo in ('cfg', 'reuniao', 'delegado', 'documento', 'parecer', 'estatistica', 'financa', 'ata') then
          select doc into ex from ipb_reuniao_itens where id = it->>'id';
          r := coalesce(ex, jsonb_build_object('id', it->>'id', 'tipo', v_tipo)) || ipb_pick(it, ipb_r_campos(v_tipo)) || jsonb_build_object('tipo', v_tipo, 'updatedAt', t);
          if v_tipo = 'parecer' then
            r := r || jsonb_build_object('status', case when it->>'status' in ('rascunho', 'concluido', 'aprovado', 'emendas', 'rejeitado') then it->>'status' else 'rascunho' end,
              'emendas', coalesce(it->>'emendas', ''), 'historico', coalesce(ex->'historico', jsonb_build_array(jsonb_build_object('em', t, 'por', u.nome, 'acao', 'Importado'))));
          end if;
          if v_tipo = 'documento' then r := r || jsonb_build_object('arquivo', coalesce(ex->'arquivo', 'null'::jsonb)); end if;
          insert into ipb_reuniao_itens (id, tipo, doc) values (r->>'id', v_tipo, r) on conflict (id) do update set tipo = excluded.tipo, doc = excluded.doc;
          v_n := v_n + 1;
        end if;
      end loop;
      perform ipb_registrar(u, 'importar', v_n || ' itens da reunião importados', 'reuniao', '');
      return jsonb_build_object('importados', v_n);
    end if;

    if v_op = 'decidir' then
      if u.role <> 'admin' then perform ipb_fail('Só a Mesa registra a decisão do plenário.', 'FORBIDDEN'); end if;
      select doc into r from ipb_reuniao_itens where id = req->>'id' and tipo = 'parecer' for update;
      if r is null then perform ipb_fail('Parecer não encontrado.', 'NOTFOUND'); end if;
      if coalesce(req->>'status', '') not in ('rascunho', 'concluido', 'aprovado', 'emendas', 'rejeitado') then perform ipb_fail('Situação inválida.'); end if;
      r := ipb_hist(r || jsonb_build_object('status', req->>'status', 'emendas', coalesce(req->>'emendas', ''), 'updatedAt', t), u.nome, 'Plenário: ' || (req->>'status'));
      update ipb_reuniao_itens set doc = r where id = r->>'id';
      perform ipb_registrar(u, 'parecer', 'Decisão do plenário: ' || (req->>'status'), 'parecer', r->>'id');
      return jsonb_build_object('item', r);
    end if;

    if v_op = 'excluir' then
      select doc into r from ipb_reuniao_itens where id = req->>'id';
      if r is null then perform ipb_fail('Registro não encontrado.', 'NOTFOUND'); end if;
      if not (u.role = 'admin' or (r->>'tipo' = 'parecer' and r->>'status' = 'rascunho' and r->>'criadoPor' = u.id)) then
        perform ipb_fail('Você não pode excluir este registro.', 'FORBIDDEN');
      end if;
      if r->>'tipo' = 'reuniao' then delete from ipb_reuniao_itens where doc->>'reuniaoId' = r->>'id'; end if;
      delete from ipb_reuniao_itens where id = r->>'id';
      perform ipb_registrar(u, 'excluir', (r->>'tipo') || ' ' || coalesce(r->>'nome', r->>'titulo', r->>'assunto', r->>'id'), r->>'tipo', r->>'id');
      return '{}';
    end if;

    if v_op <> 'salvar' then perform ipb_fail('Operação desconhecida.'); end if;
    v_tipo := req->>'tipo';
    if coalesce(v_tipo, '') not in ('cfg', 'reuniao', 'delegado', 'documento', 'parecer', 'estatistica', 'financa', 'ata') then perform ipb_fail('Tipo desconhecido.'); end if;
    it := coalesce(req->'item', '{}');
    if v_tipo = 'cfg' then it := it || '{"id":"cfg"}'; end if;
    select doc into ex from ipb_reuniao_itens where id = it->>'id' for update;
    if ex is not null and ex->>'tipo' <> v_tipo then perform ipb_fail('Registro de outro tipo.'); end if;
    if v_tipo <> 'parecer' and u.role <> 'admin' then perform ipb_fail('Apenas a Mesa (administrador) pode fazer isso.', 'FORBIDDEN'); end if;
    m := coalesce(ex, '{}'::jsonb) || ipb_pick(it, ipb_r_campos(v_tipo));
    perform ipb_r_validar(v_tipo, m);
    if v_tipo = 'parecer' then
      if not ipb_r_pode_parecer(u, m->>'comissaoId', m->>'reuniaoId') then perform ipb_fail('Você não é delegado desta comissão.', 'FORBIDDEN'); end if;
      if ex is not null and u.role <> 'admin' then
        if ex->>'status' in ('aprovado', 'emendas', 'rejeitado') then perform ipb_fail('O plenário já decidiu sobre este parecer.', 'FORBIDDEN'); end if;
        if ex->>'comissaoId' <> m->>'comissaoId' or ex->>'reuniaoId' <> m->>'reuniaoId' then perform ipb_fail('Não é possível mudar a comissão do parecer.', 'FORBIDDEN'); end if;
      end if;
      v_txt := case when it->>'status' = 'concluido' then 'concluido' else 'rascunho' end;
      if v_txt = 'concluido' and not ipb_r_relator(u, m->>'comissaoId', m->>'reuniaoId') then perform ipb_fail('Só o relator da comissão conclui o parecer.', 'FORBIDDEN'); end if;
      v_id := coalesce(ex->>'id', ipb_uid('pa_'));
      r := coalesce(ex, jsonb_build_object('id', v_id, 'tipo', 'parecer', 'criadoPor', u.id, 'criadoPorNome', u.nome, 'createdAt', t, 'historico', '[]'::jsonb, 'emendas', ''))
           || ipb_pick(it, ipb_r_campos('parecer')) || jsonb_build_object('status', v_txt, 'updatedAt', t, 'atualizadoPorNome', u.nome);
      r := ipb_hist(r, u.nome, case when ex is null then 'Criado' when v_txt = 'concluido' then 'Concluído e enviado ao plenário' else 'Editado' end);
    else
      v_id := coalesce(ex->>'id', case when v_tipo = 'cfg' then 'cfg' else ipb_uid('{"reuniao":"ru_","delegado":"de_","documento":"do_","estatistica":"es_","financa":"fi_","ata":"ag_"}'::jsonb->>v_tipo) end);
      r := coalesce(ex, jsonb_build_object('id', v_id, 'tipo', v_tipo, 'createdAt', t)) || ipb_pick(it, ipb_r_campos(v_tipo)) || jsonb_build_object('updatedAt', t);
      if v_tipo = 'delegado' then
        if coalesce(r->>'userId', '') <> '' then
          select * into x from ipb_usuarios where id = r->>'userId';
          if x.id is null then r := r || '{"userId":null}';
          elsif coalesce(r->>'nome', '') = '' then r := r || jsonb_build_object('nome', x.nome); end if;
        end if;
        if r->>'funcao' = 'Relator' then
          update ipb_reuniao_itens set doc = doc || '{"funcao":"Participante"}'
           where tipo = 'delegado' and id <> v_id and doc->>'comissaoId' = r->>'comissaoId' and doc->>'reuniaoId' = r->>'reuniaoId' and doc->>'funcao' = 'Relator';
        end if;
      end if;
      if v_tipo = 'documento' then r := r || jsonb_build_object('arquivo', coalesce(ex->'arquivo', 'null'::jsonb)); end if;
    end if;
    insert into ipb_reuniao_itens (id, tipo, doc) values (v_id, v_tipo, r) on conflict (id) do update set doc = excluded.doc;
    perform ipb_registrar(u, case when ex is null then 'criar' else 'editar' end,
      v_tipo || ' ' || coalesce(r->>'nome', r->>'titulo', r->>'assunto', r->>'ano', v_id), v_tipo, v_id);
    return jsonb_build_object('item', r);
  end if;

  perform ipb_fail('Ação desconhecida.');
  return null;
exception when others then
  get stacked diagnostics v_msg = message_text, v_code = pg_exception_detail;
  if sqlstate <> 'P0001' then v_code := 'ERRO'; v_msg := 'Erro no servidor: ' || v_msg; end if;
  return jsonb_build_object('erro', v_msg, 'code', coalesce(nullif(v_code, ''), 'ERRO'));
end $$;

revoke all on function ipb_api(jsonb) from public;
grant execute on function ipb_api(jsonb) to anon, authenticated;
-- as funções auxiliares não ficam expostas
revoke all on function ipb_fail(text, text), ipb_sessao(text), ipb_registrar(ipb_usuarios, text, text, text, text) from public, anon, authenticated;
revoke all on function ipb_pick(jsonb, text[]), ipb_r_campos(text), ipb_r_pode_parecer(ipb_usuarios, text, text), ipb_r_relator(ipb_usuarios, text, text), ipb_r_validar(text, jsonb) from public, anon, authenticated;
