# -*- coding: utf-8 -*-
"""ОТП: приложение-трей для Windows и macOS (один код).

• значок в трее/меню-баре: работает / перерыв / обед / отсутствие / вне смены / нет связи;
• меню: начать смену, техперерыв 1/2, обед, вернуться, временное отсутствие, завершить смену;
• перед применением — отсчёт 10 секунд с «Отмена»; повторный клик по пункту — применить сразу;
• вход по ссылке на свою страницу и паролю; токен хранится только на этом компьютере;
• опрос состояния раз в 20 секунд.

Запуск:
  Windows: .venv\\Scripts\\python.exe app\\tray\\otp_tray.py
  macOS:   python3 app/tray/otp_tray.py
Проверка без трея: otp_tray.py --selftest
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timedelta, timezone
from pathlib import Path

APP_NAME = "OtpTray"
VERSION = "1.0"
POLL_SECONDS = 20
CONFIRM_SECONDS = 10
TZ = timezone(timedelta(hours=3))          # Москва, UTC+3

# публичные значения сайта (не секреты), можно переопределить в config.json
DEFAULT_CLOUD = {
    "url": "https://qfhjkynkvltquzyskfgi.supabase.co",
    "key": "sb_publishable_L_KQNO6S3tK2df7DhgGywQ_wt_U41Hd",
}
SITE_BASE = "https://videoxiter.github.io/9a57a59df2fd/"


# ---------------------------------------------------------------- настройки ---
def config_dir() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
    else:
        base = Path.home() / "Library" / "Application Support"
    return base / APP_NAME


CONFIG_PATH = config_dir() / "config.json"
LOG_PATH = config_dir() / "app.log"


def log(msg: str) -> None:
    """Простой журнал рядом с настройками — помогает разбирать проблемы сотрудника."""
    try:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  {msg}\n")
    except Exception:
        pass


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_config(cfg: dict) -> None:
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        os.chmod(CONFIG_PATH, 0o600)
    except Exception:
        pass


# ---------------------------------------------------------------------- API ---
def http_json(url: str, method: str = "GET", body=None, headers=None, timeout: int = 20):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    if body is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        text = r.read().decode("utf-8")
        return json.loads(text) if text else None


class Api:
    def __init__(self, cfg: dict):
        cloud = cfg.get("cloud") or DEFAULT_CLOUD
        self.url = str(cloud.get("url") or DEFAULT_CLOUD["url"]).rstrip("/")
        self.key = str(cloud.get("key") or DEFAULT_CLOUD["key"])
        self.token = cfg.get("token") or ""
        self.slug = cfg.get("slug") or ""

    def rpc(self, name: str, payload: dict):
        return http_json(f"{self.url}/rest/v1/rpc/{name}", "POST", payload,
                         {"apikey": self.key, "Authorization": "Bearer " + self.key})

    def login(self, slug: str, password: str):
        res = self.rpc("otp_login", {"p_slug": slug, "p_pass": password})
        if res and res.get("ok") and res.get("token"):
            self.token, self.slug = res["token"], slug
        return res or {"ok": False, "error": "нет ответа"}

    def api(self, path: str, method: str = "GET", body=None):
        return http_json(f"{self.url}/functions/v1/api", "POST",
                         {"token": self.token, "path": path, "method": method, "body": body},
                         {"apikey": self.key, "Authorization": "Bearer " + self.key})

    def events_today(self):
        day = datetime.now(TZ).date().isoformat()
        rows = self.api(f"otp_time_events?select=*&day=eq.{day}"
                        f"&empSlug=eq.{urllib.parse.quote(self.slug)}&order=at.asc")
        return rows if isinstance(rows, list) else []

    def add_event(self, ev: dict):
        return self.api("otp_time_events", "POST", [ev])


# -------------------------------------------------------------------- статус --
def parse_at(s: str) -> float:
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def compute_state(events: list) -> dict:
    started = stopped = None
    active = None
    acc = 0.0
    last = None
    used = set()
    for e in sorted(events, key=lambda x: str(x.get("at", ""))):
        t = parse_at(e.get("at"))
        typ = e.get("type")
        if typ == "shift_start":
            started, last, active, stopped = t, t, None, None
        elif typ == "shift_stop":
            if started and not stopped and last:
                acc += max(0.0, t - last)
            stopped, active = t, None
        elif typ in ("break_start", "absence_start"):
            if last and started and not stopped:
                acc += max(0.0, t - last)
            last = t
            slot = e.get("slot") or ("absence" if typ == "absence_start" else "break")
            active = {"type": typ, "slot": slot, "at": t}
        elif typ in ("break_end", "absence_end"):
            if typ == "break_end":
                used.add(e.get("slot") or "break")
            last, active = t, None
    if started and not stopped and last:
        acc += max(0.0, time.time() - last)
    if stopped:
        kind, label = "done", "Смена завершена"
    elif active and active["type"] == "absence_start":
        kind, label = "absence", "Временное отсутствие"
    elif active:
        slot = active["slot"]
        label = {"tech1": "Техперерыв 1", "tech2": "Техперерыв 2", "lunch": "Обед"}.get(slot, "Перерыв")
        kind = "pause"
    elif started:
        kind, label = "work", "На смене"
    else:
        kind, label = "idle", "Смена не начата"
    return {"kind": kind, "label": label, "active": active, "started": started,
            "stopped": stopped, "sec": int(acc), "used": used}


def hms(sec: int) -> str:
    sec = max(0, int(sec))
    return f"{sec // 3600:02d}:{(sec % 3600) // 60:02d}:{sec % 60:02d}"


ICON_BY_KIND = {"work": "work", "pause": "break", "absence": "absence",
                "done": "off", "idle": "off", "offline": "offline"}


def icons_dir() -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    for cand in (base / "icons", Path(__file__).resolve().parent / "icons",
                 base.parent.parent / "app" / "assets"):
        if cand.exists():
            return cand
    return base


# ---------------------------------------------------------------- приложение --
class App:
    def __init__(self):
        self.cfg = load_config()
        self.api = Api(self.cfg)
        self.state = {"kind": "idle", "label": "Смена не начата", "sec": 0,
                      "active": None, "used": set(), "started": None, "stopped": None}
        self.pending = None            # {"act": str, "until": float, "label": str}
        self.icon = None
        self.lock = threading.Lock()
        self._alive = True

    # --- значок
    def make_icon(self, kind: str):
        from PIL import Image
        name = "tray-%s-32.png" % ICON_BY_KIND.get(kind, "off")
        path = icons_dir() / name
        if path.exists():
            return Image.open(path).convert("RGBA")
        return Image.new("RGBA", (32, 32), (0, 0, 0, 0))

    def status_line(self, item=None):
        st = self.state
        extra = f" · {hms(st['sec'])}" if st["kind"] in ("work", "pause", "absence") else ""
        title = f"{st['label']}{extra}"
        if self.pending:
            title = f"{self.pending['label']} · {max(0, int(self.pending['until'] - time.time()))} с"
        return title

    def page_url(self):
        return f"{SITE_BASE}team/{self.api.slug}/start/" if self.api.slug else SITE_BASE

    # --- доступность пунктов
    def can_start(self, item=None):
        return self.state["kind"] == "idle"

    def can_slot(self, slot):
        st = self.state
        if st["kind"] in ("idle", "done", "offline"):
            return False
        act = st.get("active") or {}
        if act:
            return act.get("slot") == slot
        return slot not in st.get("used", set())

    def can_finish(self, item=None):
        return self.state["kind"] in ("work", "pause", "absence")

    def can_return(self, item=None):
        return bool(self.state.get("active"))

    # --- меню
    def menu(self):
        from pystray import Menu, MenuItem
        return Menu(
            MenuItem(self.status_line, None, enabled=False),
            MenuItem(lambda _: ("ОТМЕНА · " + self.pending["label"]) if self.pending else "Отмена",
                     lambda: self.cancel_pending(), enabled=lambda _: bool(self.pending)),
            Menu.SEPARATOR,
            MenuItem("Начать смену", lambda: self.act("start"), enabled=self.can_start),
            MenuItem("Техперерыв 1", lambda: self.act("slot-tech1"), enabled=lambda _: self.can_slot("tech1")),
            MenuItem("Техперерыв 2", lambda: self.act("slot-tech2"), enabled=lambda _: self.can_slot("tech2")),
            MenuItem("Обед", lambda: self.act("slot-lunch"), enabled=lambda _: self.can_slot("lunch")),
            MenuItem("Вернуться с перерыва", lambda: self.act("return"), enabled=self.can_return),
            MenuItem("Временное отсутствие", lambda: self.act("absence"), enabled=lambda _: self.can_slot("absence")),
            MenuItem("Завершить смену", lambda: self.act("stop"), enabled=self.can_finish),
            Menu.SEPARATOR,
            MenuItem("Открыть мою страницу", lambda: webbrowser.open(self.page_url())),
            MenuItem("Обновить", lambda: self.refresh()),
            MenuItem("Журнал приложения", lambda: webbrowser.open(LOG_PATH.as_uri())),
            MenuItem(f"ОТП · версия {VERSION}", None, enabled=False),
            MenuItem("Выход", lambda: self.quit_app()),
        )

    def update_icon(self):
        if not self.icon:
            return
        try:
            self.icon.icon = self.make_icon(self.state["kind"])
            self.icon.title = self.status_line()
            self.icon.update_menu()
        except Exception:
            pass

    # --- действия
    def act(self, name):
        with self.lock:
            if self.pending and self.pending["act"] == name:
                p = self.pending
                self.pending = None
                self.apply(p["act"])
                return
            if self.pending:
                return
            labels = {"start": "Смена начнётся", "stop": "Смена завершится",
                      "return": "Перерыв завершится", "absence": "Отсутствие начнётся"}
            if name.startswith("slot-"):
                slot = name[5:]
                act = self.state.get("active") or {}
                if slot == "absence":
                    labels[name] = "Отсутствие начнётся"
                else:
                    base = "Обед" if slot == "lunch" else "Перерыв"
                    labels[name] = base + (" завершится" if act.get("slot") == slot else " начнётся")
            self.pending = {"act": name, "until": time.time() + CONFIRM_SECONDS,
                            "label": labels.get(name, "Действие")}
        self.update_icon()

    def cancel_pending(self):
        with self.lock:
            self.pending = None
        self.update_icon()

    def apply(self, name):
        try:
            if name == "start":
                self._post("shift_start", None)
            elif name == "stop":
                self._post("shift_stop", None)
            elif name == "return":
                act = self.state.get("active") or {}
                if act.get("type") == "absence_start":
                    self._post("absence_end", "absence")
                else:
                    self._post("break_end", act.get("slot") or "break")
            elif name == "absence":
                if (self.state.get("active") or {}).get("slot") == "absence":
                    self._post("absence_end", "absence")
                else:
                    self._post("absence_start", "absence", reason="Без заявки")
            elif name.startswith("slot-"):
                slot = name[5:]
                act = self.state.get("active") or {}
                self._post("break_end" if act.get("slot") == slot else "break_start", slot)
        except Exception as e:
            log("ошибка действия %s: %r" % (name, e))
            self.state = dict(self.state, kind="offline", label="Нет связи")
        self.refresh()
        self.update_icon()

    def _post(self, typ, slot, reason=None):
        now = datetime.now(TZ)
        ev = {
            "id": "app-" + str(int(time.time())) + "-" + os.urandom(2).hex(),
            "empSlug": self.api.slug, "empName": self.cfg.get("name") or "",
            "day": now.date().isoformat(), "type": typ, "slot": slot,
            "at": now.isoformat(timespec="seconds"),
        }
        if reason:
            ev["reason"] = reason
        self.api.add_event(ev)

    # --- опрос и отсчёт
    def refresh(self):
        try:
            self.state = compute_state(self.api.events_today())
        except Exception as e:
            log("нет связи при обновлении: %r" % (e,))
            self.state = dict(self.state, kind="offline", label="Нет связи")
        self.update_icon()
        return self.state

    def countdown_loop(self):
        while self._alive:
            time.sleep(1)
            p = self.pending
            if not p:
                continue
            left = int(round(p["until"] - time.time()))
            if left <= 0:
                with self.lock:
                    self.pending = None
                self.apply(p["act"])
            else:
                try:
                    if self.icon:
                        self.icon.title = f"{p['label']} · {left} с"
                except Exception:
                    pass

    def poll_loop(self):
        while self._alive:
            time.sleep(POLL_SECONDS)
            try:
                self.refresh()
            except Exception:
                pass

    # --- запуск
    def run(self):
        if not self.api.token:
            if not self.login_dialog():
                return
        self.refresh()
        from pystray import Icon
        self.icon = Icon(APP_NAME, self.make_icon(self.state["kind"]),
                         self.status_line(), menu=self.menu())
        threading.Thread(target=self.poll_loop, daemon=True).start()
        threading.Thread(target=self.countdown_loop, daemon=True).start()
        self.icon.run()

    def quit_app(self):
        self._alive = False
        try:
            if self.icon:
                self.icon.stop()
        except Exception:
            pass

    # --- вход
    def login_dialog(self):
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.title("ОТП — вход")
        root.geometry("440x230")
        tk.Label(root, text="Вставь ссылку на свою страницу (или её код):", anchor="w").pack(fill="x", padx=12, pady=(12, 2))
        link = tk.Entry(root)
        link.pack(fill="x", padx=12)
        tk.Label(root, text="Пароль:", anchor="w").pack(fill="x", padx=12, pady=(10, 2))
        pwd = tk.Entry(root, show="*")
        pwd.pack(fill="x", padx=12)
        result = {"ok": False}

        def go(_=None):
            raw = link.get().strip()
            code = raw
            if "/team/" in raw:
                code = raw.split("/team/", 1)[1].split("/", 1)[0]
            code = code.strip().strip("/")
            if not code or not pwd.get():
                messagebox.showwarning("ОТП", "Нужны ссылка (или код) и пароль.")
                return
            try:
                res = self.api.login(code, pwd.get())
            except Exception as e:
                messagebox.showerror("ОТП", f"Нет связи: {e}")
                return
            if not (res and res.get("ok")):
                messagebox.showerror("ОТП", "Неверный пароль или ссылка.")
                return
            self.cfg.update({"token": self.api.token, "slug": self.api.slug,
                             "name": res.get("fio") or "",
                             "cloud": self.cfg.get("cloud") or DEFAULT_CLOUD})
            save_config(self.cfg)
            result["ok"] = True
            root.destroy()

        tk.Button(root, text="Войти", command=go, width=18).pack(pady=14)
        pwd.bind("<Return>", go)
        link.focus_set()
        root.mainloop()
        return result["ok"]


def selftest() -> int:
    cfg = load_config()
    api = Api(cfg)
    print("конфиг:", CONFIG_PATH, "| токен:", "есть" if api.token else "нет", "| slug:", api.slug or "-")
    print("иконки:", icons_dir(), "| есть tray-work-32:", (icons_dir() / "tray-work-32.png").exists())
    now = datetime.now(TZ)
    ev = [{"type": "shift_start", "at": (now - timedelta(hours=1)).isoformat()},
          {"type": "break_start", "slot": "tech1", "at": (now - timedelta(minutes=10)).isoformat()}]
    st = compute_state(ev)
    print("тест состояния:", st["kind"], st["label"], hms(st["sec"]))
    assert st["kind"] == "pause" and st["active"]["slot"] == "tech1", st
    ev2 = ev + [{"type": "break_end", "slot": "tech1", "at": (now - timedelta(minutes=5)).isoformat()}]
    st2 = compute_state(ev2)
    assert st2["kind"] == "work" and "tech1" in st2["used"], st2
    print("selftest: OK")
    return 0


def main():
    if "--selftest" in sys.argv:
        return selftest()
    App().run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
