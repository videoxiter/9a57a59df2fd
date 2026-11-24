#!/bin/bash
# Удаление агентов синхронизации на macOS.
set -euo pipefail
AGENTS="$HOME/Library/LaunchAgents"
for name in com.otp.schedule.daily com.otp.schedule.watch; do
  plist="$AGENTS/$name.plist"
  if [ -f "$plist" ]; then
    launchctl unload "$plist" 2>/dev/null || true
    rm -f "$plist"
    echo "удалено: $plist"
  fi
done
echo "Готово."
