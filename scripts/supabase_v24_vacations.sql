-- ===========================================================================
-- v24: отпуска на месяц и особые отметки дней.
-- otp_vacations   — периоды отпусков (заполняет агент из страницы отпусков);
-- otp_month_flags — отметки дней: праздник без смен / укороченный день.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_vacations (
  id       text primary key,          -- month:slug:from
  month    text not null,             -- YYYY-MM
  emp_slug text not null,
  from_day int not null,
  to_day   int not null,
  raw      text,
  updated_at timestamptz default now()
);
create index if not exists otp_vacations_month_idx on public.otp_vacations (month);

create table if not exists public.otp_month_flags (
  month text not null,
  day   int not null,
  kind  text not null,                 -- short | holiday
  note  text,
  primary key (month, day)
);

alter table public.otp_vacations enable row level security;
alter table public.otp_month_flags enable row level security;

-- агент пишет отпуска (полная замена набора за месяц)
create or replace function public.otp_vacations_set(p_month text, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  r jsonb;
begin
  delete from public.otp_vacations where month = p_month;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    insert into public.otp_vacations (id, month, emp_slug, from_day, to_day, raw, updated_at)
    values (p_month || ':' || (r->>'emp_slug') || ':' || (r->>'from_day'),
            p_month, r->>'emp_slug', (r->>'from_day')::int, (r->>'to_day')::int, r->>'raw', now())
    on conflict (id) do update
      set to_day = excluded.to_day, raw = excluded.raw, updated_at = now();
    v_count := v_count + 1;
  end loop;
  return jsonb_build_object('ok', true, 'count', v_count);
end $$;
grant execute on function public.otp_vacations_set(text, jsonb) to anon;

create or replace function public.otp_vacations_get(p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object('emp_slug', emp_slug, 'from_day', from_day,
                                        'to_day', to_day, 'raw', raw) order by emp_slug)
      from public.otp_vacations where month = p_month), '[]'::jsonb));
end $$;
grant execute on function public.otp_vacations_get(text) to anon;

-- отметки дней: читать всем, писать — по админ-токену
create or replace function public.otp_month_flags_get(p_month text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'note', note) order by day)
      from public.otp_month_flags where month = p_month), '[]'::jsonb));
end $$;
grant execute on function public.otp_month_flags_get(text) to anon;

create or replace function public.otp_month_flags_set(p_token uuid, p_month text, p_day int, p_kind text)
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
  if p_kind is null or p_kind = '' then
    delete from public.otp_month_flags where month = p_month and day = p_day;
  else
    insert into public.otp_month_flags (month, day, kind)
    values (p_month, p_day, p_kind)
    on conflict (month, day) do update set kind = excluded.kind;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_month_flags_set(uuid, text, int, text) to anon;

-- Проверка:
--   select * from public.otp_vacations order by month, emp_slug;
--   select * from public.otp_month_flags order by month, day;
