#!/bin/bash
# Установка агента синхронизации графика на macOS (для заместителя).
# Запуск из корня проекта:  bash scripts/macos/install_macos_agent.command
#
# Создаёт два LaunchAgent'а в ~/Library/LaunchAgents:
#   com.otp.schedule.daily  — каждый день в 07:30
#   com.otp.schedule.watch  — каждые 5 минут проверяет кнопку на сайте
# Явного окна у агента нет: python3 запускается без терминала.
#
# Перед установкой положи логин Confluence одним из способов:
#   scripts/.env                       (CONFLUENCE_LOGIN, CONFLUENCE_PASSWORD)
#   ~/.otp/confluence.env              (то же)
#   переменные окружения в plist       (см. ниже, строки EnvironmentVariables)
set -euo pipefail

PROJ="$(cd "$(dirname "$0")/../.." && pwd)"
PY="${PYTHON:-$(command -v python3 || true)}"
[ -n "$PY" ] || { echo "Не найден python3. Установи: xcode-select --install или python.org"; exit 1; }
SCRIPT="$PROJ/scripts/sync_schedule.py"
[ -f "$SCRIPT" ] || { echo "Нет $SCRIPT"; exit 1; }

AGENTS="$HOME/Library/LaunchAgents"
mkdir -p "$AGENTS"

make_plist() {
  local name="$1" arg="$2" interval="$3" calendar="$4" out="$AGENTS/$name.plist"
  cat > "$out" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$name</string>
  <key>ProgramArguments</key>
  <array>
    <string>$PY</string>
    <string>$SCRIPT</string>
    <string>$arg</string>
  </array>
  <key>WorkingDirectory</key><string>$PROJ</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OTP_CONFLUENCE_ENV</key><string>$PROJ/scripts/.env</string>
    <key>PATH</key><string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>StandardOutPath</key><string>/tmp/otp-schedule-$name.log</string>
  <key>StandardErrorPath</key><string>/tmp/otp-schedule-$name.log</string>
  <key>RunAtLoad</key><false/>
$interval
$calendar
</dict>
</plist>
PLIST
  launchctl unload "$out" 2>/dev/null || true
  launchctl load "$out"
  echo "  установлено: $out"
}

make_plist "com.otp.schedule.daily" "--auto" "" \
  "  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>30</integer></dict>"
make_plist "com.otp.schedule.watch" "--if-requested" \
  "  <key>StartInterval</key><integer>300</integer>" ""

echo
echo "Готово. Проверить: launchctl list | grep otp.schedule"
echo "Запустить сейчас: launchctl start com.otp.schedule.watch"
echo "Логи: /tmp/otp-schedule-com.otp.schedule.watch.log"
echo "Удалить: bash scripts/macos/uninstall_macos_agent.sh"
