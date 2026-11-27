# -*- coding: utf-8 -*-
"""Тест сравнения версий: буква после номера не должна приводить к откату."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray as t  # noqa: E402


def main():
    cases = [
        ("2.3.3a", "2.3.3", 1),   # буква новее, чем без неё
        ("2.3.3", "2.3.3a", -1),
        ("2.3.4", "2.3.3a", 1),
        ("2.3.3b", "2.3.3a", 1),
        ("2.3.3a", "2.3.3a", 0),
        ("1.9.0", "2.0.0", -1),
    ]
    bad = 0
    for a, b, want in cases:
        got = (t.ver_tuple(a) > t.ver_tuple(b)) - (t.ver_tuple(a) < t.ver_tuple(b))
        mark = "ok" if got == want else "ОШИБКА"
        if got != want:
            bad += 1
        print(f"  {mark}: {a} vs {b} → {got} (ожидалось {want})")
    if bad:
        print("провалено:", bad)
        return 1
    print("сравнение версий: всё верно")
    return 0


if __name__ == "__main__":
    sys.exit(main())
