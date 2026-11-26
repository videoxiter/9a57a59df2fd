# -*- coding: utf-8 -*-
"""Собирает app/tray/changelog.py из docs/CHANGELOG.json.

Приложение носит историю версий с собой (файл попадает в exe), поэтому
«О программе» и окно «Что нового» работают без интернета.

Запуск: python scripts/make_changelog.py
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "CHANGELOG.json")
OUT = os.path.join(ROOT, "app", "tray", "changelog.py")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    versions = data.get("versions") or []
    body = (
        "# -*- coding: utf-8 -*-\n"
        "# Сгенерировано scripts/make_changelog.py из docs/CHANGELOG.json — не править вручную.\n"
        "CHANGELOG = " + json.dumps(versions, ensure_ascii=False, indent=2) + "\n"
    )
    open(OUT, "w", encoding="utf-8", newline="").write(body)
    print(f"changelog.py: {len(versions)} версий ({versions[0]['version']} → {versions[-1]['version']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
