-- Исправление сохранения сотрудника + возможность сотруднику менять свой пароль и аватар.
-- Выполнить в SQL Editor.

-- 1. Сохранение сотрудника администратором (дело было в схеме pgcrypto)
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

  if p_pass is not null and length(p_pass) >= 4 then
    update public.otp_staff
       set pass_hash = crypt(p_pass, gen_salt('bf')), pass_plain = p_pass
     where slug = p_slug;
  end if;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_staff_save(uuid, text, text, text, text, text, boolean) to anon;

-- 2. Сотрудник меняет свой пароль и/или аватар (по своему токену сессии)
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

  if p_pass is not null and length(p_pass) >= 4 then
    update public.otp_staff
       set pass_hash = crypt(p_pass, gen_salt('bf')), pass_plain = p_pass
     where slug = v_slug;
  end if;

  return jsonb_build_object('ok', true, 'slug', v_slug);
end $$;
grant execute on function public.otp_self_update(uuid, text, text) to anon;

notify pgrst, 'reload schema';
