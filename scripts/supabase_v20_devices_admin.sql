-- ===========================================================================
-- v20: управление устройствами и правилом «только из приложения» из админки.
-- 1) otp_device_revoke — отвязать устройство сотрудника.
-- 2) otp_staff_set_only_app_all — включить/выключить правило для всех сразу.
-- Обе функции доступны только по админ-сессии.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

-- Список устройств теперь отдаёт и сам токен устройства (только админ-сессия),
-- иначе из админки нельзя отвязать конкретное устройство.
create or replace function public.otp_devices_list(p_token uuid)
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
    'slug', d.slug, 'device', d.device, 'fio', coalesce(st.fio, d.slug),
    'label', d.label, 'created', d.created, 'last_seen', d.last_seen
  ) order by d.last_seen desc nulls last), '[]'::jsonb)
  into v_json
  from public.otp_devices d
  left join public.otp_staff st on st.slug = d.slug;
  return jsonb_build_object('ok', true, 'list', v_json);
end $$;
grant execute on function public.otp_devices_list(uuid) to anon;

create or replace function public.otp_device_revoke(p_token uuid, p_slug text, p_device text)
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
  delete from public.otp_devices where slug = p_slug and device = p_device;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_device_revoke(uuid, text, text) to anon;

create or replace function public.otp_staff_set_only_app_all(p_token uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  update public.otp_staff
     set only_app = coalesce(p_on, false)
   where slug <> 'admin' and active;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'updated', v_n);
end $$;
grant execute on function public.otp_staff_set_only_app_all(uuid, boolean) to anon;

-- Проверка:
--   select slug, only_app from public.otp_staff order by slug;
