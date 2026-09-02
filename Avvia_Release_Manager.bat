@echo off
setlocal
title FreschiTech - RELEASE MANAGER
cd /d "%~dp0"

echo ====================================================
echo   FRESCHITECH - RELEASE MANAGER
echo ====================================================

:: Verifica se Python è installato
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Python non è installato o non è nel PATH.
    pause
    exit /b
)

:: Avvio dell'app
echo [INFO] Avvio interfaccia grafica...
python release_manager_windows.py

if %errorlevel% neq 0 (
    echo.
    echo [ERRORE] Si è verificato un problema durante l'avvio.
    echo Assicurati di aver installato le dipendenze con: pip install pywebview requests "git+https://github.com/massimosico-gif/TauriKit#subdirectory=core/tecno-release"
    pause
)
