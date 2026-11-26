-- ===========================================================================
-- v28: данные страниц больше не лежат в HTML.
-- Payload персональных страниц и общий dataset дашборда хранятся в базе и
-- отдаются только по действующей сессии (сотрудник — свои данные, дашборд —
-- только администратору). Поэтому curl по адресу страницы покажет только форму входа.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_profiles (
  slug       text primary key,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.otp_profiles enable row level security;
-- политик нет: анонимный ключ не читает и не пишет таблицу напрямую

-- запись: только с секретом агента (генератор страниц на машине руководителя)
create or replace function public.otp_profile_set(p_secret text, p_slug text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select value into v_secret from public.otp_settings where key = 'agent_secret';
  if v_secret is null or p_secret is null or p_secret <> v_secret then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  insert into public.otp_profiles (slug, payload, updated_at)
  values (p_slug, p_payload, now())
  on conflict (slug) do update set payload = excluded.payload, updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_profile_set(text, text, jsonb) to anon;

-- чтение: сотруднику — свой payload, администратору — любой и общий dataset '__data'
create or replace function public.otp_profile_get(p_token uuid, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_admin boolean;
  v_payload jsonb;
begin
  select s.slug, coalesce(st.is_admin, false)
    into v_slug, v_admin
    from public.otp_sessions s
    left join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();

  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  if p_slug = '__data' then
    if not v_admin then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
  elsif not v_admin and p_slug <> v_slug then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select payload into v_payload from public.otp_profiles where slug = p_slug;
  if v_payload is null then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  return jsonb_build_object('ok', true, 'payload', v_payload);
end $$;
grant execute on function public.otp_profile_get(uuid, text) to anon;

-- Проверка:
--   select slug, length(payload::text) from public.otp_profiles order by slug;
