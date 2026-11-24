@echo off
chcp 65001 >nul
title ОТП: убрать автозапуск
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'OTP Tray' -Confirm:$false -ErrorAction SilentlyContinue; Write-Host 'Автозапуск убран.'"
pause
