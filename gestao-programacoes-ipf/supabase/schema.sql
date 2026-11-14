-- =============================================================================
-- Gestão de Programações · IP Filadélfia — banco de dados no Supabase
--
-- Tabelas com prefixo ipf_ (não interferem em outras tabelas do projeto).
-- O site nunca lê as tabelas direto: todas têm RLS ligado e nenhuma política,
-- e o acesso passa só pela função ipf_api (mesmas regras do antigo Code.gs).
-- O Apps Script continua só como "carteiro" (e-mails e WhatsApp), chamando
-- ipf_carteiro / ipf_carteiro_feito com uma senha guardada em ipf_settings.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ----------------------------------------------------------------------------
-- TABELAS
-- ----------------------------------------------------------------------------
create table if not exists public.ipf_users (
  id            text primary key,
  name          text not null,
  username      text not null,
  role          text not null default 'user' check (role in ('admin', 'user')),
  active        boolean not null default true,
  password_hash text not null default '',
  email         text not null default '',
  phone         text not null default '',
  created_at    timestamptz not null default now()
);
create unique index if not exists ipf_users_username_key on public.ipf_users (lower(username));

create table if not exists public.ipf_ministries (
  id          text primary key,
  name        text not null,
  leader      text not null default '',
  color       text not null default '#4f46e5',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.ipf_events (
  id                text primary key,
  title             text not null,
  ministry_id       text not null default '',
  status            text not null default 'Pendente',
  date              text not null default '',      -- AAAA-MM-DD
  time              text not null default '',      -- HH:MM
  location          text not null default '',
  responsible       text not null default '',
  description       text not null default '',
  responsible_email text not null default '',
  responsible_phone text not null default '',
  created_by        text not null default '',      -- id do login dono
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        text not null default '',      -- username
  reminder_sent_at  timestamptz
);
create index if not exists ipf_events_date_idx on public.ipf_events (date);

create table if not exists public.ipf_log (
  id        text primary key,
  at        timestamptz not null default clock_timestamp(),
  user_id   text not null default '',
  username  text not null default '',
  action    text not null default '',
  entity    text not null default '',
  entity_id text not null default '',
  title     text not null default '',
  owner     text not null default '',
  details   text not null default '',
  alert     boolean not null default false
);
create index if not exists ipf_log_at_idx on public.ipf_log (at desc);

create table if not exists public.ipf_sessions (
  token      uuid primary key default gen_random_uuid(),
  user_id    text not null,
  expires_at timestamptz not null
);

create table if not exists public.ipf_login_fails (
  username text primary key,
  fails    int not null default 0,
  last_at  timestamptz not null default now()
);

-- e-mails de alerta aos administradores, enviados pelo Apps Script (carteiro)
create table if not exists public.ipf_outbox (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  to_emails  text[] not null,
  subject    text not null,
  body       text not null,
  sent_at    timestamptz,
  error      text
);

create table if not exists public.ipf_settings (
  key   text primary key,
  value text not null default ''
);
insert into public.ipf_settings (key, value)
values ('carteiro_secret', encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- ninguém de fora acessa as tabelas diretamente
do $$
declare t text;
begin
  foreach t in array array['ipf_users','ipf_ministries','ipf_events','ipf_log','ipf_sessions','ipf_login_fails','ipf_outbox','ipf_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- UTILITÁRIOS
-- ----------------------------------------------------------------------------
create or replace function public.ipf_fail(msg text, code text default 'ERROR') returns void
language plpgsql set search_path = public as $$
begin
  raise exception using message = msg, hint = code;
end $$;

create or replace function public.ipf_str(p jsonb, k text, maxlen int default null) returns text
language sql immutable set search_path = public as $$
  select case when maxlen is null then s else left(s, maxlen) end
  from (select btrim(coalesce(p ->> k, '')) as s) x
$$;

create or replace function public.ipf_hash(pass text) returns text
language sql immutable set search_path = public, extensions as $$
  select 'sha256:' || encode(extensions.digest(convert_to('ipf::' || pass, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.ipf_is_email(v text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(v, '') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
$$;

-- só os dígitos com o código do país (Brasil por padrão), ou '' se inválido
create or replace function public.ipf_phone_digits(v text) returns text
language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(v, ''), '\D', '', 'g');
begin
  if length(d) in (10, 11) then d := '55' || d; end if;
  return case when length(d) between 12 and 15 then d else '' end;
end $$;

create or replace function public.ipf_valid_id(id text, prefix text) returns text
language sql volatile set search_path = public as $$
  select case when coalesce(id, '') ~ '^[a-z]-[A-Za-z0-9_-]{1,40}$' then id
              else prefix || '-' || left(replace(gen_random_uuid()::text, '-', ''), 12) end
$$;

create or replace function public.ipf_iso(t timestamptz) returns text
language sql immutable set search_path = public as $$
  select case when t is null then '' else to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
$$;

create or replace function public.ipf_date_br(iso text) returns text
language sql immutable set search_path = public as $$
  select case when coalesce(iso, '') ~ '^\d{4}-\d{2}-\d{2}$'
              then substr(iso, 9, 2) || '/' || substr(iso, 6, 2) || '/' || substr(iso, 1, 4)
              else coalesce(iso, '') end
$$;

create or replace function public.ipf_username_of(uid text) returns text
language sql stable set search_path = public as $$
  select case when coalesce(uid, '') = '' then ''
              else coalesce((select username from ipf_users where id = uid), uid) end
$$;

create or replace function public.ipf_ministry_name(mid text) returns text
language sql stable set search_path = public as $$
  select case when coalesce(mid, '') = '' then ''
              else coalesce((select name from ipf_ministries where id = mid), mid) end
$$;

-- ----------------------------------------------------------------------------
-- CONVERSÃO PARA O FORMATO DO SITE
-- ----------------------------------------------------------------------------
create or replace function public.ipf_user_json(u public.ipf_users, with_contacts boolean) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', u.id, 'name', u.name, 'username', u.username,
           'role', case when u.role = 'admin' then 'admin' else 'user' end, 'active', u.active)
         || case when with_contacts then jsonb_build_object('email', u.email, 'phone', u.phone) else '{}'::jsonb end
$$;

create or replace function public.ipf_event_json(e public.ipf_events) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'ministryId', e.ministry_id, 'status', e.status, 'date', e.date, 'time', e.time,
    'location', e.location, 'responsible', e.responsible, 'description', e.description,
    'responsibleEmail', e.responsible_email, 'responsiblePhone', e.responsible_phone,
    'createdBy', e.created_by, 'reminderSentAt', ipf_iso(e.reminder_sent_at),
    'updatedAt', ipf_iso(e.updated_at), 'updatedBy', e.updated_by)
$$;

create or replace function public.ipf_log_json(l public.ipf_log) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object('id', l.id, 'at', ipf_iso(l.at), 'userId', l.user_id, 'username', l.username,
    'action', l.action, 'entity', l.entity, 'entityId', l.entity_id, 'title', l.title, 'owner', l.owner,
    'details', l.details, 'alert', l.alert)
$$;

create or replace function public.ipf_get_all(me public.ipf_users) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'users', coalesce((select jsonb_agg(ipf_user_json(u, me.role = 'admin' or u.id = me.id) order by u.created_at, u.id) from ipf_users u), '[]'::jsonb),
    'ministries', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'leader', m.leader, 'color', m.color,
                     'description', m.description) order by m.created_at, m.id) from ipf_ministries m), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(ipf_event_json(e) order by e.date, e.time, e.id) from ipf_events e), '[]'::jsonb),
    'alerts', case when me.role = 'admin' then
        coalesce((select jsonb_agg(ipf_log_json(l) order by l.at desc)
                  from (select * from ipf_log where alert order by at desc limit 200) l), '[]'::jsonb)
      else '[]'::jsonb end)
