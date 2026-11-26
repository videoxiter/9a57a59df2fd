# -*- coding: utf-8 -*-
"""Пишет assets/js/cloud-config.js — адрес и публичный ключ Supabase.

Данные страниц теперь живут в базе, поэтому конфигурация облака больше не
приходит вместе с payload'ом: она нужна ещё до входа (чтобы вызвать RPC входа).
Публичный ключ (sb_publishable_…) не секрет — доступ ограничивают RLS-политики.

Запуск: python scripts/make_cloud_config.py (вызывается генераторами страниц)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUD = os.path.join(ROOT, "scripts", "cloud.json")
OUT = os.path.join(ROOT, "assets", "js", "cloud-config.js")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def write_config():
    try:
        c = json.load(open(CLOUD, encoding="utf-8"))
    except Exception:
        print("cloud.json не найден — cloud-config.js не обновлён")
        return False
    url = (c.get("url") or "").rstrip("/")
    key = c.get("key") or ""
    if not url or not key:
        print("в cloud.json нет url/key")
        return False
    body = ("/* Публичные параметры облака: адрес и ключ для RPC. Ключ не секрет. */\n"
            "window.OTP_CLOUD_CFG = " + json.dumps({"url": url, "key": key}, ensure_ascii=False) + ";\n")
    open(OUT, "w", encoding="utf-8", newline="").write(body)
    print("cloud-config.js: обновлён")
    return True


if __name__ == "__main__":
    sys.exit(0 if write_config() else 1)
