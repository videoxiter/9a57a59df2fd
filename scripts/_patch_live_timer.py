# -*- coding: utf-8 -*-
"""Патч 2.3.1: счётчик в окне идёт каждую секунду.

Было: self.state пересчитывался только при запросе к серверу (раз в минуту),
поэтому в окне «замирали» секунды, а статус отставал.
Стало: события кэшируются, состояние пересчитывается локально каждую секунду
(без обращений к сети), сеть — только для новых событий.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# 1) refresh кэширует события и пересчитывает состояние
old_refresh = '''    def refresh(self):
        try:
            self.state = compute_state(self.api.events_today())
        except Exception as e:
            log("нет связи при обновлении: %r" % (e,))
            self.state = dict(self.state, kind="offline", label="Нет связи")
        self.update_icon()
        return self.state'''
new_refresh = '''    def refresh(self):
        try:
            self.events = self.api.events_today()
            self.state = compute_state(self.events or [])
        except Exception as e:
            log("нет связи при обновлении: %r" % (e,))
            self.state = dict(self.state, kind="offline", label="Нет связи")
        self.update_icon()
        return self.state

    def tick_state(self):
        """Пересчёт времени по локальным часам — раз в секунду, без сети."""
        try:
            if self.events:
                fresh = compute_state(self.events)
                # смена могла завершиться по локальным часам — значок тоже обновляем
                if fresh.get("kind") != self.state.get("kind"):
                    self.state = fresh
                    self.update_icon()
                else:
                    self.state = fresh
        except Exception as e:
            log("пересчёт состояния: %r" % (e,))'''
assert old_refresh in src, "refresh"
src = src.replace(old_refresh, new_refresh, 1)

# 2) поток пересчёта
old_loop = '''    def countdown_loop(self):'''
new_loop = '''    def state_loop(self):
        """Держит время в окне живым: пересчёт каждую секунду."""
        while self._alive:
            time.sleep(1)
            self.tick_state()

    def countdown_loop(self):'''
assert old_loop in src, "countdown_loop"
src = src.replace(old_loop, new_loop, 1)

# 3) запуск потока рядом с остальными
src = src.replace('''        threading.Thread(target=self.poll_loop, daemon=True).start()''',
'''        threading.Thread(target=self.poll_loop, daemon=True).start()
        threading.Thread(target=self.state_loop, daemon=True).start()''', 1)

# 4) начальное значение кэша
src = src.replace('''        self._alive = True''', '''        self._alive = True
        self.events = []''', 1)

# 5) в окне тик раз в 500 мс уже есть; секунды пойдут из свежего state
open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 2.3.1 применён")
sys.exit(0)
