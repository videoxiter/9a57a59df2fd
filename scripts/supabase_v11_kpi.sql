-- ===========================================================================
-- v11: KPI и бонусы по сотруднику за месяц — ввод из админки.
-- Таблица — источник истины для ручных значений: агент применяет её к data.js
-- после каждой пересборки, поэтому текстовые itogi её не затирают.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_kpi (
  id           text primary key,        -- <slug>:<YYYY-MM>
  emp_slug     text not null,
  month        text not null,           -- YYYY-MM
  quality      int,
  learnability int,
  initiative   int,
  engagement   int,
  discipline   int,
  bonus        int,                     -- рубли
  note         text,
  updated_at   timestamptz default now(),
  updated_by   text
);

alter table public.otp_kpi enable row level security;

drop policy if exists "kpi read"   on public.otp_kpi;
drop policy if exists "kpi insert" on public.otp_kpi;
drop policy if exists "kpi update" on public.otp_kpi;

-- KPI и так публикуются на страницах сотрудников (data.js), так что чтение
-- анонимом ничего нового не раскрывает. Запись — из админки под сессией.
create policy "kpi read"   on public.otp_kpi for select to anon using (true);
create policy "kpi insert" on public.otp_kpi for insert to anon with check (true);
create policy "kpi update" on public.otp_kpi for update to anon using (true) with check (true);

-- Проверка:
--   select * from public.otp_kpi order by month desc limit 10;
