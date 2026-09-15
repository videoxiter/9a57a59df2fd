# Моя команда ОТП

Тёмный интерактивный дашборд эффективности отдела технической поддержки + 10 персональных страниц роста. Самодостаточный статический сайт (HTML/CSS/JS), без сборки и бэкенда.

## Что внутри

- **`index.html`** — главный дашборд: hero с роботом, рейтинг по среднему KPI, карточки сотрудников, динамика команды (линейный график, бонусы, радар с выбором сотрудника).
- **`team/<id>/index.html`** × 10 — персональная страница: радар 5 метрик, динамика по месяцам, бонусы, сильные стороны / зоны роста, план роста (3 шага), литература и ссылки.
- **`assets/js/data.js`** — **единая точка правды** со всеми данными.
- **`scripts/`** — генераторы (`generate_data.py`, `generate_pages.py`) и `verify.js` (автопроверка через Playwright).

## Как открыть

Просто открой `index.html` в браузере (работает и через `file://`). Либо локальный сервер:

```bash
cd G:\LMStudio\otp-team
python -m http.server 8080
# → http://localhost:8080
```

## ⚠️ Данные — демо

Сейчас в `data.js` лежат **реалистичные, но выдуманные** KPI/бонусы (я не смог вытащить твой Qwen-чат: браузер в среде не поднялся). Всё помечено бейджем «Демо».

### Как вставить реальные данные

Два пути:

1. **Править `data.js` напрямую** — ищи нужного сотрудника и меняй числа:
   - `baseline` — текущие 5 метрик (шкала 1–10),
   - `history` — 13 месяцев (`quality`, `learnability`, `initiative`, `engagement`, `discipline`, `bonus`),
   - `bonuses`, `strengths`, `growth`, `recommendations`, `literature`, `links`.

2. **Править `scripts/generate_data.py`** (там те же данные в читаемом виде), затем перегенерировать:
   ```bash
   cd G:\LMStudio\otp-team
   PYTHONUTF8=1 python scripts/generate_data.py   # обновит data.js
   PYTHONUTF8=1 python scripts/generate_pages.py  # обновит team/*/index.html
   ```

### Как добавить новый месяц

В `generate_data.py` поправь `months_back(...)` и `MONTHS`, либо просто допиши новый объект месяца в `history` каждого сотрудника в `data.js`.

## Публикация

Сайт статический — годится любой хостинг:

- **Локально на твоём сервере** (`hermes-workspace`, порт :3000): положи папку `otp-team` в `apps/` и раздай статикой.
- **GitHub Pages / Netlify / Vercel**: залей содержимое папки в репозиторий — и готово.
- Каждый сотрудник получает свою ссылку вида `…/team/<id>/`.

## Стек

GSAP + ScrollTrigger (Apple-подобный скролл, reveal/parallax), Lenis (инерция скролла), Chart.js (графики с hover-tooltip), Phosphor Icons, шрифты Space Grotesk / JetBrains Mono. Всё с CDN.
