-- ===========================================================================
-- v17: «Старт смены только из приложения» + привязка устройства.
-- Идея: у сотрудника есть флаг only_app. Если он включён, прокси api принимает
-- shift_start только с зарегистрированного устройства (приложение-трей), а
-- нажатие «Начало смены» в браузере отклоняет с понятной ошибкой.
-- Устройство получает свой токен через otp_device_claim (по сессии сотрудника)
-- и присылает его в каждом событии старта.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

alter table public.otp_staff add column if not exists only_app boolean default false;

create table if not exists public.otp_devices (
  slug      text not null,
  device    text not null,              -- токен устройства (uuid)
  label     text,                       -- «Windows», «macOS», имя ПК
  created   timestamptz default now(),
  last_seen timestamptz,
  primary key (slug, device)
);

-- RLS включён и политик для anon нет: доступ только через функции и сервис-роль.
alter table public.otp_devices enable row level security;

-- Приложение заявляет устройство по своей сессии и получает токен устройства.
create or replace function public.otp_device_claim(p_token uuid, p_label text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_slug text;
  v_dev  text;
begin
  select slug into v_slug
    from public.otp_sessions
   where token = p_token and expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_dev := gen_random_uuid()::text;
  insert into public.otp_devices (slug, device, label, last_seen)
  values (v_slug, v_dev, nullif(p_label, ''), now());

  return jsonb_build_object('ok', true, 'device', v_dev, 'slug', v_slug);
end $$;

grant execute on function public.otp_device_claim(uuid, text) to anon;

-- Флаг «только из приложения» переключает руководитель (админ-сессия).
create or replace function public.otp_staff_set_only_app(p_token uuid, p_slug text, p_only_app boolean)
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
  update public.otp_staff set only_app = coalesce(p_only_app, false) where slug = p_slug;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.otp_staff_set_only_app(uuid, text, boolean) to anon;

-- Проверка:
--   select slug, only_app from public.otp_staff order by slug;
--   select * from public.otp_devices;
