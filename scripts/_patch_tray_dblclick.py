# -*- coding: utf-8 -*-
"""Патч 3.6b: двойной клик вызывает окно напрямую, а не через self().

pystray-евский self() активирует «пункт по умолчанию» через меню, которое
создаётся лениво; при этом вызов молча падает (ошибку ловит и глотает
внутренний диспетчер библиотеки). Поэтому передаём обработчик явно.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

old = "def tray_icon_class():"
assert old in src, "tray_icon_class"
src = src.replace(old, "def tray_icon_class(on_double_click=None):", 1)

old2 = '''        class TrayIcon(Icon):
            def _on_notify(self, wparam, lparam):'''
new2 = '''        class TrayIcon(Icon):
            _on_double = staticmethod(on_double_click or (lambda *a: None))

            def _on_notify(self, wparam, lparam):'''
assert old2 in src, "класс TrayIcon"
src = src.replace(old2, new2, 1)

old3 = '''                    if lparam == WM_LBUTTONDBLCLK:
                        try:
                            self()      # действие по умолчанию — открыть окно
                        except Exception as e:
                            log("трей: окно не открылось (%r)" % (e,))
                        return'''
new3 = '''                    if lparam == WM_LBUTTONDBLCLK:
                        try:
                            TrayIcon._on_double()
                        except Exception as e:
                            log("трей: окно не открылось (%r)" % (e,))
                        return'''
assert old3 in src, "обработчик двойного клика"
src = src.replace(old3, new3, 1)

# сторож тоже создаёт иконку — передаём обработчик
src = src.replace('''                self.icon = tray_icon_class()(APP_NAME, self.make_icon(self.state["kind"]),
                                              self.status_line(), menu=self.menu())''',
'''                self.icon = tray_icon_class(self.show_main_window)(
                    APP_NAME, self.make_icon(self.state["kind"]),
                    self.status_line(), menu=self.menu())''', 1)

# основное создание иконки
src = src.replace("        IconClass = tray_icon_class()",
                  "        IconClass = tray_icon_class(self.show_main_window)", 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.6b применён")
sys.exit(0)
