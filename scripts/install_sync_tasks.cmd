@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0.."
set "PROJ=%CD%"
set "PY=python"

echo Проверяю Python...
"%PY%" --version >nul 2>&1
if errorlevel 1 (
  echo Не найден python в PATH. Установи Python или поправь PY= в этом файле.
  pause
  exit /b 1
)

echo.
echo Создаю две задачи планировщика:
echo   1) OTP Schedule Daily  - каждый день в 07:30, синхронизация графика
echo   2) OTP Schedule Watch  - каждые 5 минут, проверка кнопки на сайте
echo.

schtasks /Create /TN "OTP Schedule Daily" /TR "\"%PY%\" \"%PROJ%\scripts\sync_schedule.py\" --auto" /SC DAILY /ST 07:30 /F
if errorlevel 1 echo ВНИМАНИЕ: не удалось создать ежедневную задачу.
schtasks /Create /TN "OTP Schedule Watch" /TR "\"%PY%\" \"%PROJ%\scripts\sync_schedule.py\" --if-requested" /SC MINUTE /MO 5 /F
if errorlevel 1 echo ВНИМАНИЕ: не удалось создать задачу-наблюдатель.

echo.
echo Готово. Проверить: планировщик задач Windows - "Библиотека планировщика" - OTP Schedule.
echo Удалить задачи: schtasks /Delete /TN "OTP Schedule Daily" /F  и  schtasks /Delete /TN "OTP Schedule Watch" /F
echo.
pause
