-- ============================================================================
-- v4. Закрыть дыры безопасности (2026-11-20). Выполнить в Supabase → SQL Editor.
-- Скрипт идемпотентен: повторное выполнение безопасно.
--
-- Что закрывается:
--   1. otp_staff читался аноном (в т.ч. pass_hash и pass_plain — пароль открытым текстом)
--   2. otp_staff_list() (v2) отдавал pass_plain анону
--   3. СТАРЫЙ overload otp_staff_save (6 аргументов) — security definer БЕЗ проверки
--      сессии: сброс пароля любому сотруднику без входа
--   4. otp_time_events: anon мог insert и update (подмена чужих событий/времени в обход
--      Edge Function api)
--   5. otp_day_snapshot был открыт анону
--   6. otp_login: брутфорс (добавлена блокировка после 5 неудачных попыток)
--
-- ВАЖНО (что закрывается ВПРЕДИ, а не самим скриптом):
--   * Cloudflare/балансировщик не нужны.
--   * После выполнения: запись time_events — ТОЛЬКО через Edge Function `api`
--     (service-role), заявки — только через `api`/`n8n-api`, аватары — через
--     `otp_staff_admin_list`. Прямые REST-запросы с anon-ключом начнут получать 401/403.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. otp_staff: закрыть аноный SELECT.
--    (Админка читает сотрудников через RPC otp_staff_admin_list с проверкой
--     админ-токена — см. блок 3.)
-- ---------------------------------------------------------------------------
drop policy if exists "staff read" on public.otp_staff;

-- Пароль открытым текстом — не нужен: админка видит пароль только в момент
-- сохранения (из формы), а новый владелец пароля — это сам сотрудник.
alter table public.otp_staff drop column if exists pass_plain;

-- ---------------------------------------------------------------------------
-- 2. otp_staff_list(): убрать поле pass, закрыть анону, выдать только service_role
--    (Edge Function api/cron работают с service-role ключом).
-- ---------------------------------------------------------------------------
create or replace function public.otp_staff_list()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug, 'fio', fio, 'login', login, 'is_admin', is_admin,
    'avatar', avatar, 'active', active, 'has_pass', pass_hash is not null
  ) order by is_admin desc, fio), '[]'::jsonb)
  from public.otp_staff;
$$;
revoke execute on function public.otp_staff_list() from anon;
revoke execute on function public.otp_staff_list() from public;
grant  execute on function public.otp_staff_list() to service_role;

-- ---------------------------------------------------------------------------
-- 3. otp_staff_admin_list(): список сотрудников для админки (аватары и т.п.).
--    Вызывается с админ-токеном сессии (как otp_staff_save в v3).
-- ---------------------------------------------------------------------------
create or replace function public.otp_staff_admin_list(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_json jsonb;
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden', 'list', '[]'::jsonb);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug, 'fio', fio, 'login', login, 'is_admin', is_admin,
    'avatar', avatar, 'active', active, 'has_pass', pass_hash is not null
  ) order by is_admin desc, fio), '[]'::jsonb)
  into v_json
  from public.otp_staff;
  return jsonb_build_object('ok', true, 'list', v_json);
end $$;
grant execute on function public.otp_staff_admin_list(uuid) to anon;

-- ---------------------------------------------------------------------------
-- 4. Убрать СТАРЫЙ overload otp_staff_save БЕЗ проверки сессии (6 аргументов).
--    Оставляем 7-аргументный (p_token uuid, ...) — он проверяет админ-токен.
-- ---------------------------------------------------------------------------
drop function if exists public.otp_staff_save(text, text, text, text, text, boolean);

-- ---------------------------------------------------------------------------
-- 5. otp_time_events: запись только через Edge Function `api` (service-role).
--    Чтение остаётся аноным — нужны cron, n8n-api и «Сейчас на смене».
-- ---------------------------------------------------------------------------
drop policy if exists "time insert" on public.otp_time_events;
drop policy if exists "time update" on public.otp_time_events;
-- read оставляем как есть.

