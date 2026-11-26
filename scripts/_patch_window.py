# -*- coding: utf-8 -*-
"""Одноразовый патч: заменяет main_window в app/tray/otp_tray.py на новую версию.

Запуск: python scripts/_patch_window.py
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")

NEW = '''    def main_window(self):
        """Главное окно: статус смены, действия, лента событий с сайта."""
        import tkinter as tk

        BG, CARD, CARD2 = "#0b1119", "#111a24", "#0e1620"
        TEXT, MUTED, ACCENT, LINE = "#e8edf5", "#9fb0c5", "#22d3ee", "#1e2b3a"
        DIM, RED = "#1b2735", "#f87171"

        root = tk.Tk()
        root.title("ОТП — учёт рабочего времени")
        root.geometry("620x740")
        root.minsize(580, 700)
        root.configure(bg=BG)
        try:
            root.iconphoto(True, tk.PhotoImage(file=str(icons_dir() / "tray-work-32.png")))
        except Exception:
            pass

        head = tk.Frame(root, bg=BG)
        head.pack(fill="x", padx=26, pady=(20, 2))
        tk.Label(head, text="ОТП", bg=BG, fg=ACCENT,
                 font=("Segoe UI", 20, "bold")).pack(side="left")
        tk.Label(head, text="учёт рабочего времени", bg=BG, fg=MUTED,
                 font=("Segoe UI", 10)).pack(side="left", padx=(10, 0), pady=(8, 0))
        tk.Label(head, text="версия " + VERSION, bg=BG, fg="#5b6b80",
                 font=("Segoe UI", 9)).pack(side="right", pady=(8, 0))

        card = tk.Frame(root, bg=CARD, highlightbackground=LINE, highlightthickness=1)
        card.pack(fill="x", padx=24, pady=(14, 10))
        top = tk.Frame(card, bg=CARD)
        top.pack(fill="x", padx=20, pady=(16, 0))
        dot = tk.Canvas(top, width=10, height=10, bg=CARD, highlightthickness=0)
        dot_id = dot.create_oval(1, 1, 9, 9, fill=ACCENT, outline="")
        dot.pack(side="left", pady=(4, 0))
        state_var = tk.StringVar(value="Загрузка…")
        tk.Label(top, textvariable=state_var, bg=CARD, fg=TEXT,
                 font=("Segoe UI", 12, "bold")).pack(side="left", padx=(8, 0))
        hint_var = tk.StringVar(value="")
        tk.Label(top, textvariable=hint_var, bg=CARD, fg=MUTED,
                 font=("Segoe UI", 9)).pack(side="right")

        timer_var = tk.StringVar(value="00:00:00")
        tk.Label(card, textvariable=timer_var, bg=CARD, fg=ACCENT,
                 font=("Segoe UI", 40, "bold")).pack(pady=(4, 0))
        meta_var = tk.StringVar(value="")
        tk.Label(card, textvariable=meta_var, bg=CARD, fg=MUTED,
                 font=("Segoe UI", 9)).pack(pady=(0, 10))
        bar = tk.Canvas(card, height=6, bg=CARD2, highlightthickness=0, bd=0)
        bar.pack(fill="x", padx=20, pady=(0, 18))
        bar_id = bar.create_rectangle(0, 0, 0, 6, fill=ACCENT, outline="")

        grid = tk.Frame(root, bg=BG)
        grid.pack(fill="x", padx=24)
        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)

        buttons = {}

        def chip(parent, glyph, label, key, cmd, primary=False):
            b = tk.Button(parent, text=glyph + "  " + label, command=cmd, relief="flat", bd=0,
                          anchor="w", justify="left", padx=14, pady=11, cursor="hand2",
                          bg=ACCENT if primary else CARD,
                          fg="#06131a" if primary else TEXT,
                          activebackground="#67e8f9" if primary else DIM,
                          activeforeground="#06131a" if primary else TEXT,
                          disabledforeground="#4b5b6b",
                          font=("Segoe UI", 10, "bold" if primary else "normal"))
            buttons[key] = (b, primary)
            return b

        chip(grid, "▶", "Начать смену", "start", lambda: self.act("start"), True).grid(
            row=0, column=0, sticky="ew", padx=(0, 6), pady=(0, 8))
        chip(grid, "■", "Завершить смену", "stop", lambda: self.act("stop")).grid(
            row=0, column=1, sticky="ew", padx=(6, 0), pady=(0, 8))
        chip(grid, "☕", "Техперерыв 1", "tech1", lambda: self.act("slot-tech1")).grid(
            row=1, column=0, sticky="ew", padx=(0, 6), pady=(0, 8))
        chip(grid, "☕", "Техперерыв 2", "tech2", lambda: self.act("slot-tech2")).grid(
            row=1, column=1, sticky="ew", padx=(6, 0), pady=(0, 8))
        chip(grid, "🍽", "Обед", "lunch", lambda: self.act("slot-lunch")).grid(
            row=2, column=0, sticky="ew", padx=(0, 6), pady=(0, 8))
        chip(grid, "🚶", "Временное отсутствие", "absence", lambda: self.act("absence")).grid(
            row=2, column=1, sticky="ew", padx=(6, 0), pady=(0, 8))
        chip(grid, "↩", "Вернуться с перерыва", "return", lambda: self.act("return"), True).grid(
            row=3, column=0, columnspan=2, sticky="ew", pady=(0, 10))

        news = tk.Frame(root, bg=CARD, highlightbackground=LINE, highlightthickness=1)
        news.pack(fill="both", expand=True, padx=24, pady=(4, 10))
        tk.Label(news, text="Последние события", bg=CARD, fg=MUTED,
                 font=("Segoe UI", 9, "bold")).pack(anchor="w", padx=18, pady=(12, 6))
        feed_box = tk.Frame(news, bg=CARD)
        feed_box.pack(fill="both", expand=True, padx=18, pady=(0, 12))
        feed_state = {"sig": None}

        def render_feed():
            items = self.feed_items()[:5]
            sig = "|".join(str(x.get("t")) + str(x.get("text")) for x in items)
            if sig == feed_state["sig"]:
                return
            feed_state["sig"] = sig
            for w in feed_box.winfo_children():
                w.destroy()
            if not items:
                tk.Label(feed_box, text="Пока нет новостей: опросы, бонусы и изменения графика появятся здесь.",
                         bg=CARD, fg="#6b7c90", font=("Segoe UI", 9), wraplength=520,
                         justify="left").pack(anchor="w")
                return
            for it in items:
                row = tk.Frame(feed_box, bg=CARD)
                row.pack(fill="x", pady=2)
                tk.Label(row, text=str(it.get("t", ""))[:5], bg=CARD, fg="#6b7c90",
                         font=("Segoe UI", 9)).pack(side="left", padx=(0, 10))
                tk.Label(row, text=str(it.get("text", "")), bg=CARD, fg=TEXT,
                         font=("Segoe UI", 9), wraplength=470, justify="left").pack(side="left", anchor="w")

        foot = tk.Frame(root, bg=BG)
        foot.pack(fill="x", padx=24, pady=(0, 18))

        def link(text, cmd, danger=False):
            b = tk.Button(foot, text=text, command=cmd, relief="flat", bd=0,
                          bg=BG, fg=RED if danger else MUTED, activebackground=BG,
                          activeforeground=RED if danger else ACCENT, cursor="hand2",
                          font=("Segoe UI", 9), padx=8, pady=4)
            return b

        link("Моя страница", lambda: webbrowser.open(self.page_url())).pack(side="left")
        link("Справка", self.help_window).pack(side="left")
        link("Обновления", lambda: threading.Thread(target=self.check_updates_manual, daemon=True).start()).pack(side="left")
        link("История версий", self.changelog_window).pack(side="left")
        link("Выход", self.quit_app, True).pack(side="right")

        def tick():
            try:
                st = self.state
                kind = st.get("kind") or "off"
                state_var.set(st.get("label") or "—")
                timer_var.set(hms(st.get("sec") or 0))
                hint_var.set(("подтвердите: " + self.pending["label"]) if self.pending else "МСК")
                colour = {"work": ACCENT, "pause": "#facc15", "absence": "#38bdf8",
                          "off": "#94a3b8", "offline": RED}.get(kind, ACCENT)
                dot.itemconfig(dot_id, fill=colour)
                bar.itemconfig(bar_id, fill=colour)
                sec = st.get("sec") or 0
                pct = min(1.0, sec / ST_NORM_DAY) if ST_NORM_DAY else 0
                w = max(1, bar.winfo_width())
                bar.coords(bar_id, 0, 0, int(w * pct), 6)
                meta_var.set("норма 7:30 · отработано %s" % hms(sec))
                for key, (btn, primary) in buttons.items():
                    ok = {"start": self.can_start, "stop": self.can_finish,
                          "return": self.can_return}.get(key)
                    if ok is None:
                        ok = self.can_slot(key)
                    btn.configure(state="normal" if ok else "disabled",
                                  bg=(ACCENT if ok else "#123240") if primary else CARD,
                                  fg="#06131a" if (primary and ok) else TEXT)
                render_feed()
            except Exception:
                pass
            root.after(700, tick)

        root.protocol("WM_DELETE_WINDOW", root.withdraw)
        tick()
        root.mainloop()

'''

src = open(PATH, encoding="utf-8").read()
start = src.index("    def main_window(self):")
end = src.index("    def update_icon(self):")
src = src[:start] + NEW + src[end:]
open(PATH, "w", encoding="utf-8", newline="").write(src)
print("main_window заменён")
sys.exit(0)
