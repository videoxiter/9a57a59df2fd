-- ===========================================================================
-- v15: ИСПРАВЛЕНИЕ ВХОДА. Причина 403/«неверный пароль»:
--   функция otp_login была создана с search_path = public, а функция crypt()
--   (pgcrypto) живёт в схеме extensions. Поэтому любой вызов входа падал с
--   ошибкой «function crypt(text, text) does not exist» — вход не работал
--   ни у кого с новой сессией.
-- Заодно: 15-минутная блокировка убрана (по просьбе), неудачные попытки
-- по-прежнему пишутся в otp_login_fails.
-- Этот скрипт заменяет v13 и v14 — их выполнять не нужно.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_login(p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions      -- ← crypt/gen_salt находятся здесь
as $$
declare
  v_hash  text;
  v_admin boolean;
  v_token uuid;
begin
  if p_slug is null or p_pass is null then
    return jsonb_build_object('ok', false, 'error', 'bad_password');
  end if;

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

-- Проверка сохранения пароля (v14) — тот же search_path, иначе crypt не найдётся
create or replace function public.otp_staff_verify_pass(p_token uuid, p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select pass_hash into v_hash from public.otp_staff where slug = p_slug;
  if v_hash is null then
    return jsonb_build_object('ok', true, 'exists', false, 'matches', false);
  end if;
  return jsonb_build_object('ok', true, 'exists', true,
                            'matches', (v_hash = crypt(p_pass, v_hash)));
end $$;

grant execute on function public.otp_staff_verify_pass(uuid, text, text) to anon;

-- Снимаем накопленные неудачные попытки (они больше не блокируют вход)
delete from public.otp_login_fails;

-- Проверка после выполнения (должно вернуть ok: true и токен):
--   select public.otp_login('bolgov', '123FGH') as result;
