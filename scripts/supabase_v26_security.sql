-- ===========================================================================
-- v26: безопасность записи.
-- 1) otp_kpi: прямой анонимный доступ на запись закрыт; KPI сохраняются только
--    через RPC otp_kpi_set с админ-токеном.
-- 2) Отпуска (otp_vacations_set): запись только с секретом агента.
-- Секрет агента хранится в otp_settings; его же нужно прописать в
-- scripts/cloud.json (поле agentSecret) на машине, где работает агент.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_settings (
  key   text primary key,
  value text not null
);
alter table public.otp_settings enable row level security;

-- секрет агента (сгенерируется один раз)
insert into public.otp_settings (key, value)
select 'agent_secret', '9dfe59099a691d9bb47eb2e04bc0ba1c'
where not exists (select 1 from public.otp_settings where key = 'agent_secret');

-- 1. KPI: закрываем прямую запись и делаем RPC с админ-сессией
drop policy if exists "kpi insert" on public.otp_kpi;
drop policy if exists "kpi update" on public.otp_kpi;

create or replace function public.otp_kpi_set(
  p_token uuid, p_slug text, p_month text,
  p_quality int, p_learnability int, p_initiative int, p_engagement int,
  p_discipline int, p_bonus int, p_note text)
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

  insert into public.otp_kpi (id, emp_slug, month, quality, learnability, initiative,
                              engagement, discipline, bonus, note, updated_at, updated_by)
  values (p_slug || ':' || p_month, p_slug, p_month, p_quality, p_learnability,
          p_initiative, p_engagement, p_discipline, p_bonus, p_note, now(), 'admin')
  on conflict (id) do update
    set quality = excluded.quality, learnability = excluded.learnability,
        initiative = excluded.initiative, engagement = excluded.engagement,
        discipline = excluded.discipline, bonus = excluded.bonus,
        note = excluded.note, updated_at = now(), updated_by = 'admin';
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_kpi_set(uuid, text, text, int, int, int, int, int, int, text) to anon;

-- 2. Отпуска: только с секретом агента
create or replace function public.otp_vacations_set(p_secret text, p_month text, p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_count int := 0;
  r jsonb;
begin
  select value into v_secret from public.otp_settings where key = 'agent_secret';
  if v_secret is null or p_secret is null or p_secret <> v_secret then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

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
grant execute on function public.otp_vacations_set(text, text, jsonb) to anon;

-- Проверка: секрет для cloud.json
--   select value as agentSecret from public.otp_settings where key = 'agent_secret';
