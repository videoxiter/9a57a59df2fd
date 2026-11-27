# -*- coding: utf-8 -*-
"""Тест подписи кнопки возврата для разных состояний."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray as t  # noqa: E402


def label(state):
    app = object.__new__(t.App)
    app.state = state
    return app.return_text()


def main():
    cases = [
        ({"kind": "pause", "active": {"slot": "lunch"}}, "Вернуться с обеда"),
        ({"kind": "pause", "active": {"slot": "tech1"}}, "Вернуться с перерыва"),
        ({"kind": "pause", "active": {"slot": "tech2"}}, "Вернуться с перерыва"),
        ({"kind": "absence", "active": {"slot": "absence"}}, "Вернуться после отсутствия"),
        ({"kind": "work", "active": None}, "Вернуться с перерыва"),
        ({"kind": "idle", "active": None}, "Вернуться с перерыва"),
    ]
    bad = 0
    for state, want in cases:
        got = label(state)
        ok = got == want
        bad += 0 if ok else 1
        print(("  ok  " if ok else "  ОШИБКА ") + f"{state.get('active')} → «{got}»")
    if bad:
        print("провалено:", bad)
        return 1
    print("подписи возврата верны")
    return 0


if __name__ == "__main__":
    sys.exit(main())
