# -*- coding: utf-8 -*-
"""Проверка, что счётчик времени идёт сам (без запросов к серверу).

Берём события «смена началась 2 часа назад» и считаем состояние дважды
с паузой: секунды обязаны вырасти.
"""
import os
import sys
import time
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray  # noqa: E402


def main():
    now = datetime.now(otp_tray.TZ)
    events = [{"type": "shift_start", "at": (now - timedelta(hours=2)).isoformat()}]
    a = otp_tray.compute_state(events)
    time.sleep(2.2)
    b = otp_tray.compute_state(events)
    delta = (b.get("sec") or 0) - (a.get("sec") or 0)
    print("секунды:", a.get("sec"), "→", b.get("sec"), "| прирост:", delta)
    if delta >= 2:
        print("ok: время идёт без обращения к серверу")

    # проверяем именно тот метод, что обновляет окно: tick_state
    app = object.__new__(otp_tray.App)
    app.events = events
    app.state = otp_tray.compute_state(events)
    app.icon = None
    app.update_icon = lambda: None
    first = app.state.get("sec") or 0
    time.sleep(2.2)
    app.tick_state()
    second = app.state.get("sec") or 0
    print("tick_state:", first, "→", second)
    if second - first < 2:
        print("ОШИБКА: tick_state не двигает время")
        return 1
    print("ok: окно получает свежее время каждую секунду")
    return 0


if __name__ == "__main__":
    sys.exit(main())
