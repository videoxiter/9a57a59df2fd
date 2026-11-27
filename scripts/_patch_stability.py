# -*- coding: utf-8 -*-
"""Патч 3.4 (исправленный): стабильность окна и журнал сбоев."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# ---- 1. показ окна через флаг (Tk нельзя дёргать из чужого потока)
old_show = '''    def show_main_window(self, *_):
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
'''
new_show = '''    def show_main_window(self, *_):
        """Просит окно показаться: Tk из этого потока трогать нельзя,
        поэтому выставляем флаг, а окно поднимает себя само."""
        self._win_show = True
        if not getattr(self, "_win_alive", False):
            threading.Thread(target=self.main_window, daemon=True).start()
'''
assert old_show in src, "show_main_window"
src = src.replace(old_show, new_show, 1)

# ---- 2. хвост главного окна: флаг показа + корректный выход из mainloop
old_tail = '''        self._win_root = root
        root.protocol("WM_DELETE_WINDOW", root.withdraw)
        tick()
        root.mainloop()'''
new_tail = '''        self._win_root = root
        self._win_alive = True
        root.protocol("WM_DELETE_WINDOW", root.withdraw)

        def watch_flag():
            try:
                if getattr(self, "_win_show", False):
                    self._win_show = False
                    root.deiconify()
                    root.lift()
                    try:
                        root.focus_force()
                    except Exception:
                        pass
            except Exception:
                pass
            try:
                root.after(400, watch_flag)
            except Exception:
                pass

        watch_flag()
        tick()
        try:
            root.mainloop()
        finally:
            self._win_alive = False
            self._win_root = None'''
assert old_tail in src, "хвост main_window"
src = src.replace(old_tail, new_tail, 1)

# ---- 3. журнал необработанных исключений
hook = '''

def install_crash_logging():
    """Пишет необработанные ошибки в журнал: без этого «зависло» не разобрать."""
    import traceback

    def write(exc_type, exc, tb):
        try:
            log("СБОЙ: " + "".join(traceback.format_exception(exc_type, exc, tb))[:4000])
        except Exception:
            pass

    sys.excepthook = write
    try:
        threading.excepthook = lambda a: write(a.exc_type, a.exc_value, a.exc_traceback)
    except Exception:
        pass
    try:
        import tkinter
        tkinter.Tk.report_callback_exception = lambda self, et, ev, tb: write(et, ev, tb)
    except Exception:
        pass

'''
src = src.replace("\n\ndef main():", hook + "\ndef main():", 1)
src = src.replace('def main():\n    if "--selftest" in sys.argv:',
                  'def main():\n    install_crash_logging()\n    if "--selftest" in sys.argv:', 1)

# ---- 4. автообновление не запускаем при открытом окне
src = src.replace('''                info = update_available()
                if info:''',
'''                info = update_available()
                if info and getattr(self, "_win_alive", False):
                    log("обновление: отложено, пока открыто окно")
                    info = None
                if info:''', 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.4 применён")
sys.exit(0)
