# -*- coding: utf-8 -*-
"""Патч: сравнение версий по дате сборки, чтобы смена схемы нумерации не блокировала обновление.

Было: «3.7» > «2.3.0» численно, поэтому после перехода на новую схему
пользователи на старых сборках не увидели бы обновление.
Стало: обновление предлагается, если версия отличается И манифест опубликован
позже установленного exe.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "app", "tray", "otp_tray.py")
src = open(PATH, encoding="utf-8").read()

old = '''def update_available():
    """Возвращает информацию о новой версии, если она вышла, иначе None."""
    try:
        info = http_json(UPDATE_URL, timeout=15)
        if not isinstance(info, dict):
            return None
        latest = str(info.get("version") or "")
        if latest and ver_tuple(latest) > ver_tuple(VERSION):
            log("доступно обновление: %s (сейчас %s)" % (latest, VERSION))
            return info
    except Exception as e:
        log("обновление: проверить не удалось %r" % (e,))
    return None'''
new = '''def exe_built_at() -> float:
    """Когда собран установленный exe — для сравнения с датой публикации."""
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
        from datetime import datetime as _dt
        return _dt.fromisoformat(raw.replace("Z", "+00:00")).timestamp()
    except Exception:
        return 0.0


def update_available():
    """Возвращает информацию о новой версии, если она вышла, иначе None."""
    try:
        info = http_json(UPDATE_URL, timeout=15)
        if not isinstance(info, dict):
            return None
        latest = str(info.get("version") or "")
        if not latest or latest == VERSION:
            return None
        # новая схема нумерации (мажор.функционал.исправление) может быть «младше»
        # численно, поэтому решаем по дате публикации, а номер — как подстраховка
        newer_by_date = manifest_time(info) > exe_built_at() + 60
        newer_by_number = ver_tuple(latest) > ver_tuple(VERSION)
        if newer_by_date or newer_by_number:
            log("доступно обновление: %s (сейчас %s)" % (latest, VERSION))
            return info
    except Exception as e:
        log("обновление: проверить не удалось %r" % (e,))
    return None'''
assert old in src, "update_available"
src = src.replace(old, new, 1)

open(PATH, "w", encoding="utf-8", newline="").write(src)
print("сравнение версий обновлено")
sys.exit(0)
