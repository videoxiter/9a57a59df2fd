# -*- coding: utf-8 -*-
"""Проверка, что в публикуемых файлах нет секретов.

GitHub Pages — публичный хостинг: всё, что попало в репозиторий, может скачать
любой человек через curl. Скрипт ищет признаки настоящих секретов (ключ
service_role, приватные ключи, токены GitHub/Supabase) и завершает работу
с ошибкой, если что-то нашлось.

Публичный ключ Supabase (sb_publishable_…) — не секрет: он по замыслу лежит
в клиенте, доступ ограничивают RLS-политики на стороне базы.

Запуск: python scripts/check_secrets.py
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# (описание, регулярное выражение)
RULES = [
    ("JWT Supabase (eyJ…)", re.compile(r"eyJhbGciOi[A-Za-z0-9_\-]{10,}")),
    ("ключ sb_secret_", re.compile(r"sb_secret_[A-Za-z0-9_\-]{10,}")),
    ("токен GitHub", re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}")),
    ("приватный ключ", re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("пароль в строке подключения", re.compile(r"postgres(ql)?://[^:\s]+:[^@\s]+@")),
    ("секрет агента в коде", re.compile(r"agentSecret['\"]?\s*[:=]\s*['\"][0-9a-f]{16,}")),
]

SKIP_DIRS = {".git", ".venv", ".dsh", ".dsh-pyenv", "node_modules", "build", "dist"}
SKIP_FILES = {"cloud.json", "hermes.env", ".env"}


def tracked_files():
    try:
        out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True)
        return [f.strip() for f in out.stdout.splitlines() if f.strip()]
    except Exception:
        found = []
        for base, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for f in files:
                found.append(os.path.relpath(os.path.join(base, f), ROOT))
        return found


def main():
    problems = []
    for rel in tracked_files():
        name = os.path.basename(rel)
        if name in SKIP_FILES:
            print(f"пропуск (локальный файл, не публикуется): {rel}")
            continue
        if any(part in SKIP_DIRS for part in rel.split(os.sep)):
            continue
        if rel.endswith((".exe", ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".ico", ".woff", ".woff2")):
            continue
        path = os.path.join(ROOT, rel)
        try:
            if os.path.getsize(path) > 5 * 1024 * 1024:
                continue
            text = open(path, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        for label, rx in RULES:
            m = rx.search(text)
            if m:
                line = text[:m.start()].count("\n") + 1
                problems.append((rel, line, label, m.group(0)[:60]))

    if problems:
        print("НАЙДЕНЫ возможные секреты:")
        for rel, line, label, sample in problems:
            print(f"  {rel}:{line} — {label}: {sample}")
        return 1
    print("секретов в отслеживаемых файлах не найдено")
    return 0


if __name__ == "__main__":
    sys.exit(main())
