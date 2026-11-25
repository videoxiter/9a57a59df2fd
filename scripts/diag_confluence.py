# -*- coding: utf-8 -*-
"""Диагностика: какие страницы Confluence содержат сотрудника.

Запуск: python scripts/diag_confluence.py "торыгин"
"""
import importlib.util
import re
import sys

spec = importlib.util.spec_from_file_location("fc", "scripts/fetch_confluence.py")
fc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fc)

needle = (sys.argv[1] if len(sys.argv) > 1 else "торыгин").lower()
c = fc.Client()

roots = {"графики": fc.SHIFTS_ROOT, "отпуска": fc.VAC_ROOT}
for name, root in roots.items():
    try:
        kids = c.children(root)
    except Exception as e:
        print(name, "ошибка:", e)
        continue
    print(f"=== {name}: страниц {len(kids)}")
    for title, pid in list(kids.items())[:20]:
        try:
            html = c.get(f"/rest/api/content/{pid}?expand=body.view")["body"]["view"]["value"]
        except Exception as e:
            print("  ", title, pid, "ошибка:", e)
            continue
        hit = needle in re.sub(r"<[^>]+>", " ", html).lower()
        if hit or "2026" in str(title):
            print("  ", ("НАЙДЕН" if hit else "нет"), title, pid)

pid = 452755676
try:
    page = c.get(f"/rest/api/content/{pid}?expand=body.view,space")
    html = page["body"]["view"]["value"]
    text = re.sub(r"<[^>]+>", " ", html)
    print("=== страница", pid, "|", page.get("title"), "| пространство:",
          (page.get("space") or {}).get("key"))
    print("   содержит искомого:", needle in text.lower())
    m = re.search(r".{0,60}" + re.escape(needle) + r".{0,80}", text, re.I | re.S)
    print("   фрагмент:", re.sub(r"\s+", " ", m.group(0)) if m else "—")
except Exception as e:
    print("страница", pid, "ошибка:", e)
