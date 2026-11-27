# -*- coding: utf-8 -*-
"""Опрос: у каждого дня две половины — «с 05:00» (голубая) и «с 08:00» (тёмно-зелёная).

Клик по половине выбирает день с этим временем; повторный клик по той же
половине снимает выбор. Выпадающий список времени больше не нужен.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
CSS = os.path.join(ROOT, "assets", "css", "main.css")

src = open(PJ, encoding="utf-8").read()

# ---------- 1. ячейка календаря ----------
old_cells = """          const cls = ["poll-day"];
          if (isFree(d)) cls.push("is-weekend"); else cls.push("is-work");
          if (isHoliday(d)) cls.push("is-holiday");
          const on = (selArr || []).map(String).includes(String(d));
          if (on) cls.push("is-on");
          const clickable = isFree(d) ? ` data-cal="${kind}" data-day="${d}"` : "";
          const badge = (kind === "weekend" && on) ? `<span class="poll-day-time">${wtimes[String(d)] || defTime}</span>` : "";
          cells.push(`<button type="button" class="${cls.join(" ")}"${clickable}>${d}${badge}</button>`);"""
new_cells = """          const on = (selArr || []).map(String).includes(String(d));
          const hold = isHoliday(d) ? " is-holiday" : "";
          if (!isFree(d)) {
            cells.push(`<span class="poll-day is-work">${d}</span>`);
            continue;
          }
          if (kind === "weekend") {
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
          }
          const cls = ["poll-day", "is-weekend" + hold];
          if (on) cls.push("is-on");
          cells.push(`<button type="button" class="${cls.join(" ")}" data-cal="${kind}" data-day="${d}">${d}</button>`);"""
assert old_cells in src, "ячейки календаря"
src = src.replace(old_cells, new_cells, 1)

# ---------- 2. убираем выпадающий список времени ----------
old_row = """          <div class="poll-row">
            <label class="poll-field">Время смены
              <select id="poll-time">
                <option value="05:00"${saved.weekend_time === "05:00" ? " selected" : ""}>с 05:00</option>
                <option value="08:00"${saved.weekend_time === "08:00" ? " selected" : ""}>с 08:00</option>
              </select>
            </label>
            <label class="poll-check"><input type="checkbox" id="poll-none" ${saved.weekend_none ? "checked" : ""}> Прошу без выходных смен</label>
          </div>"""
new_row = """          <div class="poll-row">
            <label class="poll-check"><input type="checkbox" id="poll-none" ${saved.weekend_none ? "checked" : ""}> Прошу без выходных смен</label>
          </div>"""
assert old_row in src, "выпадающий список времени"
src = src.replace(old_row, new_row, 1)

# ---------- 3. подсказка ----------
old_hint = """            <span>Оплата 4 000 ₽ за смену. Клик по дню: выбрать → сменить 05:00 ↔ 08:00 → снять.
            Время у каждого дня своё, оно видно на плитке.</span></header>"""
new_hint = """            <span>Оплата 4 000 ₽ за смену. У дня две половины: голубая — с 05:00,
            тёмно-зелёная — с 08:00. Нажмите нужную; повторное нажатие снимает выбор.</span></header>"""
assert old_hint in src, "подсказка"
src = src.replace(old_hint, new_hint, 1)

# ---------- 4. клик по половине/дню ----------
old_click_start = """      const paintTime = (cell, day) => {"""
old_click_end = """          paintTime(cell, day);
        });
      });"""
i = src.index(old_click_start)
j = src.index(old_click_end, i) + len(old_click_end)
new_click = """      const syncHalf = (wrap, day) => {
        const cur = wtimes[String(day)] || "";
        wrap.querySelectorAll(".poll-half").forEach((b) => {
          b.classList.toggle("is-sel", b.dataset.time === cur);
        });
      };

      box.querySelectorAll(".poll-half").forEach((half) => {
        half.addEventListener("click", () => {
          const day = half.dataset.day;
          const time = half.dataset.time;
          const inp = box.querySelector(`input[data-pd="weekend"][value="${day}"]`);
          if (!inp) return;
          const same = inp.checked && (wtimes[String(day)] || "") === time;
          if (same) {
            inp.checked = false;
            delete wtimes[String(day)];
          } else {
            inp.checked = true;
            wtimes[String(day)] = time;
            const n = box.querySelector("#poll-none");
            if (n) n.checked = false;
          }
          const wrap = half.closest(".poll-day2");
          if (wrap) syncHalf(wrap, day);
        });
      });

      /* второй календарь (обязательные выходные) — обычный клик */
      box.querySelectorAll(".poll-day[data-cal='off']").forEach((cell) => {
        cell.addEventListener("click", () => {
          const day = cell.dataset.day;
          const inp = box.querySelector(`input[data-pd="off"][value="${day}"]`);
          if (!inp) return;
          inp.checked = !inp.checked;
          cell.classList.toggle("is-on", inp.checked);
        });
      });"""
src = src[:i] + new_click + src[j:]

# ---------- 5. сохранение: weekend_time = время первого дня ----------
old_save = """          weekend_time: (box.querySelector("#poll-time") || {}).value || "05:00","""
new_save = """          weekend_time: (pick("weekend").map((d) => wtimes[String(d)]).filter(Boolean)[0]) || "05:00","""
assert old_save in src, "weekend_time при сохранении"
src = src.replace(old_save, new_save, 1)

open(PJ, "w", encoding="utf-8", newline="").write(src)
print("profile.js: половины дня 05:00/08:00")

CSS_ADD = '''

/* ---------- день с двумя половинами времени ---------- */
.poll-day2 { position: relative; display: flex; flex-direction: column; gap: 3px;
  border: 1px solid rgba(148,163,184,.20); border-radius: 10px; padding: 4px; background: rgba(8,14,20,.45); }
.poll-day2.is-holiday { border-color: rgba(244,114,182,.45); }
.poll-dn { font: 700 11px/1 "Segoe UI", sans-serif; color: #9fb0c5; text-align: center; }
.poll-half { border: 1px solid transparent; border-radius: 7px; cursor: pointer; padding: 6px 2px;
  font: 600 10.5px/1 "Segoe UI", sans-serif; color: #dbe3ee; transition: filter .12s ease; }
.poll-half.h05 { background: rgba(34,211,238,.22); }
.poll-half.h08 { background: rgba(16,120,86,.45); }
.poll-half:hover { filter: brightness(1.25); }
.poll-half.h05.is-sel { background: #22d3ee; color: #06131a; }
.poll-half.h08.is-sel { background: #10b981; color: #04140d; }
.poll-cal-grid { grid-auto-rows: minmax(74px, auto); }
.poll-day.is-on { font-weight: 700; }
'''

css = open(CSS, encoding="utf-8").read()
if ".poll-day2 {" not in css:
    open(CSS, "w", encoding="utf-8", newline="").write(css + CSS_ADD)
    print("main.css: стиль половин дня")
sys.exit(0)
