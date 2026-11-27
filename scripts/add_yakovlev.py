# -*- coding: utf-8 -*-
"""Добавляет Яковлева Е.Е. в данные сайта и выставляет порядок как в Confluence (ноябрь 2026).

Порядок взят из scripts/schedule.json (месяц 2026-11, порядок строк графика Confluence):
  Яковлев, Фролов, Болгов, Мельников, Хасанов, Пестовский, Елисеев,
  Завьялов, Юрьев, Агарков, Вторыгин, Поспелова

Новому сотруднику копируется структура существующего (пустая история), чтобы
личная страница сразу открывалась. Данные пишутся в assets/js/data.js.
"""
import copy
import json
import os
import secrets
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "js", "data.js")

ORDER = [
    "Яковлев Евгений Евгеньевич",
    "Фролов Павел Александрович",
    "Болгов Андрей Владимирович",
    "Мельников Алексей Сергеевич",
    "Хасанов Радион Равильевич",
    "Пестовский Георгий Александрович",
    "Елисеев Антон Андреевич",
    "Завьялов Максим Вячеславович",
    "Юрьев Сергей Олегович",
    "Агарков Владимир Сергеевич",
    "Вторыгин Ефим Владимирович",
    "Поспелова Екатерина Алексеевна",
]

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    raw = open(DATA, encoding="utf-8").read()
    mark = "window.OTP_DATA = "
    i = raw.index(mark) + len(mark)
    data = json.loads(raw[i:].strip().rstrip(";"))
    emps = data["employees"]

    def norm(name):
        n = str(name or "").lower().replace("радион", "родион").replace("ё", "е")
        parts = n.split()
        return (parts[0] if parts else "") + " " + (parts[1][:3] if len(parts) > 1 else "")

    def find(name):
        key = norm(name)
        for e in emps:
            if norm(e.get("fullName")) == key:
                return e
        return None

    # 1. добавляем Яковлева, если его ещё нет
    if find("Яковлев Евгений Евгеньевич"):
        print("Яковлев уже есть в данных")
    else:
        base = copy.deepcopy(find("Фролов Павел Александрович") or emps[0])
        slug = secrets.token_hex(6)
        base.update({
            "id": slug,
            "slug": slug,
            "fullName": "Яковлев Евгений Евгеньевич",
            "shortName": "Евгений",
            "role": "Руководитель отдела технической поддержки",
            "siteTitle": "Руководитель ОТП",
            "tagline": "руководитель отдела",
            "status": "active",
            "canManage": True,
            "history": [],
            "current": None,
            "avg": 0,
            "growth_delta": 0,
            "hours_base": 0,
            "stars": 0,
            "stars_delta": 0,
            "starLog": [],
            "lvl": 1,
            "stars_in_level": 0,
            "bonuses": [],
            "strengths": [],
            "growth": [],
            "recommendations": [],
            "awards": [],
            "recognition": [],
            "praise": [],
            "rank": 1,
            "income": {},
        })
        # убираем служебные поля, которых у нового сотрудника быть не должно
        for k in ("literature", "resources", "personal"):
            base.pop(k, None)
        emps.insert(0, base)
        print("добавлен Яковлев Евгений Евгеньевич, slug:", slug)

    # 2. порядок: сначала список из Confluence, затем остальные (кроме уволенных — они в конец)
    by_name = {}
    for e in emps:
        by_name.setdefault(e.get("fullName"), e)
    ordered, used = [], set()
    for name in ORDER:
        e = find(name)
        if e is not None:
            ordered.append(e)
            used.add(id(e))
    rest_active = [e for e in emps if id(e) not in used and e.get("status") != "left"]
    rest_left = [e for e in emps if id(e) not in used and e.get("status") == "left"]
    data["employees"] = ordered + rest_active + rest_left

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    open(DATA, "w", encoding="utf-8", newline="").write(mark + payload + ";\n")

    print("порядок:", " → ".join(e["shortName"] for e in data["employees"]))
    print("всего сотрудников:", len(data["employees"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
