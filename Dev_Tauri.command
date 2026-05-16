#!/bin/bash

# FreschiTech - TAURI SVILUPPO (Mac)
# Questo script avvia l'ambiente di sviluppo Tauri (Rust + React/Vite)

# 1. Spostiamoci nella cartella dello script
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

echo "===================================================="
echo "  FRESCHITECH - TAURI (MODALITA SVILUPPO)"
echo "===================================================="

# 2. Pulizia porta 3000 se occupata (Vite)
echo "[TAURI] Controllo porta 3000..."
PID=$(lsof -t -i:3000)
if [ ! -z "$PID" ]; then
    echo "[TAURI] Porta 3000 occupata dal processo $PID. Terminazione in corso..."
    kill -9 $PID
fi

# 3. Verifica dipendenze
if [ ! -d "modern-ui/node_modules" ]; then
    echo "[TAURI] Dipendenze mancanti. Installazione in corso..."
    cd "modern-ui"
    npm install
    cd ..
fi

# 4. Avvio Tauri Dev
echo "[TAURI] Avvio ambiente nativo Rust + React..."
cd "modern-ui"
npm run tauri dev

echo ""
echo "[TAURI] Applicazione chiusa."
echo "Premi un tasto per chiudere questo terminale."
read -n 1
