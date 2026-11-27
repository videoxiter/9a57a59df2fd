# -*- coding: utf-8 -*-
"""Патч 3.6c: двойной клик определяем по времени между нажатиями.

Отказываемся от переопределения оконной процедуры (внутренности pystray
создают два окна и сообщение не доходит). Вместо этого:
  • библиотека, как обычно, вызывает пункт «по умолчанию» на левый клик;
  • пункт по умолчанию — наш обработчик, который считает интервал:
      первый клик — ничего, второй в течение 450 мс — открыть окно.
Правый клик, как и раньше, показывает меню.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# 1) используем обычную иконку (без подкласса с оконной процедурой)
src = src.replace("        IconClass = tray_icon_class(self.show_main_window)",
                  "        IconClass = Icon", 1)
src = src.replace('''                self.icon = tray_icon_class(self.show_main_window)(
                    APP_NAME, self.make_icon(self.state["kind"]),
                    self.status_line(), menu=self.menu())''',
'''                self.icon = Icon(APP_NAME, self.make_icon(self.state["kind"]),
                                 self.status_line(), menu=self.menu())''', 1)

# 2) пункт по умолчанию — обработчик двойного клика
src = src.replace('MenuItem("Открыть окно ОТП", self.show_main_window, default=True)',
                  'MenuItem("Открыть окно ОТП", self._on_tray_activate, default=True)', 1)

# 3) метод-различитель
anchor = "    def show_main_window(self, *_):"
adder = '''    def _on_tray_activate(self, *_):
        """Библиотека зовёт это на каждый левый клик: окно — только на двойной."""
        now = time.monotonic()
        prev = getattr(self, "_last_tray_click", 0.0)
        self._last_tray_click = now
        if now - prev <= 0.45:
            self._last_tray_click = 0.0
            self.show_main_window()

'''
assert anchor in src, "show_main_window"
src = src.replace(anchor, adder + anchor, 1)

# 4) убираем диагностический лог из старого обработчика (класс больше не используется)
src = src.replace('                    log("трей: сообщение %s" % hex(int(lparam or 0)))\n', "", 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.6c применён")
sys.exit(0)
