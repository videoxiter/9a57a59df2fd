# README-DSH — контекст проекта «Моя команда ОТП»

Файл для агента (DeepSeek Harness и любой другой обвязки), который берёт проект в работу.

> Защищённое имя `AGENTS.md` писать нельзя (система блокирует), поэтому контекст лежит здесь.

## Каталог и репозиторий

- Локально: `G:\LMStudio\VSCode\Projects\Сайт ОТП`
- Репозиторий: `https://github.com/videoxiter/9a57a59df2fd.git` (ветка `main`)
- Публикация: GitHub Pages — `https://videoxiter.github.io/9a57a59df2fd/`
- Дашборд (только для руководителя, URL не для публики): `/1bceb335668c/`
- Персональные страницы: `/team/<slug>/` + 11 разделов

## Что это

Статический сайт (HTML/CSS/JS, без серверного рендера): дашборд руководителя отдела технической поддержки и персональные страницы сотрудников. Геймификация: уровни, звёзды, награды. Заявки на часы, учёт времени и уведомления — через Supabase (Postgres + Edge Functions). Сайт работает без ПК руководителя: браузер обращается к Supabase напрямую или через edge-функции.

## Структура

```
scripts/
  generate_data.py        # extracted.json + itogi/*.txt + schedule.json -> assets/js/data.js
  generate_pages.py       # team/<slug>/ — 11 разделов на сотрудника
  generate_dashboard.py   # 1bceb335668c/ — 6 разделов из dashboard_source.html
  dashboard_source.html   # исходный шаблон дашборда
  fetch_confluence.py     # графики смен и отпуска из Confluence -> schedule.json
  parse_itogi.py          # итоги месяца из txt -> extracted.json (по умолчанию DRY-RUN)
  parse_roadmap.py        # дорожные карты xlsx -> roadmaps.json
  generate_link_icons.py  # SVG-иконки раздела «Ссылки»
  supabase_schema.sql     # схема otp_requests + RLS
assets/
  js/main.js              # дашборд
  js/profile.js           # персональные страницы (11 разделов)
  js/cloud.js             # Supabase: заявки, синхронизация
  js/hr.js                # ленты заявок, решения
  js/common.js            # GSAP/reveal, хелперы
  js/theme.js, themes.js  # темы и анимации
  css/main.css            # стили, темы, светлая тема
  img/                    # награды, иконки тем, ссылки
supabase/functions/
  api/index.ts            # JSON API-прокси (рекомендуемый доступ)
  cron/index.ts           # периодические задачи
  notify/index.ts         # уведомления
docs/                     # OTP-JSON-API.pdf, otp-api.html, otp-docs.html, timetrack.md, ТЕКСТЫ-ОЗВУЧКИ.md
video/                    # генератор видеоинструкций (TTS + Playwright + ffmpeg), final/*.mp4
team/<slug>/…             # СГЕНЕРИРОВАННЫЕ страницы — руками не править
1bceb335668c/…            # СГЕНЕРИРОВАННЫЙ дашборд — руками не править
```

## Данные: откуда что берётся

| Что | Источник | Куда попадает |
|---|---|---|
| Итоги месяца (KPI, бонусы, отзыв) | `G:\LMStudio\Hermes\hermes-workspace\itogi\<Фамилия>.txt` | `scripts/extracted.json` → `data.js` |
| Графики смен, линии, отпуска | Confluence (креды в `.env` Hermes) | `scripts/schedule.json` |
| Заявки на часы, учёт времени | Supabase | браузер (в рантайме) |
| Дорожные карты | xlsx | `scripts/roadmaps.json` |

## Supabase: адреса для GET/POST

Проект: `qfhjkynkvltquzyskfgi`. Базовый адрес: `https://qfhjkynkvltquzyskfgi.supabase.co`

### Способ 1 — прокси `api` (рекомендуется)

```
POST https://qfhjkynkvltquzyskfgi.supabase.co/functions/v1/api
Content-Type: application/json

{
  "token": "<uuid сессии>",
  "path": "otp_requests?select=*&status=eq.pending",
  "method": "GET",          // GET | POST | PATCH
  "body": [ { ... } ]       // только для POST/PATCH
}
```

