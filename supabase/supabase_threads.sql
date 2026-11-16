-- Треды смен: начало смены = сообщение в канале, остальные события идут в его тред.
-- Выполнить в Supabase → SQL Editor → Run. Повторный запуск безопасен.

create table if not exists public.otp_shift_threads (
  emp       text  not null,
  day       date  not null,
  message_id bigint not null,
  created   timestamptz not null default now(),
  primary key (emp, day)
);

alter table public.otp_shift_threads enable row level security;

-- доступ только сервисной роли (cron работает под ней)
drop policy if exists otp_shift_threads_service on public.otp_shift_threads;
create policy otp_shift_threads_service on public.otp_shift_threads
  for all to service_role using (true) with check (true);

create index if not exists otp_shift_threads_day on public.otp_shift_threads (day);