$$;

-- ----------------------------------------------------------------------------
-- REGISTRO DE AÇÕES E ALERTAS
-- ----------------------------------------------------------------------------
create or replace function public.ipf_diff(before jsonb, after jsonb, keys text[]) returns text
language plpgsql stable set search_path = public as $$
declare
  labels constant jsonb := '{"name":"Nome","username":"Usuário","role":"Perfil","active":"Situação","email":"E-mail",
    "phone":"WhatsApp","leader":"Responsável","color":"Cor","title":"Título","ministryId":"Ministério","status":"Status",
    "date":"Data","time":"Horário","location":"Local","responsible":"Responsável","description":"Descrição",
    "responsibleEmail":"E-mail do responsável","responsiblePhone":"WhatsApp do responsável","createdBy":"Dono"}';
  k text; a text; b text; fa text; fb text; lbl text;
  out text[] := '{}';
begin
  foreach k in array keys loop
    a := coalesce(before ->> k, ''); b := coalesce(after ->> k, '');
    continue when a = b;
    lbl := coalesce(labels ->> k, k);
    fa := a; fb := b;
    if k = 'ministryId' then fa := ipf_ministry_name(a); fb := ipf_ministry_name(b); end if;
    if k = 'createdBy' then fa := ipf_username_of(a); fb := ipf_username_of(b); end if;
    if k = 'date' then fa := ipf_date_br(a); fb := ipf_date_br(b); end if;
    if k = 'active' then
      fa := case when upper(a) = 'TRUE' then 'ativo' else 'inativo' end;
      fb := case when upper(b) = 'TRUE' then 'ativo' else 'inativo' end;
    end if;
    if k = 'role' then
      fa := case when a = 'admin' then 'Administrador' else 'Usuário' end;
      fb := case when b = 'admin' then 'Administrador' else 'Usuário' end;
    end if;
    if k = 'description' and (length(a) > 60 or length(b) > 60) then
      out := out || (lbl || ' alterada');
      continue;
    end if;
    out := out || (lbl || ': ' || coalesce(nullif(fa, ''), '(vazio)') || ' → ' || coalesce(nullif(fb, ''), '(vazio)'));
  end loop;
  return array_to_string(out, ' | ');
