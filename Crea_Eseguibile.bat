@echo off
setlocal
cd /d %~dp0
cd modern-ui

echo ====================================================
echo   FRESCHITECH - CREAZIONE ESEGUIBILE (Build Mode)
echo ====================================================
echo.
echo [BUILD] Pulizia cache precedente...
if exist "dist" rmdir /s /q dist
if exist "src-tauri\target\release\bundle" rmdir /s /q src-tauri\target\release\bundle

echo [BUILD] Inizio compilazione Tauri...
echo Questo processo puo richiedere diversi minuti (5-10 min)...
echo.

call npm run tauri build

if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] ERRORE: La compilazione e fallita.
    echo Controlla i messaggi sopra per i dettagli.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo   COMPILAZIONE COMPLETATA CON SUCCESSO!
echo ====================================================
echo.
echo L'eseguibile si trova in:
echo modern-ui\src-tauri\target\release\bundle\msi\
echo.
pause
