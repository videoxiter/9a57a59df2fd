-- ===========================================================================
-- v9: доступ агента синхронизации к флагу (локальный скрипт на Mac/Windows).
-- Агент ходит с публичным ключом (без сессий), поэтому ему нужны политики
-- select/update на таблице флага. Данных сотрудников в таблице нет — только
-- отметки «запрошено/выполнено». Кнопка на сайте при этом по-прежнему идёт
-- через api и проверяет право can_sync (v8).
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

drop policy if exists "sync flags agent read"  on public.otp_sync_flags;
drop policy if exists "sync flags agent write" on public.otp_sync_flags;

create policy "sync flags agent read"  on public.otp_sync_flags for select to anon using (true);
create policy "sync flags agent write" on public.otp_sync_flags for update to anon using (true) with check (true);

-- Проверка:
--   select * from public.otp_sync_flags;
