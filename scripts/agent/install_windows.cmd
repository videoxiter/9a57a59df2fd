@echo off
chcp 65001 >nul
title Синхронизация графика ОТП
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_windows.ps1"
