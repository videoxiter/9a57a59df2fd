# -*- coding: utf-8 -*-
"""Пересчёт версий в схему мажор.функционал.исправление.

Правила владельца:
  • 1-я цифра — версия (меняется по его сигналу либо когда функции переваливают за .9);
  • 2-я цифра — изменение функционала (+1 на каждую новую возможность);
  • 3-я цифра — исправления (+1 на каждый выпуск с исправлениями);
  • если исправлений набралось больше 9 — второе число +1.

Скрипт берёт старую историю (1.0 … 3.7), расставляет выпуски по порядку и
присваивает новые номера. Старый номер сохраняется в поле "legacy".
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "docs", "CHANGELOG.json")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# порядок от старых к новым: old_version -> тип выпуска
#   "feature" — изменение функционала, "fix" — исправления
SEQUENCE = [
    ("1.0", "feature"),
    ("1.4", "feature"),
    ("1.5", "feature"),
    ("1.6", "fix"),
    ("1.7", "feature"),
    ("1.8", "fix"),
    ("1.9", "feature"),
    ("2.0", "feature"),
    ("2.1", "feature"),
    ("2.2", "feature"),
    ("2.3", "fix"),
    ("2.4", "feature"),
    ("2.5", "fix"),
    ("2.6", "feature"),
    ("2.7", "feature"),
    ("2.8", "fix"),
    ("2.9", "fix"),
    ("3.0", "feature"),
    ("3.1", "fix"),
    ("3.2", "feature"),
    ("3.3", "fix"),
    ("3.4", "fix"),
    ("3.5", "fix"),
    ("3.6", "fix"),
    ("3.7", "feature"),
]


def main():
    data = json.load(open(PATH, encoding="utf-8"))
    old = {str(v.get("version")): v for v in data.get("versions") or []}

    missing = [o for o, _ in SEQUENCE if o not in old]
    if missing:
        print("нет в истории:", missing)
        return 1

    major, minor, patch = 1, 0, 0
    new_versions = []
    for idx, (old_ver, kind) in enumerate(SEQUENCE):
        if idx == 0:
            major, minor, patch = 1, 0, 0
        elif kind == "feature":
            minor += 1
            patch = 0
            if minor > 9:
                major += 1
                minor = 0
        else:
            patch += 1
            if patch > 9:
                minor += 1
                patch = 0
                if minor > 9:
                    major += 1
                    minor = 0
        v = dict(old[old_ver])
        v["version"] = f"{major}.{minor}.{patch}"
        v["legacy"] = old_ver
        new_versions.append(v)

    data["versions"] = list(reversed(new_versions))     # в файле — от новых к старым
    data["note"] = ("Схема: мажор.функционал.исправление. Мажор меняется по решению владельца "
                    "или когда число функционала переваливает за 9. Поле legacy — прежний номер.")
    json.dump(data, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print("новая нумерация (старая → новая):")
    for v in new_versions:
        print(f"  {v['legacy']:>4} → {v['version']:>6}  {v['title']}")
    print("текущая версия:", new_versions[-1]["version"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
