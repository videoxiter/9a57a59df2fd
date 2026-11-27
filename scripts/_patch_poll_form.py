# -*- coding: utf-8 -*-
"""Новый вид формы пожеланий: календарь на месяц, карточки-разделы, иконки.

Заменяет initPollCard в assets/js/profile.js и добавляет стили в main.css.
Данные формы не меняются — сохраняется тот же набор полей.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
CSS = os.path.join(ROOT, "assets", "css", "main.css")

NEW = r'''  function initPollCard(hostEl) {
    const A = window.OTP_AUTH;
    if (!A || !A.pollMy) return;
    const host = hostEl || document.getElementById("st-actions");
    if (!host) return;
    const sec = host.closest(".st-card") || host.parentNode;
    A.pollMy(String(emp.id)).then((res) => {
      if (!res || !res.ok || !res.poll) return;
      const poll = res.poll;
      const saved = res.answers || {};
      const [y, m] = String(poll.month).split("-").map(Number);
      const monthName = new Date(y, m - 1, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      const due = poll.due_at
        ? new Date(poll.due_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "без срока";
      const FIXED = ["01-01", "01-02", "01-07", "02-23", "03-08", "05-01", "05-09", "06-12", "11-04"];
      const lastDay = new Date(y, m, 0).getDate();
      const mm = String(m).padStart(2, "0");
      const dow = (d) => new Date(y, m - 1, d).getDay();
      const isHoliday = (d) => FIXED.includes(mm + "-" + String(d).padStart(2, "0"));
      const isFree = (d) => dow(d) === 0 || dow(d) === 6 || isHoliday(d);
      const chk = (arr, v) => (arr || []).map(String).includes(String(v)) ? "checked" : "";

      const freeDays = [];
      for (let d = 1; d <= lastDay; d++) if (isFree(d)) freeDays.push(d);

      const weeks = [];
      for (let d = 1; d <= lastDay; d++) {
        if (dow(d) === 1) {
          const fri = Math.min(d + 4, lastDay);
          weeks.push({ from: d, label: `${String(d).padStart(2, "0")}.${mm}–${String(fri).padStart(2, "0")}.${mm}` });
        }
      }

      /* календарь: клик по выходному/празднику = выбор. Пн–Вс, как в графике. */
      const calHtml = (kind) => {
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
        }
        return `<div class="poll-cal">
          <div class="poll-cal-week">${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => `<span>${x}</span>`).join("")}</div>
          <div class="poll-cal-grid">${cells.join("")}</div>
          <div class="poll-cal-legend">
            <span><i class="poll-dot dot-free"></i> выходной</span>
            <span><i class="poll-dot dot-holiday"></i> праздник</span>
            <span><i class="poll-dot dot-on"></i> выбрано</span>
          </div>
        </div>`;
      };

      const hidden = (kind, arr) => `<div class="poll-hidden">${freeDays
        .map((d) => `<input type="checkbox" data-pd="${kind}" value="${d}" ${chk(arr, d)}>`).join("")}</div>`;

      const box = document.createElement("div");
      box.className = "poll-ui";
      box.innerHTML = `
        <div class="poll-head">
          <div class="poll-head-l">
            <div class="poll-head-ico"><i class="ph-bold ph-calendar-check"></i></div>
            <div>
              <h3>Пожелания по графику</h3>
              <p>${escHtml(monthName)} · заполняется один раз, можно поправить до срока</p>
            </div>
          </div>
          <span class="poll-due"><i class="ph-bold ph-clock"></i> сдать до ${escHtml(due)}</span>
        </div>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>1. Желаемые выходные смены</b>
            <span>Оплата 4 000 ₽ за смену. Отметьте дни в календаре.</span></header>
          ${calHtml("weekend")}${hidden("weekend", saved.weekend_dates)}
          <div class="poll-row">
            <label class="poll-field">Время смены
              <select id="poll-time">
                <option value="05:00"${saved.weekend_time === "05:00" ? " selected" : ""}>с 05:00</option>
                <option value="08:00"${saved.weekend_time === "08:00" ? " selected" : ""}>с 08:00</option>
              </select>
            </label>
            <label class="poll-check"><input type="checkbox" id="poll-none" ${saved.weekend_none ? "checked" : ""}> Прошу без выходных смен</label>
          </div>
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>2. Обязательные выходные дни</b>
            <span>Даты, когда не можете работать (учтите отпуск).</span></header>
          ${calHtml("off")}${hidden("off", saved.off_dates)}
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>3. 3-я смена (10:00–19:00)</b>
            <span>Недели, когда готовы выходить в 3-ю смену.</span></header>
          <div class="poll-chips">${weeks.map((w) => `<label class="poll-chip">
            <input type="checkbox" data-pd="third" value="${w.from}" ${chk(saved.third_weeks, w.from)}>
            <span>${escHtml(w.label)}</span></label>`).join("")}</div>
          <label class="poll-check"><input type="checkbox" id="poll-third-none" ${saved.third_none ? "checked" : ""}> Без 3-й смены</label>
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>4. Дежурный по МКК «Тания»</b>
            <span>Готовы быть дежурным в этом месяце?</span></header>
          <div class="poll-seg">
            <label><input type="radio" name="poll-tania" value="1" ${saved.tania === true ? "checked" : ""}><span>Готов</span></label>
            <label><input type="radio" name="poll-tania" value="0" ${saved.tania === false ? "checked" : ""}><span>Не готов</span></label>
          </div>
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>5. Дополнительно</b>
            <span>Пожелания, ограничения, пояснения.</span></header>
          <textarea id="poll-comment" rows="3" placeholder="Например: 12–14 декабря не могу — семейные дела">${escHtml(saved.comment || "")}</textarea>
        </section>

        <div class="poll-foot">
          <button class="btn btn-primary" id="poll-save" type="button"><i class="ph-bold ph-check"></i> Сохранить пожелания</button>
          <span class="staff-hint" id="poll-msg">${Object.keys(saved).length ? "Ответ сохранён — можно поправить до срока." : ""}</span>
        </div>`;
      sec.appendChild(box);

      /* клик по дню календаря = отметить/снять */
      box.querySelectorAll(".poll-day[data-cal]").forEach((cell) => {
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
      });

      box.querySelectorAll("[data-pd]").forEach((el) => el.addEventListener("change", () => {
        if (el.dataset.pd === "weekend" && el.checked) { const n = box.querySelector("#poll-none"); if (n) n.checked = false; }
        if (el.dataset.pd === "third" && el.checked) { const n = box.querySelector("#poll-third-none"); if (n) n.checked = false; }
        const cell = box.querySelector(`.poll-day[data-cal="${el.dataset.pd}"][data-day="${el.value}"]`);
        if (cell) cell.classList.toggle("is-on", el.checked);
      }));

      const save = box.querySelector("#poll-save");
      if (save) save.addEventListener("click", async () => {
        const pick = (kind) => Array.from(box.querySelectorAll(`[data-pd="${kind}"]:checked`)).map((x) => Number(x.value));
        const tania = box.querySelector('input[name="poll-tania"]:checked');
        save.disabled = true;
        const r = await A.pollSave(String(emp.id), poll.id, {
          weekend_dates: pick("weekend"),
          weekend_time: (box.querySelector("#poll-time") || {}).value || "05:00",
          weekend_none: !!(box.querySelector("#poll-none") || {}).checked,
          off_dates: pick("off"),
          third_weeks: pick("third"),
          third_none: !!(box.querySelector("#poll-third-none") || {}).checked,
          tania: tania ? tania.value === "1" : null,
          comment: (box.querySelector("#poll-comment") || {}).value || "",
        });
        save.disabled = false;
        const msg = box.querySelector("#poll-msg");
        if (msg) msg.textContent = r && r.ok ? "Сохранено. Можно поправить до срока." : "Не удалось сохранить — попробуйте ещё раз.";
      });
    }).catch(() => {});
  }

'''

src = open(PJ, encoding="utf-8").read()
start = src.index("  function initPollCard(hostEl) {")
end = src.index("  /* «Ознакомлен»: показывает опубликованный график")
src = src[:start] + NEW + src[end:]
open(PJ, "w", encoding="utf-8", newline="").write(src)
print("profile.js: новая форма опроса")

CSS_ADD = '''

/* ---------- форма пожеланий по графику (раздел «Опрос») ---------- */
.poll-ui { display: flex; flex-direction: column; gap: 16px; }
.poll-head { display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 16px 18px; border: 1px solid var(--line, rgba(148,163,184,.22)); border-radius: 14px;
  background: rgba(17,26,36,.6); }
.poll-head-l { display: flex; align-items: center; gap: 14px; }
.poll-head-ico { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
  background: rgba(34,211,238,.12); color: #22d3ee; font-size: 20px; }
.poll-head h3 { margin: 0 0 2px; font-size: 17px; }
.poll-head p { margin: 0; font-size: 13px; color: #9fb0c5; }
.poll-due { font-size: 12.5px; color: #22d3ee; background: rgba(34,211,238,.10);
  border: 1px solid rgba(34,211,238,.25); border-radius: 999px; padding: 6px 12px; white-space: nowrap; }

.poll-sec { border: 1px solid var(--line, rgba(148,163,184,.18)); border-radius: 14px;
  padding: 16px 18px; background: rgba(12,20,28,.55); display: flex; flex-direction: column; gap: 12px; }
.poll-sec-head { display: flex; flex-direction: column; gap: 4px; }
.poll-sec-head b { font-size: 15px; }
.poll-sec-head span { font-size: 12.5px; color: #9fb0c5; }

.poll-cal { border: 1px solid rgba(148,163,184,.18); border-radius: 12px; padding: 10px; background: rgba(8,14,20,.5); }
.poll-cal-week, .poll-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.poll-cal-week span { text-align: center; font-size: 11.5px; color: #7f93a8; padding: 4px 0; text-transform: uppercase; letter-spacing: .04em; }
.poll-day { aspect-ratio: 1 / 1; border-radius: 10px; border: 1px solid transparent; cursor: pointer;
  background: rgba(148,163,184,.08); color: #dbe3ee; font: 600 14px/1 "Segoe UI", sans-serif; }
.poll-day.is-blank { background: none; cursor: default; }
.poll-day.is-work { background: none; color: #5b6c80; cursor: default; }
.poll-day.is-weekend { background: rgba(148,163,184,.16); }
.poll-day.is-holiday { color: #f472b6; }
.poll-day:hover[data-cal] { border-color: #22d3ee; }
.poll-day.is-on { background: #22d3ee; color: #06131a; border-color: #22d3ee; }
.poll-cal-legend { display: flex; gap: 14px; margin-top: 8px; font-size: 11.5px; color: #9fb0c5; }
.poll-dot { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 5px; }
.dot-free { background: rgba(148,163,184,.45); }
.dot-holiday { background: #f472b6; }
.dot-on { background: #22d3ee; }

.poll-row { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.poll-field { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: #9fb0c5; }
.poll-field select { background: #0e1620; color: #e8edf5; border: 1px solid rgba(148,163,184,.3);
  border-radius: 10px; padding: 8px 12px; font-size: 14px; }
.poll-check { display: inline-flex; align-items: center; gap: 8px; font-size: 13.5px; color: #dbe3ee; }

.poll-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.poll-chip { display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  border: 1px solid rgba(148,163,184,.25); border-radius: 999px; padding: 8px 14px; font-size: 13px; }
.poll-chip:has(input:checked) { background: rgba(34,211,238,.15); border-color: #22d3ee; color: #eaf9fd; }
.poll-chip input { accent-color: #22d3ee; }

.poll-seg { display: inline-flex; border: 1px solid rgba(148,163,184,.25); border-radius: 12px; overflow: hidden; }
.poll-seg label { cursor: pointer; }
.poll-seg input { position: absolute; opacity: 0; }
.poll-seg span { display: block; padding: 10px 20px; font-size: 13.5px; color: #dbe3ee; }
.poll-seg input:checked + span { background: #22d3ee; color: #06131a; font-weight: 600; }

.poll-ui textarea { width: 100%; background: #0e1620; color: #e8edf5; border: 1px solid rgba(148,163,184,.3);
  border-radius: 12px; padding: 12px; font: 14px/1.5 "Segoe UI", sans-serif; resize: vertical; }
.poll-hidden { display: none; }
.poll-foot { display: flex; align-items: center; gap: 14px; padding-bottom: 6px; }
'''

css = open(CSS, encoding="utf-8").read()
if ".poll-ui {" not in css:
    css = css + CSS_ADD
    open(CSS, "w", encoding="utf-8", newline="").write(css)
print("main.css: стили формы добавлены")
sys.exit(0)
