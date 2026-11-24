#!/bin/bash
# Запуск приложения ОТП на macOS из исходников (без сборки).
# Первый запуск создаст окружение и поставит зависимости, дальше — просто запуск.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$DIR/.venv"
PY="$(command -v python3 || true)"
[ -n "$PY" ] || { echo "Нет python3. Выполни: xcode-select --install"; read -r -p "Enter…" _; exit 1; }

if [ ! -d "$VENV" ]; then
  echo "Первый запуск: создаю окружение и ставлю зависимости…"
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip >/dev/null
  "$VENV/bin/python" -m pip install pystray pillow
fi
exec "$VENV/bin/python" "$DIR/otp_tray.py"
