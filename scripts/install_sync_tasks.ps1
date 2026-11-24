# Создаёт задачи планировщика для синхронизации графика с Confluence.
# Запуск: powershell -ExecutionPolicy Bypass -File scripts\install_sync_tasks.ps1
# Окна при работе задач не показываются: используется pythonw.exe, задачи
# запускаются только когда пользователь вошёл в систему.

$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $PSScriptRoot
$pyw = Join-Path (Split-Path (Get-Command python).Source) "pythonw.exe"
if (-not (Test-Path $pyw)) { throw "не найден pythonw.exe рядом с python" }
$script = Join-Path $proj "scripts\sync_schedule.py"
if (-not (Test-Path $script)) { throw "не найден scripts\sync_schedule.py" }

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew
$actDaily = New-ScheduledTaskAction -Execute $pyw -Argument ('"' + $script + '" --auto') -WorkingDirectory $proj
$actWatch = New-ScheduledTaskAction -Execute $pyw -Argument ('"' + $script + '" --if-requested') -WorkingDirectory $proj
$trgDaily = New-ScheduledTaskTrigger -Daily -At 07:30
$trgWatch = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 5)

Register-ScheduledTask -TaskName "OTP Schedule Daily" -Action $actDaily -Trigger $trgDaily `
  -Settings $settings -Description "Синхронизация графика из Confluence раз в день (без окон)" -Force | Out-Null
Register-ScheduledTask -TaskName "OTP Schedule Watch" -Action $actWatch -Trigger $trgWatch `
  -Settings $settings -Description "Проверка кнопки синхронизации на сайте каждые 5 минут (без окон)" -Force | Out-Null

Write-Host "Готово. Задачи:"
Get-ScheduledTask -TaskName "OTP Schedule *" | Select-Object TaskName, State | Format-Table -AutoSize
Write-Host "Проверить сейчас: Start-ScheduledTask -TaskName 'OTP Schedule Watch'"
Write-Host "Удалить: Unregister-ScheduledTask -TaskName 'OTP Schedule Daily','OTP Schedule Watch' -Confirm:`$false"
