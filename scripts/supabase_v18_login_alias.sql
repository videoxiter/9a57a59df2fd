-- ===========================================================================
-- v18: вход по ЛЮБОЙ из двух форм идентификатора.
-- Приложение-трей присылает код из ссылки (hash страницы), а запись в
-- otp_staff может быть заведена под внутренним id («bolgov») — раньше сервер
-- искал только по slug и отвечал bad_password, хотя пароль верный.
-- Теперь вход ищет и по slug, и по page_hash (колонка из v12).
-- Заменяет функцию otp_login (блокировка по-прежнему отключена).
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_login(p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash  text;
  v_admin boolean;
  v_token uuid;
  v_slug  text;
begin
  if p_slug is null or p_pass is null then
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

  -- ищем по внутреннему id ИЛИ по коду страницы (hash)
  select pass_hash, is_admin, slug into v_hash, v_admin, v_slug
    from public.otp_staff
   where (slug = p_slug or page_hash = p_slug) and active
   order by (slug = p_slug) desc
   limit 1;

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
  delete from public.otp_login_fails where slug = v_slug;
  insert into public.otp_sessions (slug) values (v_slug) returning token into v_token;
  return jsonb_build_object('ok', true, 'token', v_token, 'slug', v_slug,
                            'admin', coalesce(v_admin, false));
end $$;

grant execute on function public.otp_login(text, text) to anon;

-- Проверка (подставь код страницы и пароль сотрудника):
--   select public.otp_login('e5d35a6fc921', 'его-пароль') as result;
