# Автозапуск приложения ОТП при входе в систему (Windows).
# Запуск: powershell -ExecutionPolicy Bypass -File install_autostart_windows.ps1
$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$exe = Join-Path $dir "dist\OtpTray.exe"
if (-not (Test-Path $exe)) {
  Write-Host "Сначала собери приложение: dist\OtpTray.exe не найден."
  Read-Host "Enter…" | Out-Null
  exit 1
}
$action = New-ScheduledTaskAction -Execute $exe -WorkingDirectory (Split-Path $exe)
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "OTP Tray" -Action $action -Trigger $trigger -Settings $settings -Description "Значок ОТП в трее: смена, перерывы, обед" -Force | Out-Null
Write-Host "Готово: приложение будет запускаться при входе в Windows."
Write-Host "Проверить: Start-ScheduledTask -TaskName 'OTP Tray'"
Write-Host "Удалить автозапуск: Unregister-ScheduledTask -TaskName 'OTP Tray' -Confirm:`$false"
