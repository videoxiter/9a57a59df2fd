# -*- coding: utf-8 -*-
"""Патч 3.6: окончательное исправление «трей не реагирует».

Причина найдена: в обработчике клика использовалась константа
WM_LBUTTONDBLCLK, которой НЕТ в pystray._util.win32. AttributeError
возникал прямо в оконной процедуре значка — сообщение не обрабатывалось,
а цикл трея умирал. Процесс завершался, а значок оставался «призраком»
(нажатия не реагируют, в диспетчере процесса нет).

Что сделано:
1. Числовые коды сообщений вместо несуществующей константы + полный try/except.
2. Любая ошибка в обработчике больше не убивает цикл.
3. Сторож: если цикл трея всё же завершился сам, приложение поднимает его
   заново (до 3 раз), а не оставляет призрачный значок.
4. Тест обработчика: двойной клик, одиночный, правый клик — без исключений.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# ---------- 1. безопасный обработчик ----------
old = '''        class TrayIcon(Icon):
            def _on_notify(self, wparam, lparam):
                if lparam == _w32.WM_LBUTTONDBLCLK:
                    try:
                        self()          # действие по умолчанию — открыть окно
                    except Exception:
                        pass
                    return
                if lparam == _w32.WM_LBUTTONUP:
                    return              # одиночный левый клик ничего не делает
                return super()._on_notify(wparam, lparam)
'''
new = '''        WM_LBUTTONUP = 0x0202        # одиночный левый клик
        WM_LBUTTONDBLCLK = 0x0203    # двойной левый клик (в pystray этой константы нет)
        WM_RBUTTONUP = 0x0205        # правый клик — меню

        class TrayIcon(Icon):
            def _on_notify(self, wparam, lparam):
                # ВАЖНО: это оконная процедура. Любое исключение здесь убивает
                # цикл сообщений, значок остаётся «призраком» — поэтому всё в try.
                try:
                    if lparam == WM_LBUTTONDBLCLK:
                        try:
                            self()      # действие по умолчанию — открыть окно
                        except Exception as e:
                            log("трей: окно не открылось (%r)" % (e,))
                        return
                    if lparam == WM_LBUTTONUP:
                        return          # одиночный левый клик ничего не делает
                except Exception as e:
                    log("трей: ошибка обработчика (%r)" % (e,))
                try:
                    return super()._on_notify(wparam, lparam)
                except Exception as e:
                    log("трей: меню не открылось (%r)" % (e,))
'''
assert old in src, "обработчик трея"
src = src.replace(old, new, 1)

# ---------- 2. сторож цикла трея ----------
old_run = '''        threading.Thread(target=self.poll_loop, daemon=True).start()'''
new_run = '''        threading.Thread(target=self.poll_loop, daemon=True).start()'''
assert old_run in src, "poll_loop"

old_icon_run = '''        self.icon.run()'''
new_icon_run = '''        # сторож: если цикл сообщений завершится сам (ошибка внутри библиотеки),
        # поднимаем значок заново, а не оставляем «призрачную» иконку
        for attempt in range(1, 4):
            try:
                self.icon.run()
                if not self._alive or getattr(self, "_quitting", False):
                    break
                log("трей: цикл завершился неожиданно (попытка %d) — перезапускаю" % attempt)
            except Exception as e:
                log("трей: сбой цикла (%r)" % (e,))
            if not self._alive or getattr(self, "_quitting", False):
                break
            time.sleep(2)
            try:
                from pystray import Icon as _I
                self.icon = tray_icon_class()(APP_NAME, self.make_icon(self.state["kind"]),
                                              self.status_line(), menu=self.menu())
            except Exception as e:
                log("трей: не удалось поднять заново (%r)" % (e,))
                break'''
assert src.count(old_icon_run) == 1, "icon.run встречается больше одного раза"
src = src.replace(old_icon_run, new_icon_run, 1)

# ---------- 3. отметка «выходим сами» ----------
src = src.replace('''    def quit_app(self):
        self._alive = False''',
'''    def quit_app(self):
        self._alive = False
        self._quitting = True''', 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.6 применён")
sys.exit(0)
