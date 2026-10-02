-- Схема базы заявок ОТП для Supabase. Выполнить один раз в SQL Editor.
-- Колонки в camelCase — так сайт отправляет объекты заявок как есть.

create table if not exists public.otp_requests (
  id          text primary key,
  "empSlug"   text,
  "empName"   text,
  type        text,          -- overtime | leave | dayoff
  date        text,
  "date2"     text,          -- дата выходной смены (для отгула)
  "from"      text,
  "to"        text,
  hours       numeric,
  reason      text,
  status      text,          -- pending | approved | rejected
  reject      text,          -- причина отказа
  created     timestamptz,
  decided     timestamptz
);

alter table public.otp_requests enable row level security;

-- сайт работает с публичным (publishable/anon) ключом: читать и писать заявки можно,
-- удалять и менять структуру — нет
drop policy if exists "otp read"   on public.otp_requests;
drop policy if exists "otp insert" on public.otp_requests;
drop policy if exists "otp update" on public.otp_requests;

create policy "otp read"   on public.otp_requests for select to anon using (true);
create policy "otp insert" on public.otp_requests for insert to anon with check (true);
create policy "otp update" on public.otp_requests for update to anon using (true) with check (true);

-- Добавлено позже: ручное «не списывать» при подтверждении заявки руководителем
alter table public.otp_requests add column if not exists "noDeduct" boolean default false;
