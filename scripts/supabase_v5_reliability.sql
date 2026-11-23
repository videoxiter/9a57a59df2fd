-- ============================================================================
-- v5. Надёжность данных (пункт 2 из 5, 2026-11-20). Выполнить в Supabase → SQL Editor.
-- Скрипт идемпотентен: повторное выполнение безопасно.
--
-- Что делает:
--   * Таблица otp_schedule_cache — копия schedule.json в базе.
--     Дашборд (админ) пишет её функцией otp_schedule_set (см. main.js);
--     cron теперь ЧИТАЕТ график сначала отсюда, а только при пустой таблице
--     обращается к GitHub Pages. Итог: откат сайта к старой версии больше
--     не закручивает уведомления по старому графику.
--   * Других изменений БД в пункте 2 нет: остальное — клиентский код
--     (JS/CSS) и две Edge Functions (api, cron).
-- ============================================================================

create table if not exists public.otp_schedule_cache (
  id         text primary key,               -- значение "generated" (метка версии сайта)
  doc        jsonb not null,                 -- весь документ {generated, team, schedule}
  fetched_at timestamptz not null default now()
);
alter table public.otp_schedule_cache enable row level security;
-- Политики не создаём: пишет только security definer функция (postgres),
-- читает только service-role (cron). Anon видит пустоту.

create or replace function public.otp_schedule_set(p_token uuid, p_doc jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_doc is null or not p_doc ? 'schedule' then
    return jsonb_build_object('ok', false, 'error', 'bad doc');
  end if;
  insert into public.otp_schedule_cache (id, doc)
  values (
    coalesce(nullif(p_doc->>'generated', ''), 'v-' || to_char(now(), 'YYYYMMDDHH24MISS')),
    p_doc
  )
  on conflict (id) do update set doc = excluded.doc, fetched_at = now();
  return jsonb_build_object('ok', true,
    'id', coalesce(nullif(p_doc->>'generated', ''), ''));
end $$;
grant execute on function public.otp_schedule_set(uuid, jsonb) to anon;

-- ---------------------------------------------------------------------------
-- 2. otp_event_fix() — страховочная правка события для руководителя (P1.2).
--    Вызывается из «Отчёта по рабочему времени» (кнопка ✎ у строки дня):
--    поменять время события (at) или удалить лишнее (например, телефон
--    «нажал сам» в кармане). Доступ: только админ-сессия.
-- ---------------------------------------------------------------------------
create or replace function public.otp_event_fix(p_token uuid, p_id text, p_at timestamptz, p_del boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if coalesce(p_del, false) then
    delete from public.otp_time_events where id = p_id;
    return jsonb_build_object('ok', true, 'deleted', p_id);
  end if;

  if p_at is null then
    return jsonb_build_object('ok', false, 'error', 'nothing to update');
  end if;
  update public.otp_time_events set at = p_at where id = p_id;
  select * into v_row from public.otp_time_events where id = p_id;
  if v_row is null then
    return jsonb_build_object('ok', false, 'error', 'event not found');
  end if;
  return jsonb_build_object('ok', true, 'id', p_id, 'at', v_row.at, 'day', v_row.day);
end $$;
grant execute on function public.otp_event_fix(uuid, text, timestamptz, boolean) to anon;

notify pgrst, 'reload schema';

-- Проверка (по желанию, в том же SQL Editor):
--   select id, fetched_at from otp_schedule_cache;
--   → пусто, пока админ не открыл дашборд; после — одна строка.
