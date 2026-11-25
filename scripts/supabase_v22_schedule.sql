-- ===========================================================================
-- v22: график месяца — хранение и чтение.
-- otp_schedule: одна строка на месяц, ячейки в jsonb (сотрудник → день → символ).
-- Руководитель сохраняет черновик; сотрудникам отдаём только опубликованный.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_schedule (
  month      text primary key,                   -- YYYY-MM
  cell       jsonb not null default '{}'::jsonb, -- { "<slug>": { "1": "2", ... } }
  status     text not null default 'draft',      -- draft | published
  updated_at timestamptz default now(),
  updated_by text,
  version    int not null default 1
);

create table if not exists public.otp_schedule_log (
  id      bigserial primary key,
  month   text not null,
  at      timestamptz default now(),
  by_who  text,
  action  text,
  payload jsonb
);

alter table public.otp_schedule enable row level security;
alter table public.otp_schedule_log enable row level security;

-- сохранить график (руководитель)
create or replace function public.otp_schedule_save(
  p_token uuid, p_month text, p_cell jsonb, p_status text default 'draft', p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_ver int;
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

  insert into public.otp_schedule (month, cell, status, updated_at, updated_by, version)
  values (p_month, coalesce(p_cell, '{}'::jsonb), coalesce(p_status, 'draft'), now(), 'admin', 1)
  on conflict (month) do update
    set cell = coalesce(excluded.cell, public.otp_schedule.cell),
        status = coalesce(p_status, public.otp_schedule.status),
        updated_at = now(),
        updated_by = 'admin',
        version = public.otp_schedule.version + 1
  returning version into v_ver;

  insert into public.otp_schedule_log (month, by_who, action, payload)
  values (p_month, 'admin', coalesce(p_status, 'draft'),
          jsonb_build_object('note', p_note, 'version', v_ver));

  return jsonb_build_object('ok', true, 'version', v_ver);
end $$;
grant execute on function public.otp_schedule_save(uuid, text, jsonb, text, text) to anon;

-- прочитать график: руководителю — любой, сотруднику — только опубликованный
create or replace function public.otp_schedule_get(p_token uuid, p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
  v_slug  text;
  v_row   record;
begin
  select s.slug, st.is_admin into v_slug, v_admin
    from public.otp_sessions s join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();
  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select month, cell, status, updated_at, version into v_row
    from public.otp_schedule where month = p_month;
  if v_row.month is null then
    return jsonb_build_object('ok', true, 'schedule', null);
  end if;
  if not coalesce(v_admin, false) and v_row.status <> 'published' then
    return jsonb_build_object('ok', true, 'schedule', null);
  end if;

  return jsonb_build_object('ok', true, 'schedule', jsonb_build_object(
    'month', v_row.month, 'cell', v_row.cell, 'status', v_row.status,
    'updated_at', v_row.updated_at, 'version', v_row.version));
end $$;
grant execute on function public.otp_schedule_get(uuid, text) to anon;

-- Проверка:
--   select month, status, version, updated_at from public.otp_schedule;
