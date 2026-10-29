@echo off
setlocal
title Visor de Datos
chcp 65001 >nul

set "WSLROOT=%~dp0"
set "WSLROOT=%WSLROOT:\\wsl$\Ubuntu=%"
set "WSLROOT=%WSLROOT:\=/%"

echo Iniciando Visor de Datos...
echo.
wsl.exe -- bash "%WSLROOT%scripts/start.sh"
if errorlevel 1 goto error

start "" http://127.0.0.1:8000
exit /b 0

:error
echo.
echo No se pudo iniciar el visor. Revise el mensaje de arriba.
echo Si es la primera vez, ejecute en Ubuntu:
echo   bash "%WSLROOT%scripts/setup.sh"
pause
exit /b 1
