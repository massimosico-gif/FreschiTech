"""Release Manager di FreschiTech.

La finestra e' questa: quello che c'e' sotto - allineare la versione, trovare
l'installer, creare la release, caricare l'asset, aggiornare il manifest - sta
in `tecno_release`, il pacchetto condiviso di TauriKit, ed e' lo stesso codice
che usa TecnoRilievi.

    pip install "git+https://github.com/massimosico-gif/TauriKit#subdirectory=core/tecno-release"

LA CHIAVE DI FIRMA NON STA PIU' QUI
-----------------------------------
Era una stringa letterale in cima a questo file, su un repository PUBBLICO, e
per giunta con password vuota. Ora la legge `signing_key.py` da un file non
versionato. Toglierla non la rende segreta - resta nella storia di git - quindi
va anche rigenerata: le istruzioni sono in `signing_key.py`.
"""

import json
import os
import shutil
import subprocess
import threading
from pathlib import Path

import webview

from tecno_release import (
    ErroreRelease,
    carica_asset,
    crea_release,
    leggi_segreto,
    leggi_versione,
    pubblica_manifest,
    scrivi_versione,
    trova_installer,
)

from release_config import CARTELLE_ENV, CONFIG, leggi_token
from signing_key import load_signing_key

PROGETTO = CONFIG.cartella_progetto

