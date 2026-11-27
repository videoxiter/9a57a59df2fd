# -*- coding: utf-8 -*-
"""Тест правила «Без заявки»: время идёт; отсутствие с причиной — пауза."""
import os
import sys
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray as t  # noqa: E402


def build(reason, minutes_absent=60):
    now = datetime.now(t.otp_tray_tz()) if hasattr(t, "otp_tray_tz") else datetime.now(t.TZ)
    return [
        {"type": "shift_start", "at": (now - timedelta(hours=2)).isoformat()},
        {"type": "absence_start", "reason": reason,
         "at": (now - timedelta(minutes=minutes_absent)).isoformat()},
    ]


def main():
    a = t.compute_state(build("Без заявки"))
    b = t.compute_state(build("Покурить"))
    print("«Без заявки» →", a["sec"], "с | статус:", a["label"])
    print("«Покурить»  →", b["sec"], "с | статус:", b["label"])
    bad = 0
    if a["sec"] < 7000:          # ~2 часа: время шло всё время
        print("ОШИБКА: с «Без заявки» время остановилось")
        bad += 1
    if not (3500 < b["sec"] < 3700):   # ~1 час: пауза сработала
        print("ОШИБКА: с причиной время не встало на паузу")
        bad += 1
    if a["label"] != "Временное отсутствие":
        print("ОШИБКА: статус не отображается")
        bad += 1
    if bad:
        return 1
    print("ok: «Без заявки» — время идёт, с причиной — пауза")
    return 0


if __name__ == "__main__":
    sys.exit(main())
