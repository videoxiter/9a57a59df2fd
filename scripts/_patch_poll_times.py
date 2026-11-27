# -*- coding: utf-8 -*-
"""Опрос: время выходной смены задаётся отдельно для каждого дня.

Клик по дню: выбрать с текущим временем → сменить 05:00 ↔ 08:00 → снять.
В ответе сохраняется объект weekend_times: {"5":"05:00","12":"08:00"}.
Старое поле weekend_time остаётся как значение по умолчанию (совместимость).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
CSS = os.path.join(ROOT, "assets", "css", "main.css")

src = open(PJ, encoding="utf-8").read()

# 1) календарь выходных показывает время дня
old_cal = """      const calHtml = (kind) => {
        const selArr = kind === "weekend" ? saved.weekend_dates : saved.off_dates;
        const cells = [];
        const shift = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        for (let i = 0; i < shift; i++) cells.push('<span class="poll-day is-blank"></span>');
        for (let d = 1; d <= lastDay; d++) {
          const cls = ["poll-day"];
          if (isFree(d)) cls.push("is-weekend"); else cls.push("is-work");
          if (isHoliday(d)) cls.push("is-holiday");
          if ((selArr || []).map(String).includes(String(d))) cls.push("is-on");
          const clickable = isFree(d) ? ` data-cal="${kind}" data-day="${d}"` : "";
          cells.push(`<button type="button" class="${cls.join(" ")}"${clickable}>${d}</button>`);
        }"""
new_cal = """      /* время смены у каждого дня своё: по умолчанию — из выпадающего списка */
      const defTime = saved.weekend_time === "08:00" ? "08:00" : "05:00";
      const wtimes = {};
      (saved.weekend_times && typeof saved.weekend_times === "object" ? Object.keys(saved.weekend_times) : [])
        .forEach((k) => { wtimes[String(k)] = String(saved.weekend_times[k]); });
      (saved.weekend_dates || []).forEach((d) => { if (!wtimes[String(d)]) wtimes[String(d)] = defTime; });

      const calHtml = (kind) => {
        const selArr = kind === "weekend" ? saved.weekend_dates : saved.off_dates;
        const cells = [];
        const shift = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        for (let i = 0; i < shift; i++) cells.push('<span class="poll-day is-blank"></span>');
        for (let d = 1; d <= lastDay; d++) {
          const cls = ["poll-day"];
          if (isFree(d)) cls.push("is-weekend"); else cls.push("is-work");
          if (isHoliday(d)) cls.push("is-holiday");
          const on = (selArr || []).map(String).includes(String(d));
          if (on) cls.push("is-on");
          const clickable = isFree(d) ? ` data-cal="${kind}" data-day="${d}"` : "";
          const badge = (kind === "weekend" && on) ? `<span class="poll-day-time">${wtimes[String(d)] || defTime}</span>` : "";
          cells.push(`<button type="button" class="${cls.join(" ")}"${clickable}>${d}${badge}</button>`);
        }"""
assert old_cal in src, "календарь"
src = src.replace(old_cal, new_cal, 1)

# 2) подсказка у первого вопроса — про управление временем
old_hint = """          <header class="poll-sec-head"><b>1. Желаемые выходные смены</b>
            <span>Оплата 4 000 ₽ за смену. Отметьте дни в календаре.</span></header>"""
new_hint = """          <header class="poll-sec-head"><b>1. Желаемые выходные смены</b>
            <span>Оплата 4 000 ₽ за смену. Клик по дню: выбрать → сменить 05:00 ↔ 08:00 → снять.
            Время у каждого дня своё, оно видно на плитке.</span></header>"""
assert old_hint in src, "подсказка"
src = src.replace(old_hint, new_hint, 1)

# 3) клик по дню: три состояния (выбрать / сменить время / снять)
old_click = """      box.querySelectorAll(".poll-day[data-cal]").forEach((cell) => {
        cell.addEventListener("click", () => {
          const kind = cell.dataset.cal;
          const day = cell.dataset.day;
          const inp = box.querySelector(`input[data-pd="${kind}"][value="${day}"]`);
          if (!inp) return;
          inp.checked = !inp.checked;
          cell.classList.toggle("is-on", inp.checked);
          if (kind === "weekend" && inp.checked) {
            const n = box.querySelector("#poll-none");
            if (n) n.checked = false;
          }
        });
      });"""
new_click = """      const paintTime = (cell, day) => {
        const t = wtimes[String(day)];
        let badge = cell.querySelector(".poll-day-time");
        if (!t || !cell.classList.contains("is-on")) {
          if (badge) badge.remove();
          return;
        }
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "poll-day-time";
          cell.appendChild(badge);
        }
        badge.textContent = t;
      };

      box.querySelectorAll(".poll-day[data-cal]").forEach((cell) => {
        cell.addEventListener("click", () => {
          const kind = cell.dataset.cal;
          const day = cell.dataset.day;
          const inp = box.querySelector(`input[data-pd="${kind}"][value="${day}"]`);
          if (!inp) return;
          const defaultTime = (box.querySelector("#poll-time") || {}).value || "05:00";
          if (!inp.checked) {
            // включаем день со временем по умолчанию
            inp.checked = true;
            cell.classList.add("is-on");
            if (kind === "weekend") {
              wtimes[String(day)] = defaultTime;
              const n = box.querySelector("#poll-none");
              if (n) n.checked = false;
            }
          } else if (kind === "weekend") {
            // день уже выбран: 05:00 → 08:00 → снять
            const cur = wtimes[String(day)] || defaultTime;
            if (cur === "05:00") {
              wtimes[String(day)] = "08:00";
            } else {
              inp.checked = false;
              cell.classList.remove("is-on");
              delete wtimes[String(day)];
            }
          } else {
            inp.checked = false;
            cell.classList.remove("is-on");
          }
          paintTime(cell, day);
        });
      });"""
assert old_click in src, "обработчик клика"
src = src.replace(old_click, new_click, 1)

# 4) сохранение: добавляем карту времён
old_save = """          weekend_dates: pick("weekend"),
          weekend_time: (box.querySelector("#poll-time") || {}).value || "05:00","""
new_save = """          weekend_dates: pick("weekend"),
          weekend_time: (box.querySelector("#poll-time") || {}).value || "05:00",
          weekend_times: (() => {
            const out = {};
            pick("weekend").forEach((d) => { out[String(d)] = wtimes[String(d)] || "05:00"; });
            return out;
          })(),"""
assert old_save in src, "сохранение"
src = src.replace(old_save, new_save, 1)

open(PJ, "w", encoding="utf-8", newline="").write(src)
print("profile.js: время по каждому дню")

CSS_ADD = '''

/* время смены внутри плитки календаря */
.poll-day { position: relative; }
.poll-day-time { position: absolute; bottom: 4px; left: 0; right: 0; font-size: 10px; font-weight: 700;
  letter-spacing: .02em; opacity: .85; }
.poll-day.is-on { padding-top: 6px; line-height: 1.1; }
'''

css = open(CSS, encoding="utf-8").read()
if ".poll-day-time {" not in css:
    open(CSS, "w", encoding="utf-8", newline="").write(css + CSS_ADD)
    print("main.css: стиль времени дня")
sys.exit(0)