HTML_CONTENT = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        :root {
            --bg-color: #f8fafc;
            --brand-primary: #E30613;
            --brand-secondary: #0f172a;
            --brand-blue: #3b82f6;
            --brand-red: #ef4444;
            --text-primary: #0f172a;
            --text-secondary: #64748b;
            --glass-bg: rgba(255, 255, 255, 0.4);
            --font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        body { font-family: var(--font-family); background-color: var(--bg-color); color: var(--text-primary); margin: 0; padding: 25px; overflow: hidden; user-select: none; height: 100vh; box-sizing: border-box; }
        .aurora-container { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; overflow: hidden; background-color: #f8fafc; }
        .aurora-blob { position: absolute; filter: blur(80px); opacity: 0.2; border-radius: 50%; will-change: transform; }
        .blob-1 { width: 500px; height: 500px; background: var(--brand-primary); top: -200px; right: -100px; animation: float 20s infinite alternate ease-in-out; }
        .blob-2 { width: 450px; height: 450px; background: var(--brand-blue); bottom: -150px; left: -100px; animation: float 25s infinite alternate-reverse ease-in-out; }
        .blob-3 { width: 300px; height: 300px; background: #facc15; top: 40%; left: 30%; opacity: 0.1; animation: float 18s infinite alternate-reverse ease-in-out; }
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-40px, 40px) scale(1.1); } }
        .container { display: flex; flex-direction: column; height: 100%; gap: 15px; }
        header { display: flex; justify-content: space-between; align-items: flex-end; }
        .title { font-size: 24px; font-weight: 800; color: var(--brand-secondary); margin: 0; }
        .subtitle { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: var(--text-secondary); opacity: 0.6; margin-bottom: 2px; }
        .version-badge { background: white; color: var(--brand-primary); padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid rgba(255,255,255,0.8); }
        .main-card { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; padding: 20px; border: 1px solid rgba(255, 255, 255, 0.5); display: flex; flex-direction: column; gap: 15px; flex-grow: 1; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05); }
        .top-row { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
        .input-group { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.5); padding: 10px 15px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.8); flex-grow: 1; }
        .input-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); }
        .input-group input { background: transparent; border: none; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--brand-secondary); width: 100%; outline: none; }
        .timer-badge { background: rgba(15, 23, 42, 0.05); padding: 10px 15px; border-radius: 14px; font-size: 12px; font-weight: 700; color: var(--brand-secondary); min-width: 80px; text-align: center; }
        .progress-container { height: 8px; background: rgba(255,255,255,0.3); border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.5); }
        .progress-bar { height: 100%; width: 0%; background: var(--brand-primary); transition: width 0.5s ease-in-out; box-shadow: 0 0 10px rgba(227, 6, 19, 0.5); }
        .console { height: 260px; max-height: 260px; background: rgba(15, 23, 42, 0.03); border-radius: 14px; padding: 14px; font-size: 11px; color: var(--text-primary); overflow-y: auto; border: 1px solid rgba(0,0,0,0.05); line-height: 1.6; box-sizing: border-box; }
        .actions { display: flex; gap: 10px; }
        .btn-publish { background: var(--brand-primary); color: white; border: none; padding: 16px; border-radius: 14px; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em; flex-grow: 2; }
        .btn-cancel { background: white; color: var(--brand-red); border: 1px solid rgba(239, 68, 68, 0.2); padding: 16px; border-radius: 14px; font-size: 13px; font-weight: 800; cursor: pointer; transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.05em; flex-grow: 1; display: none; }
        .log-entry { margin-bottom: 3px; }
        .log-success { color: #10b981; font-weight: 700; }
        .log-error { color: #ef4444; font-weight: 700; }
        .log-info { color: var(--brand-blue); font-weight: 700; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(15, 23, 42, 0.1); border-radius: 10px; }
    </style>
</head>
<body>
    <div class="aurora-container"><div class="aurora-blob blob-1"></div><div class="aurora-blob blob-2"></div><div class="aurora-blob blob-3"></div></div>
    <div class="container">
        <header><div><div class="subtitle">FreschiTech System</div><div class="title">Release Manager Pro</div></div><div id="version-badge" class="version-badge">v---</div></header>
        <div class="main-card">
            <div class="top-row"><div class="input-group"><label>Versione:</label><input type="text" id="version-input" value="---"></div><div id="timer" class="timer-badge">00:00</div></div>
            <div class="progress-container"><div id="progress-bar" class="progress-bar"></div></div>
            <div id="console" class="console">Pronto per la pubblicazione di FreschiTech.</div>
            <div class="actions">
                <button id="publish-btn" class="btn-publish" onclick="startPublish()">Compila e Pubblica</button>
                <button id="cancel-btn" class="btn-cancel" onclick="cancelProcess()">Annulla</button>
            </div>
        </div>
    </div>
    <script>
        let startTime = 0; let timerInterval = null;
        function log(msg, type = 'default') {
            const area = document.getElementById('console');
            if (area.innerText.includes('Pronto per')) area.innerText = '';
            const div = document.createElement('div'); div.className = 'log-entry log-' + type; div.innerText = msg;
            area.appendChild(div); area.scrollTop = area.scrollHeight;
        }
        function updateProgress(percent) { document.getElementById('progress-bar').style.width = percent + '%'; }
        function startTimer() { startTime = Date.now(); timerInterval = setInterval(() => {
            const diff = Date.now() - startTime; const m = Math.floor(diff / 60000); const s = Math.floor((diff % 60000) / 1000);
            document.getElementById('timer').innerText = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        }, 1000); }
        function stopTimer() { clearInterval(timerInterval); }
        function startPublish() {
            const v = document.getElementById('version-input').value;
            document.getElementById('publish-btn').style.display = 'none'; document.getElementById('cancel-btn').style.display = 'block';
            document.getElementById('version-input').disabled = true; updateProgress(5); startTimer();
            log('Inizio processo di release v' + v + '...', 'info');
            window.pywebview.api.run_release(v);
        }
        function cancelProcess() { log('Interruzione richiesta...', 'error'); window.pywebview.api.stop_release(); }
        function finish(success, msg = null) {
            stopTimer(); document.getElementById('publish-btn').style.display = 'block'; document.getElementById('cancel-btn').style.display = 'none';
            document.getElementById('version-input').disabled = false;
            if (success) { updateProgress(100); log('🏆 PROCESSO COMPLETATO CON SUCCESSO!', 'success'); }
            else { log(msg || '❌ PROCESSO INTERROTTO.', 'error'); }
        }
        window.addEventListener('pywebviewready', () => {
            window.pywebview.api.get_data().then(data => {
                document.getElementById('version-input').value = data.version;
                document.getElementById('version-badge').innerText = 'v' + data.version;
            });
        });
    </script>
</body>
</html>
"""


class Api:
    """Il ponte fra la finestra e la procedura di pubblicazione."""

    def __init__(self):
        self._window = None
        self._processo = None
        self._annullato = False

    def set_window(self, window):
        self._window = window

    # --- comunicazione con la finestra -------------------------------------

    def log(self, messaggio, tipo="default"):
        if self._window:
            self._window.evaluate_js(f"log({json.dumps(messaggio)}, '{tipo}')")
        print(f"[{tipo.upper()}] {messaggio}")

    def progress(self, percentuale):
        if self._window:
            self._window.evaluate_js(f"updateProgress({percentuale})")

    def _finito(self, riuscito, messaggio=None):
        if not self._window:
            return
        if messaggio:
            self._window.evaluate_js(f"finish({str(riuscito).lower()}, {json.dumps(messaggio)})")
        else:
            self._window.evaluate_js(f"finish({str(riuscito).lower()})")

    # --- chiamate dalla finestra -------------------------------------------

    def get_data(self):
        return {"version": leggi_versione(CONFIG)}

    def stop_release(self):
        self._annullato = True
        if self._processo:
            # taskkill /T chiude anche i figli, che sono quelli che tengono
            # occupata la macchina dopo la chiusura della finestra.
            subprocess.run(
                f"taskkill /F /T /PID {self._processo.pid}",
                shell=True, capture_output=True,
            )
        self.log("Processo interrotto dall'utente.", "error")

    def run_release(self, version):
        self._annullato = False
        threading.Thread(target=self._procedura, args=(version,), daemon=True).start()

    # --- la procedura -------------------------------------------------------

    def _compila(self):
        """Compila mostrando il progresso, e resta interrompibile."""
        # La cartella dei pacchetti va svuotata prima: altrimenti una build
        # fallita lascia l'installer della versione precedente, che la ricerca
        # trova e pubblica come se fosse nuovo.
        bundle = PROGETTO / "src-tauri/target/release/bundle"
        if bundle.exists():
            shutil.rmtree(bundle, ignore_errors=True)

        self._processo = subprocess.Popen(
            "cmd /c npx tauri build", shell=True, cwd=PROGETTO,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        for riga in self._processo.stdout:
            if self._annullato:
                break
            riga = riga.strip()
            if "Compiling" in riga:
                self.log(f"Compilazione: {riga.split('Compiling')[-1].strip()[:30]}...")

        self._processo.wait()
        return self._processo.returncode == 0

    def _firma(self, installer):
        ambiente = os.environ.copy()
        ambiente["TAURI_SIGNING_PRIVATE_KEY"] = load_signing_key()
        password = leggi_segreto("TAURI_SIGNING_PRIVATE_KEY_PASSWORD", CARTELLE_ENV) or ""
        ambiente["TAURI_SIGNING_PRIVATE_KEY_PASSWORD"] = password

        # La password va passata anche vuota: senza, il firmatario la chiede da
        # tastiera, e qui non c'e' una tastiera da cui rispondere.
        #
        # Che oggi sia vuota e' un difetto, non una scelta: quando la chiave
        # verra' rigenerata (vedi signing_key.py) va data una password vera e
        # messa in TAURI_SIGNING_PRIVATE_KEY_PASSWORD, fuori dal repository.
        firmatario = subprocess.Popen(
            f'cmd /c npx tauri signer sign --password "{password}" "{installer}"',
            shell=True, cwd=PROGETTO, env=ambiente,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )
        for riga in firmatario.stdout:
            riga = riga.strip()
            if riga:
                self.log(f"Firma: {riga}")
        firmatario.wait()

        file_firma = Path(str(installer) + ".sig")
        if firmatario.returncode != 0 or not file_firma.exists():
            raise ErroreRelease("Firma non riuscita: il file .sig non e' stato prodotto.")

        valore = file_firma.read_text(encoding="utf-8").strip()
        file_firma.unlink()
        return valore

    def _procedura(self, versione):
        try:
            token = leggi_token()
            if not token:
                self.log("Token GitHub non trovato in .env ne' in GitHubToken.env.", "error")
                self._finito(False)
                return
            self.progress(10)

            self.log("Allineamento della versione nei tre file...", "info")
            for percorso in scrivi_versione(CONFIG, versione):
                self.log(f"  {percorso.relative_to(CONFIG.cartella_base)}")
            self.progress(15)

            self.log("Compilazione...", "info")
            riuscita = self._compila()
            if self._annullato:
                self._finito(False, "Annullato")
                return
            if not riuscita:
                self.log("Compilazione fallita.", "error")
                self._finito(False)
                return
            self.progress(80)

            # `trova_installer` filtra sull'estensione. La ricerca precedente
            # usava un glob `*{versione}*.*`, che prendeva anche il .sig di una
            # firma precedente: essendo piu' recente vinceva l'ordinamento per
            # data e veniva pubblicato al posto del programma, e i client
            # scaricavano poche centinaia di byte.
            installer = trova_installer(CONFIG, versione)
            if installer is None:
                raise ErroreRelease(
                    f"Nessun installer della versione {versione} nella cartella bundle."
                )
            self.log(f"Installer: {installer.name}", "success")
            self.progress(85)

            self.log("Firma digitale...", "info")
            firma = self._firma(installer)
            self.log("Firma acquisita.", "success")
            self.progress(90)

            self.log("Creazione della release su GitHub...", "info")
            id_release = crea_release(CONFIG, token, versione)

            self.log(f"Caricamento di {installer.name}...", "info")
            carica_asset(CONFIG, token, id_release, installer)
            self.progress(95)

            # Solo la voce Windows. `pubblica_manifest` rilegge il manifest e
            # sostituisce solo questa: scrivere `platforms` da capo - come si
            # faceva qui - cancellerebbe le voci darwin il giorno in cui
            # FreschiTech venisse pubblicata anche per macOS, senza che niente
            # lo segnali, perche' la pubblicazione riesce comunque.
            self.log("Aggiornamento del manifest dell'updater...", "info")
            pubblica_manifest(
                CONFIG, token, versione,
                {
                    "windows-x86_64": {
                        "signature": firma,
                        "url": f"{CONFIG.url_repo_release}/releases/download/{versione}/{installer.name}",
                    }
                },
            )

            self.progress(100)
            self.log(f"{CONFIG.nome_app} v{versione} pubblicata.", "success")
            self._finito(True)

        except ErroreRelease as errore:
            # Le funzioni condivise sollevano invece di restituire False: prima
            # un caricamento fallito passava inosservato e il manifest finiva
            # per puntare a un file inesistente.
            self.log(str(errore), "error")
            self._finito(False)
        except Exception as errore:
            if not self._annullato:
                self.log(f"Errore inatteso: {errore}", "error")
                self._finito(False)


if __name__ == "__main__":
    api = Api()
    finestra = webview.create_window(
        f"{CONFIG.nome_app} - Release Manager",
        html=HTML_CONTENT, js_api=api, width=650, height=580,
    )
    api.set_window(finestra)
    webview.start()
