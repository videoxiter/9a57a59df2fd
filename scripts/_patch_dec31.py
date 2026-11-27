# -*- coding: utf-8 -*-
"""Опрос: информация про 31 декабря и отдельный вопрос про работу в этот день."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
MJ = os.path.join(ROOT, "assets", "js", "main.js")
CSS = os.path.join(ROOT, "assets", "css", "main.css")

src = open(PJ, encoding="utf-8").read()

# 1) информационный блок после шапки формы
old_head_end = '''        <section class="poll-sec">
          <header class="poll-sec-head"><b>1. Желаемые выходные смены</b>'''
new_head_end = '''        <section class="poll-note">
          <div class="poll-note-head"><i class="ph-bold ph-info"></i> 31 декабря — смены будут</div>
          <ul class="poll-note-list">
            <li><b>1-я смена</b> 05:00–10:00 · перерывы 07:00–07:15 и 08:30–08:45 · без обеда</li>
            <li><b>2-я смена</b> 08:00–13:00 · перерывы 09:30–09:45 и 10:45–11:00 · без обеда</li>
            <li><b>3-я смена</b> 10:00–15:00 · перерывы 11:30–11:45 и 12:30–12:45 · без обеда</li>
          </ul>
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>1. Желаемые выходные смены</b>'''
assert old_head_end in src, "шапка формы"
src = src.replace(old_head_end, new_head_end, 1)

# 2) отдельный вопрос про 31 декабря — перед «Дополнительно»
old_extra = '''        <section class="poll-sec">
          <header class="poll-sec-head"><b>5. Дополнительно</b>'''
new_extra = '''        <section class="poll-sec">
          <header class="poll-sec-head"><b>5. Работа 31 декабря</b>
            <span>Смены будут: выберите удобную — или отметьте, что не готовы.</span></header>
          <div class="poll-chips poll-dec31">
            <label class="poll-chip"><input type="radio" name="poll-dec31" value="1" ${saved.dec31 === "1" ? "checked" : ""}><span>1-я · 05:00–10:00</span></label>
            <label class="poll-chip"><input type="radio" name="poll-dec31" value="2" ${saved.dec31 === "2" ? "checked" : ""}><span>2-я · 08:00–13:00</span></label>
            <label class="poll-chip"><input type="radio" name="poll-dec31" value="3" ${saved.dec31 === "3" ? "checked" : ""}><span>3-я · 10:00–15:00</span></label>
            <label class="poll-chip"><input type="radio" name="poll-dec31" value="no" ${saved.dec31 === "no" ? "checked" : ""}><span>Не готов(а)</span></label>
          </div>
        </section>

        <section class="poll-sec">
          <header class="poll-sec-head"><b>6. Дополнительно</b>'''
assert old_extra in src, "блок дополнительно"
src = src.replace(old_extra, new_extra, 1)

# 3) сохранение: добавляем dec31
old_save = '''          tania: tania ? tania.value === "1" : null,'''
new_save = '''          tania: tania ? tania.value === "1" : null,
          dec31: (() => {
            const sel = box.querySelector('input[name="poll-dec31"]:checked');
            return sel ? sel.value : null;
          })(),'''
assert old_save in src, "сохранение"
src = src.replace(old_save, new_save, 1)

open(PJ, "w", encoding="utf-8", newline="").write(src)
print("profile.js: блок 31 декабря и вопрос добавлены")

# 4) администраторская таблица ответов: колонка 31.12
m = open(MJ, encoding="utf-8").read()
if "31.12" not in m:
    m = m.replace('''<th>Тания</th>''', '''<th>Тания</th><th>31.12</th>''', 1)
    m = m.replace('''<td>${a.tania ? "да" : "нет"}</td>''',
                  '''<td>${a.tania ? "да" : "нет"}</td><td>${a.dec31 ? (a.dec31 === "no" ? "не готов" : a.dec31 + "-я") : "—"}</td>''', 1)
    open(MJ, "w", encoding="utf-8", newline="").write(m)
    print("main.js: колонка 31.12 в таблице ответов:", "31.12" in m)
else:
    print("main.js: колонка уже была")

# 5) стили информационного блока
CSS_ADD = '''

/* ---------- информация про 31 декабря в опросе ---------- */
.poll-note { border: 1px solid rgba(251,191,36,.35); background: rgba(251,191,36,.08);
  border-radius: 14px; padding: 14px 18px; }
.poll-note-head { font-size: 14px; font-weight: 700; color: #fbbf24; margin-bottom: 8px; }
.poll-note-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px;
  font-size: 13px; color: #e8edf5; }
.poll-note-list b { color: #fff; }
.poll-dec31 { gap: 10px; }
.poll-dec31 label span { min-width: 150px; text-align: center; }
'''

css = open(CSS, encoding="utf-8").read()
if ".poll-note {" not in css:
    open(CSS, "w", encoding="utf-8", newline="").write(css + CSS_ADD)
    print("main.css: стили блока добавлены")
sys.exit(0)
