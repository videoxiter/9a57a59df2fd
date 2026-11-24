-- ===========================================================================
-- v7: флаг «синхронизировать график» для кнопки на главной (P3, план 24.11).
-- Кнопка на сайте пишет запрос, локальный агент (scripts/sync_schedule.py,
-- запуск из планировщика Windows) забирает график из Confluence и публикует.
-- Таблица без секретов: только отметки времени и результат.
-- Выполнить один раз в SQL Editor. Скрипт идемпотентный.
-- ===========================================================================

create table if not exists public.otp_sync_flags (
  id           text primary key,          -- 'schedule'
  requested_at timestamptz,               -- когда нажали кнопку на сайте
  requested_by text,
  done_at      timestamptz,               -- когда агент закончил
  ok           boolean,
  message      text
);

alter table public.otp_sync_flags enable row level security;

drop policy if exists "sync flags read"   on public.otp_sync_flags;
drop policy if exists "sync flags insert" on public.otp_sync_flags;
drop policy if exists "sync flags update" on public.otp_sync_flags;

-- читать и писать может кто угодно: в таблице нет ничего, кроме отметок
-- «кнопку нажали / синхронизация закончилась». Секретов и данных сотрудников нет.
create policy "sync flags read"   on public.otp_sync_flags for select to anon using (true);
create policy "sync flags insert" on public.otp_sync_flags for insert to anon with check (true);
create policy "sync flags update" on public.otp_sync_flags for update to anon using (true) with check (true);

insert into public.otp_sync_flags (id) values ('schedule')
on conflict (id) do nothing;

-- Проверка:
--   select * from public.otp_sync_flags;
