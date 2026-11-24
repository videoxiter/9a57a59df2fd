# Автозапуск приложения ОТП при входе в систему (macOS).
# Запуск: bash install_autostart_macos.command
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/dist/OtpTray.app"
if [ ! -d "$APP" ]; then
  echo "Сначала собери приложение: bash build_macos.command"
  read -r -p "Enter…" _; exit 1
fi
PLIST="$HOME/Library/LaunchAgents/com.otp.tray.plist"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.otp.tray</string>
  <key>ProgramArguments</key><array><string>$APP/Contents/MacOS/OtpTray</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><false/>
  <key>StandardOutPath</key><string>/tmp/otp-tray.log</string>
  <key>StandardErrorPath</key><string>/tmp/otp-tray.log</string>
</dict>
</plist>
PLIST
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Готово: приложение будет запускаться при входе в систему."
echo "Лог: /tmp/otp-tray.log"
echo "Удалить автозапуск: launchctl unload \"$PLIST\" && rm -f \"$PLIST\""
