-- ===========================================================================
-- v14: проверка, что пароль реально сохранён в базе.
-- Зачем: админка сохраняла пароль и не проверяла результат — в текст доступа
-- мог попасть пароль, который фактически не записался (так и вышло у Болгова:
-- has_pass = true, но crypt('...', pass_hash) не совпадал).
-- Функция доступна только админ-сессии и не раскрывает хеш: отвечает true/false.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_staff_verify_pass(p_token uuid, p_slug text, p_pass text)
returns jsonb
language plpgsql
security definer
set search_path = public
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

-- Проверка (по желанию, подставь slug и пароль):
--   select public.otp_staff_verify_pass('<токен админа>', 'bolgov', '123FGH');
