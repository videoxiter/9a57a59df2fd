# -*- coding: utf-8 -*-
"""Тест перезапуска и защиты от второго экземпляра.

1. Обычный запуск — ровно один процесс.
2. Второй запуск поверх живого — выживает ровно один.
3. Два запуска одновременно (как при перезапуске) — тоже ровно один.
"""
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray", "OtpTray.exe")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def running() -> int:
    out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq OtpTray.exe"],
                         capture_output=True, text=True, encoding="cp866", errors="replace")
    return sum(1 for line in out.stdout.splitlines() if "OtpTray.exe" in line and "INFO" not in line)


def kill():
    subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)


def main():
    if not os.path.exists(EXE):
        raise SystemExit("нет сборки OtpTray.exe")
    kill()
    time.sleep(1)

    subprocess.Popen([EXE])
    time.sleep(8)
    if running() != 1:
        print("не стартовал один экземпляр:", running())
        return 1
    print("ok: первый экземпляр работает")

    subprocess.Popen([EXE])
    time.sleep(9)
    if running() != 1:
        print("ошибка: экземпляров больше одного:", running())
        kill()
        return 1
    print("ok: второй экземпляр не плодится")

    kill()
    time.sleep(1)
    subprocess.Popen([EXE], creationflags=0x00000008 | 0x00000200)
    subprocess.Popen([EXE], creationflags=0x00000008 | 0x00000200)
    time.sleep(14)
    n = running()
    kill()
    if n == 1:
        print("ok: после перезапуска работает ровно один экземпляр")
        return 0
    print("ошибка: после перезапуска экземпляров:", n)
    return 1


if __name__ == "__main__":
    sys.exit(main())
