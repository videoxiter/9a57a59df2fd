-- ===========================================================================
-- v13: вход без 15-минутной блокировки.
-- Было: после 5 неверных попыток вход блокировался на 15 минут
-- (error "too_many_attempts"), и даже верный пароль не принимался.
-- Стало: блокировка отключена; неудачные попытки по-прежнему пишутся в
-- otp_login_fails (для аудита), но вход не блокируют.
--
-- Компромисс: сайт публичный, поэтому подбор пароля теперь ничем не ограничен
-- по времени. Пароли — от 6 символов. Если понадобится вернуть защиту,
-- раскомментируйте блок с `if v_fails >= 5 ...` ниже.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_login(p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash  text;
  v_admin boolean;
  v_token uuid;
  v_fails int := 0;
  v_last  timestamptz;
begin
  if p_slug is null or p_pass is null then
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  -- блокировка отключена (v13). Вернуть защиту — раскомментировать:
  -- select fails, last_at into v_fails, v_last
  --   from public.otp_login_fails where slug = p_slug for update;
  -- if v_fails >= 5 and v_last > now() - interval '15 minutes' then
  --   return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  -- end if;

  select pass_hash, is_admin into v_hash, v_admin
    from public.otp_staff where slug = p_slug and active;

  if v_hash is null then
    insert into public.otp_login_fails (slug, fails, first_at, last_at)
    values (p_slug, 1, now(), now())
    on conflict (slug) do update
      set fails  = case when otp_login_fails.last_at > now() - interval '15 minutes'
                         then otp_login_fails.fails + 1 else 1 end,
          first_at = case when otp_login_fails.last_at > now() - interval '15 minutes'
                          then otp_login_fails.first_at else now() end,
          last_at = now();
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  if v_hash <> crypt(p_pass, v_hash) then
    insert into public.otp_login_fails (slug, fails, first_at, last_at)
    values (p_slug, 1, now(), now())
    on conflict (slug) do update
      set fails  = case when otp_login_fails.last_at > now() - interval '15 minutes'
                         then otp_login_fails.fails + 1 else 1 end,
          first_at = case when otp_login_fails.last_at > now() - interval '15 minutes'
                          then otp_login_fails.first_at else now() end,
          last_at = now();
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  delete from public.otp_login_fails where slug = p_slug;
  insert into public.otp_sessions (slug) values (p_slug) returning token into v_token;
  return jsonb_build_object('ok', true, 'token', v_token, 'slug', p_slug,
                            'admin', coalesce(v_admin, false));
end $$;

grant execute on function public.otp_login(text, text) to anon;

-- Проверка (по желанию):
--   select * from public.otp_login_fails;
