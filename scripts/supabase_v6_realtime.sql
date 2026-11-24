-- ===========================================================================
-- v6: мгновенные обновления (Supabase Realtime) + метрики входов (P3).
-- Выполнить один раз в SQL Editor. Скрипт идемпотентный.
-- ===========================================================================

-- 1. Realtime для таблицы событий учёта времени: браузер получает INSERT/UPDATE
--    сразу после записи, поэтому «Стартовая» и дашборд обновляются мгновенно,
--    а не по опросу раз в 15/60 секунд. Политика чтения у anon уже есть
--    (time read), поэтому подписка с публичным ключом работает без изменений.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'otp_time_events'
  ) then
    execute 'alter publication supabase_realtime add table public.otp_time_events';
  end if;
end $$;

-- 2. Метрики: список неудачных попыток входа (таблицу пишет otp_login,
--    см. scripts/supabase_v4_security.sql). Доступ — только админ-сессии.
create or replace function public.otp_login_fails_list(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', slug, 'fails', fails, 'first_at', first_at, 'last_at', last_at
    ) order by last_at desc)
    from public.otp_login_fails
  ), '[]'::jsonb));
end $$;

grant execute on function public.otp_login_fails_list(uuid) to anon;

notify pgrst, 'reload schema';

-- Проверка (по желанию):
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
--   select public.otp_login_fails_list('<токен админа>'::uuid);

-- Откат:
--   do $$ begin
--     if exists (select 1 from pg_publication_tables
--                where pubname='supabase_realtime' and schemaname='public'
--                  and tablename='otp_time_events') then
--       execute 'alter publication supabase_realtime drop table public.otp_time_events';
--     end if;
--   end $$;
--   drop function if exists public.otp_login_fails_list(uuid);
