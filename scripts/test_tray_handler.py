# -*- coding: utf-8 -*-
"""Тест обработчика кликов трея: ни одно сообщение не должно бросать исключение.

Раньше обращение к несуществующей константе pystray убивало цикл сообщений,
и значок оставался «призраком». Тест ловит такую регрессию.

Запуск: python scripts/test_tray_handler.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray  # noqa: E402


def main():
    cls = otp_tray.tray_icon_class()
    fake = object.__new__(cls)          # без инициализации окна: проверяем только обработчик
    fake._running = False               # чтобы __del__ pystray не ругался
    messages = {
        "левый одиночный (0x0202)": 0x0202,
        "левый двойной (0x0203)": 0x0203,
        "правый (0x0205)": 0x0205,
        "неизвестное (0x0200)": 0x0200,
        "ноль": 0,
    }
    bad = 0
    for name, code in messages.items():
        try:
            cls._on_notify(fake, 0, code)
            print(f"  ok  {name}")
        except Exception as e:
            bad += 1
            print(f"  ОШИБКА {name}: {e!r}")
    if bad:
        print(f"провалено: {bad}")
        return 1
    print("обработчик трея: все сообщения обрабатываются без исключений")
    return 0


if __name__ == "__main__":
    sys.exit(main())
