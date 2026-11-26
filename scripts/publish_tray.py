# -*- coding: utf-8 -*-
"""Публикует сборку приложения для автообновления.

Кладёт exe и манифест версии в папку downloads/ (её отдаёт GitHub Pages),
затем коммитит и пушит. Приложение раз в сутки читает
downloads/version.json и, если версия новее, скачивает exe и перезапускается.

Запуск: python scripts/publish_tray.py [--no-push]
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray.exe")
APP_PY = os.path.join(ROOT, "app", "tray", "otp_tray.py")
OUT_DIR = os.path.join(ROOT, "downloads")
PAGES = "https://videoxiter.github.io/9a57a59df2fd"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def app_version() -> str:
    text = open(APP_PY, encoding="utf-8").read()
    m = re.search(r'^VERSION\s*=\s*"([^"]+)"', text, re.M)
    return m.group(1) if m else "0"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-push", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(EXE):
        raise SystemExit("нет сборки app/tray/dist/OtpTray.exe — сначала соберите приложение")

    os.makedirs(OUT_DIR, exist_ok=True)
    target = os.path.join(OUT_DIR, "OtpTray.exe")
    shutil.copy2(EXE, target)
    data = open(target, "rb").read()
    ver = app_version()
    manifest = {
        "version": ver,
        "url": PAGES + "/downloads/OtpTray.exe",
        "sha256": hashlib.sha256(data).hexdigest(),
        "size": len(data),
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    # инсталлятор (если собран) тоже публикуем — по нему ставят приложение
    setup_src = os.path.join(ROOT, "dist", f"OTP-Tray-Setup-{ver}.exe")
    if os.path.exists(setup_src):
        shutil.copy2(setup_src, os.path.join(OUT_DIR, "OTP-Tray-Setup.exe"))
        manifest["setup"] = PAGES + "/downloads/OTP-Tray-Setup.exe"
        print("инсталлятор опубликован: downloads/OTP-Tray-Setup.exe")
    else:
        print("инсталлятор не найден — публикую только exe")
    manifest["guide"] = (PAGES + "/downloads/"
                         "%D0%A3%D0%A1%D0%A2%D0%90%D0%9D%D0%9E%D0%92%D0%9A%D0%90"
                         "-%D0%9F%D0%A0%D0%98%D0%9B%D0%9E%D0%96%D0%95%D0%9D%D0%98%D0%AF.pdf")
    with open(os.path.join(OUT_DIR, "version.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"опубликовано: версия {ver}, {len(data) // 1024} КБ, sha256 {manifest['sha256'][:12]}…")

    if args.no_push:
        print("--no-push: коммит не делаю")
        return 0
    subprocess.run(["git", "-C", ROOT, "add", "downloads"], check=True)
    st = subprocess.run(["git", "-C", ROOT, "status", "--porcelain"], capture_output=True, text=True)
    if not st.stdout.strip():
        print("изменений нет")
        return 0
    subprocess.run(["git", "-C", ROOT, "commit", "-m", f"app release {ver}"], check=True)
    subprocess.run(["git", "-C", ROOT, "push", "origin", "main"], check=True)
    print("запушено")
    return 0


if __name__ == "__main__":
    sys.exit(main())
