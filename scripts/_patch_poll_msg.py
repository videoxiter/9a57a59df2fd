# -*- coding: utf-8 -*-
"""Правка profile.js: различать «нет опроса» и «не удалось узнать состояние»."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "assets", "js", "profile.js")
src = open(PATH, encoding="utf-8").read()

old = """      if (!res || !res.ok || !res.poll) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Сейчас опроса нет. Когда руководитель его откроет, '
          + 'здесь появится форма пожеланий, а в меню — пункт «Опрос».</p></div>';
        return;
      }"""
new = """      if (!res || !res.ok) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Не удалось узнать состояние опроса: нет связи '
          + 'или нужен вход. Обновите страницу (Ctrl+F5) и войдите снова.</p></div>';
        return;
      }
      if (!res.poll) {
        hidePollNav(true);
        host.innerHTML = '<div class="p-card"><p>Сейчас опроса нет. Когда руководитель его откроет, '
          + 'здесь появится форма пожеланий, а в меню — пункт «Опрос».</p></div>';
        return;
      }"""
if old not in src:
    raise SystemExit("блок не найден")
open(PATH, "w", encoding="utf-8", newline="").write(src.replace(old, new, 1))
print("profile.js: сообщения различаются")
sys.exit(0)
