@echo off
setlocal
title FreschiTech - ANTEPRIMA TAURI

cd /d "%~dp0"
set PROJECT_ROOT=%CD%

echo ====================================================
echo   FRESCHITECH - TAURI (ANTEPRIMA)
echo ====================================================

:: 1. Pulizia porta 1420 se occupata (Vite/Tauri)
echo [TAURI] Controllo porta 1420...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1420 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

:: 2. Verifica dipendenze
if not exist "modern-ui\node_modules" (
    echo [TAURI] Dipendenze mancanti. Installazione in corso...
    cd modern-ui
    call npm install
    cd ..
)

:: 3. Avvio Tauri Dev
echo [TAURI] Avvio interfaccia React in contenitore Tauri...
cd modern-ui
call npm run tauri dev

echo.
echo [TAURI] Applicazione chiusa.
pause
