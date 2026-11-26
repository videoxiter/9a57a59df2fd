# -*- coding: utf-8 -*-
"""Патч 3.1: не открывать окно из фонового потока (это подвешивало трей),
плюс кнопка «Что нового» в главном окне и пункт «Перезапустить» в меню."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

old = '''    def maybe_show_whatsnew(self):
        """После обновления один раз показываем, что изменилось."""
        if self.cfg.get("lastVersion") == VERSION:
            return
        first_run = not self.cfg.get("lastVersion")
        self.cfg["lastVersion"] = VERSION
        save_config(self.cfg)
        if first_run:
            return          # первая установка: историю не навязываем
        self.changelog_window(only_current=True)
'''
new = '''    def maybe_show_whatsnew(self):
        """После обновления сообщаем о новой версии БЕЗ открытия окон.

        Раньше окно создавалось из фонового потока — это подвешивало трей
        (иконка переставала отвечать). Окно истории человек открывает сам.
        """
        if self.cfg.get("lastVersion") == VERSION:
            return
        first_run = not self.cfg.get("lastVersion")
        self.cfg["lastVersion"] = VERSION
        self.cfg["whatsnewSeen"] = bool(first_run)
        try:
            save_config(self.cfg)
        except Exception:
            pass
        if first_run:
            return
        text = "Обновлено до версии %s — что изменилось, смотрите в «О программе → История версий»." % VERSION
        self.push_feed(text)
        try:
            if self.icon:
                self.icon.notify(text, "ОТП обновилось")
        except Exception:
            pass
'''
if old not in src:
    raise SystemExit("не найден блок maybe_show_whatsnew")
src = src.replace(old, new, 1)

# пункт «Перезапустить» в меню — помогает, если что-то зависло
src = src.replace('''            MenuItem("Выход", lambda: self.quit_app()),''',
'''            MenuItem("Перезапустить", self.restart_app),
            MenuItem("Выход", lambda: self.quit_app()),''', 1)

restart = '''    def restart_app(self):
        """Перезапуск: полезно, если зависло окно или нужно применить настройки."""
        try:
            exe = sys.executable
            args = [exe] if not getattr(sys, "frozen", False) else [exe]
            subprocess.Popen(args, close_fds=True)
        except Exception as e:
            log("перезапуск: %r" % (e,))
        threading.Timer(0.4, lambda: os._exit(0)).start()

'''
src = src.replace("    def quit_app(self):", restart + "    def quit_app(self):", 1)

# кнопка «Что нового» в главном окне (рядом с версией)
old_head = '''        tk.Label(head, text="версия " + VERSION, bg=BG, fg="#5b6b80",
                 font=("Segoe UI", 9)).pack(side="right", pady=(8, 0))'''
new_head = '''        tk.Label(head, text="версия " + VERSION, bg=BG, fg="#5b6b80",
                 font=("Segoe UI", 9)).pack(side="right", pady=(8, 0))
        if not self.cfg.get("whatsnewSeen"):
            tk.Button(head, text="Что нового", command=self._open_whatsnew,
                      relief="flat", bd=0, bg="#0d2330", fg=ACCENT, cursor="hand2",
                      font=("Segoe UI", 9, "bold"), padx=10, pady=3).pack(side="right", padx=(0, 10))'''
if old_head not in src:
    raise SystemExit("не найден блок версии в окне")
src = src.replace(old_head, new_head, 1)

helper = '''    def _open_whatsnew(self):
        """Открывает историю версий и помечает «что нового» просмотренным."""
        self.cfg["whatsnewSeen"] = True
        try:
            save_config(self.cfg)
        except Exception:
            pass
        self.changelog_window(only_current=True)

'''
src = src.replace("    def changelog_window(", helper + "    def changelog_window(", 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.1 применён")
sys.exit(0)
