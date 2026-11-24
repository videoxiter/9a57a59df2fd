#!/bin/bash
# Сборка приложения ОТП для macOS (.app) из исходников.
# Запуск: bash build_macos.command  → результат app/tray/dist/OtpTray.app
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
VENV="$DIR/.venv"
PY="$(command -v python3)"
[ -n "$PY" ] || { echo "Нет python3"; exit 1; }

if [ ! -d "$VENV" ]; then
  "$PY" -m venv "$VENV"
  "$VENV/bin/python" -m pip install --upgrade pip >/dev/null
  "$VENV/bin/python" -m pip install pystray pillow pyinstaller
fi

# иконка приложения: png → icns средствами macOS
ICONSET="$DIR/build/AppIcon.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
SRC="$ROOT/app/assets/app-icon-1024.png"
for s in 16 32 64 128 256 512; do
  sips -z $s $s "$SRC" --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$SRC" --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$DIR/build/app.icns"

"$VENV/bin/pyinstaller" --noconfirm --clean --windowed --name OtpTray \
  --icon "$DIR/build/app.icns" \
  --add-data "$DIR/icons:icons" \
  --distpath "$DIR/dist" --workpath "$DIR/build" "$DIR/otp_tray.py"

echo "Готово: $DIR/dist/OtpTray.app"
echo "Запуск: open \"$DIR/dist/OtpTray.app\""
echo "Автозапуск: bash install_autostart_macos.command"
