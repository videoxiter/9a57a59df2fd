# -*- coding: utf-8 -*-
"""Отпуска на месяц: читает страницы «График отпусков» Confluence и пишет в базу.

Источник — дочерние страницы «График отпусков на <год>г.» под 430081574.
Периоды вида «12 января - 16 января» (возможны «продлевается до …»).
Для месяца собираются только пересечения с ним; сотрудник сопоставляется по ФИО.

Запуск: python scripts/sync_vacations.py --month 2026-12
"""
import argparse
import importlib.util
import json
import os
import re
import sys
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAC_ROOT = 430081574
MONTHS_RU = {
    "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "ма": 5, "июн": 6,
    "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

spec = importlib.util.spec_from_file_location("fc", os.path.join(ROOT, "scripts", "fetch_confluence.py"))
fc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fc)


def cloud():
    return json.load(open(os.path.join(ROOT, "scripts", "cloud.json"), encoding="utf-8"))


def rpc(name, body):
    c = cloud()
    req = urllib.request.Request(
        c["url"].rstrip("/") + "/rest/v1/rpc/" + name,
        data=json.dumps(body).encode(),
        headers={"apikey": c["key"], "Authorization": "Bearer " + c["key"],
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode() or "null")


def month_num(word: str):
    w = word.lower()
    for stem, num in MONTHS_RU.items():
        if w.startswith(stem):
            return num
    return None


def parse_period(text: str):
    """«12 января - 16 января» → (месяц1, день1, месяц2, день2) или None."""
    t = re.sub(r"\s+", " ", text.replace("–", "-").replace("—", "-"))
    m = re.search(r"(\d{1,2})\s+([а-яё]+)\s*-\s*(\d{1,2})\s+([а-яё]+)", t, re.I)
    if m:
        return (month_num(m.group(2)), int(m.group(1)), month_num(m.group(4)), int(m.group(3)))
    m = re.search(r"(\d{1,2})\s*-\s*(\d{1,2})\s+([а-яё]+)", t, re.I)
    if m:
        mon = month_num(m.group(3))
        return (mon, int(m.group(1)), mon, int(m.group(2)))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True, help="YYYY-MM")
    ap.add_argument("--no-push", action="store_true", help="только показать, не писать в базу")
    args = ap.parse_args()
    args.push = not args.no_push
    year, mon = int(args.month[:4]), int(args.month[5:7])

    client = fc.Client()
    # 430081574 — сама страница «График отпусков на 2026г.»; дочерние могут быть у других лет
    page = client.get(f"/rest/api/content/{VAC_ROOT}?expand=body.storage")
    title = str(page.get("title") or "")
    html_body = page["body"]["storage"]["value"]
    if str(year) not in title:
        kids = client.children(VAC_ROOT)
        pid = next((v for t, v in kids.items() if str(year) in str(t)), None)
        if not pid:
            print("страница отпусков за", year, "не найдена; в корне:", title)
            return 1
        html_body = client.body(pid)
    # разбор через таблицы Confluence: ФИО часто вписано ссылкой на пользователя,
    # поэтому берём ключи пользователей и превращаем их в имена через API
    p = fc.Tables()
    p.feed(html_body)
    out = []
    for tb in p.tables:
        for r in tb:
            if len(r) < 2:
                continue
            keys = [k for c in r for k in (c.get("keys") or [])]
            fio = client.user(keys[0]) if keys else (r[0]["t"] or "").strip()
            period = (r[1]["t"] or "").strip()
            if not fio or not period or "ФИО" in fio.upper():
                continue
            pr = parse_period(period)
            if not pr:
                continue
            m1, d1, m2, d2 = pr
            if not m1 or not m2:
                continue
            start = date(year, m1, d1)
            end_year = year + (1 if m2 < m1 else 0)
            end = date(end_year, m2, d2)
            first = date(year, mon, 1)
            last = date(year + (1 if mon == 12 else 0), 1 if mon == 12 else mon + 1, 1)
            if end < first or start >= last:
                continue
            from_day = max(1, (start - first).days + 1)
            to_day = min((last - first).days, (end - first).days + 1)
            out.append({"fio": fio, "from_day": from_day, "to_day": to_day, "raw": period})
    print("периодов в месяце", args.month, ":", len(out), [f"{x['fio']} {x['from_day']}-{x['to_day']}" for x in out])

    # сопоставляем ФИО с сотрудниками сайта и пишем в базу
    raw = open(os.path.join(ROOT, "assets", "js", "data.js"), encoding="utf-8").read()
    mark = "window.OTP_DATA = "
    payload = json.loads(raw[raw.index(mark) + len(mark):].strip().rstrip(";"))
    by_fio = {str(e.get("fullName") or "").strip(): str(e.get("id")) for e in payload.get("employees", [])}
    rows = []
    for x in out:
        slug = by_fio.get(x["fio"].strip())
        if not slug:
            print("  нет сотрудника на сайте:", x["fio"])
            continue
        rows.append({"emp_slug": slug, "from_day": x["from_day"], "to_day": x["to_day"], "raw": x["raw"]})
    if args.push:
        res = rpc("otp_vacations_set", {"p_month": args.month, "p_rows": rows})
        print("записано в базу:", (res or {}).get("count"))
    print(json.dumps(rows, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
