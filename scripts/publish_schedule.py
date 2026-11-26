# -*- coding: utf-8 -*-
"""Публикует опубликованный график из базы в data.js и страницы сайта.

Агент вызывает скрипт по задаче `publish_schedule` из админки:
  1. читает опубликованный месяц через RPC otp_schedule_public (без админ-токена);
  2. переносит ячейки в data.js → schedule.months[month].shifts (с легендой символов);
  3. пересобирает страницы и дашборд, коммитит и публикует.

Запуск: python scripts/publish_schedule.py --month 2026-12 [--no-push]
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "js", "data.js")
MARK = "window.OTP_DATA = "

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def cloud():
    return json.load(open(os.path.join(ROOT, "scripts", "cloud.json"), encoding="utf-8"))


def rpc(name, body):
    c = cloud()
    url = c["url"].rstrip("/") + "/rest/v1/rpc/" + name
    req = urllib.request.Request(url, data=json.dumps(body).encode(),
                                headers={"apikey": c["key"], "Authorization": "Bearer " + c["key"],
                                         "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode() or "null")


def load_data():
    raw = open(DATA, encoding="utf-8").read()
    head = raw[:raw.index(MARK)]
    payload = json.loads(raw[raw.index(MARK) + len(MARK):].strip().rstrip(";"))
    return head, payload


def save_data(head, payload):
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(head + MARK + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True)
    ap.add_argument("--no-push", action="store_true")
    args = ap.parse_args()

    res = rpc("otp_schedule_public", {"p_month": args.month})
    sch = (res or {}).get("schedule")
    if not sch:
        print("месяц", args.month, "не опубликован — нечего переносить")
        return 0

    legend = json.load(open(os.path.join(ROOT, "scripts", "schedule.json"), encoding="utf-8")).get("legend") or {}
    head, payload = load_data()
    by_slug = {}
    for e in payload.get("employees", []):
        by_slug[str(e.get("id"))] = e
        by_slug[str(e.get("slug"))] = e

    months = payload.setdefault("schedule", {}).setdefault("months", {})
    month = months.setdefault(args.month, {})
    shifts = month.setdefault("shifts", {})
    month.setdefault("lines", {})
    month.setdefault("facts", [])

    changed = 0
    for slug, days in (sch.get("cell") or {}).items():
        emp = by_slug.get(str(slug))
        if not emp:
            print("  пропуск: нет сотрудника", slug)
            continue
        fio = emp.get("fullName") or emp.get("fio") or slug
        row = {}
        for day, sym in (days or {}).items():
            if not sym:
                continue
            info = legend.get(str(sym)) or {"kind": "off", "title": str(sym), "time": None, "breaks": [], "lunch": None}
            row[str(day)] = {
                "sym": str(sym),
                "kind": info.get("kind") or "off",
                "title": info.get("title") or str(sym),
                "time": info.get("time"),
                "breaks": info.get("breaks") or [],
                "lunch": info.get("lunch"),
            }
        shifts[fio] = row
        changed += 1
    print(f"перенесено сотрудников: {changed} · месяц {args.month} · версия {sch.get('version')}")
    if not changed:
        return 0

    save_data(head, payload)
    for script in ("generate_pages.py", "generate_dashboard.py"):
        print("→", script)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", script)], cwd=ROOT, check=True)
    # данные страниц живут в базе: после генерации заливаем payload'ы
    print("→ publish_profiles.py")
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "publish_profiles.py")],
                   cwd=ROOT, check=True)

    if not args.no_push:
        subprocess.run(["git", "-C", ROOT, "add", "-A"], check=True)
        st = subprocess.run(["git", "-C", ROOT, "status", "--porcelain"], capture_output=True, text=True)
        if st.stdout.strip():
            subprocess.run(["git", "-C", ROOT, "commit", "-m",
                            f"schedule published: {args.month} (v{sch.get('version')})"], check=True)
            subprocess.run(["git", "-C", ROOT, "push", "origin", "main"], check=True)
            print("опубликовано на сайт")
        else:
            print("изменений нет")
    return 0


if __name__ == "__main__":
    sys.exit(main())
