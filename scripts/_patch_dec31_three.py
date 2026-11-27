# -*- coding: utf-8 -*-
"""31 декабря — ТРИ смены (05:00, 08:00, 10:00), а не две половины.

Обычный выходной день в опросе: две половины — 05:00 и 08:00.
31 декабря (праздничный день с усиленным графиком): три варианта —
05:00–10:00, 08:00–13:00, 10:00–15:00.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
CSS = os.path.join(ROOT, "assets", "css", "main.css")

src = open(PJ, encoding="utf-8").read()

# --- ячейка: для 31.12 три варианта
old = """          if (kind === "weekend") {
            // день делится на две половины: 05:00 и 08:00
            const cur = on ? (wtimes[String(d)] || defTime) : "";
            cells.push(`<span class="poll-day2${hold}">
              <span class="poll-dn">${d}</span>
              <button type="button" class="poll-half h05${cur === "05:00" ? " is-sel" : ""}"
                      data-cal="weekend" data-day="${d}" data-time="05:00">05:00</button>
              <button type="button" class="poll-half h08${cur === "08:00" ? " is-sel" : ""}"
                      data-cal="weekend" data-day="${d}" data-time="08:00">08:00</button>
            </span>`);
            continue;
          }"""
new = """          if (kind === "weekend") {
            // обычный выходной — 05:00 и 08:00; 31 декабря — три смены (05, 08, 10)
            const times = (m === 12 && d === 31) ? ["05:00", "08:00", "10:00"] : ["05:00", "08:00"];
            const cur = on ? (wtimes[String(d)] || defTime) : "";
            const halves = times.map((t) => {
              const cls = t === "05:00" ? "h05" : (t === "08:00" ? "h08" : "h10");
              return `<button type="button" class="poll-half ${cls}${cur === t ? " is-sel" : ""}"
                      data-cal="weekend" data-day="${d}" data-time="${t}">${t}</button>`;
            }).join("");
            cells.push(`<span class="poll-day2${hold}">
              <span class="poll-dn">${d}</span>${halves}
            </span>`);
            continue;
          }"""
assert old in src, "ячейки выходных"
src = src.replace(old, new, 1)

# --- подсказка у вопроса
old_hint = """            <span>Оплата 4 000 ₽ за смену. У дня две половины: голубая — с 05:00,
            тёмно-зелёная — с 08:00. Нажмите нужную; повторное нажатие снимает выбор.</span></header>"""
new_hint = """            <span>Оплата 4 000 ₽ за смену. Обычный день делится на 05:00 (голубая) и 08:00
            (тёмно-зелёная); у 31 декабря три варианта — 05:00, 08:00 и 10:00 (фиолетовая).
            Повторное нажатие снимает выбор.</span></header>"""
assert old_hint in src, "подсказка"
src = src.replace(old_hint, new_hint, 1)

# --- плашка про 31 декабря
old_note = """            <li><b>Как выбрать:</b> в календаре ниже нажмите половину дня <b>«05:00»</b> или <b>«08:00»</b>,
              а 31 декабря — в этом же календаре (оно подсвечено как праздничное).</li>"""
new_note = """            <li><b>Как выбрать:</b> у обычного дня две кнопки — <b>05:00</b> и <b>08:00</b>.
              У 31 декабря их <b>три</b>: 05:00, 08:00 и 10:00 — выберите нужную в календаре.</li>"""
if old_note in src:
    src = src.replace(old_note, new_note, 1)
    print("плашка обновлена")

open(PJ, "w", encoding="utf-8", newline="").write(src)
print("profile.js: у 31 декабря три смены")

CSS_ADD = '''

/* третий вариант времени — только 31 декабря */
.poll-half.h10 { background: rgba(139,92,246,.38); }
.poll-half.h10.is-sel { background: #8b5cf6; color: #0c0714; }
.poll-day2 { min-height: 92px; }
'''

css = open(CSS, encoding="utf-8").read()
if ".poll-half.h10" not in css:
    open(CSS, "w", encoding="utf-8", newline="").write(css + CSS_ADD)
    print("main.css: стиль третьего варианта")
sys.exit(0)