-- ---------------------------------------------------------------------------
-- 6. otp_time_notices: анону — только чтение (писала только service-role cron).
-- ---------------------------------------------------------------------------
drop policy if exists "notices insert" on public.otp_time_notices;

-- ---------------------------------------------------------------------------
-- 7. otp_day_snapshot(): только с валидным токеном сессии.
-- ---------------------------------------------------------------------------
create or replace function public.otp_day_snapshot(p_slug text, p_day text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last  record;
  v_events jsonb;
  v_status text;
  v_token uuid;
begin
  select s.token into v_token
    from public.otp_sessions s
    where s.expires > now()
      and (s.slug = p_slug or exists (
        select 1 from public.otp_staff st
        where st.slug = s.slug and st.is_admin));
  if v_token is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select e.type, e.slot, e.reason, e.at
    into v_last
    from public.otp_time_events e
   where e."empSlug" = p_slug and e.day = p_day
   order by e.at desc, e.id desc
   limit 1;

  v_status := case
    when v_last is null then 'none'
    when v_last.type in ('shift_start', 'break_end', 'absence_end') then 'work'
    when v_last.type = 'shift_stop' then 'done'
    when v_last.type = 'break_start' then coalesce(v_last.slot, 'break')
    when v_last.type = 'absence_start' then 'absence'
    else 'unknown'
  end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'type', e.type, 'slot', e.slot, 'reason', e.reason, 'at', e.at
         ) order by e.at), '[]'::jsonb)
    into v_events
    from public.otp_time_events e
   where e."empSlug" = p_slug and e.day = p_day;

  return jsonb_build_object(
    'empSlug', p_slug,
    'day', p_day,
    'status', v_status,
    'since', v_last.at,
    'reason', v_last.reason,
    'events', v_events
  );
end $$;
grant execute on function public.otp_day_snapshot(text, text) to anon;

-- ---------------------------------------------------------------------------
-- 8. otp_login: антибрутфорс.
--    Таблица неудачных попыток; 5 провалов подряд за 15 минут → блокировка
--    на 15 минут. Успешный вход и истечение окна обнуляют счётчик.
-- ---------------------------------------------------------------------------
create table if not exists public.otp_login_fails (
  slug      text primary key,
  fails     int not null default 0,
  first_at  timestamptz not null default now(),
  last_at   timestamptz not null default now()
);
alter table public.otp_login_fails enable row level security;
-- политики не создаём: RLS on + ноль политик = доступ только owner'у (security definer
-- функция работает от имени postgres). Anon таблицу не видит и не сбрасывает счётчик.

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
  v_fails int := 0;
  v_last  timestamptz;
begin
  if p_slug is null or p_pass is null then
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  -- блокировка?
  select fails, last_at into v_fails, v_last
    from public.otp_login_fails
   where slug = p_slug
   for update;
  if v_fails >= 5 and v_last > now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;

  select pass_hash, is_admin into v_hash, v_admin
    from public.otp_staff where slug = p_slug and active;
  if v_hash is null then
    -- не раскрываем, есть ли такой slug: тот же ответ, что и на неверный пароль
    insert into public.otp_login_fails (slug, fails, first_at, last_at)
    values (p_slug, 1, now(), now())
    on conflict (slug) do update
      set fails  = case when otp_login_fails.last_at > now() - interval '15 minutes'
                         then otp_login_fails.fails + 1 else 1 end,
          first_at = case when otp_login_fails.last_at > now() - interval '15 minutes'
                          then otp_login_fails.first_at else now() end,
          last_at = now();
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;
  if v_hash <> crypt(p_pass, v_hash) then
    insert into public.otp_login_fails (slug, fails, first_at, last_at)
    values (p_slug, 1, now(), now())
    on conflict (slug) do update
      set fails  = case when otp_login_fails.last_at > now() - interval '15 minutes'
                         then otp_login_fails.fails + 1 else 1 end,
          first_at = case when otp_login_fails.last_at > now() - interval '15 minutes'
                          then otp_login_fails.first_at else now() end,
          last_at = now();
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  delete from public.otp_login_fails where slug = p_slug;
  insert into public.otp_sessions (slug) values (p_slug) returning token into v_token;
  return jsonb_build_object('ok', true, 'token', v_token, 'slug', p_slug,
                            'admin', coalesce(v_admin, false));
