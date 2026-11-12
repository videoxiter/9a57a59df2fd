-- Учётные записи: список с флагом «пароль задан» и сохранение только администратором.
-- Выполнить в SQL Editor.

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
grant execute on function public.otp_staff_list() to anon;

drop function if exists public.otp_staff_save(text, text, text, text, text, boolean);
create function public.otp_staff_save(
  p_token uuid, p_slug text, p_fio text, p_login text, p_pass text, p_avatar text, p_active boolean
)
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

  insert into public.otp_staff (slug, fio, login, avatar, active)
  values (p_slug, p_fio, p_login, p_avatar, coalesce(p_active, true))
  on conflict (slug) do update
    set fio    = excluded.fio,
        login  = excluded.login,
        avatar = coalesce(excluded.avatar, otp_staff.avatar),
        active = coalesce(excluded.active, otp_staff.active);

  if p_pass is not null and length(p_pass) >= 4 then
    update public.otp_staff set pass_hash = crypt(p_pass, gen_salt('bf')) where slug = p_slug;
  end if;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_staff_save(uuid, text, text, text, text, text, boolean) to anon;

notify pgrst, 'reload schema';
