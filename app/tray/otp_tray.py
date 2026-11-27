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
import ssl
import subprocess
import sys
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timedelta, timezone
from pathlib import Path

APP_NAME = "OtpTray"
VERSION = "2.3.4"
try:
    from changelog import CHANGELOG
except Exception:      # запуск из другого каталога — истории просто не будет
    CHANGELOG = []


def current_changes():
    """Что вошло в установленную версию."""
    for v in CHANGELOG:
        if str(v.get("version")) == VERSION:
            return v
    return {}


def changes_of(ver: str):
    for v in CHANGELOG:
        if str(v.get("version")) == str(ver):
            return v
    return {}


def tray_icon_class(on_double_click=None):
    """Иконка трея с нужным поведением мыши.

    По умолчанию pystray открывает действие на ЛЮБОЙ левый клик, а меню — правым.
    Нужно: левый двойной клик — главное окно, левый одиночный — ничего,
    правый одиночный — контекстное меню.
    """
    try:
        from pystray import Icon
        from pystray._util import win32 as _w32

        WM_LBUTTONUP = 0x0202        # одиночный левый клик
        WM_LBUTTONDBLCLK = 0x0203    # двойной левый клик (в pystray этой константы нет)
        WM_RBUTTONUP = 0x0205        # правый клик — меню

        class TrayIcon(Icon):
            _on_double = staticmethod(on_double_click or (lambda *a: None))

            def _on_notify(self, wparam, lparam):
                # ВАЖНО: это оконная процедура. Любое исключение здесь убивает
                # цикл сообщений, значок остаётся «призраком» — поэтому всё в try.
                try:
                    if lparam == WM_LBUTTONDBLCLK:
                        try:
                            TrayIcon._on_double()
                        except Exception as e:
                            log("трей: окно не открылось (%r)" % (e,))
                        return
                    if lparam == WM_LBUTTONUP:
                        return          # одиночный левый клик ничего не делает
                except Exception as e:
                    log("трей: ошибка обработчика (%r)" % (e,))
                try:
                    return super()._on_notify(wparam, lparam)
                except Exception as e:
                    log("трей: меню не открылось (%r)" % (e,))

        return TrayIcon
    except Exception as e:
        log("иконка трея: обычное поведение (%r)" % (e,))
        from pystray import Icon
        return Icon


# причины временного отсутствия — те же, что на сайте
ABSENCE_REASONS = [
    "Без заявки",
    "Передохнуть на пару минут",
    "Зарядка для глаз",
    "Покурить",
    "Физ. потребность (туалет, попить, принять лекарство)",
    "Иное",
]
# Сочетания по умолчанию: пользователь может поменять их в меню «Горячие клавиши…»
DEFAULT_HOTKEYS = {
    "start": "ctrl+alt+s",
    "slot-tech1": "ctrl+alt+b",
    "slot-lunch": "ctrl+alt+l",
    "absence": "ctrl+alt+a",
    "return": "ctrl+alt+r",
    "stop": "ctrl+alt+e",
}
POLL_SECONDS = 20
CONFIRM_SECONDS = 10
ST_NORM_DAY = 7.5 * 3600
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
        # журнал не должен расти бесконечно: старше 1 МБ — сдвигаем в app.log.1
        try:
            if LOG_PATH.exists() and LOG_PATH.stat().st_size > 1024 * 1024:
                backup = LOG_PATH.with_suffix(".log.1")
                if backup.exists():
                    backup.unlink()
                LOG_PATH.rename(backup)
        except Exception:
            pass
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  {msg}\n")
    except Exception:
        pass


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


CONFIG_LOCK = threading.Lock()


def save_config(cfg: dict) -> None:
    # настройки пишут несколько потоков (опрос, данные страницы, события).
    # Без блокировки и атомарной записи файл мог остаться недописанным.
    with CONFIG_LOCK:
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = CONFIG_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, CONFIG_PATH)
    try:
        os.chmod(CONFIG_PATH, 0o600)
    except Exception:
        pass


# ------------------------------------------------------- автообновление ------
UPDATE_URL = "https://videoxiter.github.io/9a57a59df2fd/downloads/version.json"
SETUP_URL = "https://videoxiter.github.io/9a57a59df2fd/downloads/OTP-Tray-Setup.exe"
DATA_URL = "https://videoxiter.github.io/9a57a59df2fd/assets/js/data.js"


def ver_tuple(v) -> tuple:
    """Ключ сравнения версий: пары (число, буква) по каждому разряду.

    «2.3.3a» → ((2,0),(3,0),(3,1)); «2.3.3» → ((2,0),(3,0),(3,0)),
    поэтому первая больше, а «2.3.4» больше обеих.
    """
    try:
        import re as _re
        parts = _re.findall(r"(\d+)\s*([a-zA-Z]*)", str(v).replace(",", "."))
        key = []
        for num, letters in parts[:3]:
            # без буквы — младше любой буквенной версии: 2.3.3 < 2.3.3a
            key.append((int(num), (ord(letters.lower()[0]) - ord("a") + 1) if letters else 0))
        return tuple(key) if key else ((0, 0),)
    except Exception:
        return ((0, 0),)


def exe_built_at() -> float:
    """Когда собран установленный exe — сравниваем с датой публикации."""
    try:
        return Path(sys.executable).stat().st_mtime if getattr(sys, "frozen", False) else 0.0
    except Exception:
        return 0.0


def manifest_time(info) -> float:
    """Дата публикации манифеста в секундах."""
    try:
        raw = str(info.get("date") or "")
        if not raw:
            return 0.0
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def update_available():
    """Возвращает описание новой версии или None."""
    try:
        info = http_json(UPDATE_URL, timeout=15)
        if not isinstance(info, dict):
            return None
        latest = str(info.get("version") or "")
        if not latest or latest == VERSION:
            return None
        # сравниваем номера: ни при каких условиях не «обновляемся» на старую версию
        if ver_tuple(latest) > ver_tuple(VERSION):
            log("доступно обновление: %s (сейчас %s)" % (latest, VERSION))
            return info
        if ver_tuple(latest) < ver_tuple(VERSION):
            return None
        # номера равны — решает дата публикации (пересборка той же версии)
        if manifest_time(info) > exe_built_at() + 60:
            log("доступна пересборка %s (сейчас %s)" % (latest, VERSION))
            return info
    except Exception as e:
        log("обновление: проверка не удалась %r" % (e,))
    return None


STARTUP_DIR = Path(os.environ.get("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"


def autostart_target() -> Path:
    """Файл автозапуска в папке «Автозагрузка» — надёжнее ключа Run."""
    return STARTUP_DIR / "ОТП.cmd"


def autostart_enabled() -> bool:
    try:
        return autostart_target().exists()
    except Exception:
        return False


def set_autostart(on: bool) -> bool:
    """Включает/выключает запуск при входе: файл в «Автозагрузке» + ключ Run."""
    exe = Path(sys.executable) if getattr(sys, "frozen", False) else None
    if not exe:
        return False
    target = autostart_target()
    try:
        if on:
            STARTUP_DIR.mkdir(parents=True, exist_ok=True)
            target.write_text(
                '@echo off\r\n'
                f'start "" "{exe}"\r\n',
                encoding="cp1251" if os.name == "nt" else "utf-8",
            )
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                                    r"Software\Microsoft\Windows\CurrentVersion\Run",
                                    0, winreg.KEY_SET_VALUE) as k:
                    winreg.SetValueEx(k, "OtpTray", 0, winreg.REG_SZ, f'"{exe}"')
            except Exception as e:
                log("автозапуск: ключ реестра не записан %r" % (e,))
        else:
            if target.exists():
                target.unlink()
            try:
                import winreg
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
                                    r"Software\Microsoft\Windows\CurrentVersion\Run",
                                    0, winreg.KEY_SET_VALUE) as k:
                    winreg.DeleteValue(k, "OtpTray")
            except Exception:
                pass
        log("автозапуск: %s" % ("включён" if on else "выключен"))
        return True
    except Exception as e:
        log("автозапуск: ошибка %r" % (e,))
        return False


def venv_writable(path: Path) -> bool:
    """Можно ли писать в папку (в Program Files без прав — нельзя)."""
    try:
        probe = path / ".otp_write_test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return True
    except Exception:
        return False


