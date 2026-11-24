-- ===========================================================================
-- v8: синхронизацию графика может запрашивать главный специалист (Павел) —
-- без админ-пароля, но только через прокси api со своей сессией.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

-- 1. Право «запрашивать синхронизацию графика» сотруднику.
alter table public.otp_staff add column if not exists can_sync boolean not null default false;
update public.otp_staff set can_sync = true where slug = 'frolov';

-- 2. Флаг синхронизации больше не пишется анонимом: только через api
--    (service-role) после проверки сессии и права can_sync/admin.
drop policy if exists "sync flags read"   on public.otp_sync_flags;
drop policy if exists "sync flags insert" on public.otp_sync_flags;
drop policy if exists "sync flags update" on public.otp_sync_flags;

-- Проверка:
--   select slug, can_sync from public.otp_staff where can_sync;
--   select * from public.otp_sync_flags;
