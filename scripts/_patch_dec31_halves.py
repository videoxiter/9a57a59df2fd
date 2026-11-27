# -*- coding: utf-8 -*-
"""31 декабря: убираем отдельный вопрос, день выбирается половинами в календаре.

1. Из формы убирается раздел «Работа 31 декабря» (смены 1/2/3) — он дублировал выбор.
2. 31.12 в календаре показывается двумя половинами 05:00 / 08:00, как остальные дни.
3. Плашка сверху поясняет: смены 31 декабря выбираются в календаре.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PJ = os.path.join(ROOT, "assets", "js", "profile.js")
src = open(PJ, encoding="utf-8").read()

# 1) убираем раздел про 31 декабря
start = src.index('        <section class="poll-sec">\n          <header class="poll-sec-head"><b>5. Работа 31 декабря</b>')
end = src.index('        <section class="poll-sec">\n          <header class="poll-sec-head"><b>6. Дополнительно</b>')
src = src[:start] + src[end:]

# 2) «Дополнительно» становится пятым пунктом
src = src.replace("<b>6. Дополнительно</b>", "<b>5. Дополнительно</b>", 1)

# 3) из сохранения убираем dec31
old_save = """          tania: tania ? tania.value === "1" : null,
          dec31: (() => {
            const sel = box.querySelector('input[name="poll-dec31"]:checked');
            return sel ? sel.value : null;
          })(),"""
new_save = """          tania: tania ? tania.value === "1" : null,"""
if old_save in src:
    src = src.replace(old_save, new_save, 1)
    print("dec31 убран из сохранения")
else:
    print("блок сохранения dec31 не найден — пропускаю")

# 4) плашка: уточняем, что 31 декабря выбирается в календаре
old_note = """          <ul class="poll-note-list">
            <li><b>1-я смена</b> 05:00–10:00 · перерывы 07:00–07:15 и 08:30–08:45 · без обеда</li>
            <li><b>2-я смена</b> 08:00–13:00 · перерывы 09:30–09:45 и 10:45–11:00 · без обеда</li>
            <li><b>3-я смена</b> 10:00–15:00 · перерывы 11:30–11:45 и 12:30–12:45 · без обеда</li>
          </ul>"""
new_note = """          <ul class="poll-note-list">
            <li><b>1-я смена</b> 05:00–10:00 · перерывы 07:00–07:15 и 08:30–08:45 · без обеда</li>
            <li><b>2-я смена</b> 08:00–13:00 · перерывы 09:30–09:45 и 10:45–11:00 · без обеда</li>
            <li><b>3-я смена</b> 10:00–15:00 · перерывы 11:30–11:45 и 12:30–12:45 · без обеда</li>
            <li><b>Как выбрать:</b> в календаре ниже нажмите половину дня <b>«05:00»</b> или <b>«08:00»</b>,
              а 31 декабря — в этом же календаре (оно подсвечено как праздничное).</li>
          </ul>"""
if old_note in src:
    src = src.replace(old_note, new_note, 1)
    print("плашка обновлена")
else:
    print("текст плашки не найден")

open(PJ, "w", encoding="utf-8", newline="").write(src)
print("раздел про 31 декабря убран:", "poll-dec31" not in src)
sys.exit(0)
