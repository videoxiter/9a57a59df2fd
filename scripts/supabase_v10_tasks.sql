-- ===========================================================================
-- v10: очередь задач для локального агента (создание страниц сотруднику).
-- Кнопка в админке пишет задачу; агент на ПК/маке выполняет её (правит data.js,
-- генерирует страницы, публикует) и отмечает результат.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create table if not exists public.otp_tasks (
  id           text primary key,
  kind         text not null,          -- add_employee
  payload      jsonb,                  -- {fio, slug, ...}
  requested_at timestamptz default now(),
  requested_by text,
  done_at      timestamptz,
  ok           boolean,
  message      text
);

alter table public.otp_tasks enable row level security;

drop policy if exists "tasks read"   on public.otp_tasks;
drop policy if exists "tasks insert" on public.otp_tasks;
drop policy if exists "tasks update" on public.otp_tasks;

-- секретов в таблице нет: ФИО, код страницы, отметки времени
create policy "tasks read"   on public.otp_tasks for select to anon using (true);
create policy "tasks insert" on public.otp_tasks for insert to anon with check (true);
create policy "tasks update" on public.otp_tasks for update to anon using (true) with check (true);

-- Проверка:
--   select * from public.otp_tasks order by requested_at desc limit 5;