Прокси держит service-role ключ на сервере. Разрешённые таблицы:
`otp_time_events` (GET/POST/PATCH), `otp_requests` (GET/PATCH),
`otp_content` (GET), `otp_staff` (GET).
Коды: 200 — успех, 401 — нет/просрочен токен, 403 — таблица/метод не разрешены.

### Способ 2 — прямой PostgREST

```
GET    https://qfhjkynkvltquzyskfgi.supabase.co/rest/v1/otp_requests?select=*
POST   https://qfhjkynkvltquzyskfgi.supabase.co/rest/v1/otp_requests
PATCH  https://qfhjkynkvltquzyskfgi.supabase.co/rest/v1/otp_requests?id=eq.<id>
DELETE https://qfhjkynkvltquzyskfgi.supabase.co/rest/v1/otp_requests?id=eq.<id>   // только id like 'test-%'
```

Заголовки:

```
apikey: <publishable key из scripts/cloud.json>
Authorization: Bearer <тот же ключ>
Content-Type: application/json
Prefer: return=minimal            // или return=representation
```

Для upsert: `Prefer: resolution=merge-duplicates,return=minimal`.

RPC-эндпоинты: `POST /rest/v1/rpc/otp_current_status` (тело `{}`),
`POST /rest/v1/rpc/otp_content_list` (тело `{"p_emp": "<slug>"}`).

Подробнее — `docs/otp-api.html` и `docs/OTP-JSON-API.pdf`.

## Процесс обновления данных (строгий порядок)

```bash
cd scripts
PYTHONUTF8=1 python parse_itogi.py            # DRY-RUN, показать разбор
PYTHONUTF8=1 python parse_itogi.py --write    # после подтверждения
PYTHONUTF8=1 python generate_data.py
PYTHONUTF8=1 python generate_pages.py
PYTHONUTF8=1 python generate_dashboard.py
```

Затем:
1. Поднять `V = "NNN"` в `generate_pages.py` и `generate_dashboard.py`.
2. `git add -A && git commit -m "..." && git push origin main`.
3. Дождаться сборки Pages (1–3 мин), проверить `curl` (200) и Playwright.

## Правила

- **Секреты не печатать и не коммитить.** `.env` Hermes — только чтение.
- Репозиторий публичный: выгрузки с ключами — только в `.verify/` (в `.gitignore`).
  Перед `git add -A` смотреть `git status --short`.
- Деструктивные операции — только после явного «д».
- Перед изменениями, создающими/удаляющими файлы — DRY-RUN и подтверждение.
- Не запускать dev-серверы без разрешения.
- Сгенерированные каталоги (`team/`, `1bceb335668c/`) не редактировать вручную.

## Грабли (проверено на практике)

- `data-reveal` + ScrollTrigger: контент рендерится после инициализации → блоки остаются прозрачными. В `common.js` есть watchdog — не удалять.
- После `syncReqs` страница наград перерисовывается: нужен `initMonthTabs()`, иначе пропадают награды месяца и табы.
- `decidedBy` (автор решения) сохраняется только если он в `EXTRA` в `cloud.js` (упаковка в поле `reject`).
- Отгул за выходную смену (`dayoff`) **не влияет** на баланс часов. Увольнительная списывает, если `forceDeduct` или показатели ниже порога.
- Записи с id `test-*` не должны уходить в облако (фильтр в `cloud.js` → `put()`).
- Confluence требует CA-бандл: `SSL_CERT_FILE=<bundle-corp.pem>`.
- `?v=` обязателен: без него браузеры держат кэш.

## Проверка

```bash
curl -s -o /dev/null -w "%{http_code}" <url>          # 200
node <playwright-скрипт>                              # консоль без ошибок, скриншот
```

Обход: 10 сотрудников × 11 разделов + 6 разделов дашборда.

## Видеоинструкции

`video/build.js` — генератор: TTS (edge-tts / silero / xtts) + запись HTML-сцен (Playwright) + ffmpeg.
Запуск: `node video/build.js [id ...]`; результат — `video/out/<id>.mp4` (1920×1080, 30 fps).
Готовые ролики — в `video/final/` (10 инструкций по разделам).
Требования: Chrome, ffmpeg, playwright-core (пути заданы в начале `video/build.js`).

## Проверка окружения

- Python 3.11+ (`PYTHONUTF8=1` обязателен для кириллицы).
- Node.js + `playwright-core` + Chrome.
- ffmpeg (для видео).
