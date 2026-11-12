-- Учётные записи сотрудников и админка (выполнить один раз в SQL Editor).
-- Пароли хранятся как bcrypt-хеш (pgcrypto), проверка — только через RPC.

create extension if not exists pgcrypto;

create table if not exists public.otp_staff (
  slug      text primary key,          -- внутренний id сотрудника (bolgov, frolov...)
  fio       text not null,
  login     text,                      -- логин в Яндекс Мессенджере (login@ftech.io)
  pass_hash text,                      -- crypt(пароль)
  is_admin  boolean default false,
  avatar    text,                      -- URL аватара (Supabase Storage)
  active    boolean default true,
  created   timestamptz default now()
);

alter table public.otp_staff enable row level security;
drop policy if exists "staff read" on public.otp_staff;
create policy "staff read" on public.otp_staff for select to anon using (true);

create table if not exists public.otp_sessions (
  token   uuid primary key default gen_random_uuid(),
  slug    text not null,
  created timestamptz default now(),
  expires timestamptz default (now() + interval '60 days')
);
alter table public.otp_sessions enable row level security;

-- Вход по slug + пароль
create or replace function public.otp_login(p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash  text;
  v_admin boolean;
  v_token uuid;
begin
  select pass_hash, is_admin into v_hash, v_admin
  from public.otp_staff where slug = p_slug and active;
  if v_hash is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_hash <> crypt(p_pass, v_hash) then
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;
  insert into public.otp_sessions (slug) values (p_slug) returning token into v_token;
  return jsonb_build_object('ok', true, 'token', v_token, 'slug', p_slug, 'admin', coalesce(v_admin, false));
end $$;
grant execute on function public.otp_login(text, text) to anon;

-- Проверка сессии (при загрузке страницы)
create or replace function public.otp_check_session(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_admin boolean;
begin
  select s.slug, coalesce(st.is_admin, false) into v_slug, v_admin
  from public.otp_sessions s
  left join public.otp_staff st on st.slug = s.slug
  where s.token = p_token and s.expires > now();
  if v_slug is null then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'slug', v_slug, 'admin', coalesce(v_admin, false));
end $$;
grant execute on function public.otp_check_session(uuid) to anon;

-- Список сотрудников (для админки)
create or replace function public.otp_staff_list()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug, 'fio', fio, 'login', login, 'is_admin', is_admin,
    'avatar', avatar, 'active', active
  ) order by fio), '[]'::jsonb)
  from public.otp_staff;
$$;
grant execute on function public.otp_staff_list() to anon;

-- Сохранить сотрудника (админка)
create or replace function public.otp_staff_save(
  p_slug text, p_fio text, p_login text, p_pass text, p_avatar text, p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.otp_staff (slug, fio, login, avatar, active)
  values (p_slug, p_fio, p_login, p_avatar, coalesce(p_active, true))
  on conflict (slug) do update
    set fio = excluded.fio,
        login = excluded.login,
        avatar = coalesce(excluded.avatar, public.otp_staff.avatar),
        active = coalesce(excluded.active, public.otp_staff.active);
  if p_pass is not null and length(p_pass) >= 4 then
    update public.otp_staff set pass_hash = crypt(p_pass, gen_salt('bf')) where slug = p_slug;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_staff_save(text, text, text, text, text, boolean) to anon;
