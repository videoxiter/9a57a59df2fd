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


def changelog_notes(ver: str):
    """Список изменений версии из docs/CHANGELOG.json (для окна обновления)."""
    path = os.path.join(ROOT, "docs", "CHANGELOG.json")
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        return []
    for v in data.get("versions") or []:
        if str(v.get("version")) == str(ver):
            title = v.get("title") or ""
            return ([title] if title else []) + list(v.get("items") or [])
    return []
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray.exe")          # onefile
EXE_DIR = os.path.join(ROOT, "app", "tray", "dist", "OtpTray")          # onedir (папка)
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

    # основная поставка — установщик (сборка папкой: без распаковки в %TEMP%)
    setup_exe = os.path.join(ROOT, "dist", f"OTP-Tray-Setup-{app_version()}.exe")
    if not os.path.exists(setup_exe):
        raise SystemExit("нет установщика dist/OTP-Tray-Setup-<версия>.exe — сначала соберите его")
    os.makedirs(OUT_DIR, exist_ok=True)
    setup_target = os.path.join(OUT_DIR, "OTP-Tray-Setup.exe")
    shutil.copy2(setup_exe, setup_target)
    data = open(setup_target, "rb").read()
    ver = app_version()
    manifest = {
        "version": ver,
        "url": PAGES + "/downloads/OTP-Tray-Setup.exe",
        "setup": PAGES + "/downloads/OTP-Tray-Setup.exe",
        "setupSha256": hashlib.sha256(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "size": len(data),
        "date": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    # что изменилось в этой версии — показывается в окне обновления
    notes = changelog_notes(ver)
    if notes:
        manifest["notes"] = notes
        manifest["title"] = notes[0] if notes else ""
    print("инсталлятор опубликован: downloads/OTP-Tray-Setup.exe")
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
