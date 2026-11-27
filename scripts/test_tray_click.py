# -*- coding: utf-8 -*-
"""Проверка трея: клики по значку и открытие окна.

Находит все окна значка в процессе, отправляет те же сообщения, что мышь:
  • одиночный левый — окно НЕ должно открываться;
  • два левых подряд (двойной) — окно должно открыться;
  • правый — процесс должен остаться живым.

Запуск: python scripts/test_tray_click.py
"""
import ctypes
import ctypes.wintypes as wt
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray", "OtpTray.exe")
WINDOW_TITLE = "ОТП — учёт рабочего времени"

WM_NOTIFY = 0x040B
WM_LBUTTONUP = 0x0202
WM_RBUTTONUP = 0x0205

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

user32 = ctypes.windll.user32


def tray_windows(pid):
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        p = wt.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(p))
        if p.value != pid:
            return True
        cls = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls, 256)
        if "SystemTrayIcon" in cls.value:
            found.append(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return found


def window_open(title):
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        n = user32.GetWindowTextLengthW(hwnd)
        if n:
            b = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(hwnd, b, n + 1)
            if title in b.value:
                found.append(1)
        return True

    user32.EnumWindows(cb, 0)
    return bool(found)


def main():
    if not os.path.exists(EXE):
        raise SystemExit("нет сборки OtpTray.exe")
    subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)
    time.sleep(1)
    proc = subprocess.Popen([EXE])
    time.sleep(7)
    if proc.poll() is not None:
        print("приложение не запустилось")
        return 1

    hwnds = tray_windows(proc.pid)
    if not hwnds:
        print("окно значка не найдено — проверка невозможна")
        return 1
    print("окон значка:", len(hwnds))

    bad = 0

    def post(code):
        for h in hwnds:
            user32.PostMessageW(h, WM_NOTIFY, 0, code)

    # одиночный клик — окна быть не должно
    post(WM_LBUTTONUP)
    time.sleep(2)
    if window_open(WINDOW_TITLE):
        print("  ошибка: окно открылось от ОДИНОЧНОГО клика")
        bad += 1
    else:
        print("  ok  одиночный клик окно не открывает")

    # двойной клик — окно должно открыться
    post(WM_LBUTTONUP)
    time.sleep(0.12)
    post(WM_LBUTTONUP)
    time.sleep(3)
    if window_open(WINDOW_TITLE):
        print("  ok  двойной клик открыл окно")
    else:
        print("  ошибка: двойной клик не открыл окно")
        bad += 1

    # правый клик — меню (проверяем только, что процесс жив)
    post(WM_RBUTTONUP)
    time.sleep(1.5)
    if proc.poll() is not None:
        print("  ошибка: процесс умер после правого клика")
        bad += 1
    else:
        print("  ok  правый клик: процесс жив")

    subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)
    print("итог:", "всё в порядке" if not bad else f"проблем: {bad}")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
