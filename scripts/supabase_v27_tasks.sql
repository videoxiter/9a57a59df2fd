-- ===========================================================================
-- v27: очередь задач агента — видны последние задания и их статус.
-- Плюс ограничение типов задач (чтобы нельзя было писать произвольные).
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

-- ограничение типов задач (существующие строки не проверяем)
alter table public.otp_tasks
  drop constraint if exists otp_tasks_kind_chk;
alter table public.otp_tasks
  add constraint otp_tasks_kind_chk
  check (kind in ('add_employee', 'apply_kpi', 'publish_schedule',
                  'export_schedule_xlsx', 'publish_confluence_schedule', 'sync_vacations'))
  not valid;

-- последние задачи для админки
create or replace function public.otp_tasks_recent(p_token uuid, p_limit int default 10)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_list jsonb;
begin
  select st.is_admin into v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'kind', t.kind, 'requested_at', t.requested_at,
           'done_at', t.done_at, 'ok', t.ok, 'message', t.message,
           'by', t.requested_by) order by t.requested_at desc), '[]'::jsonb)
    into v_list
    from (select * from public.otp_tasks order by requested_at desc limit coalesce(p_limit, 10)) t;

  return jsonb_build_object('ok', true, 'list', v_list);
end $$;
grant execute on function public.otp_tasks_recent(uuid, int) to anon;

-- Проверка:
--   select * from public.otp_tasks order by requested_at desc limit 5;