end $$;
grant execute on function public.otp_login(text, text) to anon;

-- ---------------------------------------------------------------------------
-- 9. otp_requests: закрыто ВПРЕДИ (см. блок 2 ниже).
--    Чтение аноном остаётся (нужно n8n и «увольнительные» на profile),
--    запись — только через service-role (Edge Function api).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 10. otp_staff_save / otp_self_update: минимум пароля 6 символов
--     (сейчас 4). Переопределяем обе функции.
-- ---------------------------------------------------------------------------
create or replace function public.otp_staff_save(
  p_token uuid, p_slug text, p_fio text, p_login text, p_pass text, p_avatar text, p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.otp_staff (slug, fio, login, avatar, active)
  values (p_slug, p_fio, p_login, p_avatar, coalesce(p_active, true))
  on conflict (slug) do update
    set fio    = excluded.fio,
        login  = excluded.login,
        avatar = coalesce(excluded.avatar, otp_staff.avatar),
        active = coalesce(excluded.active, otp_staff.active);

  if p_pass is not null and length(p_pass) >= 6 then
    update public.otp_staff
       set pass_hash = crypt(p_pass, gen_salt('bf'))
     where slug = p_slug;
  end if;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_staff_save(uuid, text, text, text, text, text, boolean) to anon;

create or replace function public.otp_self_update(
  p_token uuid, p_pass text, p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_slug text;
begin
  select slug into v_slug
    from public.otp_sessions
   where token = p_token and expires > now();

  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  if p_avatar is not null and length(p_avatar) > 0 then
    update public.otp_staff set avatar = p_avatar where slug = v_slug;
  end if;

  if p_pass is not null and length(p_pass) >= 6 then
    update public.otp_staff
       set pass_hash = crypt(p_pass, gen_salt('bf'))
     where slug = v_slug;
  end if;

  return jsonb_build_object('ok', true, 'slug', v_slug);
end $$;
grant execute on function public.otp_self_update(uuid, text, text) to anon;

-- ---------------------------------------------------------------------------
-- 11. otp_current_status / otp_content_* : проверка (не меняем, уже в норме).
--     otp_current_status — security invoker, читает time_events (read открыт) — ок.
--     otp_content_list — read content открыт — ок (контент не чувствителен).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 12. otp_self_info(): сотрудник по своему токену узнаёт свой slug + аватар.
--     (Появился, потому что otp_staff закрыт от anon — см. auth.js staffList.)
-- ---------------------------------------------------------------------------
create or replace function public.otp_self_info(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', s.token is not null,
    'slug', s.slug,
    'fio', st.fio,
    'avatar', st.avatar
  )
  from (
    select token, slug from public.otp_sessions
     where p_token is not null and token = p_token and expires > now()
  ) s
  left join public.otp_staff st on st.slug = s.slug;
$$;
grant execute on function public.otp_self_info(uuid) to anon;

notify pgrst, 'reload schema';

-- ============================================================================
-- 13. ЗАКРЫТО ВПРЕДИ, не в этом скрипте (делается в интерфейсе/коде):
--
--     a) Edge Function `api` (supabase/functions/api/index.ts):
--        - POST otp_time_events: empSlug каждой строки === сессия (админ — исключение);
--        - PATCH otp_requests: админ — любую; сотрудник — только свою
--          (обязательный фильтр empSlug=eq.<свой slug> в запросе);
--        - GET otp_requests: только админ (закрыто для обычного сотрудника);
--        - staffList в auth.js: admin-токен + новый формат {ok, list}.
--     b) Edge Function `notify`: секрет в заголовке x-otp-key (секрет N8N_API_TOKEN
--        или отдельный NOTIFY_KEY в secrets; JS шлёт key из hrRules.cloud).
--     c) Cloudflare (опционально, позже): rate-limit на /functions/v1/notify
--        и /rest/v1/rpc/otp_login.
-- ============================================================================
