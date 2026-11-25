-- ===========================================================================
-- v25: подтверждение («ознакомлен») опубликованного графика.
-- otp_schedule_acks — кто и когда подтвердил месяц.
-- Функции: подтвердить (сотрудник по своей сессии), статус своего подтверждения,
-- сводка для руководителя (кто подтвердил, кто нет).
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_schedule_acks (
  month    text not null,
  emp_slug text not null,
  at       timestamptz default now(),
  primary key (month, emp_slug)
);

alter table public.otp_schedule_acks enable row level security;

-- подтвердить текущий опубликованный месяц
create or replace function public.otp_schedule_ack(p_token uuid, p_month text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_month text;
begin
  select slug into v_slug from public.otp_sessions
   where token = p_token and expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  v_month := p_month;
  if v_month is null then
    select month into v_month from public.otp_schedule
     where status = 'published' order by month desc limit 1;
  end if;
  if v_month is null then
    return jsonb_build_object('ok', false, 'error', 'no_published');
  end if;
  if not exists (select 1 from public.otp_schedule
                  where month = v_month and status = 'published') then
    return jsonb_build_object('ok', false, 'error', 'not_published');
  end if;

  insert into public.otp_schedule_acks (month, emp_slug, at)
  values (v_month, v_slug, now())
  on conflict (month, emp_slug) do update set at = now();

  return jsonb_build_object('ok', true, 'month', v_month);
end $$;
grant execute on function public.otp_schedule_ack(uuid, text) to anon;

-- мой статус: опубликованный месяц и подтверждён ли он мной
create or replace function public.otp_schedule_my_state(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_month text;
  v_at timestamptz;
begin
  select slug into v_slug from public.otp_sessions
   where token = p_token and expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select month into v_month from public.otp_schedule
   where status = 'published' order by month desc limit 1;
  if v_month is null then
    return jsonb_build_object('ok', true, 'month', null);
  end if;

  select at into v_at from public.otp_schedule_acks
   where month = v_month and emp_slug = v_slug;

  return jsonb_build_object('ok', true, 'month', v_month, 'acked_at', v_at);
end $$;
grant execute on function public.otp_schedule_my_state(uuid) to anon;

-- сводка для руководителя: подтвердили и не подтвердили
create or replace function public.otp_schedule_acks_get(p_token uuid, p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_yes jsonb;
  v_no  jsonb;
begin
  select st.is_admin into v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('emp_slug', a.emp_slug,
           'fio', coalesce(st.fio, a.emp_slug), 'at', a.at) order by a.at desc), '[]'::jsonb)
    into v_yes
    from public.otp_schedule_acks a
    left join public.otp_staff st on st.slug = a.emp_slug
   where a.month = p_month;

  select coalesce(jsonb_agg(coalesce(st.fio, st.slug) order by coalesce(st.fio, st.slug)), '[]'::jsonb)
    into v_no
    from public.otp_staff st
   where st.active and st.slug <> 'admin'
     and not exists (select 1 from public.otp_schedule_acks a
                      where a.month = p_month and a.emp_slug = st.slug);

  return jsonb_build_object('ok', true, 'acked', v_yes, 'missing', v_no);
end $$;
grant execute on function public.otp_schedule_acks_get(uuid, text) to anon;

-- Проверка:
--   select * from public.otp_schedule_acks;
