@echo off
setlocal
title FreschiTech - ANTEPRIMA WEB

cd /d "%~dp0"

echo ====================================================
echo   FRESCHITECH - ANTEPRIMA WEB (Vite)
echo ====================================================

echo [WEB] Avvio server di sviluppo...
cd modern-ui
call npm run dev

echo.
echo [WEB] Server chiuso.
pause
