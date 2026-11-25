# -*- coding: utf-8 -*-
"""Выгрузка графика месяца в Confluence новой страницей (по образцу существующих).

Источник — опубликованный месяц из базы (RPC otp_schedule_public).
Страница создаётся дочерней к «Графики рабочего времени» (57901080).
Если страница с таким названием уже есть — обновляется её содержимое.

Запуск:
  python scripts/publish_confluence_schedule.py --month 2026-12            # создать/обновить
  python scripts/publish_confluence_schedule.py --month 2026-12 --dry-run  # только собрать HTML
"""
import argparse
import html
import importlib.util
import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "js", "data.js")
MARK = "window.OTP_DATA = "
MONTHS = ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
          "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

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


def build_html(month, cell, employees):
    year, mon = month.split("-")
    days = 31 if mon in ("01", "03", "05", "07", "08", "10", "12") else 30
    if mon == "02":
        days = 29 if (int(year) % 4 == 0 and int(year) % 100 != 0) or int(year) % 400 == 0 else 28
    by_slug = {}
    for e in employees:
        by_slug[str(e.get("id"))] = e
        by_slug[str(e.get("slug"))] = e
    head = "".join(f"<th>{d}</th>" for d in range(1, days + 1))
    rows = []
    for slug, dmap in (cell or {}).items():
        emp = by_slug.get(str(slug)) or {}
        fio = emp.get("fullName") or str(slug)
        tds = "".join(f"<td>{html.escape(str((dmap or {}).get(str(d)) or ''))}</td>" for d in range(1, days + 1))
        rows.append(f"<tr><th>{html.escape(fio)}</th>{tds}</tr>")
    title = f"График на {MONTHS[int(mon)]} {year}г."
    body = (f"<h2>{html.escape(title)}</h2>"
            f"<p>Сформировано в системе ОТП. Символы соответствуют легенде графиков.</p>"
            f"<table><tbody><tr><th>ФИО</th>{head}</tr>{''.join(rows)}</tbody></table>")
    return title, body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--month", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    res = rpc("otp_schedule_public", {"p_month": args.month})
    sch = (res or {}).get("schedule")
    if not sch:
        print("месяц", args.month, "не опубликован")
        return 1

    raw = open(DATA, encoding="utf-8").read()
    payload = json.loads(raw[raw.index(MARK) + len(MARK):].strip().rstrip(";"))
    title, body = build_html(args.month, sch.get("cell") or {}, payload.get("employees") or [])

    if args.dry_run:
        out = os.path.join(ROOT, "downloads", f"confluence-{args.month}.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(body)
        print("dry-run: HTML собран →", out)
        return 0

    client = fc.Client()
    existing = client.children(fc.SHIFTS_ROOT)
    headers = {"Authorization": "Basic " + client.auth, "Content-Type": "application/json",
               "Accept": "application/json"}
    try:
        if title in existing:
            pid = existing[title]
            page = client.get(f"/rest/api/content/{pid}?expand=version")
            ver = int(page["version"]["number"]) + 1
            data = json.dumps({"id": str(pid), "type": "page", "title": title,
                               "space": {"key": page["space"]["key"]},
                               "body": {"storage": {"value": body, "representation": "storage"}},
                               "version": {"number": ver}}).encode()
            req = urllib.request.Request(f"{fc.BASE}/rest/api/content/{pid}", data=data,
                                         headers=headers, method="PUT")
            with urllib.request.urlopen(req, timeout=90) as r:
                out = json.loads(r.read().decode())
            print("страница обновлена:", out.get("_links", {}).get("base", "") + out.get("_links", {}).get("webui", ""))
        else:
            data = json.dumps({"type": "page", "title": title,
                               "space": {"key": "RTFM"},
                               "ancestors": [{"id": str(fc.SHIFTS_ROOT)}],
                               "body": {"storage": {"value": body, "representation": "storage"}}}).encode()
            req = urllib.request.Request(f"{fc.BASE}/rest/api/content", data=data,
                                         headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=90) as r:
                out = json.loads(r.read().decode())
            print("страница создана:", out.get("_links", {}).get("base", "") + out.get("_links", {}).get("webui", ""))
        return 0
    except Exception as e:
        print("не удалось выгрузить в Confluence:", e)
        return 2


if __name__ == "__main__":
    sys.exit(main())
