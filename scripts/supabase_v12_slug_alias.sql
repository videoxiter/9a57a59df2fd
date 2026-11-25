-- ===========================================================================
-- v12: соответствие «внутренний id сотрудника → код страницы (hash)».
-- Зачем: сотрудник входит по внутреннему id (страница берёт data-profile),
-- а события учёта времени пишутся с кодом страницы. Прокси api сравнивал их
-- строго и отвечал 403 «профиль не совпадает» (так было у Завьялова).
-- Теперь у записи есть page_hash, и прокси принимает обе формы.
-- Выполнить один раз в SQL Editor. Идемпотентно.
-- ===========================================================================

alter table public.otp_staff add column if not exists page_hash text;

-- Соответствие из данных сайта (assets/js/data.js).
-- Порядок в UPDATE строгий: SET … FROM (values …) AS v … WHERE …
update public.otp_staff as st
   set page_hash = v.h
  from (values
    ('frolov',    '5414335d1bd0'),
    ('melnikov',  '3def188ccc72'),
    ('khasanov',  '114778baa83f'),
    ('pestovsky', '9f4f056f3e64'),
    ('eliseev',   'f20f3afe5d45'),
    ('zavyalov',  'a9cb0e50ea70'),
    ('bolgov',    'e5d35a6fc921'),
    ('yuryev',    '8b36020d00c7'),
    ('pospelova', 'd2b44b366961'),
    ('agarov',    'f3da30046c28')
  ) as v(id, h)
 where st.slug = v.id;

-- Симметрично: если запись заведена по коду страницы, в page_hash кладём
-- внутренний id — прокси принимает любую из двух форм.
update public.otp_staff as st
   set page_hash = v.id
  from (values
    ('5414335d1bd0', 'frolov'),
    ('3def188ccc72', 'melnikov'),
    ('114778baa83f', 'khasanov'),
    ('9f4f056f3e64', 'pestovsky'),
    ('f20f3afe5d45', 'eliseev'),
    ('a9cb0e50ea70', 'zavyalov'),
    ('e5d35a6fc921', 'bolgov'),
    ('8b36020d00c7', 'yuryev'),
    ('d2b44b366961', 'pospelova'),
    ('f3da30046c28', 'agarov')
  ) as v(slug, id)
 where st.slug = v.slug;

-- Проверка:
--   select slug, page_hash from public.otp_staff order by slug;
