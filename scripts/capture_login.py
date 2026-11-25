# -*- coding: utf-8 -*-
"""Снимок окна входа приложения «ОТП» для инструкции.

Запускает OtpTray.exe (если у приложения ещё нет сохранённой сессии — откроется
окно входа), находит окно по заголовку, сохраняет PNG и закрывает процесс.

Запуск: python scripts/capture_login.py
"""
import ctypes
import ctypes.wintypes as wt
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = os.path.join(ROOT, "app", "tray", "dist", "OtpTray.exe")
OUT = os.path.join(ROOT, "docs", "images", "login.png")
TITLE = "ОТП"

user32 = ctypes.windll.user32


def find_window():
    found = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, wt.HWND, wt.LPARAM)
    def cb(hwnd, _):
        if not user32.IsWindowVisible(hwnd):
            return True
        n = user32.GetWindowTextLengthW(hwnd)
        if n:
            buf = ctypes.create_unicode_buffer(n + 1)
            user32.GetWindowTextW(hwnd, buf, n + 1)
            if TITLE in buf.value:
                found.append((hwnd, buf.value))
        return True

    user32.EnumWindows(cb, 0)
    return found


def capture(hwnd, path):
    rect = wt.RECT()
    user32.GetWindowRect(hwnd, ctypes.byref(rect))
    w, h = rect.right - rect.left, rect.bottom - rect.top
    if w <= 0 or h <= 0:
        return False
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.4)
    from PIL import ImageGrab
    img = ImageGrab.grab(bbox=(rect.left, rect.top, rect.right, rect.bottom))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("снимок:", path, w, "x", h)
    return True


def main():
    if not os.path.exists(EXE):
        raise SystemExit("нет сборки OtpTray.exe")
    proc = subprocess.Popen([EXE])
    try:
        hwnd = None
        for _ in range(30):
            time.sleep(0.7)
            wins = find_window()
            if wins:
                hwnd = wins[0][0]
                break
        if not hwnd:
            print("окно не найдено")
            return 1
        return 0 if capture(hwnd, OUT) else 1
    finally:
        subprocess.run(["taskkill", "/F", "/IM", "OtpTray.exe"], capture_output=True)


if __name__ == "__main__":
    sys.exit(main())
