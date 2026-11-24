# Установка агента синхронизации графика (Windows). Запускается из install_windows.cmd.
# Сам скачивает проект, спрашивает логин Confluence и (по желанию) токен GitHub,
# создаёт задачи планировщика без окон и один раз проверяет синхронизацию.

$ErrorActionPreference = "Stop"
$repo = "https://github.com/videoxiter/9a57a59df2fd.git"
$dir = if ($env:OTP_DIR) { $env:OTP_DIR } else { Join-Path $env:USERPROFILE "OTP-site" }
$py = (Get-Command python).Source

Write-Host "=== Синхронизация графика ОТП: установка (Windows) ==="
Write-Host ""
Write-Host ("python:   " + $py)
Write-Host ("git:      " + (Get-Command git).Source)
Write-Host ("папка:    " + $dir)
Write-Host ""

if (-not (Test-Path (Join-Path $dir ".git"))) {
  Write-Host "1/4 Скачиваю проект (один раз, ~1 минута)…"
  git clone --depth 1 $repo $dir
} else {
  Write-Host "1/4 Проект уже скачан — обновляю…"
  Push-Location $dir; git pull --ff-only; Pop-Location
}

Write-Host ""
Write-Host "2/4 Логин Confluence (нужен для чтения графика)"
$login = Read-Host "  Логин"
if ([string]::IsNullOrWhiteSpace($login)) { Write-Host "Логин пустой — остановлено."; Read-Host "Enter…" | Out-Null; exit 1 }
$secure = Read-Host "  Пароль" -AsSecureString
$pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ([string]::IsNullOrWhiteSpace($pass)) { Write-Host "Пароль пустой — остановлено."; Read-Host "Enter…" | Out-Null; exit 1 }
$envPath = Join-Path $dir "scripts\.env"
Set-Content -Path $envPath -Value ("CONFLUENCE_LOGIN=" + $login + "`r`nCONFLUENCE_PASSWORD=" + $pass) -Encoding UTF8 -NoNewline
Write-Host ("  сохранено в " + $envPath + " (в git не попадает)")

Write-Host ""
Write-Host "3/4 Публикация на сайт (git push). Нужен токен GitHub только на этот репозиторий."
Write-Host "    Нет токена — пропусти: сайт обновит руководитель."
$g = Read-Host "  Токен GitHub (Enter — пропустить)"
if (-not [string]::IsNullOrWhiteSpace($g)) {
  Push-Location $dir
  git remote set-url origin ("https://" + $g + "@github.com/videoxiter/9a57a59df2fd.git")
  Pop-Location
  Write-Host "  токен записан в .git\config (отозвать можно на GitHub)"
}

Write-Host ""
Write-Host "4/4 Автозапуск и проверка"
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir "scripts\install_sync_tasks.ps1")
Write-Host ""
Write-Host "Пробный запуск синхронизации (без публикации)…"
& $py (Join-Path $dir "scripts\sync_schedule.py") --auto --no-push

Write-Host ""
Write-Host "=== Готово ==="
Write-Host "Синхронизация запускается каждый день в 07:30 и проверяет кнопку на сайте каждые 5 минут."
Write-Host "Задачи: планировщик задач Windows → «OTP Schedule Daily», «OTP Schedule Watch»."
Read-Host "Enter, чтобы закрыть…" | Out-Null
