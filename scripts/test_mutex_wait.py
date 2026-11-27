# -*- coding: utf-8 -*-
"""Тест ожидания «один экземпляр»: как только владелец освобождает мьютекс,
второй процесс должен продолжить работу (а не ждать до конца таймаута).

Именно на этом ломался «Перезапустить»: ожидание держало свои хэндлы,
объект не освобождался, новый экземпляр выходил.
"""
import ctypes
import os
import subprocess
import sys
import threading
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "app", "tray"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import otp_tray  # noqa: E402

k32 = ctypes.windll.kernel32
NAME = "OTP_Tray_Test_" + str(os.getpid())
otp_tray.MUTEX_NAME = NAME


def main():
    handle = k32.CreateMutexW(None, False, NAME)
    if not handle:
        print("не удалось создать мьютекс")
        return 1

    code = (
        "import sys, time; sys.path.insert(0, %r); import otp_tray; "
        "otp_tray.MUTEX_NAME = %r; "
        "t = time.time(); r = otp_tray.already_running(8.0); "
        "print('RESULT', r, round(time.time() - t, 1))"
    ) % (os.path.join(ROOT, "app", "tray"), NAME)
    proc = subprocess.Popen([sys.executable, "-c", code], stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                            errors="replace")

    time.sleep(1.5)            # ребёнок точно успел начать ждать
    k32.CloseHandle(handle)    # «старый экземпляр» вышел
    out, _ = proc.communicate(timeout=30)
    print(out.strip())
    if "RESULT False" not in out:
        print("ОШИБКА: ожидание не увидело освобождение")
        return 1
    tail = out.strip().split()[-1]
    try:
        waited = float(tail)
    except Exception:
        waited = 99.0
    if waited > 4.0:
        print("ОШИБКА: ждал слишком долго,", tail, "с")
        return 1
    print("ok: ожидание увидело освобождение за", tail, "с")
    return 0


if __name__ == "__main__":
    sys.exit(main())
