@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
rem Создаёт две задачи планировщика без окон (pythonw.exe):
rem   OTP Schedule Daily  - каждый день в 07:30
rem   OTP Schedule Watch  - каждые 5 минут проверяет кнопку на сайте
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_sync_tasks.ps1"
