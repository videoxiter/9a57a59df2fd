# -*- coding: utf-8 -*-
"""Быстрая проверка сгенерированных страниц (для selftest/CI).

Проверяет: DOCTYPE и закрывающий </html>, отсутствие литералов undefined/NaN,
наличие ключевых блоков оперативной главной. Запуск: python scripts/check_pages.py
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

pages = glob.glob("team/**/index.html", recursive=True) + glob.glob("1bceb335668c/**/index.html", recursive=True)
bad = []
for p in pages:
    s = open(p, encoding="utf-8").read()
    head_ok = s.lstrip().lower().startswith("<!doctype html>")
    tail_ok = "</html>" in s[-400:].lower()
    if not (head_ok and tail_ok):
        bad.append(p + " (разметка)")
    # литералы ошибок шаблонизации
    for lit in ("undefined", "NaN"):
        if lit in s:
            bad.append(f"{p} ({lit})")
            break

issues = []
home = "1bceb335668c/index.html"
if os.path.exists(home):
    h = open(home, encoding="utf-8").read()
    for token in ('data-op="sync"', 'id="op-form"', 'id="op-modal"', 'id="home-side"'):
        if token not in h:
            issues.append("главная: нет " + token)

data = open("assets/js/data.js", encoding="utf-8").read()
mark = "window.OTP_DATA = "
payload = json.loads(data[data.index(mark) + len(mark):].strip().rstrip(";"))
months = sorted((payload.get("schedule") or {}).get("months") or {})
if len(months) < 1:
    issues.append("data.js: пустой график")

print(f"страниц: {len(pages)} | проблемных: {len(set(bad))} | замечаний: {len(issues)}")
if bad:
    print("первые проблемные:", sorted(set(bad))[:5])
if issues:
    print("замечания:", issues)
print("месяцы графика:", months, "| generated:", (payload.get("schedule") or {}).get("generated"))
sys.exit(1 if (bad or issues) else 0)
