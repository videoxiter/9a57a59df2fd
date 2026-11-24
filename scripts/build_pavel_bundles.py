# -*- coding: utf-8 -*-
"""Собирает комплекты для заместителя (macOS и Windows) в папку dist/.

Внутри каждого архива: инструкция и установщик(и). Код агента установщик
скачивает сам из репозитория (git clone), поэтому архивы маленькие.

Запуск: python scripts/build_pavel_bundles.py
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "scripts", "agent")
OUT = os.path.join(ROOT, "dist")
README = "README-ПАВЕЛ.md"

SETS = {
    "OTP-sync-macos.zip": [
        (README, README),
        ("install_macos.command", "install_macos.command"),
    ],
    "OTP-sync-windows.zip": [
        (README, README),
        ("install_windows.cmd", "install_windows.cmd"),
        ("install_windows.ps1", "install_windows.ps1"),
    ],
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, files in SETS.items():
        path = os.path.join(OUT, name)
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for src, dst in files:
                full = os.path.join(SRC, src)
                if not os.path.exists(full):
                    raise SystemExit("нет файла: " + full)
                z.write(full, dst)
        print(f"готово: {path} ({os.path.getsize(path)//1024} КБ)")


if __name__ == "__main__":
    main()
