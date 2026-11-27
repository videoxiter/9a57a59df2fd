# -*- coding: utf-8 -*-
"""Патч 2.3.2: кнопки в окне светятся только когда действие реально доступно.

Ошибка: в tick() брались ссылки на методы (self.can_start и т. п.) вместо их
вызова — объект метода всегда «истинен», поэтому кнопки выглядели активными
(«Начать смену» на смене, «Вернуться с перерыва» без перерыва).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

old = """                for key, (btn, primary) in buttons.items():
                    ok = {"start": self.can_start, "stop": self.can_finish,
                          "return": self.can_return}.get(key)
                    if ok is None:
                        ok = self.can_slot(key)
                    btn.configure(state="normal" if ok else "disabled",
                                  bg=(ACCENT if ok else "#123240") if primary else CARD,
                                  fg="#06131a" if (primary and ok) else TEXT)"""
new = """                for key, (btn, primary) in buttons.items():
                    # ВАЖНО: вызываем методы — ссылка на метод всегда истинна,
                    # из-за этого кнопки «горели» в неподходящий момент
                    ok = {"start": self.can_start, "stop": self.can_finish,
                          "return": self.can_return}.get(key)
                    ok = bool(ok()) if ok else bool(self.can_slot(key))
                    btn.configure(state="normal" if ok else "disabled",
                                  bg=(ACCENT if ok else "#0f1d28") if primary else CARD,
                                  fg="#06131a" if (primary and ok) else ("#7f93a8" if primary else TEXT),
                                  disabledforeground="#4b5b6b")"""
assert old in src, "блок кнопок в tick"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 2.3.2 применён")
sys.exit(0)
