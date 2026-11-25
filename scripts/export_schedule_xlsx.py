# -*- coding: utf-8 -*-
"""Выгрузка графика месяца в xlsx с окраской (те же символы, что в Confluence).

Источник — опубликованный месяц из базы (RPC otp_schedule_public).
Результат — downloads/grafik-YYYY-MM.xlsx + коммит и публикация на сайт,
чтобы файл можно было скачать по ссылке.

Запуск: python scripts/export_schedule_xlsx.py --month 2026-12 [--no-push]
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.request

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "js", "data.js")
MARK = "window.OTP_DATA = "
OUT_DIR = os.path.join(ROOT, "downloads")
PAGES = "https://videoxiter.github.io/9a57a59df2fd"

# цвет по типу символа (как в Confluence: смены — синие, выходные смены — жёлтые,
# отпуск — сиреневый, больничный — красный, выходной — серый, дежурства — зелёные)
COLORS = {
    "shift": "DCE9F7", "week": "FFF3D0", "duty": "DDF3E4", "extra": "FFE6CC",
    "off": "F2F4F7", "vacation": "E7DDF7", "sick": "FBDCDC", "study": "F6DDF7",
    "dayoff": "E9EDF2", "trip": "DCE7FB",
}
KIND_OF = {
    "1": "shift", "2": "shift", "3": "shift", "2Р": "shift", "3Р": "shift",
    "I": "week", "II": "week", "III": "week",
    "Ср": "duty", "Т": "duty", "Д": "extra",
    "В": "off", "О": "vacation", "Б": "sick", "У": "study",
    "X": "dayoff", "НВ": "dayoff", "Я": "dayoff", "К": "trip",
}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True)
    ap.add_argument("--no-push", action="store_true")
    args = ap.parse_args()

    res = rpc("otp_schedule_public", {"p_month": args.month})
    sch = (res or {}).get("schedule")
    if not sch:
        print("месяц", args.month, "не опубликован")
        return 1

    raw = open(DATA, encoding="utf-8").read()
    payload = json.loads(raw[raw.index(MARK) + len(MARK):].strip().rstrip(";"))
    by_slug = {}
    for e in payload.get("employees", []):
        by_slug[str(e.get("id"))] = e
        by_slug[str(e.get("slug"))] = e

    year, mon = args.month.split("-")
    days = list(range(1, 32))
    wb = Workbook()
    ws = wb.active
    ws.title = f"{mon}.{year}"
    thin = Side(style="thin", color="B9C2CE")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    ws.cell(row=1, column=1, value="ФИО").font = Font(bold=True)
    for i, d in enumerate(days):
        c = ws.cell(row=1, column=2 + i, value=d)
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
        ws.column_dimensions[get_column_letter(2 + i)].width = 4
    ws.column_dimensions["A"].width = 30
    ws.cell(row=1, column=2 + len(days), value="смен").font = Font(bold=True)

    row = 2
    cell = sch.get("cell") or {}
    for slug, dmap in cell.items():
        emp = by_slug.get(str(slug))
        fio = (emp or {}).get("fullName") or (emp or {}).get("fio") or str(slug)
        ws.cell(row=row, column=1, value=fio).border = border
        shifts = 0
        for i, d in enumerate(days):
            sym = str((dmap or {}).get(str(d)) or "")
            c = ws.cell(row=row, column=2 + i, value=sym or None)
            c.alignment = Alignment(horizontal="center")
            c.border = border
            kind = KIND_OF.get(sym)
            if kind:
                c.fill = PatternFill("solid", fgColor=COLORS.get(kind, "FFFFFF"))
            if kind in ("shift", "week"):
                shifts += 1
        t = ws.cell(row=row, column=2 + len(days), value=shifts)
        t.alignment = Alignment(horizontal="center")
        t.border = border
        row += 1

    ws.freeze_panes = "B2"
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"grafik-{args.month}.xlsx")
    wb.save(out)
    print(f"готово: {out} · строк {row - 2}")

    if not args.no_push:
        subprocess.run(["git", "-C", ROOT, "add", "downloads"], check=True)
        st = subprocess.run(["git", "-C", ROOT, "status", "--porcelain"], capture_output=True, text=True)
        if st.stdout.strip():
            subprocess.run(["git", "-C", ROOT, "commit", "-m", f"schedule xlsx {args.month}"], check=True)
            subprocess.run(["git", "-C", ROOT, "push", "origin", "main"], check=True)
            print("ссылка:", f"{PAGES}/downloads/grafik-{args.month}.xlsx")
    return 0


if __name__ == "__main__":
    sys.exit(main())