end $$;

-- alert = alguém mexeu numa programação de outro login: os administradores recebem um e-mail
create or replace function public.ipf_log_add(me public.ipf_users, p_action text, p_entity text, p_entity_id text,
  p_title text, p_owner text, p_details text, p_alert boolean default false) returns void
language plpgsql set search_path = public as $$
declare
  e_id text := 'l-' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  who text := coalesce(nullif(me.name, ''), me.username, '');
  verb text := case when p_action = 'excluiu' then 'EXCLUIU' else 'ALTEROU' end;
  dest text[];
begin
  insert into ipf_log (id, user_id, username, action, entity, entity_id, title, owner, details, alert)
  values (e_id, coalesce(me.id, ''), coalesce(me.username, ''), p_action, p_entity, coalesce(p_entity_id, ''),
          coalesce(p_title, ''), coalesce(p_owner, ''), left(coalesce(p_details, ''), 1500), coalesce(p_alert, false));
  if not coalesce(p_alert, false) then return; end if;

  select array_agg(email) into dest from ipf_users
   where role = 'admin' and active and id <> coalesce(me.id, '') and ipf_is_email(email);
  if dest is null then return; end if;
  insert into ipf_outbox (to_emails, subject, body) values (
    dest,
    '[IP Filadélfia] ' || who || ' ' || lower(verb) || ' uma programação de ' || coalesce(p_owner, ''),
    who || ' (' || coalesce(me.username, '') || ') ' || verb || ' a programação "' || coalesce(p_title, '') ||
      '", cadastrada por ' || coalesce(p_owner, '') || '.' || E'\n\nDetalhes:\n' ||
      replace(coalesce(p_details, ''), ' | ', E'\n') || E'\n\nQuando: ' ||
      to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') ||
      E'\nVeja o histórico completo em Registro de ações, no sistema.');
end $$;

create or replace function public.ipf_get_log(lim int default 1000) returns jsonb
language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(ipf_log_json(l) order by l.at desc), '[]'::jsonb)
  from (select * from ipf_log order by at desc limit lim) l
$$;

create or replace function public.ipf_notify_status() returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'reminders', coalesce((select value::timestamptz > now() - interval '30 minutes' from ipf_settings
                           where key = 'carteiro_last_run' and value <> ''), false),
    'whatsapp', coalesce((select value from ipf_settings where key = 'whatsapp_provider'), ''),
    'adminsWithEmail', (select count(*) from ipf_users where role = 'admin' and active and ipf_is_email(email)),
    'admins', (select count(*) from ipf_users where role = 'admin' and active))
$$;

-- ----------------------------------------------------------------------------
-- AUTENTICAÇÃO
-- ----------------------------------------------------------------------------
create or replace function public.ipf_login(p jsonb) returns jsonb
language plpgsql set search_path = public as $$
declare
  uname text := lower(ipf_str(p, 'username'));
  pass text := coalesce(p ->> 'password', '');
  f ipf_login_fails;
  u ipf_users;
  ghost ipf_users;
  tok uuid;
begin
  if uname = '' or pass = '' then
    return jsonb_build_object('ok', false, 'error', 'Informe usuário e senha.', 'code', 'ERROR');
  end if;
  select * into f from ipf_login_fails where username = uname;
  if found and f.fails >= 5 and f.last_at > now() - interval '5 minutes' then
    return jsonb_build_object('ok', false, 'error', 'Muitas tentativas. Aguarde 5 minutos e tente novamente.', 'code', 'ERROR');
  end if;

  select * into u from ipf_users where lower(username) = uname;
  if not found or not u.active or u.password_hash <> ipf_hash(pass) then
    insert into ipf_login_fails (username, fails, last_at) values (uname, 1, now())
    on conflict (username) do update
      set fails = case when ipf_login_fails.last_at < now() - interval '5 minutes' then 1 else ipf_login_fails.fails + 1 end,
          last_at = now();
    ghost.id := ''; ghost.username := uname;
    perform ipf_log_add(ghost, 'login_falhou', 'sessão', '', '', '', 'Usuário ou senha incorretos.');
    return jsonb_build_object('ok', false, 'error', 'Usuário ou senha incorretos.', 'code', 'ERROR');
  end if;

  delete from ipf_login_fails where username = uname;
  delete from ipf_sessions where expires_at < now();
  insert into ipf_sessions (user_id, expires_at) values (u.id, now() + interval '7 days') returning token into tok;
  perform ipf_log_add(u, 'login', 'sessão', '', '', '', '');
  return jsonb_build_object('ok', true, 'token', tok, 'me', ipf_user_json(u, true), 'data', ipf_get_all(u));
