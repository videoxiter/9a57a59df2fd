-- ===========================================================================
-- v23: публичное чтение опубликованного графика.
-- Нужно локальному агенту: он забирает график месяца и записывает его в data.js
-- (страницы сотрудников), не имея админ-токена.
-- Отдаются только опубликованные месяцы; черновики не видны.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_schedule_public(p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select month, cell, status, version, updated_at into v_row
    from public.otp_schedule where month = p_month;
  if v_row.month is null or v_row.status <> 'published' then
    return jsonb_build_object('ok', true, 'schedule', null);
  end if;
  return jsonb_build_object('ok', true, 'schedule', jsonb_build_object(
    'month', v_row.month, 'cell', v_row.cell, 'version', v_row.version,
    'updated_at', v_row.updated_at));
end $$;
grant execute on function public.otp_schedule_public(text) to anon;

-- Проверка:
--   select public.otp_schedule_public('2026-12');
