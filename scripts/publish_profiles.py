# -*- coding: utf-8 -*-
"""Загрузка данных страниц в базу (после генерации страниц).

Персональные payload'ы и общий dataset дашборда больше не лежат в открытом
доступе на GitHub Pages: они пишутся в dist/profiles/*.json и загружаются
в таблицу otp_profiles через RPC otp_profile_set (нужен секрет агента).

Запуск:
  python scripts/generate_pages.py      # создаёт dist/profiles/*.json
  python scripts/publish_profiles.py    # заливает их в базу
"""
import json
import os
import sys
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROFILES = os.path.join(ROOT, "dist", "profiles")
CLOUD = os.path.join(ROOT, "scripts", "cloud.json")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def cloud():
    try:
        return json.load(open(CLOUD, encoding="utf-8"))
    except Exception:
        return {}


def rpc(name: str, payload: dict):
    c = cloud()
    url = (c.get("url") or "").rstrip("/")
    key = c.get("key") or ""
    if not url or not key:
        raise SystemExit("нет scripts/cloud.json с url и key")
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/{name}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"apikey": key, "Authorization": "Bearer " + key,
                 "Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read().decode("utf-8")
    return json.loads(body) if body else {}


def main():
    secret = (cloud() or {}).get("agentSecret") or ""
    if not secret:
        raise SystemExit("в scripts/cloud.json нет agentSecret (нужен для записи в базу)")
    if not os.path.isdir(PROFILES):
        raise SystemExit("нет dist/profiles — сначала запустите scripts/generate_pages.py")

    # общий dataset дашборда: __data
    data_js = os.path.join(ROOT, "assets", "js", "data.js")
    if os.path.exists(data_js):
        raw = open(data_js, encoding="utf-8").read()
        marker = "window.OTP_DATA = "
        start = raw.index(marker) + len(marker)
        payload = json.loads(raw[start:].strip().rstrip(";"))
        res = rpc("otp_profile_set", {"p_secret": secret, "p_slug": "__data", "p_payload": payload})
        print("__data:", res)

    files = sorted(f for f in os.listdir(PROFILES) if f.endswith(".json"))
    ok = 0
    for name in files:
        slug = name[:-5]
        try:
            payload = json.load(open(os.path.join(PROFILES, name), encoding="utf-8"))
        except Exception as e:
            print(f"  {slug}: не прочитан ({e})")
            continue
        res = rpc("otp_profile_set", {"p_secret": secret, "p_slug": slug, "p_payload": payload})
        if isinstance(res, dict) and res.get("ok"):
            ok += 1
        else:
            print(f"  {slug}: {res}")
    print(f"загружено профилей: {ok} из {len(files)}")
    return 0 if ok == len(files) else 1


if __name__ == "__main__":
    sys.exit(main())
