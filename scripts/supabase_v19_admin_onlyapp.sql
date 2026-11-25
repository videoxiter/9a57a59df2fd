-- ===========================================================================
-- v19: админка — переключатель «старт только из приложения» и список устройств.
-- 1) otp_staff_admin_list теперь отдаёт флаг only_app и page_hash.
-- 2) otp_devices_list — список привязанных устройств (только админ-сессия).
-- Функция переключения otp_staff_set_only_app создана в v17.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

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
    'avatar', avatar, 'active', active, 'has_pass', pass_hash is not null,
    'only_app', coalesce(only_app, false), 'page_hash', page_hash
  ) order by is_admin desc, fio), '[]'::jsonb)
  into v_json
  from public.otp_staff;
  return jsonb_build_object('ok', true, 'list', v_json);
end $$;
grant execute on function public.otp_staff_admin_list(uuid) to anon;

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
    'slug', d.slug, 'fio', coalesce(st.fio, d.slug), 'label', d.label,
    'created', d.created, 'last_seen', d.last_seen
  ) order by d.last_seen desc nulls last), '[]'::jsonb)
  into v_json
  from public.otp_devices d
  left join public.otp_staff st on st.slug = d.slug;
  return jsonb_build_object('ok', true, 'list', v_json);
end $$;
grant execute on function public.otp_devices_list(uuid) to anon;

-- Проверка:
--   select public.otp_devices_list('<токен админа>');