def install_update(info) -> bool:
    """Обновление всегда идёт через установщик.

    Сборка теперь папочная (--onedir): приложение не распаковывает себя в
    %TEMP%, где антивирус удаляет python313.dll и программа падала с
    «Failed to load Python DLL». Поэтому новый код ставится установщиком в
    тихом режиме, а он же перезапускает приложение.
    """
    exe = Path(sys.executable) if getattr(sys, "frozen", False) else None
    if not exe:
        log("обновление: приложение запущено из скрипта — обновление не требуется")
        return False
    if not (info.get("url") or info.get("setup")):
        return False
    return update_via_installer(info)

    log_path = str(Path(tempfile.gettempdir()) / "otp-update.log")
    bat = Path(tempfile.gettempdir()) / "OtptrayUpdate.cmd"
    bat.write_text(
        "@echo off\r\n"
        "ping -n 4 127.0.0.1 >nul\r\n"
        f'copy /y "{exe}" "{exe}.old" >nul 2>&1\r\n'
        f'move /y "{new_exe}" "{exe}" >> "{log_path}" 2>&1\r\n'
        f'if not exist "{exe}" (\r\n'
        f'  move /y "{exe}.old" "{exe}" >> "{log_path}" 2>&1\r\n'
        f'  echo update failed, original restored >> "{log_path}"\r\n'
        "  exit /b 1\r\n"
        ")\r\n"
        f'start "" "{exe}"\r\n'
        f'del "{exe}.old" >nul 2>&1\r\n'
        'del "%~f0" >nul 2>&1\r\n',
        encoding="utf-8",
    )
    try:
        flags = 0x08000000 if os.name == "nt" else 0
        subprocess.Popen(["cmd", "/c", str(bat)], creationflags=flags,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log("обновление: перезапускаюсь в новую версию")
        os._exit(0)
    except Exception as e:
        log("обновление: перезапуск не удался %r" % (e,))
        return False


def update_via_installer(info) -> bool:
    """Обновление для установки «для всех пользователей» (Program Files).

    Скачиваем установщик и запускаем его с повышением прав в тихом режиме:
    он перезапишет файлы в своей папке и снова запустит приложение.
    Пользователь увидит только запрос UAC «Разрешить изменение».
    """
    import hashlib
    import tempfile
    setup_url = str(info.get("setup") or SETUP_URL)
    want = str(info.get("setupSha256") or "")
    setup = Path(tempfile.gettempdir()) / "OTP-Tray-Setup.exe"
    try:
        with urllib.request.urlopen(setup_url, timeout=180,
                                    context=ssl._create_unverified_context()) as r:
            data = r.read()
        if want and hashlib.sha256(data).hexdigest().lower() != want.lower():
            log("обновление: контрольная сумма установщика не совпала — отмена")
            return False
        setup.write_bytes(data)
        log("обновление: установщик скачан (%d байт)" % len(data))
    except Exception as e:
        log("обновление: установщик скачать не удалось %r" % e)
        try:
            webbrowser.open(setup_url)
        except Exception:
            pass
        return False

    try:
        import tempfile
        # Установщик заменяет OtpTray.exe, а он занят работающим приложением
        # (ошибка «DeleteFile: код 32»). Поэтому запускаем не сразу: сначала
        # выходим, а маленький скрипт ждёт 5 секунд и только потом ставит.
        helper = Path(tempfile.gettempdir()) / "OtpUpdateRun.cmd"
        helper.write_text(
            "@echo off\r\n"
            "ping -n 6 127.0.0.1 >nul\r\n"
            f'start "" "{setup}" /SILENT /NORESTART /CLOSEAPPLICATIONS /LOG="%TEMP%\\otp-setup.log"\r\n'
            'del "%~f0" >nul 2>&1\r\n',
            encoding="cp1251" if os.name == "nt" else "utf-8",
        )
        flags = 0x08000000 if os.name == "nt" else 0
        subprocess.Popen(["cmd", "/c", str(helper)], creationflags=flags,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log("обновление: выхожу, установщик запустится через несколько секунд")
        os._exit(0)
    except Exception as e:
        log("обновление: запуск установщика не удался %r" % e)
        try:
            webbrowser.open(setup_url)
        except Exception:
            pass
        return False


def notify_balloon(title: str, text: str) -> None:
    """Простое уведомление Windows без участия значка (если он ещё не создан)."""
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, title, 0x00000040)
    except Exception:
        pass


def http_text(url: str, timeout: int = 60) -> str:
    """Скачивание текста с тем же обходом корпоративного сертификата."""
    def go(ctx):
        req = urllib.request.Request(url, headers={"User-Agent": "OtpTray/" + VERSION})
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            return r.read().decode("utf-8", "replace")

    try:
        return go(ssl.create_default_context())
    except urllib.error.URLError as e:
        reason = getattr(e, "reason", e)
        if isinstance(reason, ssl.SSLError) or "CERTIFICATE_VERIFY_FAILED" in str(reason):
            return go(ssl._create_unverified_context())
        raise


def content_snapshot(slug: str, payload=None):
    """Снимок важного для сотрудника: график, бонусы, награды, место.

    Читаем публичный data.js (тот же файл, что и сайт) и берём только то,
    что касается этого сотрудника. Сравнение снимков даёт «что нового».
    """
    if payload:
        data = payload            # данные пришли с сервера (RPC), файл на сайте не нужен
    else:
        try:
            raw = http_text(DATA_URL)
            mark = "window.OTP_DATA = "
            i = raw.index(mark)
            data = json.loads(raw[i + len(mark):].strip().rstrip(";"))
        except Exception as e:
            log("данные сайта: не удалось прочитать %r" % (e,))
            return None
    emp = next((e for e in (data.get("employees") or [])
                if slug in (str(e.get("slug")), str(e.get("id")))), None)
    if not emp:
        return None
    months = ((data.get("schedule") or {}).get("months") or {})
    cur = max(months) if months else ""
    shifts = ((months.get(cur) or {}).get("shifts") or {})
    days = shifts.get(emp.get("fullName")) or {}
    hist = emp.get("history") or []
    last = hist[-1] if hist else {}
    return {
        "schedule_month": cur,
        "schedule": {str(k): (v or {}).get("sym") for k, v in days.items()},
        "bonus": last.get("bonus"),
        "money": last.get("money"),
        "awards": len(emp.get("awards") or []),
        "stars": emp.get("stars"),
        "rank": emp.get("rank"),
    }


def content_diff(old, new) -> list:
    """Что именно изменилось — словами."""
    if not old or not new:
        return []
    out = []
    if old.get("schedule") != new.get("schedule") or old.get("schedule_month") != new.get("schedule_month"):
        out.append("график")
    if old.get("bonus") != new.get("bonus") or old.get("money") != new.get("money"):
        out.append("бонусы")
    if old.get("awards") != new.get("awards"):
        out.append("награды")
    if old.get("stars") != new.get("stars") or old.get("rank") != new.get("rank"):
        out.append("уровень и место")
    return out


# ---------------------------------------------------------------------- API ---
def http_json(url: str, method: str = "GET", body=None, headers=None, timeout: int = 20):
    """Запрос с проверкой TLS. Если корпоративный прокси подставляет сертификат,
    который Python не может проверить (частая ошибка
    «CERTIFICATE_VERIFY_FAILED: Missing Authority Key Identifier»), повторяем
    запрос без проверки цепочки — иначе приложение выглядит как «нет связи»
    или «неверный пароль», хотя сервер доступен."""
    data = json.dumps(body).encode("utf-8") if body is not None else None

    def go(ctx):
        req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
        if body is not None:
            req.add_header("Content-Type", "application/json")
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            text = r.read().decode("utf-8")
            return json.loads(text) if text else None

    try:
        return go(ssl.create_default_context())
    except urllib.error.URLError as e:
        reason = getattr(e, "reason", e)
        if isinstance(reason, ssl.SSLError) or "CERTIFICATE_VERIFY_FAILED" in str(reason):
            log("TLS: сертификат не проверен (%r) — повторяю без проверки цепочки" % (reason,))
            return go(ssl._create_unverified_context())
        raise


class Api:
    def __init__(self, cfg: dict):
        cloud = cfg.get("cloud") or DEFAULT_CLOUD
        self.url = str(cloud.get("url") or DEFAULT_CLOUD["url"]).rstrip("/")
        self.key = str(cloud.get("key") or DEFAULT_CLOUD["key"])
        self.token = cfg.get("token") or ""
        self.slug = cfg.get("slug") or ""
        # v17: токен устройства — нужен, если у сотрудника включено
        # «старт смены только из приложения».
        self.device = cfg.get("device") or ""

    def rpc(self, name: str, payload: dict):
        return http_json(f"{self.url}/rest/v1/rpc/{name}", "POST", payload,
                         {"apikey": self.key, "Authorization": "Bearer " + self.key})

    def login(self, slug: str, password: str):
        try:
            res = self.rpc("otp_login", {"p_slug": slug, "p_pass": password})
        except Exception as e:
            log("вход: ошибка связи %r" % (e,))
            return {"ok": False, "error": "network", "detail": str(e)}
        if res and res.get("ok") and res.get("token"):
            self.token, self.slug = res["token"], slug
        return res or {"ok": False, "error": "нет ответа"}

    def claim_device(self, label: str = "OTP tray"):
        """Заявляем устройство и запоминаем его токен (для «старт только из приложения»)."""
        try:
            res = self.rpc("otp_device_claim", {"p_token": self.token, "p_label": label})
            if res and res.get("ok") and res.get("device"):
                self.device = res["device"]
                log("устройство привязано: %s" % self.device[:8])
                return self.device
        except Exception as e:
            log("не удалось привязать устройство: %r" % (e,))
        return ""

    def api(self, path: str, method: str = "GET", body=None):
        payload = {"token": self.token, "path": path, "method": method, "body": body}
        if self.device:
            payload["device"] = self.device
        return http_json(f"{self.url}/functions/v1/api", "POST", payload,
                         {"apikey": self.key, "Authorization": "Bearer " + self.key})

    def events_today(self):
        day = datetime.now(TZ).date().isoformat()
        rows = self.api(f"otp_time_events?select=*&day=eq.{day}"
                        f"&empSlug=eq.{urllib.parse.quote(self.slug)}&order=at.asc")
        return rows if isinstance(rows, list) else []

    def add_event(self, ev: dict):
        return self.api("otp_time_events", "POST", [ev])

    def poll_my(self):
        """Открытый опрос по графику и мой ответ (v21)."""
        return self.rpc("otp_poll_my", {"p_token": self.token})


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
class Hotkeys:
    """Глобальные горячие клавиши (Windows), настраиваемые пользователем.

    Сочетания хранятся в конфиге (`hotkeys`): действие → строка вида «ctrl+alt+s».
    Реализовано через WinAPI RegisterHotKey: без сторонних библиотек и без прав
    администратора. На macOS и при ошибке — просто не запускается (в журнал пишется причина).
    """
    MOD_ALT = 0x0001
    MOD_CONTROL = 0x0002
    MOD_SHIFT = 0x0004
    MOD_WIN = 0x0008
    WM_HOTKEY = 0x0312
    WM_QUIT = 0x0012

    ACTIONS = [
        ("start", "Начать смену"),
        ("slot-tech1", "Техперерыв 1"),
        ("slot-lunch", "Обед"),
        ("absence", "Временное отсутствие"),
        ("return", "Вернуться с перерыва"),
        ("stop", "Завершить смену"),
    ]

    def __init__(self, app, combos):
        self.app = app
        self.combos = combos or {}
        self.alive = True
        self.tid = 0

    @staticmethod
    def parse(text):
        """«ctrl+alt+s» → (модификаторы, виртуальный код клавиши) или None."""
        s = (text or "").strip().lower().replace("+", " ")
        parts = [p for p in s.split() if p]
        if not parts:
            return None
        mods, vk = 0, None
        for p in parts:
            if p in ("ctrl", "control"):
                mods |= Hotkeys.MOD_CONTROL
            elif p == "alt":
                mods |= Hotkeys.MOD_ALT
            elif p == "shift":
                mods |= Hotkeys.MOD_SHIFT
            elif p in ("win", "windows"):
                mods |= Hotkeys.MOD_WIN
            elif p == "space":
                vk = 0x20
            elif len(p) == 1 and (p.isalnum() or p in "`-=[];',./\\"):
                vk = ord(p.upper())
            elif p.startswith("f") and p[1:].isdigit() and 1 <= int(p[1:]) <= 12:
                vk = 0x70 + int(p[1:]) - 1
            else:
                return None
        return (mods, vk) if (vk and mods) else None

    def stop(self):
        self.alive = False
        try:
            import ctypes
            if self.tid:
                ctypes.windll.user32.PostThreadMessageW(self.tid, self.WM_QUIT, 0, 0)
        except Exception:
            pass

    def run(self):
        if os.name != "nt":
            log("горячие клавиши: только Windows — пропускаю")
            return
        try:
            import ctypes
            import ctypes.wintypes as wt
            kernel32 = ctypes.windll.kernel32
            user32 = ctypes.windll.user32
            self.tid = kernel32.GetCurrentThreadId()
            ids = {}
            for i, (act, _label) in enumerate(self.ACTIONS, start=1):
                combo = self.parse(self.combos.get(act, ""))
                if not combo:
                    continue
                mods, vk = combo
                if user32.RegisterHotKey(None, i, mods, vk):
                    ids[i] = act
                else:
                    log("горячая клавиша для %s (%s) занята другой программой" % (act, self.combos.get(act)))
            if not ids:
                log("горячие клавиши: ни одно сочетание не зарегистрировано")
                return
            log("горячие клавиши включены: " + ", ".join(
                "%s=%s" % (a, self.combos.get(a, "")) for a in ids.values()))
            msg = wt.MSG()
            while self.alive:
                if user32.GetMessageW(ctypes.byref(msg), None, 0, 0) == 0:
                    break
                if msg.message == self.WM_HOTKEY:
                    act = ids.get(int(msg.wParam))
                    if act:
                        try:
                            self.app.act(act)
                        except Exception as e:
                            log("горячая клавиша %s: ошибка %r" % (act, e))
            try:
                for i in list(ids):
                    user32.UnregisterHotKey(None, i)
            except Exception:
                pass
        except Exception as e:
            log("горячие клавиши не запустились: %r" % (e,))


class App:
    def __init__(self):
        self.cfg = load_config()
        self.api = Api(self.cfg)
        # v17: если вход уже был, а устройство ещё не привязано — привязываем сейчас
        if self.api.token and not self.api.device:
            dev = self.api.claim_device("Приложение OTP")
            if dev:
                self.cfg["device"] = dev
                save_config(self.cfg)
        self.state = {"kind": "idle", "label": "Смена не начата", "sec": 0,
                      "active": None, "used": set(), "started": None, "stopped": None}
        self.pending = None            # {"act": str, "until": float, "label": str}
        self.icon = None
        self.lock = threading.Lock()
        self._alive = True
        self.events = []

    # --- значок
    def make_icon(self, kind: str):
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

    def _make_icon_base(self, kind: str):
        from PIL import Image
        name = "tray-%s-32.png" % ICON_BY_KIND.get(kind, "off")
        path = icons_dir() / name
        if path.exists():
            return Image.open(path).convert("RGBA")
        return Image.new("RGBA", (32, 32), (0, 0, 0, 0))

    def return_text(self, item=None):
        """Подпись действия «вернуться»: перерыв, обед или отсутствие."""
        st = self.state or {}
        slot = (st.get("active") or {}).get("slot")
        if st.get("kind") == "absence" or slot == "absence":
            return "Вернуться после отсутствия"
        if slot == "lunch":
            return "Вернуться с обеда"
        return "Вернуться с перерыва"

    def status_line(self, item=None):
        st = self.state
        extra = f" · {hms(st['sec'])}" if st["kind"] in ("work", "pause", "absence") else ""
        title = f"{st['label']}{extra}"
        if self.pending:
            title = f"{self.pending['label']} · {max(0, int(self.pending['until'] - time.time()))} с"
        return title

    def poll_url(self):
        """Ссылка на раздел «Опрос» личной страницы."""
        base = self.page_url().rstrip("/") if self.api.slug else SITE_BASE
        if base.endswith("/start"):
            base = base[:-6]
        return base.rstrip("/") + "/poll/"

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
    def menu_dot(self, colour):
        """Маленькая цветная точка для пункта меню (по статусу действия)."""
        cache = getattr(self, "_dots", None)
        if cache is None:
            cache = self._dots = {}
        if colour in cache:
            return cache[colour]
        from PIL import Image, ImageDraw
        img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
        ImageDraw.Draw(img).ellipse((3, 3, 12, 12), fill=colour)
        cache[colour] = img
        return img

    def menu(self):
        from pystray import Menu, MenuItem
        return Menu(
            MenuItem("Открыть окно ОТП", self._on_tray_activate, default=True),
            Menu.SEPARATOR,
            MenuItem(lambda _: "🔴  ОПРОС ПО ГРАФИКУ — заполнить пожелания",
                     lambda: webbrowser.open(self.poll_url()),
                     visible=lambda _: bool(self.cfg.get("pollOpen"))),
            MenuItem(self.status_line, None, enabled=False),
            MenuItem("Горячие: Ctrl+Alt+S/B/L/A/R/E", None, enabled=False),
            MenuItem(lambda _: ("ОТМЕНА · " + self.pending["label"]) if self.pending else "Отмена",
                     lambda: self.cancel_pending(), enabled=lambda _: bool(self.pending)),
            Menu.SEPARATOR,
            MenuItem("▶  Начать смену", lambda: self.act("start"), enabled=self.can_start),
            MenuItem("☕  Техперерыв 1", lambda: self.act("slot-tech1"), enabled=lambda _: self.can_slot("tech1")),
            MenuItem("☕  Техперерыв 2", lambda: self.act("slot-tech2"), enabled=lambda _: self.can_slot("tech2")),
            MenuItem("🍽  Обед", lambda: self.act("slot-lunch"), enabled=lambda _: self.can_slot("lunch")),
            MenuItem(lambda _: "↩  " + self.return_text(),
                     lambda: self.act("return"), enabled=self.can_return),
            MenuItem("🚶  Временное отсутствие", lambda: self.act("absence"), enabled=lambda _: self.can_slot("absence")),
            MenuItem("■  Завершить смену", lambda: self.act("stop"), enabled=self.can_finish),
            Menu.SEPARATOR,
            MenuItem("Моя страница на сайте", lambda: webbrowser.open(self.page_url())),
            MenuItem("Проверить обновление", lambda: threading.Thread(target=self.check_updates_manual, daemon=True).start()),
            MenuItem("Проверить новые данные", lambda: threading.Thread(target=self.check_content_manual, daemon=True).start()),
            Menu.SEPARATOR,
            MenuItem("Справка", lambda: threading.Thread(target=self.help_window, daemon=True).start()),
            MenuItem("Горячие клавиши…", lambda: threading.Thread(target=self.hotkeys_dialog, daemon=True).start()),
            MenuItem("Запускать при входе в Windows", self.toggle_autostart,
                     checked=lambda _: autostart_enabled()),
            MenuItem("О программе", lambda: threading.Thread(target=self.about_window, daemon=True).start()),
            MenuItem("Журнал приложения", lambda: webbrowser.open(LOG_PATH.as_uri())),
            MenuItem("Перезапустить", self.restart_app),
            MenuItem("Выход", lambda: self.quit_app()),
        )

    def push_feed(self, text):
        """Добавляет событие в ленту главного окна (максимум 8 записей)."""
        try:
            items = list(self.cfg.get("feed") or [])
            items.insert(0, {"t": datetime.now(TZ).strftime("%H:%M"), "text": str(text)[:220]})
            self.cfg["feed"] = items[:8]
            save_config(self.cfg)
        except Exception:
            pass

    def feed_items(self):
        try:
            return list(self.cfg.get("feed") or [])
        except Exception:
            return []

    def _on_tray_activate(self, *_):
        """Библиотека зовёт это на каждый левый клик: окно — только на двойной."""
        now = time.monotonic()
        prev = getattr(self, "_last_tray_click", 0.0)
        self._last_tray_click = now
        if now - prev <= 0.45:
            self._last_tray_click = 0.0
            self.show_main_window()

    def show_main_window(self, *_):
        """Просит окно показаться: Tk из этого потока трогать нельзя,
        поэтому выставляем флаг, а окно поднимает себя само."""
        self._win_show = True
        lock = getattr(self, "_win_lock", None)
        if lock is None:
            lock = self._win_lock = threading.Lock()
        with lock:
            if not getattr(self, "_win_alive", False) and not getattr(self, "_win_starting", False):
                self._win_starting = True
                threading.Thread(target=self.main_window, daemon=True).start()

    def main_window(self):
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
        if not self.cfg.get("whatsnewSeen"):
            tk.Button(head, text="Что нового", command=self._open_whatsnew,
                      relief="flat", bd=0, bg="#0d2330", fg=ACCENT, cursor="hand2",
                      font=("Segoe UI", 9, "bold"), padx=10, pady=3).pack(side="right", padx=(0, 10))

        poll_card = tk.Frame(root, bg="#3a0d12", highlightbackground="#ef4444", highlightthickness=2)
        poll_var = tk.StringVar(value="")
        poll_row = tk.Frame(poll_card, bg="#3a0d12")
        poll_row.pack(fill="x", padx=16, pady=10)
        tk.Label(poll_row, text="📝", bg="#3a0d12", fg="#fecaca",
                 font=("Segoe UI", 14)).pack(side="left", padx=(0, 8))
        tk.Label(poll_row, textvariable=poll_var, bg="#3a0d12", fg="#fecaca",
                 font=("Segoe UI", 10, "bold"), justify="left", wraplength=370).pack(side="left", anchor="w")
        tk.Button(poll_row, text="Заполнить", command=lambda: webbrowser.open(self.poll_url()),
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
            poll_var.set("ОПРОС ПО ГРАФИКУ на " + name + due + " — пожелания ещё не отправлены")
            if not poll_card.winfo_ismapped():
                poll_card.pack(fill="x", padx=24, pady=(12, 0), before=card)

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
                if "return" in buttons:
                    try:
                        buttons["return"][0].configure(text="↩  " + self.return_text())
                    except Exception:
                        pass
                for key, (btn, primary) in buttons.items():
                    # ВАЖНО: вызываем методы — ссылка на метод всегда истинна,
                    # из-за этого кнопки «горели» в неподходящий момент
                    ok = {"start": self.can_start, "stop": self.can_finish,
                          "return": self.can_return}.get(key)
                    ok = bool(ok()) if ok else bool(self.can_slot(key))
                    btn.configure(state="normal" if ok else "disabled",
                                  bg=(ACCENT if ok else "#0f1d28") if primary else CARD,
                                  fg="#06131a" if (primary and ok) else ("#7f93a8" if primary else TEXT),
                                  disabledforeground="#4b5b6b")
                render_feed()
                refresh_poll_banner()
            except Exception:
                pass
            root.after(700, tick)

        self._win_root = root
        self._win_alive = True
        root.protocol("WM_DELETE_WINDOW", root.withdraw)

        def watch_flag():
            try:
                if getattr(self, "_win_show", False):
                    self._win_show = False
                    root.deiconify()
                    root.lift()
                    try:
                        root.focus_force()
                    except Exception:
                        pass
            except Exception:
                pass
            try:
                root.after(400, watch_flag)
            except Exception:
                pass

        watch_flag()
        tick()
        try:
            root.mainloop()
        finally:
            self._win_alive = False
            self._win_root = None

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
        # «Временное отсутствие» спрашивает причину сразу, без 10-секундного отсчёта:
        # ждать подтверждения, чтобы потом ответить на вопрос — слишком долго
        if name == "absence" and not (self.state.get("active") or {}).get("slot") == "absence":
            threading.Thread(target=self.apply, args=("absence",), daemon=True).start()
            return
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

    def absence_dialog(self):
        """Спрашивает причину временного отсутствия (как на сайте)."""
        import tkinter as tk
        res = {"value": None}
        root = tk.Tk()
        root.title("ОТП — временное отсутствие")
        root.geometry("580x430")
        tk.Label(root, text="Укажите причину отсутствия",
                 font=("Segoe UI", 12, "bold")).pack(pady=(14, 8))
        tk.Label(root, text="Причина попадёт в журнал и в сообщение руководителю.",
                 fg="#6b7280").pack(pady=(0, 10))
        var = tk.StringVar(value=self.cfg.get("absenceReason") or ABSENCE_REASONS[0])
        for r in ABSENCE_REASONS[:-1]:
            tk.Radiobutton(root, text=r, value=r, variable=var, anchor="w").pack(fill="x", padx=18)
        row = tk.Frame(root)
        row.pack(fill="x", padx=18, pady=(8, 0))
        tk.Radiobutton(row, text="Иное:", value="__other__", variable=var).pack(side="left")
        other = tk.Entry(row)
        other.pack(side="left", fill="x", expand=True, padx=(8, 0))

        def ok():
            value = var.get()
            if value == "__other__":
                value = other.get().strip() or "Иное"
            res["value"] = value
            try:
                self.cfg["absenceReason"] = value
                save_config(self.cfg)
            except Exception:
                pass
            root.destroy()

        def cancel():
            res["value"] = None
            root.destroy()

        btns = tk.Frame(root)
        btns.pack(pady=16)
        tk.Button(btns, text="Начать отсутствие", command=ok, width=20).pack(side="left", padx=6)
        tk.Button(btns, text="Отмена", command=cancel, width=12).pack(side="left", padx=6)
        root.protocol("WM_DELETE_WINDOW", cancel)
        root.mainloop()
        return res["value"]

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
                    reason = self.absence_dialog()
                    if not reason:
                        self.refresh()
                        return
                    self._post("absence_start", "absence", reason=reason)
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
        self._notify(ev)

    def _notify(self, ev):
        """Мгновенное сообщение в «ДисКо» (как это делает сайт).

        Отправляем сразу после записи события, чтобы перерывы/смена были видны
        в канале за секунды, а не через cron (до минуты). Ошибку не показываем:
        если не вышло — событие всё равно в базе, и cron дошлёт.
        """
        try:
            key = (self.cfg.get("cloud") or DEFAULT_CLOUD).get("key") or DEFAULT_CLOUD["key"]
            http_json(f"{self.api.url}/functions/v1/notify", "POST", {"event": ev},
                      {"apikey": key, "Authorization": "Bearer " + key, "x-otp-key": key})
        except Exception as e:
            log("notify не отправлен: %r" % (e,))

    # --- опрос и отсчёт
    def refresh(self):
        try:
            self.events = self.api.events_today()
            self.state = compute_state(self.events or [])
        except Exception as e:
            log("нет связи при обновлении: %r" % (e,))
            self.state = dict(self.state, kind="offline", label="Нет связи")
        self.update_icon()
        return self.state

    def tick_state(self):
        """Пересчёт времени по локальным часам — раз в секунду, без сети."""
        try:
            if self.events:
                fresh = compute_state(self.events)
                # смена могла завершиться по локальным часам — значок тоже обновляем
                if fresh.get("kind") != self.state.get("kind"):
                    self.state = fresh
                    self.update_icon()
                else:
                    self.state = fresh
        except Exception as e:
            log("пересчёт состояния: %r" % (e,))

    def state_loop(self):
        """Держит время в окне живым: пересчёт каждую секунду."""
        while self._alive:
            time.sleep(1)
            self.tick_state()

    def countdown_loop(self):
        while self._alive:
            time.sleep(1)
            try:
                self.maybe_pause_warning()
            except Exception:
                pass
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

    # --- напоминание о затянувшемся перерыве
    PAUSE_LIMIT = {"tech1": 15, "tech2": 15, "lunch": 60, "absence": 30}

    def maybe_pause_warning(self):
        """Если перерыв идёт дольше нормы — показываем уведомление в трее.

        Своё напоминание, не зависящее от «ДисКо»: сотрудник видит его даже
        при свёрнутом приложении. Одно уведомление на один перерыв.
        """
        active = (self.state.get("active") or {}) if isinstance(self.state, dict) else {}
        if not active:
            self._pause_warn_key = ""
            return
        slot = str(active.get("slot") or "")
        key = "%s|%s" % (slot, active.get("at") or "")
        if getattr(self, "_pause_warn_key", "") == key:
            return
        try:
            at = datetime.fromisoformat(str(active.get("at")).replace("Z", "+00:00"))
            if at.tzinfo is None:
                at = at.replace(tzinfo=TZ)
            mins = (datetime.now(TZ) - at).total_seconds() / 60.0
        except Exception:
            return
        limit = self.PAUSE_LIMIT.get(slot, 15)
        if mins < limit:
            return
        self._pause_warn_key = key
        title = "ОТП: перерыв затянулся"
        label = {"tech1": "Техперерыв 1", "tech2": "Техперерыв 2", "lunch": "Обед",
                 "absence": "Временное отсутствие"}.get(slot, "Перерыв")
        body = f"{label} идёт уже {int(mins)} мин (норма {limit} мин) — пора возвращаться к работе."
        log("напоминание: " + body)
        try:
            if self.icon:
                self.icon.notify(body, title)
        except Exception:
            # на части систем всплывающие уведомления недоступны — хотя бы заголовок значка
            try:
                if self.icon:
                    self.icon.title = body
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
        # самовосстановление автозапуска: включён в настройках, а файла нет
        try:
            if self.cfg.get("autostart") is True and not autostart_enabled():
                set_autostart(True)
        except Exception:
            pass
        if not self.api.token:
            if not self.login_dialog():
                return
        self.refresh()
        # после обновления один раз показываем, что изменилось
        threading.Thread(target=self.maybe_show_whatsnew, daemon=True).start()
        # глобальные горячие клавиши (Windows) из настроек
        self.start_hotkeys()
        # ежедневная проверка обновлений (и сразу при запуске)
        threading.Thread(target=self.update_loop, daemon=True).start()
        # проверка новых данных на странице (график, бонусы, награды)
        threading.Thread(target=self.content_loop, daemon=True).start()
        threading.Thread(target=self.poll_loop, daemon=True).start()
        threading.Thread(target=self.state_loop, daemon=True).start()

        from pystray import Icon
        IconClass = Icon  # обычная иконка: пystray сам зовёт пункт по умолчанию
        self.icon = IconClass(APP_NAME, self.make_icon(self.state["kind"]),
                         self.status_line(), menu=self.menu())
        threading.Thread(target=self.poll_loop, daemon=True).start()
        threading.Thread(target=self.countdown_loop, daemon=True).start()
        # сторож: если цикл сообщений завершится сам (ошибка внутри библиотеки),
        # поднимаем значок заново, а не оставляем «призрачную» иконку
        for attempt in range(1, 4):
            try:
                self.icon.run()
                if not self._alive or getattr(self, "_quitting", False):
                    break
                log("трей: цикл завершился неожиданно (попытка %d) — перезапускаю" % attempt)
            except Exception as e:
                log("трей: сбой цикла (%r)" % (e,))
            if not self._alive or getattr(self, "_quitting", False):
                break
            time.sleep(2)
            try:
                from pystray import Icon as _I
                self.icon = Icon(APP_NAME, self.make_icon(self.state["kind"]),
                                 self.status_line(), menu=self.menu())
            except Exception as e:
                log("трей: не удалось поднять заново (%r)" % (e,))
                break

    def toggle_autostart(self):
        """Включает/выключает запуск при входе в Windows."""
        on = not autostart_enabled()
        ok = set_autostart(on)
        try:
            self.cfg["autostart"] = bool(on)
            save_config(self.cfg)
        except Exception:
            pass
        try:
            self.icon.update_menu()
        except Exception:
            pass
        if not ok:
            notify_balloon("Автозапуск", "Не удалось изменить автозапуск. Проверьте журнал приложения.")
        else:
            notify_balloon("Автозапуск", "Автозапуск включён." if on else "Автозапуск выключен.")

    def restart_app(self, item=None):
        """Перезапуск: старый процесс выходит, новый стартует через паузу.

        Пауза обязательна: иначе новый экземпляр видит занятый мьютекс
        и завершается, а старый уже закрылся — приложение пропадает.
        """
        try:
            exe = sys.executable
            args = [exe] if getattr(sys, "frozen", False) else [exe, os.path.abspath(__file__)]
            # прямой запуск: cmd/start в отсоединённом процессе не работал,
            # а гонку за единственный экземпляр закрывает ожидание мьютекса
            flags = 0x00000008 | 0x00000200          # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
            subprocess.Popen(args, creationflags=flags, close_fds=True,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            log("перезапуск: новый экземпляр запущен, ждёт освобождения защиты")
        except Exception as e:
            log("перезапуск: %r" % (e,))
        self._alive = False
        self._quitting = True
        threading.Timer(0.3, lambda: os._exit(0)).start()

    def quit_app(self):
        self._alive = False
        self._quitting = True
        try:
            if getattr(self, "hotkeys", None):
                self.hotkeys.stop()
        except Exception:
            pass
        try:
            if self.icon:
                self.icon.stop()
        except Exception:
            pass
        # окна работают в своих потоках — завершаем процесс явно
        threading.Timer(0.4, lambda: os._exit(0)).start()

    # --- справка и «О программе»
    def _open_whatsnew(self):
        """Открывает историю версий и помечает «что нового» просмотренным."""
        self.cfg["whatsnewSeen"] = True
        try:
            save_config(self.cfg)
        except Exception:
            pass
        self.changelog_window(only_current=True)

    def changelog_window(self, only_current=False):
        """История версий: что менялось и что исправлялось."""
        import tkinter as tk
        from tkinter import ttk
        root = tk.Tk()
        root.title("ОТП — что нового" if only_current else "ОТП — история обновлений")
        root.geometry("640x580")
        cur = current_changes()
        head = f"Версия {VERSION}" + (f" · {cur.get('date', '')}" if cur else "")
        tk.Label(root, text=head, font=("Segoe UI", 14, "bold")).pack(pady=(14, 2))
        if cur and cur.get("title"):
            tk.Label(root, text=cur["title"], font=("Segoe UI", 10), fg="#0e7490").pack()

        frame = tk.Frame(root)
        frame.pack(fill="both", expand=True, padx=14, pady=10)
        scroll = ttk.Scrollbar(frame, orient="vertical")
        text = tk.Text(frame, wrap="word", yscrollcommand=scroll.set, borderwidth=0,
                       font=("Segoe UI", 10), padx=10, pady=8)
        scroll.config(command=text.yview)
        scroll.pack(side="right", fill="y")
        text.pack(side="left", fill="both", expand=True)

        text.tag_configure("ver", font=("Segoe UI", 12, "bold"), spacing1=10, spacing3=2)
        text.tag_configure("date", foreground="#6b7280")
        text.tag_configure("item", lmargin1=18, lmargin2=18, spacing3=2)

        items = CHANGELOG if not only_current else ([cur] if cur else [])
        for v in items:
            marker = "   ← эта версия" if v.get("version") == VERSION else ""
            text.insert("end", f"{v.get('version')} · {v.get('title', '')}", "ver")
            text.insert("end", f"   {v.get('date', '')}{marker}\n", "date")
            for it in v.get("items") or []:
                text.insert("end", f"• {it}\n", "item")
        text.configure(state="disabled")

        tk.Button(root, text="Понятно", command=root.destroy, width=16).pack(pady=(0, 14))
        root.mainloop()

    def maybe_show_whatsnew(self):
        """После обновления сообщаем о новой версии БЕЗ открытия окон.

        Раньше окно создавалось из фонового потока — это подвешивало трей
        (иконка переставала отвечать). Окно истории человек открывает сам.
        """
        if self.cfg.get("lastVersion") == VERSION:
            return
        first_run = not self.cfg.get("lastVersion")
        self.cfg["lastVersion"] = VERSION
        self.cfg["whatsnewSeen"] = bool(first_run)
        try:
            save_config(self.cfg)
        except Exception:
            pass
        if first_run:
            return
        text = "Обновлено до версии %s — что изменилось, смотрите в «О программе → История версий»." % VERSION
        self.push_feed(text)
        try:
            if self.icon:
                self.icon.notify(text, "ОТП обновилось")
        except Exception:
            pass

    def about_window(self):
        import tkinter as tk
        root = tk.Tk()
        root.title("О программе «ОТП»")
        root.geometry("560x430")
        tk.Label(root, text="ОТП — учёт рабочего времени", font=("Segoe UI", 14, "bold")).pack(pady=(16, 4))
        tk.Label(root, text=f"Версия {VERSION}", font=("Segoe UI", 11)).pack()
        text = ("Приложение отдела технической поддержки: смена, перерывы, обед,\n"
                "временное отсутствие — без браузера, прямо из трея.\n\n"
                "Напоминает о затянувшемся перерыве и открытом опросе, сообщает о новых\n"
                "данных на вашей странице (график, бонусы, награды) и обновляется само.\n\n"
                "Автор: Евгений Евгеньевич Яковлев\n"
                "Разработчики: Евгений Яковлев, Андрей Болгов")
        tk.Label(root, text=text, justify="left", wraplength=500).pack(padx=16, pady=10)

        btns = tk.Frame(root)
        btns.pack(pady=6)
        tk.Button(btns, text="История обновлений", width=20,
                  command=lambda: threading.Thread(target=self.changelog_window, daemon=True).start()).pack(side="left", padx=6)
        tk.Button(btns, text="Закрыть", command=root.destroy, width=12).pack(side="left", padx=6)
        root.mainloop()

    def help_window(self):
        """Справка сотруднику: по-человечески, с картинкой значков."""
        import tkinter as tk
        from tkinter import ttk
        root = tk.Tk()
        root.title("ОТП — справка")
        root.geometry("640x560")
        wrap = tk.Frame(root)
        wrap.pack(fill="both", expand=True)
        txt = tk.Text(wrap, wrap="word", padx=14, pady=12, font=("Segoe UI", 10))
        bar = ttk.Scrollbar(wrap, command=txt.yview)
        txt.configure(yscrollcommand=bar.set)
        bar.pack(side="right", fill="y")
        txt.pack(side="left", fill="both", expand=True)

        def head(s):
            txt.insert("end", "\n" + s + "\n", ("h",))

        txt.tag_configure("h", font=("Segoe UI", 11, "bold"), spacing1=8, spacing3=4)
        txt.insert("end",
            "ОТП — приложение учёта рабочего времени.\n"
            "Живёт значком в трее и позволяет без браузера начинать смену,\n"
            "делать перерывы, обед, отмечать отсутствие и завершать смену.\n")
        head("Значок и его цвета")
        # картинка со состояниями значка (реальный файл из комплекта)
        try:
            from PIL import Image, ImageTk
            p = icons_dir() / "tray-states.png"
            if p.exists():
                img = Image.open(p)
                w = min(560, img.width)
                img = img.resize((w, int(img.height * w / img.width)))
                photo = ImageTk.PhotoImage(img)
                txt.image_create("end", image=photo)
                txt.image = photo          # удерживаем ссылку
                txt.insert("end", "\n")
        except Exception as e:
            log("справка: картинку не показать (%r)" % (e,))
        txt.insert("end",
            "зелёный — работаете · жёлтый — перерыв · сиреневый — обед\n"
            "голубой — отсутствие · серый — смена не начата · красный — нет связи\n")
        head("Первый запуск")
        txt.insert("end",
            "1. Вставьте ссылку на свою страницу (её присылает руководитель)\n"
            "   или только код из ссылки. Если ссылка в буфере обмена — подставится сама.\n"
            "2. Введите пароль (галочка «показать пароль» поможет проверить ввод).\n"
            "3. «Войти». Значок появится в трее только после успешного входа.\n"
            "Больше пароль спрашивать не будет — он хранится на этом компьютере.\n")
        head("Как пользоваться")
        txt.insert("end",
            "Нажмите на значок — откроется меню. Перед действием идёт отсчёт\n"
            "10 секунд с кнопкой «Отмена»; повторное нажатие применяет сразу.\n"
            "Windows: значок справа внизу (может быть в «^»).\n"
            "macOS: значок в меню-баре сверху справа.\n")
        head("Горячие клавиши (Windows)")
        txt.insert("end",
            "Ctrl+Alt+S — начать смену        Ctrl+Alt+A — временное отсутствие\n"
            "Ctrl+Alt+B — техперерыв 1         Ctrl+Alt+R — вернуться с перерыва\n"
            "Ctrl+Alt+L — обед                 Ctrl+Alt+E — завершить смену\n"
            "Свои сочетания: меню → «Горячие клавиши…». Если сочетание занято\n"
            "другой программой, в журнале будет строка об этом.\n")
        head("Напоминания")
        txt.insert("end",
            "• Перерыв идёт дольше нормы (техперерыв 15 мин, обед 60 мин,\n"
            "  отсутствие 30 мин) — появится уведомление в трее.\n"
            "• Изменились данные на странице (график, бонусы, награды) —\n"
            "  придёт сообщение «Новое на странице: …».\n"
            "• Вышла новая версия программы — приложение обновится само\n"
            "  (настройки и данные при этом сохраняются).\n")
        head("Если что-то не так")
        txt.insert("end",
            "• «Неверный пароль или ссылка» — в окне видно ответ сервера\n"
            "  и код страницы; проверьте ссылку и пароль у руководителя.\n"
            "• «Нет связи» — проверьте интернет/VPN; приложение переподключится.\n"
            "• Подробности всегда в «Журнал приложения».\n"
            "• Проверить обновление вручную: меню → «Проверить обновление».\n")
        txt.configure(state="disabled")

        btns = tk.Frame(root)
        btns.pack(fill="x")
        tk.Button(btns, text="Открыть мою страницу", command=lambda: webbrowser.open(self.page_url()),
                  width=20).pack(side="left", padx=10, pady=8)
        tk.Button(btns, text="Закрыть", command=root.destroy, width=12).pack(side="right", padx=10, pady=8)
        root.mainloop()

    # --- горячие клавиши
    def hotkey_combos(self) -> dict:
        combos = dict(DEFAULT_HOTKEYS)
        saved = self.cfg.get("hotkeys") or {}
        for k, v in saved.items():
            if k in combos and isinstance(v, str):
                combos[k] = v
        return combos

    def start_hotkeys(self):
        try:
            if getattr(self, "hotkeys", None):
                self.hotkeys.stop()
        except Exception:
            pass
        if self.cfg.get("hotkeysOff"):
            log("горячие клавиши отключены в настройках")
            return
        try:
            self.hotkeys = Hotkeys(self, self.hotkey_combos())
            threading.Thread(target=self.hotkeys.run, daemon=True).start()
        except Exception as e:
            log("горячие клавиши: %r" % (e,))

    def hotkeys_dialog(self):
        """Окно настройки сочетаний.

        На время работы окна глобальные клавиши приостанавливаются — иначе
        Ctrl+Alt+S перехватывался приложением и в поле нельзя было напечатать
        сочетание. Сочетание можно набрать текстом или просто нажать нужные клавиши.
        """
        import tkinter as tk
        from tkinter import messagebox
        combos = self.hotkey_combos()
        # пауза глобальных клавиш, пока окно открыто
        try:
            if getattr(self, "hotkeys", None):
                self.hotkeys.stop()
        except Exception:
            pass
        root = tk.Tk()
        root.title("ОТП — горячие клавиши")
        root.geometry("560x430")
        tk.Label(root, anchor="w", justify="left",
                 text="Нажмите нужные клавиши в поле (например Ctrl+Alt+S) — сочетание подставится.\n"
                      "Или впишите вручную: ctrl+alt+s, shift+f5, ctrl+alt+1.\n"
                      "Пустое поле — действие без горячей клавиши.").pack(fill="x", padx=12, pady=(10, 6))

        off_var = tk.BooleanVar(value=bool(self.cfg.get("hotkeysOff")))
        entries = {}

        def key_name(sym: str):
            s = sym.lower()
            if len(s) == 1 and (s.isalnum() or s in "`-=[];',./\\"):
                return s
            if s.startswith("f") and s[1:].isdigit() and 1 <= int(s[1:]) <= 12:
                return s
            if s == "space":
                return "space"
            return None

        def make_handler(entry):
            def on_key(ev):
                if ev.keysym in ("Shift_L", "Shift_R", "Control_L", "Control_R", "Alt_L", "Alt_R"):
                    return "break"
                if ev.keysym in ("BackSpace", "Delete"):
                    entry.delete(0, "end")
                    return "break"
                if ev.keysym == "Escape":
                    entry.delete(0, "end")
                    return "break"
                mods = []
                if ev.state & 0x4:
                    mods.append("ctrl")
                if ev.state & 0x8:
                    mods.append("alt")
                if ev.state & 0x1:
                    mods.append("shift")
                key = key_name(ev.keysym)
                if not key or not mods:
                    return "break"
                entry.delete(0, "end")
                entry.insert(0, "+".join(mods + [key]))
                return "break"
            return on_key

        for act, label in Hotkeys.ACTIONS:
            rowf = tk.Frame(root)
            rowf.pack(fill="x", padx=12, pady=2)
            tk.Label(rowf, text=label, width=24, anchor="w").pack(side="left")
            e = tk.Entry(rowf, width=20, state="normal")
            e.insert(0, combos.get(act, ""))
            e.pack(side="left")
            e.bind("<KeyPress>", make_handler(e))
            entries[act] = e

        chk = tk.Checkbutton(root, text="Отключить горячие клавиши (действия только через меню значка)",
                             variable=off_var)
        chk.pack(anchor="w", padx=12, pady=(8, 0))

        def save():
            new = {}
            for act, e in entries.items():
                txt = e.get().strip().lower()
                if not txt:
                    new[act] = ""
                    continue
                if Hotkeys.parse(txt) is None:
                    messagebox.showerror("ОТП", f"Не понял сочетание «{txt}».\n"
                                                "Нужны модификатор и клавиша, например ctrl+alt+s.")
                    return
                new[act] = txt
            self.cfg["hotkeys"] = new
            self.cfg["hotkeysOff"] = bool(off_var.get())
            save_config(self.cfg)
            self.start_hotkeys()
            log("горячие клавиши сохранены: %r, отключены: %s" % (new, self.cfg["hotkeysOff"]))
            # сообщение показываем ДО закрытия окна: после destroy() у messagebox
            # нет живого окна-родителя, и кнопка «ОК» перестаёт нажиматься
            was_off = self.cfg["hotkeysOff"]
            messagebox.showinfo(
                "ОТП",
                "Сохранено. Горячие клавиши " + ("отключены" if was_off else "включены") + ".\n"
                "Настройки лежат отдельно от программы, обновление их не затирает.",
                parent=root)
            root.destroy()

        def reset():
            off_var.set(False)
            for act, e in entries.items():
                e.delete(0, "end")
                e.insert(0, DEFAULT_HOTKEYS.get(act, ""))

        def cancel():
            root.destroy()
            self.start_hotkeys()

        btns = tk.Frame(root)
        btns.pack(pady=14)
        tk.Button(btns, text="Сохранить", command=save, width=14).pack(side="left", padx=6)
        tk.Button(btns, text="По умолчанию", command=reset, width=14).pack(side="left", padx=6)
        tk.Button(btns, text="Отмена", command=cancel, width=10).pack(side="left", padx=6)
        root.protocol("WM_DELETE_WINDOW", cancel)
        root.mainloop()

    # --- обновление
    def update_loop(self):
        """Проверяет обновление при запуске и далее раз в сутки."""
        while self._alive:
            try:
                info = update_available()
                if info and getattr(self, "_win_alive", False):
                    log("обновление: отложено, пока открыто окно")
                    info = None
                if info:
                    log("обновление: ставлю версию %s" % info.get("version"))
                    install_update(info)   # перезапуск; настройки и статусы сохраняются
            except Exception as e:
                log("обновление: %r" % (e,))
            for _ in range(24 * 60):      # спим сутки, просыпаясь каждую минуту
                if not self._alive:
                    return
                time.sleep(60)

    def check_updates_manual(self):
        from tkinter import messagebox
        info = update_available()
        if not info:
            messagebox.showinfo("ОТП", f"Обновлений нет. Версия {VERSION}.")
            return
        ver = str(info.get("version") or "")
        ch = changes_of(ver)
        lines = []
        if ch and ch.get("title"):
            lines.append(ch["title"])
        for it in (ch.get("items") or [])[:7]:
            lines.append("• " + it)
        notes = "\n".join(lines) if lines else "\n".join(info.get("notes") or [])
        text = f"Доступна версия {ver}.\n\n" + (notes + "\n\n" if notes else "")
        text += "Установить сейчас? Настройки и статусы сохранятся."
        if messagebox.askokcancel("ОТП — обновление", text):
            install_update(info)

    # --- новые данные на странице (график, бонусы, награды)
    def content_loop(self):
        """Раз в несколько часов сверяет страницу и сообщает об изменениях."""
        first = True
        while self._alive:
            try:
                self.check_content(silent=first)
                self.check_poll()
                first = False
            except Exception as e:
                log("новые данные: ошибка %r" % (e,))
            for _ in range(6 * 60):          # проверяем примерно каждые 6 часов
                if not self._alive:
                    return
                time.sleep(60)

    def poll_loop(self):
        """Опрос по графику проверяем часто: он мог открыться только что."""
        while self._alive:
            try:
                self.check_poll()
            except Exception as e:
                log("опрос: ошибка %r" % (e,))
            for _ in range(10 * 60):
                if not self._alive:
                    return
                time.sleep(1)

    def check_content(self, silent=False):
        slug = self.api.slug or self.cfg.get("slug") or ""
        if not slug or not self.api.token:
            # без входа данных нет: не пытаемся читать старый публичный файл (404 в журнале)
            return []
        payload = None
        try:
            res = self.api.rpc("otp_profile_get", {"p_token": self.api.token, "p_slug": slug})
            if res and res.get("ok") and res.get("payload"):
                payload = res["payload"]
        except Exception as e:
            log("данные сайта: RPC недоступен %r" % (e,))
        if not payload:
            return []          # публичного файла больше нет — тихо выходим
        new = content_snapshot(slug, payload)
        if not new:
            return []
        old = self.cfg.get("content") or None
        changed = content_diff(old, new)
        self.cfg["content"] = new
        try:
            save_config(self.cfg)      # снимок лежит в конфиге, обновление его не стирает
        except Exception:
            pass
        if not changed:
            if not silent:
                log("новые данные: изменений нет")
            return []
        text = "Новое на странице: " + ", ".join(changed)
        log("новые данные: " + text)
        self.push_feed(text)
        try:
            if self.icon:
                self.icon.notify(text, "ОТП: обновились данные")
        except Exception:
            try:
                if self.icon:
                    self.icon.title = text
            except Exception:
                pass
        return changed

    def check_poll(self, silent=False):
        """Опрос по графику: сообщаем, что он открыт и что ответа ещё нет."""
        try:
            res = self.api.poll_my()
        except Exception as e:
            log("опрос: проверить не удалось %r" % (e,))
            return None
        if not (res and res.get("ok") and res.get("poll")):
            if self.cfg.get("pollOpen"):
                self.cfg["pollOpen"] = None
                try:
                    save_config(self.cfg)
                except Exception:
                    pass
            return None
        poll = res["poll"]
        ans = res.get("answers")
        answered = bool(ans and isinstance(ans, dict) and ans)
        if answered:
            if self.cfg.get("pollOpen"):
                self.cfg["pollOpen"] = None
                try:
                    save_config(self.cfg)
                except Exception:
                    pass
            return None
        key = "%s|%s" % (poll.get("id"), datetime.now(TZ).date().isoformat())
        if self.cfg.get("poll_notified") == key:
            return None
        self.cfg["poll_notified"] = key
        self.cfg["pollOpen"] = {"month": str(poll.get("month") or ""),
                                "due": poll.get("due_at") or ""}
        try:
            save_config(self.cfg)
        except Exception:
            pass
        month = str(poll.get("month") or "")
        try:
            name = datetime.strptime(month + "-01", "%Y-%m-%d").strftime("%m.%Y")
        except Exception:
            name = month
        text = ("Открыт опрос по графику на %s — пожелания ещё не отправлены. "
                "Заполните на «Стартовой» в разделе графика." % name)
        log("опрос: " + text)
        self.push_feed("Опрос по графику на " + name + " — пожелания ещё не отправлены")
        try:
            if self.icon:
                self.icon.notify(text, "ОТП: пожелания по графику")
        except Exception:
            pass
        return poll

    def check_content_manual(self):
        from tkinter import messagebox
        changed = self.check_content()
        if changed:
            messagebox.showinfo("ОТП", "Новое: " + ", ".join(changed))
        else:
            messagebox.showinfo("ОТП", "Изменений на странице нет.")

    # --- вход
    def login_dialog(self):
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.title("ОТП — вход")
        root.geometry("460x260")
        tk.Label(root, text="Ссылка на свою страницу (или её код):",
                 anchor="w").pack(fill="x", padx=12, pady=(12, 2))
        link = tk.Entry(root)
        link.pack(fill="x", padx=12)
        tk.Label(root, text="Пустое поле — вход руководителя (пароль администратора)",
                 anchor="w", fg="#6b7280").pack(fill="x", padx=12, pady=(2, 0))
        # вставка из буфера: пункт меню + кнопка, чтобы работало и без Ctrl+V
        def paste_into(entry):
            try:
                txt = root.clipboard_get()
            except Exception:
                return
            try:
                entry.insert("end", str(txt).strip())
            except Exception:
                pass

        menu = tk.Menu(root, tearoff=0)
        menu.add_command(label="Вставить", command=lambda: paste_into(link))
        menu.add_command(label="Очистить", command=lambda: link.delete(0, "end"))

        def popup(ev):
            try:
                menu.tk_popup(ev.x_root, ev.y_root)
            finally:
                menu.grab_release()

        link.bind("<Button-3>", popup)
        link.bind("<Control-v>", lambda e: (paste_into(link), "break")[1])
        link.bind("<Shift-Insert>", lambda e: (paste_into(link), "break")[1])
        tk.Label(root, text="Пароль:", anchor="w").pack(fill="x", padx=12, pady=(10, 2))
        pwd = tk.Entry(root, show="*")
        pwd.pack(fill="x", padx=12)
        # «показать пароль» — чтобы видеть опечатки при вводе
        show_var = tk.BooleanVar(value=False)

        def toggle_pwd():
            pwd.config(show="" if show_var.get() else "*")

        tk.Checkbutton(root, text="показать пароль", variable=show_var,
                       command=toggle_pwd, anchor="w").pack(fill="x", padx=10, pady=(2, 0))
        hint = tk.Label(root, text="", anchor="w", fg="#b45309")
        hint.pack(fill="x", padx=12, pady=(6, 0))
        # если в буфере обмена лежит ссылка на сайт — подставляем сразу
        try:
            clip = str(root.clipboard_get() or "")
            if "videoxiter.github.io" in clip or "/team/" in clip:
                link.insert(0, clip.strip())
        except Exception:
            pass
        result = {"ok": False}

        SECTIONS = {"development", "duties", "dynamics", "hours", "people",
                    "schedule", "settings", "1bceb335668c"}

        def parse_code(raw):
            """Ссылка → код страницы. Пусто или ссылка на дашборд → вход руководителя."""
            raw = (raw or "").strip()
            if not raw:
                return "admin"
            if "/team/" in raw:
                return raw.split("/team/", 1)[1].split("/", 1)[0].strip("/")
            if raw.startswith("http"):
                parts = [p for p in raw.split("?")[0].split("#")[0].split("/") if p]
                for seg in reversed(parts):
                    if seg not in SECTIONS and "." not in seg:
                        return seg
                return "admin"
            return raw.strip("/")

        def go(_=None):
            code = parse_code(link.get())
            if not pwd.get():
                hint.config(text="Введите пароль.")
                messagebox.showwarning("ОТП", "Не вижу пароль.\nВведите его в нижнее поле.")
                return
            hint.config(text="")
            try:
                res = self.api.login(code, pwd.get())
                if (not (res and res.get("ok"))) and code != "admin":
                    # мог быть вход руководителя по ссылке на дашборд
                    adm = self.api.login("admin", pwd.get())
                    if adm and adm.get("ok"):
                        res, code = adm, "admin"
            except Exception as e:
                messagebox.showerror("ОТП", f"Нет связи: {e}")
                return
            if not (res and res.get("ok")):
                err = (res or {}).get("error") or "нет ответа"
                if err == "network":
                    messagebox.showerror("ОТП", "Нет связи с сервером.\nПроверьте интернет или VPN и попробуйте снова.")
                else:
                    log("вход отклонён: error=%s | код=%s" % (err, code))
                    messagebox.showerror("ОТП",
                        "Неверный пароль или ссылка.\n\n"
                        f"Ответ сервера: {err}\nКод страницы: {code}")
                return
            # v17: привязываем устройство — без него не сработает «старт только из приложения»
            dev = self.api.claim_device("Приложение OTP")
            self.cfg.update({"token": self.api.token, "slug": self.api.slug,
                             "device": dev or self.cfg.get("device") or "",
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


_MUTEX_HANDLE = None
MUTEX_NAME = "OTP_Tray_SingleInstance"


def already_running(wait_seconds: float = 6.0) -> bool:
    """Не даём открыть второй экземпляр (после обновления бывало два значка)."""
    global _MUTEX_HANDLE
    if os.name != "nt":
        return False
    try:
        import ctypes
        k32 = ctypes.windll.kernel32
        global _MUTEX_HANDLE
        deadline = time.time() + wait_seconds
        attempt = 0
        while True:
            attempt += 1
            handle = k32.CreateMutexW(None, False, MUTEX_NAME)
            err = k32.GetLastError()
            if err != 183:                      # ERROR_ALREADY_EXISTS
                _MUTEX_HANDLE = handle
                if attempt > 1:
                    log("мьютекс: защита освободилась (попыток %d)" % attempt)
                return False
            # ВАЖНО: закрываем свой хэндл, иначе он сам держит объект живым
            # и ожидание никогда не увидит, что старый процесс вышел
            try:
                k32.CloseHandle(handle)
            except Exception:
                pass
            if time.time() >= deadline:
                log("мьютекс: защита занята дольше %d с" % int(wait_seconds))
                return True
            time.sleep(0.4)
        return k32.GetLastError() == 183      # ERROR_ALREADY_EXISTS
    except Exception:
        return False


def install_crash_logging():
    """Пишет необработанные ошибки в журнал: без этого «зависло» не разобрать."""
    import traceback

    def write(exc_type, exc, tb):
        try:
            log("СБОЙ: " + "".join(traceback.format_exception(exc_type, exc, tb))[:4000])
        except Exception:
            pass

    sys.excepthook = write
    try:
        threading.excepthook = lambda a: write(a.exc_type, a.exc_value, a.exc_traceback)
    except Exception:
        pass
    try:
        import tkinter
        tkinter.Tk.report_callback_exception = lambda self, et, ev, tb: write(et, ev, tb)
    except Exception:
        pass


def main():
    install_crash_logging()
    if "--selftest" in sys.argv:
        return selftest()
    if already_running():
        log("приложение уже запущено — второй экземпляр не нужен")
        return 0
    App().run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
