# -*- coding: utf-8 -*-
"""Патч 3.7: открытый опрос заметно выделяется в приложении.

1. В меню значка появляется жирная строка «ОПРОС ПО ГРАФИКУ — заполнить»
   (показывается только когда опрос открыт).
2. В главном окне плашка опроса становится красной и заметной.
3. На значке трея появляется красная точка, пока опрос не заполнен.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# ---------- 1. пункт меню ----------
old_menu = '''            MenuItem(self.status_line, None, enabled=False),'''
new_menu = '''            MenuItem(lambda _: "🔴  ОПРОС ПО ГРАФИКУ — заполнить пожелания",
                     lambda: webbrowser.open(self.poll_url()),
                     visible=lambda _: bool(self.cfg.get("pollOpen"))),
            MenuItem(self.status_line, None, enabled=False),'''
assert old_menu in src, "начало меню"
src = src.replace(old_menu, new_menu, 1)

# ---------- 2. плашка в главном окне: красная ----------
src = src.replace('''        poll_card = tk.Frame(root, bg="#0d2330", highlightbackground="#155e75", highlightthickness=1)''',
'''        poll_card = tk.Frame(root, bg="#3a0d12", highlightbackground="#ef4444", highlightthickness=2)''', 1)
src = src.replace('''        poll_row = tk.Frame(poll_card, bg="#0d2330")''',
'''        poll_row = tk.Frame(poll_card, bg="#3a0d12")''', 1)
src = src.replace('''        tk.Label(poll_row, text="📝", bg="#0d2330", fg=ACCENT,
                 font=("Segoe UI", 12)).pack(side="left", padx=(0, 8))''',
'''        tk.Label(poll_row, text="📝", bg="#3a0d12", fg="#fecaca",
                 font=("Segoe UI", 14)).pack(side="left", padx=(0, 8))''', 1)
src = src.replace('''        tk.Label(poll_row, textvariable=poll_var, bg="#0d2330", fg="#d9f6fb",
                 font=("Segoe UI", 9), justify="left", wraplength=380).pack(side="left", anchor="w")''',
'''        tk.Label(poll_row, textvariable=poll_var, bg="#3a0d12", fg="#fecaca",
                 font=("Segoe UI", 10, "bold"), justify="left", wraplength=370).pack(side="left", anchor="w")''', 1)
src = src.replace('''            poll_var.set("Открыт опрос по графику на " + name + due + " — пожелания ещё не отправлены")''',
'''            poll_var.set("ОПРОС ПО ГРАФИКУ на " + name + due + " — пожелания ещё не отправлены")''', 1)

# ---------- 3. красная точка на значке, пока опрос не заполнен ----------
old_icon = "    def make_icon(self, kind: str):"
new_icon = '''    def make_icon(self, kind: str):
        """Значок состояния; при открытом опросе — с красной точкой."""
        img = self._make_icon_base(kind)
        try:
            if self.cfg.get("pollOpen") and img is not None:
                from PIL import ImageDraw
                img = img.copy()
                d = ImageDraw.Draw(img)
                w, h = img.size
                r = max(4, int(w * 0.22))
                d.ellipse((w - r * 2, 0, w, r * 2), fill="#ef4444", outline="#0b1119")
        except Exception:
            pass
        return img

    def _make_icon_base(self, kind: str):'''
assert old_icon in src, "make_icon"
src = src.replace(old_icon, new_icon, 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч 3.7 применён")
sys.exit(0)
