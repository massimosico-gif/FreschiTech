import os
import subprocess
import json
import shutil
import datetime
import requests
import glob
import webview
import threading
import time

# --- CONFIGURAZIONE ---
APP_NAME = "FreschiTech"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.join(BASE_DIR, "modern-ui")
REPO_OWNER = "massimosico-gif"
REPO_NAME = "FreschiTech-Releases"
GIST_ID = "8305a31d9ccfad4fe99a689baf958d4b"
RELEASE_REPO_URL = f"https://github.com/{REPO_OWNER}/{REPO_NAME}"

# I segreti vivono in .env (gitignored), MAI in questo file: e' versionato.
# La chiave privata firma gli aggiornamenti automatici, quindi chi la ottiene
# puo' far installare codice arbitrario su tutte le macchine con FreschiTech.
ENV_GITHUB_TOKEN = "GITHUB_TOKEN"
ENV_SIGNING_KEY = "TAURI_SIGNING_PRIVATE_KEY"
ENV_SIGNING_PASSWORD = "TAURI_SIGNING_PRIVATE_KEY_PASSWORD"

# Credenziali della diagnostica Telegram, lette da Rust con option_env! durante
# la compilazione. Il prefisso NON e' VITE_: Vite sostituirebbe le variabili
# VITE_* nel bundle JavaScript, esponendo il token a chiunque abbia l'app.
ENV_TELEGRAM_TOKEN = "FRESCHITECH_TELEGRAM_BOT_TOKEN"
ENV_TELEGRAM_CHAT = "FRESCHITECH_TELEGRAM_CHAT_ID"

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
    def __init__(self):
        self._window = None
        self._current_process = None
        self._is_cancelled = False

    def set_window(self, window): self._window = window

    def log(self, msg, type='default'):
        if self._window: self._window.evaluate_js(f"log({json.dumps(msg)}, '{type}')")

    def progress(self, percent):
        if self._window: self._window.evaluate_js(f"updateProgress({percent})")

    def get_data(self):
        version = "1.0.0"
        try:
            v_path = os.path.join(BASE_DIR, "VERSION")
            if os.path.exists(v_path):
                with open(v_path, 'r') as f: version = f.read().strip()
        except: pass
        return {"version": version}

    def stop_release(self):
        self._is_cancelled = True
        if self._current_process:
            try: subprocess.run(['taskkill', '/F', '/T', '/PID', str(self._current_process.pid)], capture_output=True)
            except: pass
        self.log("Processo interrotto dall'utente.", "error")

    def run_release(self, version):
        self._is_cancelled = False
        threading.Thread(target=self._process, args=(version,)).start()

    def _process(self, version):
        try:
            token = self._get_token()
            if not token:
                self.log("ERRORE: GITHUB_TOKEN non trovato", "error")
                self._window.evaluate_js("finish(false)")
                return

            self.progress(10)
            self.log("Sincronizzazione file versione...", "info")
            self._update_files(version)
            self.progress(15)

            # 2. Build
            self.log("Avvio build FreschiTech...", "info")
            bundle_base = os.path.join(PROJECT_DIR, "src-tauri", "target", "release", "bundle")
            if os.path.exists(bundle_base): shutil.rmtree(bundle_base)

            # Le credenziali Telegram vengono passate all'ambiente di build:
            # finiscono nel binario Rust, non nel bundle JavaScript.
            build_env = os.environ.copy()
            for name in (ENV_TELEGRAM_TOKEN, ENV_TELEGRAM_CHAT):
                value = self._get_secret(name)
                if value:
                    build_env[name] = value
                else:
                    self.log(f"Avviso: {name} non impostato, diagnostica Telegram disattivata.", "warning")

            self._current_process = subprocess.Popen("cmd /c npx tauri build", shell=True, cwd=PROJECT_DIR, env=build_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            
            for line in self._current_process.stdout:
                if self._is_cancelled: break
                line = line.strip()
                if "Compiling" in line:
                    p = line.split("Compiling")
                    if len(p) > 1: self.log(f"Build: {p[1].strip()[:30]}...")
            
            self._current_process.wait()
            if self._is_cancelled:
                self._window.evaluate_js("finish(false, 'Annullato')")
                return

            if self._current_process.returncode != 0:
                self.log("ERRORE: Build fallita!", "error")
                self._window.evaluate_js("finish(false)")
                return

            self.progress(80)

            # 3. Installer
            installer_path = self._find_installer(version)
            if not installer_path:
                self.log("ERRORE: Installer non trovato!", "error")
                self._window.evaluate_js("finish(false)")
                return
            
            self.log(f"Trovato installer: {os.path.basename(installer_path)}", "success")
            self.progress(85)

            # 4. Sign
            self.log("Firma digitale in corso...", "info")
            signing_key = self._get_secret(ENV_SIGNING_KEY)
            if not signing_key:
                self.log(
                    f"ERRORE: {ENV_SIGNING_KEY} non trovato in .env. "
                    "Genera la coppia di chiavi con 'npx tauri signer generate' "
                    "e inserisci la chiave privata nel file .env.",
                    "error",
                )
                self._window.evaluate_js("finish(false)")
                return

            signing_password = self._get_secret(ENV_SIGNING_PASSWORD) or ""
            env = os.environ.copy()
            env[ENV_SIGNING_KEY] = signing_key
            env[ENV_SIGNING_PASSWORD] = signing_password

            # La password viaggia nell'ambiente, non sulla riga di comando:
            # gli argomenti di un processo sono leggibili da altri utenti.
            sign_cmd = f'cmd /c npx tauri signer sign "{installer_path}"'
            subprocess.run(sign_cmd, shell=True, cwd=PROJECT_DIR, env=env)
            
            sig_file = installer_path + ".sig"
            if not os.path.exists(sig_file):
                self.log("ERRORE: Firma fallita (file .sig non generato)!", "error")
                self._window.evaluate_js("finish(false)")
                return
            
            with open(sig_file, 'r') as f: signature = f.read().strip()
            self.log("Firma acquisita con successo.", "success")
            self.progress(90)

            # 5. GitHub
            self.log("Connessione a GitHub per la release...", "info")
            release_id = self._create_release(token, version)
            if not release_id:
                self.log("ERRORE: Impossibile creare/recuperare la release su GitHub.", "error")
                self._window.evaluate_js("finish(false)")
                return
            self.log(f"Release GitHub pronta (ID: {release_id})", "success")
            self.progress(93)

            # 6. Upload
            self.log(f"Caricamento {os.path.basename(installer_path)} su GitHub...", "info")
            if not self._upload_asset(token, release_id, installer_path):
                self.log("ERRORE: Caricamento asset fallito.", "error")
                self._window.evaluate_js("finish(false)")
                return
            self.log("Asset caricato correttamente.", "success")
            self.progress(97)

            # 7. Gist (Update Gist with both Windows and existing macOS platforms to not break them!)
            self.log("Sincronizzazione finale con il Gist...", "info")
            
            # Fetch existing Gist so we preserve macOS platforms!
            gist_url = f"https://api.github.com/gists/{GIST_ID}"
            headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
            gist_resp = requests.get(gist_url, headers=headers, timeout=20)
            
            platforms_data = {}
            if gist_resp.status_code == 200:
                try:
                    current_gist = gist_resp.json()
                    current_content = json.loads(current_gist["files"]["update.json"]["content"])
                    platforms_data = current_content.get("platforms", {})
                except Exception as e:
                    self.log(f"Avviso: Errore lettura Gist esistente ({str(e)}), verrà creata una nuova configurazione.", "warning")
            
            # Add or update Windows platform
            platforms_data["windows-x86_64"] = {
                "signature": signature,
                "url": f"{RELEASE_REPO_URL}/releases/download/{version}/{os.path.basename(installer_path)}"
            }
            
            update_json = {
                "version": version,
                "notes": f"Aggiornamento Windows v{version}",
                "pub_date": datetime.datetime.now().isoformat() + "Z",
                "platforms": platforms_data
            }
            
            if self._update_gist(token, version, update_json):
                self.progress(100)
                self._window.evaluate_js("finish(true)")
            else:
                self.log("ERRORE: Impossibile aggiornare il Gist.", "error")
                self._window.evaluate_js("finish(false)")

        except Exception as e:
            self.log(f"ERRORE SISTEMA: {str(e)}", "error")
            self._window.evaluate_js("finish(false)")

    def _get_secret(self, name):
        """Legge un segreto dai file .env, con fallback sulle variabili d'ambiente.

        Cerca sia nella cartella principale sia in modern-ui: storicamente i
        segreti del frontend stavano nel secondo file, quelli di release nel
        primo. Vince la prima occorrenza trovata.
        """
        for directory in (BASE_DIR, PROJECT_DIR):
            env_path = os.path.join(directory, ".env")
            if not os.path.exists(env_path):
                continue
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    key, _, value = line.partition("=")
                    if key.strip() == name:
                        return value.strip().strip('"').strip("'")
        return os.environ.get(name)

    def _get_token(self):
        return self._get_secret(ENV_GITHUB_TOKEN)

    def _update_files(self, version):
        with open(os.path.join(BASE_DIR, 'VERSION'), 'w') as f: f.write(version)
        p_path = os.path.join(PROJECT_DIR, 'package.json')
        with open(p_path, 'r') as f: pkg = json.load(f)
        pkg['version'] = version
        with open(p_path, 'w') as f: json.dump(pkg, f, indent=2)
        t_path = os.path.join(PROJECT_DIR, 'src-tauri', 'tauri.conf.json')
        with open(t_path, 'r') as f: tconf = json.load(f)
        tconf['version'] = version
        with open(t_path, 'w') as f: json.dump(tconf, f, indent=2)

    def _find_installer(self, version):
        for sub in ["msi", "nsis"]:
            path = os.path.join(PROJECT_DIR, "src-tauri", "target", "release", "bundle", sub)
            if not os.path.exists(path): continue
            files = glob.glob(os.path.join(path, f"*{version}*.*"))
            if files: return sorted(files, key=os.path.getmtime, reverse=True)[0]
        return None

    def _create_release(self, token, version):
        url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases"
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        data = {"tag_name": version, "name": f"v{version}", "body": f"Build Windows v{version}", "draft": False, "prerelease": False}
        try:
            resp = requests.post(url, headers=headers, json=data, timeout=20)
            if resp.status_code == 201: return resp.json()["id"]
            elif resp.status_code == 422:
                get_resp = requests.get(f"{url}/tags/{version}", headers=headers, timeout=20)
                if get_resp.status_code == 200: return get_resp.json()["id"]
        except: pass
        return None

    def _upload_asset(self, token, release_id, file_path):
        name = os.path.basename(file_path)
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        try:
            assets = requests.get(f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/{release_id}/assets", headers=headers, timeout=20).json()
            for a in assets:
                if a["name"] == name: requests.delete(a["url"], headers=headers, timeout=20)
            url = f"https://uploads.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases/{release_id}/assets?name={name}"
            with open(file_path, "rb") as f:
                r = requests.post(url, headers={"Authorization": f"token {token}", "Content-Type": "application/octet-stream"}, data=f, timeout=60)
            return r.status_code == 201
        except: return False

    def _update_gist(self, token, version, content):
        url = f"https://api.github.com/gists/{GIST_ID}"
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        data = {"files": {"update.json": {"content": json.dumps(content, indent=2)}, "version.txt": {"content": version}}}
        try:
            resp = requests.patch(url, headers=headers, json=data, timeout=20)
            return resp.status_code == 200
        except: return False

if __name__ == "__main__":
    api = Api()
    window = webview.create_window('FreschiTech - Release Manager Pro', html=HTML_CONTENT, js_api=api, width=650, height=580)
    api.set_window(window)
    webview.start()
