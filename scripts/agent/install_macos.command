#!/bin/bash
# Установка агента синхронизации графика (macOS). Запуск: bash install_macos.command
# Скрипт сам скачает проект, спросит логин Confluence и (по желанию) токен GitHub,
# создаст автозапуск и один раз проверит синхронизацию.
set -euo pipefail

REPO="https://github.com/videoxiter/9a57a59df2fd.git"
DIR="${OTP_DIR:-$HOME/OTP-site}"
PY="$(command -v python3 || true)"

echo "=== Синхронизация графика ОТП: установка (macOS) ==="
echo

if [ -z "$PY" ]; then
  echo "Не найден python3. Открой Терминал и выполни:  xcode-select --install"
  echo "После установки запусти этот файл снова."
  read -r -p "Enter, чтобы закрыть…" _; exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "Не найден git. Выполни:  xcode-select --install  и запусти снова."
  read -r -p "Enter, чтобы закрыть…" _; exit 1
fi
echo "python3: $PY"
echo "git:     $(command -v git)"
echo "папка:   $DIR"
echo

if [ ! -d "$DIR/.git" ]; then
  echo "1/4 Скачиваю проект (это один раз, ~1 минута)…"
  git clone --depth 1 "$REPO" "$DIR"
else
  echo "1/4 Проект уже скачан — обновляю…"
  (cd "$DIR" && git pull --ff-only) || true
fi

echo
echo "2/4 Логин Confluence (нужен для чтения графика; никуда не передаётся, кроме Confluence)"
read -r -p "  Логин: " CLOGIN
if [ -z "$CLOGIN" ]; then echo "Логин пустой — установка остановлена."; read -r -p "Enter…" _; exit 1; fi
read -r -s -p "  Пароль: " CPASS; echo
if [ -z "$CPASS" ]; then echo "Пароль пустой — установка остановлена."; read -r -p "Enter…" _; exit 1; fi
umask 077
printf 'CONFLUENCE_LOGIN=%s\nCONFLUENCE_PASSWORD=%s\n' "$CLOGIN" "$CPASS" > "$DIR/scripts/.env"
chmod 600 "$DIR/scripts/.env"
echo "  сохранено в $DIR/scripts/.env (права 600, в git не попадает)"

echo
echo "3/4 Публикация на сайт (git push). Нужен токен GitHub только на этот репозиторий."
echo "    Нет токена — можно пропустить: тогда сайт обновлять будет руководитель."
read -r -p "  Токен GitHub (Enter — пропустить): " GTOK
if [ -n "$GTOK" ]; then
  (cd "$DIR" && git remote set-url origin "https://$GTOK@github.com/videoxiter/9a57a59df2fd.git")
  echo "  токен записан в $DIR/.git/config (отозвать можно в любой момент на GitHub)"
fi

echo
echo "4/4 Автозапуск и проверка"
bash "$DIR/scripts/macos/install_macos_agent.command"
echo
echo "Пробный запуск синхронизации (без публикации)…"
"$PY" "$DIR/scripts/sync_schedule.py" --auto --no-push || echo "  (проверь логику: посмотри вывод выше)"

echo
echo "=== Готово ==="
echo "Синхронизация запускается каждый день в 07:30 и проверяет кнопку на сайте каждые 5 минут."
echo "Логи: /tmp/otp-schedule-com.otp.schedule.watch.log"
echo "Проверить: launchctl list | grep otp.schedule"
read -r -p "Enter, чтобы закрыть…" _
