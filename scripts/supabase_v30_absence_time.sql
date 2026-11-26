-- ===========================================================================
-- v30: «Временное отсутствие» (с любой причиной, включая «Без заявки»)
-- больше НЕ останавливает рабочее время.
-- События отсутствия больше не участвуют в расчёте интервалов работы:
-- счётчик идёт сквозь них, статус при этом фиксируется отдельно (колонка absences).
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

drop function if exists public.otp_current_status();
drop view if exists public.otp_time_days;

create view public.otp_time_days with (security_invoker = true) as
with today as (
  select to_char((now() at time zone 'Europe/Moscow')::date, 'YYYY-MM-DD') as d
),
marks as (
  -- «Без заявки» рабочий интервал не рвёт (отсутствие на месте в рамках
  -- производства), остальные причины отсутствия — пауза, как и раньше
  select e.*,
         lead(at) over (partition by "empSlug", day order by at, id) as next_at
  from public.otp_time_events e
  where not (
    e.type in ('absence_start', 'absence_end')
    and coalesce(e.reason, '') = 'Без заявки'
  )
),
leave_win as (
  select l."empSlug", l.date as day,
         (l.date || ' ' || l."from" || ':00+03:00')::timestamptz as from_ts,
         (l.date || ' ' || l."to"   || ':00+03:00')::timestamptz as to_ts
  from public.otp_requests l
  where l.type = 'leave' and l.status = 'approved'
    and l."from" ~ '^[0-9]{1,2}:[0-9]{2}$' and l."to" ~ '^[0-9]{1,2}:[0-9]{2}$'
),
work as (
  select m."empSlug", m.day,
         sum(extract(epoch from (b.b_end - m.at))
             - coalesce((select sum(extract(epoch from (least(b.b_end, w.to_ts) - greatest(m.at, w.from_ts))))
                         from leave_win w
                         where w."empSlug" = m."empSlug" and w.day = m.day
                           and w.from_ts < b.b_end and w.to_ts > m.at), 0))::int as worked_sec
  from marks m
  cross join today t
  cross join lateral (
    select case when m.next_at is not null then m.next_at
                when m.day = t.d then now()
                else m.at end as b_end
  ) b
  where m.type in ('shift_start', 'break_end', 'absence_end')
  group by m."empSlug", m.day
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

grant select on public.otp_time_days to anon;
