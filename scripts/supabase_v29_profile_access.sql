-- ===========================================================================
-- v29: исправление доступа к данным личной страницы.
-- Личная страница передаёт код страницы (page_hash, он же каталог /team/<код>/),
-- а сессия хранит внутренний логин сотрудника (slug). Функция сравнивала их
-- напрямую и отвечала «нет доступа». Теперь разрешены оба варианта.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

create or replace function public.otp_profile_get(p_token uuid, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_hash  text;
  v_admin boolean;
  v_payload jsonb;
begin
  select s.slug, st.page_hash, coalesce(st.is_admin, false)
    into v_slug, v_hash, v_admin
    from public.otp_sessions s
    left join public.otp_staff st on st.slug = s.slug
   where s.token = p_token and s.expires > now();

  if v_slug is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  if p_slug = '__data' then
    if not v_admin then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
  elsif not v_admin
        and p_slug is distinct from v_slug
        and p_slug is distinct from v_hash then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  -- данные лежат под кодом страницы; на случай старой загрузки — ещё и под slug
  select payload into v_payload from public.otp_profiles where slug = p_slug;
  if v_payload is null then
    select payload into v_payload from public.otp_profiles where slug = coalesce(v_hash, v_slug);
  end if;

  if v_payload is null then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  return jsonb_build_object('ok', true, 'payload', v_payload);
end $$;
grant execute on function public.otp_profile_get(uuid, text) to anon;

-- Проверка после выполнения (должно вернуть список кодов страниц):
--   select slug, length(payload::text) from public.otp_profiles order by slug;
