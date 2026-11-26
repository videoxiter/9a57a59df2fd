# -*- coding: utf-8 -*-
"""Патч 3.0: статус опроса в главном окне + запуск цикла опроса."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

# 1) check_poll сохраняет состояние для окна
old = """        if not (res and res.get("ok") and res.get("poll")):
            return None"""
new = """        if not (res and res.get("ok") and res.get("poll")):
            if self.cfg.get("pollOpen"):
                self.cfg["pollOpen"] = None
                try:
                    save_config(self.cfg)
                except Exception:
                    pass
            return None"""
src = src.replace(old, new, 1)

old2 = """        if answered:
            return None"""
new2 = """        if answered:
            if self.cfg.get("pollOpen"):
                self.cfg["pollOpen"] = None
                try:
                    save_config(self.cfg)
                except Exception:
                    pass
            return None"""
src = src.replace(old2, new2, 1)

old3 = """        self.cfg["poll_notified"] = key"""
new3 = """        self.cfg["poll_notified"] = key
        self.cfg["pollOpen"] = {"month": str(poll.get("month") or ""),
                                "due": poll.get("due_at") or ""}"""
src = src.replace(old3, new3, 1)

# 2) запуск потока опроса рядом с остальными
old4 = """        threading.Thread(target=self.content_loop, daemon=True).start()"""
new4 = """        threading.Thread(target=self.content_loop, daemon=True).start()
        threading.Thread(target=self.poll_loop, daemon=True).start()"""
src = src.replace(old4, new4, 1)

# 3) баннер опроса в главном окне: вставляем перед карточкой статуса
old5 = """        card = tk.Frame(root, bg=CARD, highlightbackground=LINE, highlightthickness=1)"""
new5 = """        poll_card = tk.Frame(root, bg="#0d2330", highlightbackground="#155e75", highlightthickness=1)
        poll_var = tk.StringVar(value="")
        poll_row = tk.Frame(poll_card, bg="#0d2330")
        poll_row.pack(fill="x", padx=16, pady=10)
        tk.Label(poll_row, text="📝", bg="#0d2330", fg=ACCENT,
                 font=("Segoe UI", 12)).pack(side="left", padx=(0, 8))
        tk.Label(poll_row, textvariable=poll_var, bg="#0d2330", fg="#d9f6fb",
                 font=("Segoe UI", 9), justify="left", wraplength=380).pack(side="left", anchor="w")
        tk.Button(poll_row, text="Заполнить", command=lambda: webbrowser.open(self.page_url()),
                  relief="flat", bd=0, bg=ACCENT, fg="#06131a", cursor="hand2",
                  font=("Segoe UI", 9, "bold"), padx=12, pady=5).pack(side="right")

        def refresh_poll_banner():
            info = self.cfg.get("pollOpen") or None
            if not info:
                poll_card.pack_forget()
                return
            month = str(info.get("month") or "")
            try:
                name = datetime.strptime(month + "-01", "%Y-%m-%d").strftime("%m.%Y")
            except Exception:
                name = month
            due = ""
            raw_due = str(info.get("due") or "")
            if raw_due:
                try:
                    due = " · сдать до " + datetime.fromisoformat(raw_due.replace("Z", "+00:00")).astimezone(TZ).strftime("%d.%m %H:%M")
                except Exception:
                    due = ""
            poll_var.set("Открыт опрос по графику на " + name + due + " — пожелания ещё не отправлены")
            if not poll_card.winfo_ismapped():
                poll_card.pack(fill="x", padx=24, pady=(12, 0), before=card)

        card = tk.Frame(root, bg=CARD, highlightbackground=LINE, highlightthickness=1)"""
src = src.replace(old5, new5, 1)

# 4) обновляем баннер в тике
old6 = """                render_feed()"""
new6 = """                render_feed()
                refresh_poll_banner()"""
src = src.replace(old6, new6, 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("патч применён")
sys.exit(0)
