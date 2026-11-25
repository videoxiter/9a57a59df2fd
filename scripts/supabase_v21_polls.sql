-- ===========================================================================
-- v21: опрос пожеланий по графику.
-- Таблицы: otp_polls (опрос на месяц), otp_poll_answers (ответы сотрудников).
-- Функции: создать опрос, получить свой опрос, сохранить ответ, сводка для
-- руководителя, сменить статус. Прямого REST-доступа нет — только функции.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_polls (
  id          text primary key,                 -- p-YYYY-MM
  month       text not null,                    -- YYYY-MM
  status      text not null default 'open',     -- open | closed | approved
  due_at      timestamptz,
  params      jsonb default '{}'::jsonb,        -- праздники, укороченные дни, линии
  created_by  text,
  created     timestamptz default now(),
  approved_at timestamptz
);

create table if not exists public.otp_poll_answers (
  id         text primary key,                  -- poll_id:emp_slug
  poll_id    text not null references public.otp_polls(id) on delete cascade,
  emp_slug   text not null,
  answers    jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists otp_poll_answers_poll_idx on public.otp_poll_answers (poll_id);

alter table public.otp_polls enable row level security;
alter table public.otp_poll_answers enable row level security;

-- --- создать/открыть опрос (руководитель)
create or replace function public.otp_poll_create(
  p_token uuid, p_month text, p_due timestamptz default null, p_params jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_id text := 'p-' || p_month;
begin
  select st.is_admin into v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_month !~ '^\d{4}-\d{2}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_month');
  end if;

  insert into public.otp_polls (id, month, status, due_at, params, created_by)
  values (v_id, p_month, 'open', p_due, coalesce(p_params, '{}'::jsonb), 'admin')
  on conflict (id) do update
    set status = case when otp_polls.status = 'approved' then otp_polls.status else 'open' end,
        due_at = coalesce(excluded.due_at, otp_polls.due_at),
        params = coalesce(excluded.params, otp_polls.params);
  return jsonb_build_object('ok', true, 'id', v_id, 'month', p_month);
end $$;
grant execute on function public.otp_poll_create(uuid, text, timestamptz, jsonb) to anon;

-- --- свой опрос и свой ответ (сотрудник по своей сессии)
create or replace function public.otp_poll_my(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_poll record;
  v_ans jsonb;
begin
  select slug into v_slug from public.otp_sessions
   where token = p_token and expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select id, month, status, due_at, params into v_poll
    from public.otp_polls
   where status = 'open' and month >= to_char((now() at time zone 'Europe/Moscow')::date, 'YYYY-MM')
   order by month asc limit 1;
  if v_poll.id is null then
    return jsonb_build_object('ok', true, 'poll', null);
  end if;

  select answers into v_ans from public.otp_poll_answers
   where poll_id = v_poll.id and emp_slug = v_slug;

  return jsonb_build_object('ok', true,
    'poll', jsonb_build_object('id', v_poll.id, 'month', v_poll.month,
                               'due_at', v_poll.due_at, 'params', v_poll.params),
    'answers', coalesce(v_ans, 'null'::jsonb));
end $$;
grant execute on function public.otp_poll_my(uuid) to anon;

-- --- сохранить ответ (сотрудник)
create or replace function public.otp_poll_save(p_token uuid, p_poll_id text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_status text;
begin
  select slug into v_slug from public.otp_sessions
   where token = p_token and expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;
  select status into v_status from public.otp_polls where id = p_poll_id;
  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'no_poll');
  end if;
  if v_status <> 'open' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;

  insert into public.otp_poll_answers (id, poll_id, emp_slug, answers, updated_at)
  values (p_poll_id || ':' || v_slug, p_poll_id, v_slug, coalesce(p_answers, '{}'::jsonb), now())
  on conflict (id) do update
    set answers = coalesce(excluded.answers, public.otp_poll_answers.answers),
        updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_poll_save(uuid, text, jsonb) to anon;

-- --- сводка для руководителя: кто ответил, кто нет
create or replace function public.otp_poll_summary(p_token uuid, p_poll_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_list jsonb;
  v_missing jsonb;
begin
  select st.is_admin into v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'emp_slug', a.emp_slug, 'fio', coalesce(st.fio, a.emp_slug),
           'answers', a.answers, 'updated_at', a.updated_at) order by st.fio), '[]'::jsonb)
    into v_list
    from public.otp_poll_answers a
    left join public.otp_staff st on st.slug = a.emp_slug
   where a.poll_id = p_poll_id;

  select coalesce(jsonb_agg(st.fio order by st.fio), '[]'::jsonb)
    into v_missing
    from public.otp_staff st
   where st.active and st.slug <> 'admin'
     and not exists (select 1 from public.otp_poll_answers a
                      where a.poll_id = p_poll_id and a.emp_slug = st.slug);

  return jsonb_build_object('ok', true, 'list', v_list, 'missing', v_missing);
end $$;
grant execute on function public.otp_poll_summary(uuid, text) to anon;

-- --- статус опроса (закрыть / утвердить)
create or replace function public.otp_poll_set_status(p_token uuid, p_poll_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  select st.is_admin into v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if not coalesce(v_admin, false) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_status not in ('open', 'closed', 'approved') then
    return jsonb_build_object('ok', false, 'error', 'bad_status');
  end if;
  update public.otp_polls
     set status = p_status,
         approved_at = case when p_status = 'approved' then now() else approved_at end
   where id = p_poll_id;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
grant execute on function public.otp_poll_set_status(uuid, text, text) to anon;

-- Проверка:
--   select * from public.otp_polls;
--   select * from public.otp_poll_answers;
