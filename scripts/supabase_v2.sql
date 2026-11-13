-- Догоняющие изменения: показ пароля администратору и снимок дня для внешних систем.
-- Выполнить в SQL Editor.

-- 1. Пароль в открытом виде — только для администратора в админке.
alter table public.otp_staff add column if not exists pass_plain text;

create or replace function public.otp_staff_list()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'slug', slug, 'fio', fio, 'login', login, 'is_admin', is_admin,
    'avatar', avatar, 'active', active, 'has_pass', pass_hash is not null,
    'pass', pass_plain
  ) order by is_admin desc, fio), '[]'::jsonb)
  from public.otp_staff;
$$;
grant execute on function public.otp_staff_list() to anon;

create or replace function public.otp_staff_save(
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
    update public.otp_staff
       set pass_hash = crypt(p_pass, gen_salt('bf')), pass_plain = p_pass
     where slug = p_slug;
  end if;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_staff_save(uuid, text, text, text, text, text, boolean) to anon;

-- 2. Снимок дня: статус, с каких пор, и история событий с временем.
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
begin
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

notify pgrst, 'reload schema';
