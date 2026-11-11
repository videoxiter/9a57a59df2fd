-- Учёт рабочего времени («Стартовая»): отдельная таблица, не связанная с часами
-- увольнительных и переработок (otp_requests). Выполнить один раз в SQL Editor.
--
-- Каждая кнопка на «Стартовой» — это событие. Текущее состояние (работа/перерыв/обед/
-- отсутствие/смена завершена) и отработанное время выводятся из этих событий.

create table if not exists public.otp_time_events (
  id        text primary key,
  "empSlug" text not null,
  "empName" text,
  day       text not null,          -- рабочий день, YYYY-MM-DD (локальная дата сотрудника)
  type      text not null,          -- shift_start | shift_stop | break_start | break_end | absence_start | absence_end
  slot      text,                   -- tech1 | tech2 | lunch | absence
  at        timestamptz not null,   -- момент нажатия
  reason    text,                   -- причина «Временного отсутствия»
  created   timestamptz default now()
);

create index if not exists otp_time_events_day_idx    on public.otp_time_events (day, "empSlug");
create index if not exists otp_time_events_emp_idx    on public.otp_time_events ("empSlug", day);
create index if not exists otp_time_events_at_idx     on public.otp_time_events (at);

alter table public.otp_time_events enable row level security;

-- сайт работает с публичным publishable-ключом: писать события можно, удалять — нет
drop policy if exists "time read"   on public.otp_time_events;
drop policy if exists "time insert" on public.otp_time_events;
drop policy if exists "time update" on public.otp_time_events;

create policy "time read"   on public.otp_time_events for select to anon using (true);
create policy "time insert" on public.otp_time_events for insert to anon with check (true);
create policy "time update" on public.otp_time_events for update to anon using (true) with check (true);

-- Журнал отправленных уведомлений: чтобы cron не дублировал сообщения в «ДисКо».
create table if not exists public.otp_time_notices (
  id   text primary key,          -- day:kind:emp — уникальность на день и вид
  day  text not null,
  kind text not null,
  emp  text not null,
  at   timestamptz default now()
);
alter table public.otp_time_notices enable row level security;
drop policy if exists "notices read"   on public.otp_time_notices;
drop policy if exists "notices insert" on public.otp_time_notices;
create policy "notices read"   on public.otp_time_notices for select to anon using (true);
create policy "notices insert" on public.otp_time_notices for insert to anon with check (true);

-- Сводка по дням: удобно и для отчёта, и для JSON-запросов.
-- Отработанные секунды = сумма интервалов «работа → пауза» (пауза = перерыв/обед/отсутствие).
drop view if exists public.otp_time_days;
create view public.otp_time_days with (security_invoker = true) as
with marks as (
  select e.*,
         lead(at) over (partition by "empSlug", day order by at, id) as next_at
  from public.otp_time_events e
),
work as (
  select "empSlug", day, sum(extract(epoch from (next_at - at)))::int as worked_sec
  from marks
  where type in ('shift_start', 'break_end', 'absence_end') and next_at is not null
  group by "empSlug", day
),
agg as (
  select "empSlug", max("empName") as "empName", day,
         min(at) filter (where type = 'shift_start') as started,
         max(at) filter (where type = 'shift_stop')  as stopped,
         count(*) filter (where type = 'break_start')   as breaks,
         count(*) filter (where type = 'absence_start') as absences
  from public.otp_time_events
  group by "empSlug", day
)
select a."empSlug", a."empName", a.day, a.started, a.stopped,
       coalesce(w.worked_sec, 0) as worked_sec, a.breaks, a.absences
from agg a
left join work w using ("empSlug", day);
