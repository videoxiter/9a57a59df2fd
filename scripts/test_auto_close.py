# -*- coding: utf-8 -*-
"""Тест правила автозакрытия: незакрытая смена считается закрытой в 23:59:59."""
import os
import sys
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray as t  # noqa: E402


def main():
    now = datetime.now(t.TZ)
    day = (now - timedelta(days=1)).date()
    start = datetime(day.year, day.month, day.day, 9, 0, tzinfo=t.TZ)
    close = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=t.TZ)

    # что видит сервер после автозакрытия
    closed = t.compute_state([
        {"type": "shift_start", "at": start.isoformat()},
        {"type": "shift_stop", "at": close.isoformat()},
    ])
    # и что было бы без него (смена «висит»)
    open_state = t.compute_state([{"type": "shift_start", "at": start.isoformat()}])

    print("без автозакрытия:", open_state["sec"], "с, статус:", open_state["label"])
    print("после автозакрытия:", closed["sec"], "с, статус:", closed["label"])
    if closed["label"] != "Смена завершена":
        print("ОШИБКА: смена не считается завершённой")
        return 1
    hours = closed["sec"] / 3600
    if not (14.0 < hours < 15.1):     # 09:00–23:59:59 ≈ 15 ч
        print("ОШИБКА: неверная длительность", hours)
        return 1
    print("ok: смена закрывается ровно в 23:59:59")
    return 0


if __name__ == "__main__":
    sys.exit(main())
