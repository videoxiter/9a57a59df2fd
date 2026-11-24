# -*- coding: utf-8 -*-
"""Собирает комплекты приложения для сотрудников (Windows и macOS) в dist/.

Windows-комплект требует уже собранный app/tray/dist/OtpTray.exe
(см. app/tray/README.md — команда PyInstaller).
macOS-комплект содержит исходник и .command-скрипты: на Mac он запускается
без сборки (venv ставится при первом запуске).

Запуск: python scripts/build_employee_kits.py
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAY = os.path.join(ROOT, "app", "tray")
OUT = os.path.join(ROOT, "dist")
README = "README-СОТРУДНИК.md"

WINDOWS = [
    ("dist/OtpTray.exe", "OtpTray.exe"),
    ("install_autostart_windows.ps1", "install_autostart_windows.ps1"),
    ("Установить автозапуск.cmd", "Установить автозапуск.cmd"),
    ("Убрать автозапуск.cmd", "Убрать автозапуск.cmd"),
    (README, README),
]

MACOS = [
    ("otp_tray.py", "otp_tray.py"),
    ("run_macos.command", "run_macos.command"),
    ("build_macos.command", "build_macos.command"),
    ("install_autostart_macos.command", "install_autostart_macos.command"),
    (README, README),
]


def add(z, rel, dst):
    full = os.path.join(TRAY, rel)
    if not os.path.exists(full):
        raise SystemExit("нет файла: " + full)
    z.write(full, dst)


def main():
    os.makedirs(OUT, exist_ok=True)

    win = os.path.join(OUT, "OTP-tray-windows.zip")
    with zipfile.ZipFile(win, "w", zipfile.ZIP_DEFLATED) as z:
        for rel, dst in WINDOWS:
            add(z, rel, dst)
    print(f"готово: {win} ({os.path.getsize(win)//1024//1024} МБ)")

    mac = os.path.join(OUT, "OTP-tray-macos.zip")
    with zipfile.ZipFile(mac, "w", zipfile.ZIP_DEFLATED) as z:
        for rel, dst in MACOS:
            add(z, rel, dst)
        icons = os.path.join(TRAY, "icons")
        for name in sorted(os.listdir(icons)):
            z.write(os.path.join(icons, name), "icons/" + name)
    print(f"готово: {mac} ({os.path.getsize(mac)//1024} КБ)")


if __name__ == "__main__":
    main()
