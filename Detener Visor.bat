@echo off
setlocal
title Detener Visor de Datos
chcp 65001 >nul

set "WSLROOT=%~dp0"
set "WSLROOT=%WSLROOT:\\wsl$\Ubuntu=%"
set "WSLROOT=%WSLROOT:\=/%"

wsl.exe -- bash "%WSLROOT%scripts/stop.sh"
timeout /t 3 >nul
exit /b 0
