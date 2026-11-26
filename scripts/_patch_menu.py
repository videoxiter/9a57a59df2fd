# -*- coding: utf-8 -*-
"""Патч меню трея: pystray 0.19.5 не поддерживает icon у пункта,
поэтому статусы показываем символами в тексте. Заодно убираем сбой запуска."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")

NEW = '''    def menu(self):
        from pystray import Menu, MenuItem
        return Menu(
            MenuItem("Открыть окно ОТП", self.main_window, default=True),
            Menu.SEPARATOR,
            MenuItem(self.status_line, None, enabled=False),
            MenuItem("Горячие: Ctrl+Alt+S/B/L/A/R/E", None, enabled=False),
            MenuItem(lambda _: ("ОТМЕНА · " + self.pending["label"]) if self.pending else "Отмена",
                     lambda: self.cancel_pending(), enabled=lambda _: bool(self.pending)),
            Menu.SEPARATOR,
            MenuItem("▶  Начать смену", lambda: self.act("start"), enabled=self.can_start),
            MenuItem("☕  Техперерыв 1", lambda: self.act("slot-tech1"), enabled=lambda _: self.can_slot("tech1")),
            MenuItem("☕  Техперерыв 2", lambda: self.act("slot-tech2"), enabled=lambda _: self.can_slot("tech2")),
            MenuItem("🍽  Обед", lambda: self.act("slot-lunch"), enabled=lambda _: self.can_slot("lunch")),
            MenuItem("↩  Вернуться с перерыва", lambda: self.act("return"), enabled=self.can_return),
            MenuItem("🚶  Временное отсутствие", lambda: self.act("absence"), enabled=lambda _: self.can_slot("absence")),
            MenuItem("■  Завершить смену", lambda: self.act("stop"), enabled=self.can_finish),
            Menu.SEPARATOR,
            MenuItem("Моя страница на сайте", lambda: webbrowser.open(self.page_url())),
            MenuItem("Проверить обновление", lambda: threading.Thread(target=self.check_updates_manual, daemon=True).start()),
            MenuItem("Проверить новые данные", lambda: threading.Thread(target=self.check_content_manual, daemon=True).start()),
            Menu.SEPARATOR,
            MenuItem("Справка", self.help_window),
            MenuItem("Горячие клавиши…", self.hotkeys_dialog),
            MenuItem("Запускать при входе в Windows", self.toggle_autostart,
                     checked=lambda _: autostart_enabled()),
            MenuItem("О программе", self.about_window),
            MenuItem("Журнал приложения", lambda: webbrowser.open(LOG_PATH.as_uri())),
            MenuItem("Выход", lambda: self.quit_app()),
        )

'''

src = open(PATH, encoding="utf-8").read()
start = src.index("    def menu(self):")
end = src.index("    def push_feed(self, text):")
src = src[:start] + NEW + src[end:]
open(PATH, "w", encoding="utf-8", newline="").write(src)
print("меню заменено, icon убран")
sys.exit(0)
