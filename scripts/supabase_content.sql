-- Контент по сотрудникам: бонусы, награды, зоны роста, достижения.
-- Вводится вручную в админке (/staff/), показывается на личной странице.

create table if not exists public.otp_content (
  id       text primary key,
  emp_slug text not null,                 -- внутренний id (bolgov, frolov...)
  section  text not null,                 -- bonus | awards | growth | lvl | stats
  title    text,
  body     text,
  value    text,                          -- сумма/подпись, например "5 000 ₽" или "+2"
  on_date  text,                          -- YYYY-MM-DD
  created  timestamptz default now()
);

alter table public.otp_content enable row level security;
drop policy if exists "content read" on public.otp_content;
create policy "content read" on public.otp_content for select to anon using (true);

create or replace function public.otp_content_list(p_emp text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'section', section, 'title', title, 'body', body,
    'value', value, 'on_date', on_date
  ) order by on_date desc nulls last, created desc), '[]'::jsonb)
  from public.otp_content
  where emp_slug = p_emp;
$$;
grant execute on function public.otp_content_list(text) to anon;

create or replace function public.otp_content_save(
  p_token uuid, p_id text, p_emp text, p_section text,
  p_title text, p_body text, p_value text, p_on_date text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.otp_content (id, emp_slug, section, title, body, value, on_date)
  values (coalesce(nullif(p_id, ''), 'c-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4)),
          p_emp, p_section, p_title, p_body, p_value, nullif(p_on_date, ''))
  on conflict (id) do update
    set section = excluded.section, title = excluded.title, body = excluded.body,
        value = excluded.value, on_date = excluded.on_date;

  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_content_save(uuid, text, text, text, text, text, text, text) to anon;

create or replace function public.otp_content_del(p_token uuid, p_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.otp_sessions s
    join public.otp_staff st on st.slug = s.slug
    where s.token = p_token and s.expires > now() and st.is_admin
  ) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.otp_content where id = p_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.otp_content_del(uuid, text) to anon;

notify pgrst, 'reload schema';
