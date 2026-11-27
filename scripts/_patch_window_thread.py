# -*- coding: utf-8 -*-
"""Патч 3.3: главное окно в отдельном потоке.

Раньше окно открывалось прямо в обработчике меню трея: его mainloop занимал
поток сообщений, и значок переставал реагировать (ни меню, ни двойной клик).
Теперь окно живёт в своём потоке, а меню лишь просит его показать.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# 1) показать окно из меню — через отдельный поток
src = src.replace('MenuItem("Открыть окно ОТП", self.main_window, default=True)',
                  'MenuItem("Открыть окно ОТП", self.show_main_window, default=True)', 1)

# 2) методы показа окна: ленивый запуск в своём потоке, повторный показ — deiconify
old = "    def main_window(self):"
new = '''    def show_main_window(self, *_):
        """Показывает главное окно, не блокируя трей."""
        root = getattr(self, "_win_root", None)
        if root is not None:
            try:
                root.deiconify()
                root.lift()
                root.focus_force()
                return
            except Exception:
                self._win_root = None
        threading.Thread(target=self.main_window, daemon=True).start()

    def main_window(self):'''
if old not in src:
    raise SystemExit("не найден main_window")
src = src.replace(old, new, 1)

# 3) запоминаем окно и при закрытии просто прячем (поток живёт в своём mainloop)
old2 = '''        root.protocol("WM_DELETE_WINDOW", root.withdraw)'''
new2 = '''        self._win_root = root
        root.protocol("WM_DELETE_WINDOW", root.withdraw)'''
if old2 not in src:
    raise SystemExit("не найден обработчик закрытия")
src = src.replace(old2, new2, 1)

# 4) остальные окна тоже не должны держать поток меню
for name in ("help_window", "hotkeys_dialog", "about_window", "changelog_window"):
    src = src.replace(f"MenuItem(\"Справка\", self.{name})", f"MenuItem(\"Справка\", lambda: threading.Thread(target=self.{name}, daemon=True).start())")
    src = src.replace(f"MenuItem(\"Горячие клавиши…\", self.{name})", f"MenuItem(\"Горячие клавиши…\", lambda: threading.Thread(target=self.{name}, daemon=True).start())")
    src = src.replace(f"MenuItem(\"О программе\", self.{name})", f"MenuItem(\"О программе\", lambda: threading.Thread(target=self.{name}, daemon=True).start())")

src = src.replace('tk.Button(btns, text="История обновлений", width=20,\n                  command=self.changelog_window)',
                  'tk.Button(btns, text="История обновлений", width=20,\n                  command=lambda: threading.Thread(target=self.changelog_window, daemon=True).start())')

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.3 применён")
sys.exit(0)
