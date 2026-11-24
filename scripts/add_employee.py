# -*- coding: utf-8 -*-
"""Добавляет сотрудника в данные сайта и пересобирает его страницы.

Используется мастером в админке: админка пишет задачу в otp_tasks, локальный
агент вызывает этот скрипт. Можно и вручную:

  python scripts/add_employee.py --fio "Иванов Иван Иванович" --slug 1a2b3c4d5e6f
  python scripts/add_employee.py --fio "..." --slug ... --dry-run   # только показать
  python scripts/add_employee.py --fio "..." --slug ... --no-push   # без git push

Что делает: берёт «пустой» профиль (как у сотрудника на адаптации, без KPI),
подставляет ФИО/код, дописывает в assets/js/data.js, запускает генераторы
(страницы team/ и дашборд) и публикует.
"""
import argparse
import copy
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "js", "data.js")
MARK = "window.OTP_DATA = "

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def load_data():
    raw = open(DATA, encoding="utf-8").read()
    head = raw[:raw.index(MARK)]
    payload = json.loads(raw[raw.index(MARK) + len(MARK):].strip().rstrip(";"))
    return head, payload


def save_data(head, payload):
    with open(DATA, "w", encoding="utf-8") as f:
        f.write(head + MARK + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")


def short_name(fio):
    p = [x for x in re.split(r"\s+", fio.strip()) if x]
    if len(p) >= 3:
        return f"{p[0]} {p[1][0]}.{p[2][0]}."
    if len(p) == 2:
        return f"{p[0]} {p[1][0]}."
    return fio.strip()


def blank_employee(payload, fio, slug, role):
    """Копия «пустого» профиля: все метрики null, текущего KPI нет."""
    tpl = next((e for e in payload["employees"]
                if e.get("current") is None and e.get("status") != "left"), None)
    if tpl is None:
        tpl = next((e for e in payload["employees"] if e.get("status") != "left"), None)
    if tpl is None:
        raise SystemExit("в data.js нет ни одного сотрудника — не из чего собрать шаблон")
    emp = copy.deepcopy(tpl)
    emp.update({
        "id": slug,
        "slug": slug,
        "fullName": fio.strip(),
        "shortName": short_name(fio),
        "role": role or "Специалист ТП",
        "status": "active",
        "canManage": False,
        "rank": None,
        "avg": None,
        "current": None,
        "lvl": 1,
        "stars": 0,
        "stars_in_level": 0,
        "stars_delta": 0,
        "growth_delta": 0,
        "awards": [],
        "bonuses": [],
        "praise": [],
        "recognition": [],
        "recommendations": [],
        "strengths": [],
        "growth": [],
        "starLog": [],
        "personal": {},
        "income": {},
        "hours_base": 0,
        "tagline": "",
        "siteTitle": fio.strip(),
    })
    # история месяцев остаётся «пустой» (как у шаблона): null по всем метрикам
    return emp


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fio", required=True)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--role", default="Специалист ТП")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-push", action="store_true")
    args = ap.parse_args()

    slug = re.sub(r"[^0-9a-zA-Z]", "", args.slug)
    if len(slug) < 6:
        raise SystemExit("код страницы: минимум 6 символов (латиница/цифры)")

    head, payload = load_data()
    if any((e.get("slug") or e.get("id")) == slug or e.get("id") == slug for e in payload["employees"]):
        raise SystemExit("сотрудник с таким кодом уже есть")
    if any(e.get("fullName") == args.fio.strip() for e in payload["employees"]):
        raise SystemExit("сотрудник с таким ФИО уже есть")

    emp = blank_employee(payload, args.fio, slug, args.role)
    print("новый сотрудник:", emp["fullName"], "| код:", slug, "| короткое имя:", emp["shortName"])
    print("месяцев в истории:", len(emp.get("history") or []), "| текущий KPI:", emp.get("current"))
    if args.dry_run:
        print("--dry-run: файлы не менялись")
        return 0

    payload["employees"].append(emp)
    save_data(head, payload)
    print("data.js обновлён")

    for script in ("generate_pages.py", "generate_dashboard.py"):
        print("→", script)
        subprocess.run([sys.executable, os.path.join(ROOT, "scripts", script)], cwd=ROOT, check=True)

    if not args.no_push:
        subprocess.run(["git", "-C", ROOT, "add", "-A"], check=True)
        st = subprocess.run(["git", "-C", ROOT, "status", "--porcelain"], capture_output=True, text=True)
        if st.stdout.strip():
            subprocess.run(["git", "-C", ROOT, "commit", "-m",
                            f"new employee: {emp['fullName']} ({slug})"], check=True)
            subprocess.run(["git", "-C", ROOT, "push", "origin", "main"], check=True)
            print("опубликовано")
        else:
            print("изменений нет")
    return 0


if __name__ == "__main__":
    sys.exit(main())
