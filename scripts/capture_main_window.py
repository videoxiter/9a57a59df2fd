# -*- coding: utf-8 -*-
"""Снимок главного окна приложения (для проверки плашки опроса).

Запускает приложение, посылает значку двойной клик, ждёт окно и снимает его.
Результат: docs/images/app-main.png
"""
import ctypes
import ctypes.wintypes as wt
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray", "OtpTray.exe")
OUT = os.path.join(ROOT, "docs", "images", "app-main.png")
TITLE = "ОТП — учёт рабочего времени"
WM_NOTIFY = 0x040B
WM_LBUTTONUP = 0x0202

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


def find_window(title):
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
                found.append(hwnd)
        return True

    user32.EnumWindows(cb, 0)
    return found[0] if found else None


def main():
    if not os.path.exists(EXE):
        raise SystemExit("нет сборки OtpTray.exe")
    subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)
    time.sleep(1)
    proc = subprocess.Popen([EXE])
    time.sleep(8)

    for h in tray_windows(proc.pid):
        user32.PostMessageW(h, WM_NOTIFY, 0, WM_LBUTTONUP)
    time.sleep(0.12)
    for h in tray_windows(proc.pid):
        user32.PostMessageW(h, WM_NOTIFY, 0, WM_LBUTTONUP)
    time.sleep(3)

    hwnd = find_window(TITLE)
    if not hwnd:
        print("окно не найдено")
        return 1
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.5)
    from PIL import ImageGrab
    img = ImageGrab.grab(bbox=(rect.left, rect.top, rect.right, rect.bottom))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT)
    print("снимок:", OUT, img.size)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    finally:
        subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)