end $$;

create or replace function public.ipf_auth(p_token text) returns public.ipf_users
language plpgsql set search_path = public as $$
declare u ipf_users;
begin
  if coalesce(p_token, '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    perform ipf_fail('Sessão expirada. Entre novamente.', 'AUTH');
  end if;
  select users.* into u from ipf_sessions s join ipf_users users on users.id = s.user_id
   where s.token = p_token::uuid and s.expires_at > now();
  if not found then perform ipf_fail('Sessão expirada. Entre novamente.', 'AUTH'); end if;
  if not u.active then perform ipf_fail('Usuário inativo ou removido.', 'AUTH'); end if;
  return u;
end $$;

create or replace function public.ipf_require_admin(me public.ipf_users) returns void
language plpgsql set search_path = public as $$
begin
  if me.role <> 'admin' then perform ipf_fail('Apenas administradores podem fazer isso.', 'FORBIDDEN'); end if;
end $$;

-- ----------------------------------------------------------------------------
-- PROGRAMAÇÕES
-- ----------------------------------------------------------------------------
create or replace function public.ipf_upsert_event(p jsonb, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare
  v_title text := ipf_str(p, 'title', 120);
  v_ministry text := ipf_str(p, 'ministryId');
  v_status text := case when p ->> 'status' in ('Pendente', 'Em andamento', 'Concluída') then p ->> 'status' else 'Pendente' end;
  v_date text := ipf_str(p, 'date');
  v_time text := ipf_str(p, 'time');
  v_location text := ipf_str(p, 'location', 120);
  v_resp text := ipf_str(p, 'responsible', 120);
  v_desc text := ipf_str(p, 'description', 2000);
  v_email text := ipf_str(p, 'responsibleEmail', 120);
  v_phone text := ipf_str(p, 'responsiblePhone', 30);
  v_id text := ipf_valid_id(p ->> 'id', 'e');
  ex ipf_events; nw ipf_events;
  is_new boolean;
  v_owner text; v_created_by text; changes text; only_status boolean;
  keys constant text[] := array['title','ministryId','status','date','time','location','responsible','description',
                                'responsibleEmail','responsiblePhone','createdBy'];
begin
  if v_title = '' or v_date = '' or v_time = '' or v_location = '' or v_resp = '' then
    perform ipf_fail('Preencha todos os campos obrigatórios.');
  end if;
  if v_date !~ '^\d{4}-\d{2}-\d{2}$' then perform ipf_fail('Data inválida.'); end if;
  if v_time !~ '^\d{2}:\d{2}$' then perform ipf_fail('Horário inválido.'); end if;
  if v_email <> '' and not ipf_is_email(v_email) then perform ipf_fail('E-mail do responsável inválido.'); end if;
  if v_phone <> '' and ipf_phone_digits(v_phone) = '' then perform ipf_fail('WhatsApp do responsável inválido. Use DDD + número.'); end if;

  select * into ex from ipf_events where id = v_id for update;
  is_new := not found;
  v_owner := case when is_new then me.id else ex.created_by end;
  if not is_new and me.role <> 'admin' and v_owner <> me.id then
    perform ipf_fail('Você só pode alterar as programações cadastradas por você.', 'FORBIDDEN');
  end if;
  -- o administrador pode transferir a programação para outro login
  v_created_by := v_owner;
  if me.role = 'admin' and ipf_str(p, 'createdBy') <> '' and exists (select 1 from ipf_users where id = p ->> 'createdBy') then
    v_created_by := p ->> 'createdBy';
  end if;

  insert into ipf_events as e (id, title, ministry_id, status, date, time, location, responsible, description,
                               responsible_email, responsible_phone, created_by, created_at, updated_at, updated_by)
  values (v_id, v_title, v_ministry, v_status, v_date, v_time, v_location, v_resp, v_desc,
          v_email, v_phone, v_created_by, now(), now(), me.username)
  on conflict (id) do update set
    title = excluded.title, ministry_id = excluded.ministry_id, status = excluded.status, date = excluded.date,
    time = excluded.time, location = excluded.location, responsible = excluded.responsible,
    description = excluded.description, responsible_email = excluded.responsible_email,
    responsible_phone = excluded.responsible_phone, created_by = excluded.created_by,
    updated_at = now(), updated_by = excluded.updated_by,
    -- mudou data ou horário: o lembrete volta a valer para a nova data
    reminder_sent_at = case when e.date <> excluded.date or e.time <> excluded.time then null else e.reminder_sent_at end
  returning * into nw;

  if is_new then
    perform ipf_log_add(me, 'criou', 'programação', v_id, v_title, ipf_username_of(v_created_by),
                        ipf_date_br(v_date) || ' ' || v_time);
    return;
  end if;
  changes := ipf_diff(ipf_event_json(ex), ipf_event_json(nw), keys);
  if changes = '' then return; end if;
  only_status := ipf_diff(ipf_event_json(ex), ipf_event_json(nw), array_remove(keys, 'status')) = '';
  perform ipf_log_add(me, case when only_status then 'mudou_status' else 'editou' end, 'programação', v_id, v_title,
                      ipf_username_of(v_owner), changes, v_owner <> '' and v_owner <> me.id);
end $$;

create or replace function public.ipf_delete_event(v_id text, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare ex ipf_events;
begin
  select * into ex from ipf_events where id = v_id for update;
  if not found then return; end if;
  if me.role <> 'admin' and ex.created_by <> me.id then
    perform ipf_fail('Você só pode excluir as programações cadastradas por você.', 'FORBIDDEN');
  end if;
  delete from ipf_events where id = v_id;
  perform ipf_log_add(me, 'excluiu', 'programação', v_id, ex.title, ipf_username_of(ex.created_by),
    ipf_date_br(ex.date) || ' ' || ex.time || ' · ' || ex.location, ex.created_by <> '' and ex.created_by <> me.id);
end $$;

-- ----------------------------------------------------------------------------
-- MINISTÉRIOS
-- ----------------------------------------------------------------------------
create or replace function public.ipf_norm(s text) returns text
language sql immutable set search_path = public as $$
  select lower(translate(btrim(coalesce(s, '')),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'))
$$;

create or replace function public.ipf_upsert_ministry(p jsonb, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare
  v_name text := ipf_str(p, 'name', 60);
  v_leader text := ipf_str(p, 'leader', 120);
  v_color text := case when coalesce(p ->> 'color', '') ~* '^#[0-9a-f]{6}$' then p ->> 'color' else '#4f46e5' end;
  v_desc text := ipf_str(p, 'description', 2000);
  v_id text := ipf_valid_id(p ->> 'id', 'm');
  ex ipf_ministries; changes text;
begin
  if v_name = '' or v_leader = '' then perform ipf_fail('Preencha todos os campos obrigatórios.'); end if;
  if exists (select 1 from ipf_ministries where id <> v_id and ipf_norm(name) = ipf_norm(v_name)) then
    perform ipf_fail('Já existe um ministério com esse nome.');
  end if;
  select * into ex from ipf_ministries where id = v_id for update;
  if found then
    perform ipf_require_admin(me);   -- todos cadastram; só administradores alteram
    update ipf_ministries set name = v_name, leader = v_leader, color = v_color, description = v_desc, updated_at = now()
     where id = v_id;
    changes := ipf_diff(jsonb_build_object('name', ex.name, 'leader', ex.leader, 'color', ex.color, 'description', ex.description),
                        jsonb_build_object('name', v_name, 'leader', v_leader, 'color', v_color, 'description', v_desc),
                        array['name','leader','color','description']);
    if changes <> '' then perform ipf_log_add(me, 'editou', 'ministério', v_id, v_name, '', changes); end if;
  else
    insert into ipf_ministries (id, name, leader, color, description) values (v_id, v_name, v_leader, v_color, v_desc);
    perform ipf_log_add(me, 'criou', 'ministério', v_id, v_name, '', '');
  end if;
end $$;

create or replace function public.ipf_delete_ministry(v_id text, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare ex ipf_ministries; n int;
begin
  perform ipf_require_admin(me);
  select * into ex from ipf_ministries where id = v_id;
  if not found then return; end if;
  delete from ipf_ministries where id = v_id;
  update ipf_events set ministry_id = '' where ministry_id = v_id;
  get diagnostics n = row_count;
  perform ipf_log_add(me, 'excluiu', 'ministério', v_id, ex.name, '',
    case when n > 0 then n || ' programação(ões) ficaram sem ministério' else '' end);
end $$;

-- ----------------------------------------------------------------------------
-- USUÁRIOS
-- ----------------------------------------------------------------------------
create or replace function public.ipf_upsert_user(p jsonb, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare
  v_name text := ipf_str(p, 'name', 80);
  v_username text := ipf_str(p, 'username', 40);
  v_role text := case when p ->> 'role' = 'admin' then 'admin' else 'user' end;
  v_active boolean := coalesce(p -> 'active', 'true'::jsonb) <> 'false'::jsonb;
  v_email text := ipf_str(p, 'email', 120);
  v_phone text := ipf_str(p, 'phone', 30);
  v_id text := ipf_valid_id(p ->> 'id', 'u');
  ex ipf_users; nw ipf_users; changes text;
begin
  if v_name = '' or v_username = '' then perform ipf_fail('Preencha todos os campos obrigatórios.'); end if;
  if v_username !~ '^[a-zA-Z0-9._-]{2,}$' then perform ipf_fail('Usuário deve ter ao menos 2 caracteres, sem espaços ou acentos.'); end if;
  if v_email <> '' and not ipf_is_email(v_email) then perform ipf_fail('E-mail inválido.'); end if;
  if v_phone <> '' and ipf_phone_digits(v_phone) = '' then perform ipf_fail('WhatsApp inválido. Use DDD + número.'); end if;
  if exists (select 1 from ipf_users where id <> v_id and lower(username) = lower(v_username)) then
    perform ipf_fail('Esse nome de usuário já está em uso.');
  end if;

  select * into ex from ipf_users where id = v_id for update;
  if found then
    if ex.id = me.id and (not v_active or v_role <> 'admin') then
      perform ipf_fail('Você não pode remover o seu próprio acesso de administrador.');
    end if;
    if ex.role = 'admin' and (v_role <> 'admin' or not v_active)
       and not exists (select 1 from ipf_users where role = 'admin' and active and id <> v_id) then
      perform ipf_fail('É necessário manter ao menos um administrador ativo.');
    end if;
    update ipf_users set name = v_name, username = v_username, role = v_role, active = v_active, email = v_email, phone = v_phone
     where id = v_id returning * into nw;
    changes := ipf_diff(ipf_user_json(ex, true), ipf_user_json(nw, true), array['name','username','role','active','email','phone']);
    if changes <> '' then perform ipf_log_add(me, 'editou', 'usuário', v_id, v_name || ' (' || v_username || ')', '', changes); end if;
  else
    if length(coalesce(p ->> 'password', '')) < 4 then perform ipf_fail('A senha deve ter ao menos 4 caracteres.'); end if;
    insert into ipf_users (id, name, username, role, active, password_hash, email, phone)
    values (v_id, v_name, v_username, v_role, v_active, ipf_hash(p ->> 'password'), v_email, v_phone);
    perform ipf_log_add(me, 'criou', 'usuário', v_id, v_name || ' (' || v_username || ')', '',
                        case when v_role = 'admin' then 'Administrador' else 'Usuário' end);
  end if;
end $$;

create or replace function public.ipf_delete_user(v_id text, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare u ipf_users;
begin
  if v_id = me.id then perform ipf_fail('Você não pode excluir o seu próprio usuário.'); end if;
  select * into u from ipf_users where id = v_id;
  if not found then return; end if;
  if u.role = 'admin' and not exists (select 1 from ipf_users where role = 'admin' and active and id <> v_id) then
    perform ipf_fail('É necessário manter ao menos um administrador ativo.');
  end if;
  delete from ipf_users where id = v_id;
  delete from ipf_sessions where user_id = v_id;
  perform ipf_log_add(me, 'excluiu', 'usuário', v_id, u.name || ' (' || u.username || ')', '', '');
end $$;

create or replace function public.ipf_set_password(v_id text, pass text, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare u ipf_users;
begin
  if length(coalesce(pass, '')) < 4 then perform ipf_fail('A senha deve ter ao menos 4 caracteres.'); end if;
  update ipf_users set password_hash = ipf_hash(pass) where id = v_id returning * into u;
  if not found then perform ipf_fail('Usuário não encontrado.'); end if;
  perform ipf_log_add(me, 'senha', 'usuário', v_id, u.name || ' (' || u.username || ')', '',
                      case when v_id = me.id then 'Trocou a própria senha' else 'Redefiniu a senha' end);
end $$;

-- ----------------------------------------------------------------------------
-- IMPORTAÇÃO DE BACKUP (substitui tudo)
-- ----------------------------------------------------------------------------
create or replace function public.ipf_import_all(p jsonb, me public.ipf_users) returns void
language plpgsql set search_path = public as $$
declare n_u int; n_m int; n_e int;
begin
  if jsonb_typeof(p -> 'users') <> 'array' or jsonb_typeof(p -> 'ministries') <> 'array' or jsonb_typeof(p -> 'events') <> 'array' then
    perform ipf_fail('Backup inválido.');
  end if;

  create temp table ipf_tmp_users on commit drop as
  select ipf_valid_id(u ->> 'id', 'u') as id, ipf_str(u, 'name', 80) as name, ipf_str(u, 'username', 40) as username,
         case when u ->> 'role' = 'admin' then 'admin' else 'user' end as role,
         not (coalesce(u ->> 'active', '') in ('false', 'FALSE')) as active,
         case when coalesce(u ->> 'passwordHash', '') like 'sha256:%' then u ->> 'passwordHash'
              when coalesce(u ->> 'password', '') <> '' then ipf_hash(u ->> 'password')
              else coalesce(old.password_hash, '') end as password_hash,
         coalesce(old.created_at, now()) as created_at,
         left(coalesce(nullif(ipf_str(u, 'email'), ''), old.email, ''), 120) as email,
         left(coalesce(nullif(ipf_str(u, 'phone'), ''), old.phone, ''), 30) as phone
    from jsonb_array_elements(p -> 'users') u
    left join ipf_users old on old.id = u ->> 'id'
   where ipf_str(u, 'name') <> '' and ipf_str(u, 'username') <> '';

  if not exists (select 1 from ipf_tmp_users where role = 'admin' and active and password_hash <> '') then
    perform ipf_fail('O backup não possui nenhum administrador ativo com senha.');
  end if;

  delete from ipf_users;
  insert into ipf_users (id, name, username, role, active, password_hash, created_at, email, phone)
  select distinct on (lower(username)) id, name, username, role, active, password_hash, created_at, email, phone
    from ipf_tmp_users order by lower(username)
  on conflict (id) do nothing;
  get diagnostics n_u = row_count;

  delete from ipf_ministries;
  insert into ipf_ministries (id, name, leader, color, description)
  select ipf_valid_id(m ->> 'id', 'm'), ipf_str(m, 'name', 60), ipf_str(m, 'leader', 120),
         case when coalesce(m ->> 'color', '') ~* '^#[0-9a-f]{6}$' then m ->> 'color' else '#4f46e5' end,
         ipf_str(m, 'description', 2000)
    from jsonb_array_elements(p -> 'ministries') m
   where ipf_str(m, 'name') <> ''
  on conflict (id) do nothing;
  get diagnostics n_m = row_count;

  delete from ipf_events;
  insert into ipf_events (id, title, ministry_id, status, date, time, location, responsible, description,
                          updated_by, created_by, responsible_email, responsible_phone, reminder_sent_at)
  select ipf_valid_id(e ->> 'id', 'e'), ipf_str(e, 'title', 120), ipf_str(e, 'ministryId'),
         case when e ->> 'status' in ('Pendente', 'Em andamento', 'Concluída') then e ->> 'status' else 'Pendente' end,
         ipf_str(e, 'date'), ipf_str(e, 'time'), ipf_str(e, 'location', 120), ipf_str(e, 'responsible', 120),
         ipf_str(e, 'description', 2000), 'importação', ipf_str(e, 'createdBy'),
         ipf_str(e, 'responsibleEmail', 120), ipf_str(e, 'responsiblePhone', 30),
         case when ipf_str(e, 'reminderSentAt') ~ '^\d{4}-\d{2}-\d{2}T' then (e ->> 'reminderSentAt')::timestamptz end
    from jsonb_array_elements(p -> 'events') e
   where ipf_str(e, 'title') <> ''
  on conflict (id) do nothing;
  get diagnostics n_e = row_count;

  perform ipf_log_add(me, 'importou', 'backup', '', 'Backup', '',
    n_e || ' programações, ' || n_m || ' ministérios, ' || n_u || ' usuários');
end $$;

-- ----------------------------------------------------------------------------
-- PONTO DE ENTRADA DO SITE
-- POST /rest/v1/rpc/ipf_api  { "req": { "action", "token", "payload" } }
-- ----------------------------------------------------------------------------
create or replace function public.ipf_api(req jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_action text := coalesce(req ->> 'action', '');
  p jsonb := coalesce(req -> 'payload', '{}'::jsonb);
  me ipf_users;
  v_msg text; v_code text;
begin
  if jsonb_typeof(p) <> 'object' then p := '{}'::jsonb; end if;
  if v_action = 'ping' then return jsonb_build_object('ok', true); end if;
  if v_action = 'login' then return ipf_login(p); end if;

  begin
    me := ipf_auth(req ->> 'token');

    if v_action = 'logout' then
      delete from ipf_sessions where token = (req ->> 'token')::uuid;
      perform ipf_log_add(me, 'logout', 'sessão', '', '', '', '');
      return jsonb_build_object('ok', true);
    end if;
    if v_action = 'getAll' then
      return jsonb_build_object('ok', true, 'data', ipf_get_all(me), 'me', ipf_user_json(me, true));
    end if;
    if v_action = 'getLog' then
      perform ipf_require_admin(me);
      return jsonb_build_object('ok', true, 'log', ipf_get_log(1000), 'notify', ipf_notify_status());
    end if;

    perform pg_advisory_xact_lock(hashtext('ipf_api'));
    case v_action
      when 'upsertEvent' then perform ipf_upsert_event(p, me);
      when 'deleteEvent' then perform ipf_delete_event(ipf_str(p, 'id'), me);
      when 'upsertMinistry' then perform ipf_upsert_ministry(p, me);
      when 'deleteMinistry' then perform ipf_delete_ministry(ipf_str(p, 'id'), me);
      when 'upsertUser' then perform ipf_require_admin(me); perform ipf_upsert_user(p, me);
      when 'deleteUser' then perform ipf_require_admin(me); perform ipf_delete_user(ipf_str(p, 'id'), me);
      when 'setPassword' then
        if me.role <> 'admin' and me.id <> coalesce(p ->> 'id', '') then perform ipf_fail('Sem permissão.', 'FORBIDDEN'); end if;
        perform ipf_set_password(ipf_str(p, 'id'), p ->> 'password', me);
      when 'importAll' then perform ipf_require_admin(me); perform ipf_import_all(p, me);
      else perform ipf_fail('Ação desconhecida: ' || v_action);
    end case;

    select * into me from ipf_users where id = me.id;
    return jsonb_build_object('ok', true, 'data', ipf_get_all(me), 'me', ipf_user_json(me, true));
  exception when others then
    get stacked diagnostics v_msg = message_text, v_code = pg_exception_hint;
    if coalesce(v_code, '') not in ('AUTH', 'FORBIDDEN', 'ERROR') then
      raise log 'ipf_api % falhou: %', v_action, v_msg;
      if v_code is null or v_code = '' then v_code := 'ERROR'; end if;
    end if;
    return jsonb_build_object('ok', false, 'error', v_msg, 'code', v_code);
  end;
end $$;

-- ----------------------------------------------------------------------------
-- CARTEIRO (Apps Script): lembretes 48h antes e alertas por e-mail
-- ----------------------------------------------------------------------------
create or replace function public.ipf_carteiro(secret text, whatsapp text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if secret is null or secret <> (select value from ipf_settings where key = 'carteiro_secret') then
    return jsonb_build_object('ok', false, 'error', 'Senha do carteiro inválida.');
  end if;
  insert into ipf_settings (key, value) values ('carteiro_last_run', now()::text), ('whatsapp_provider', coalesce(whatsapp, ''))
  on conflict (key) do update set value = excluded.value;

  return jsonb_build_object('ok', true,
    'reminders', coalesce((
      select jsonb_agg(ipf_event_json(e) || jsonb_build_object('ministryName', ipf_ministry_name(e.ministry_id),
                                                               'dateBr', ipf_date_br(e.date)))
        from ipf_events e
       where e.reminder_sent_at is null and e.status <> 'Concluída'
         and e.date ~ '^\d{4}-\d{2}-\d{2}$' and e.time ~ '^\d{2}:\d{2}$'
         and (e.date || ' ' || e.time)::timestamp at time zone 'America/Sao_Paulo' > now()
         and (e.date || ' ' || e.time)::timestamp at time zone 'America/Sao_Paulo' <= now() + interval '48 hours'
    ), '[]'::jsonb),
    'alerts', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'to', array_to_string(o.to_emails, ','), 'subject', o.subject, 'body', o.body) order by o.id)
        from ipf_outbox o where o.sent_at is null and o.created_at > now() - interval '3 days'
    ), '[]'::jsonb));
end $$;

-- result: { reminders: [{ id, details }], alerts: [{ id, error }] }
create or replace function public.ipf_carteiro_feito(secret text, result jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb; e ipf_events; sys ipf_users;
begin
  if secret is null or secret <> (select value from ipf_settings where key = 'carteiro_secret') then
    return jsonb_build_object('ok', false, 'error', 'Senha do carteiro inválida.');
  end if;
  sys.id := ''; sys.username := 'sistema'; sys.name := 'Sistema';
  for r in select * from jsonb_array_elements(coalesce(result -> 'reminders', '[]'::jsonb)) loop
    update ipf_events set reminder_sent_at = now() where id = r ->> 'id' and reminder_sent_at is null returning * into e;
    if found then
      perform ipf_log_add(sys, 'lembrete', 'programação', e.id, e.title, e.responsible, coalesce(r ->> 'details', ''));
    end if;
  end loop;
  for r in select * from jsonb_array_elements(coalesce(result -> 'alerts', '[]'::jsonb)) loop
    update ipf_outbox set sent_at = now(), error = nullif(r ->> 'error', '') where id = (r ->> 'id')::bigint;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- ----------------------------------------------------------------------------
-- PERMISSÕES: o público só chama as três funções de entrada
-- ----------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'ipf\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
grant execute on function public.ipf_api(jsonb) to anon, authenticated;
grant execute on function public.ipf_carteiro(text, text) to anon, authenticated;
grant execute on function public.ipf_carteiro_feito(text, jsonb) to anon, authenticated;
