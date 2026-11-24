# -*- coding: utf-8 -*-
"""Применяет KPI и бонусы из админки (таблица otp_kpi) к data.js.

Зачем: сейчас KPI собираются из scripts/extracted.json и itogi/*.txt — этих
файлов на рабочей машине нет, а править их руками неудобно. Теперь значения
вводятся в админке (5 метрик за месяц + бонус), хранятся в Supabase и
применяются поверх data.js. Агент вызывает скрипт после каждой пересборки,
поэтому ручные значения не затираются текстовыми источниками.

Запуск:
  python scripts/apply_kpi.py             # применить и опубликовать
  python scripts/apply_kpi.py --no-push   # только файлы
  python scripts/apply_kpi.py --dry-run   # показать, что изменится
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
MKEYS = ["quality", "learnability", "initiative", "engagement", "discipline"]
MNAMES = {"quality": "Качество", "learnability": "Обучаемость", "initiative": "Инициатива",
          "engagement": "Вовлечённость", "discipline": "Дисциплина"}

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def cloud():
    try:
        return json.load(open(os.path.join(ROOT, "scripts", "cloud.json"), encoding="utf-8"))
    except Exception:
        return None


def sb_get(path):
    c = cloud()
    if not c:
        raise SystemExit("нет scripts/cloud.json")
    url = c["url"].rstrip("/") + "/rest/v1/" + path
    req = urllib.request.Request(url, headers={"apikey": c["key"], "Authorization": "Bearer " + c["key"]})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8") or "null")


def load_data():
    raw = open(DATA, encoding="utf-8").read()
    head = raw[:raw.index(MARK)]
    payload = json.loads(raw[raw.index(MARK) + len(MARK):].strip().rstrip(";"))
    return head, payload


def save_data(head, payload):
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(head + MARK + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")


def apply_rows(payload, rows, dry=False):
    changed = 0
    by_slug = {}
    for e in payload["employees"]:
        by_slug[e.get("slug") or e.get("id")] = e
        by_slug[e.get("id")] = e
    for r in rows:
        emp = by_slug.get(r.get("emp_slug"))
        if not emp:
            print("  пропуск: нет сотрудника", r.get("emp_slug"))
            continue
        month = str(r.get("month") or "")
        hist = emp.get("history") or []
        item = next((h for h in hist if str(h.get("key")) == month), None)
        if item is None:
            print("  пропуск: у", emp.get("fullName"), "нет месяца", month)
            continue
        for k in MKEYS:
            v = r.get(k)
            if v is not None:
                item[k] = int(v)
        if r.get("bonus") is not None:
            item["bonus"] = int(r["bonus"])
        # дублируем в kpi-объект, если он есть (его читают графики)
        if isinstance(item.get("kpi"), dict):
            for k in MKEYS:
                if item[k] is not None:
                    item["kpi"][k] = item[k]
        changed += 1
        print(f"  {emp.get('fullName')} · {month}: " +
              ", ".join(f"{MNAMES[k]}={item[k]}" for k in MKEYS if item.get(k) is not None) +
              (f", бонус={item.get('bonus')}" if item.get("bonus") is not None else ""))
    if dry or not changed:
        return changed

    # пересчёт текущего KPI, среднего и места в рейтинге
    for emp in payload["employees"]:
        hist = emp.get("history") or []
        with_kpi = [h for h in hist if all(h.get(k) is not None for k in MKEYS)]
        if with_kpi:
            last = with_kpi[-1]
            emp["current"] = {k: last[k] for k in MKEYS}
            emp["avg"] = round(sum(last[k] for k in MKEYS) / len(MKEYS), 1)
        # если KPI нет вообще (адаптация) — оставляем как было
    rated = [e for e in payload["employees"] if e.get("current") and e.get("status") != "left"]
    rated.sort(key=lambda e: (-(e.get("avg") or 0), str(e.get("fullName"))))
    for i, e in enumerate(rated, 1):
        e["rank"] = i
    for e in payload["employees"]:
        if not e.get("current"):
            e["rank"] = None
    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-push", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    try:
        rows = sb_get("otp_kpi?select=*&order=month.asc") or []
    except Exception as e:
        print("не удалось прочитать otp_kpi:", e)
        return 1
    if not rows:
        print("в otp_kpi нет записей — нечего применять")
        return 0

    head, payload = load_data()
    print(f"записей KPI: {len(rows)}")
    changed = apply_rows(payload, rows, dry=args.dry_run)
    if args.dry_run:
        print("--dry-run: файлы не менялись")
        return 0
    if not changed:
        print("изменений нет")
        return 0
    save_data(head, payload)
    print("data.js обновлён")
    for script in ("generate_pages.py", "generate_dashboard.py"):
        print("→", script)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", script)], cwd=ROOT, check=True)

    if not args.no_push:
        subprocess.run(["git", "-C", ROOT, "add", "-A"], check=True)
        st = subprocess.run(["git", "-C", ROOT, "status", "--porcelain"], capture_output=True, text=True)
        if st.stdout.strip():
            subprocess.run(["git", "-C", ROOT, "commit", "-m", "KPI: apply manual entries from admin"], check=True)
            subprocess.run(["git", "-C", ROOT, "push", "origin", "main"], check=True)
            print("опубликовано")
        else:
            print("изменений для публикации нет")
    return 0


if __name__ == "__main__":
    sys.exit(main())
