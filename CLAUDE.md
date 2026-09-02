# CLAUDE.md

Guida per Claude Code (claude.ai/code) su questo repository.

## Cos'è questo progetto

FreschiTech è un'applicazione **desktop** (macOS in primis, Windows supportato) costruita su
**TauriKit**: Tauri 2 + React 19 + Rust/SQLite. Deve funzionare **senza connessione**: niente CDN,
niente asset remoti bloccanti.

Il codice e i commenti sono in italiano: mantieni questa convenzione, inclusi i commenti "PERCHÉ"
che spiegano il bug corretto — sono documentazione, non rumore.

## Layout del repository

| Percorso | Cosa contiene |
| --- | --- |
| `modern-ui/src/` | Frontend (React 19 + Vite 8 + Tailwind 4) |
| `modern-ui/src-tauri/` | Backend Rust: identità dell'app, schema, comandi di dominio |
| `release_manager_windows.py` | Release manager con GUI pywebview: **solo la finestra**, le operazioni stanno in `tecno_release` |
| `release_config.py`, `signing_key.py` | Configurazione di release e caricamento della chiave di firma |

**L'infrastruttura non è qui.** Tre pacchetti di TauriKit (repo privato
`massimosico-gif/TauriKit`) contengono ciò che non deve divergere fra le applicazioni. Un bug lì si
corregge una volta sola: non ricopiare quel codice dentro questo repository.

| Pacchetto | Cosa contiene | Come si aggiorna |
| --- | --- | --- |
| `tecno-core` (cargo) | Database, migrazioni, backup, logging, diagnostica, hook sui panic | `cargo update -p tecno-core` |
| `@tecno/ui` (npm) | `validateVAT`, `validateTaxCode`, `parseNumber`/`formatAmount`…, `Toast`, `ConfirmModal`, `FeedbackProvider`, `useToast`/`useConfirm` | `npm --prefix modern-ui update @tecno/ui` |
| `tecno_release` (pip) | Allineamento della versione, ricerca dell'installer, release GitHub, manifest dell'updater | `pip install --upgrade --force-reinstall "git+…#subdirectory=core/tecno-release"` |

Il pacchetto Python va installato una volta per macchina:

```bash
pip install "git+https://github.com/massimosico-gif/TauriKit#subdirectory=core/tecno-release"
```

## Comandi

Tutti i comandi npm vanno eseguiti in `modern-ui/`.

```bash
npm --prefix modern-ui install
```

```bash
npm --prefix modern-ui run tauri dev
```

```bash
npm --prefix modern-ui run lint
```

Anteprima **web**: interfaccia nel browser senza guscio nativo, con i moduli `@tauri-apps/*`
sostituiti dal mock. Serve a iterare sull'interfaccia senza ricompilare Rust:

```bash
npm --prefix modern-ui run dev:web
```

Test JS (vitest). **Non ce ne sono**: l'unico era su `FeedbackProvider`, che ora vive in
TauriKit insieme al componente (`cd ~/Desktop/Tauri/TauriKit && npm test`). Il codice di dominio di
FreschiTech — i calcoli finanziari, l'importazione dei listini — non ne ha mai avuti, e il comando
usa `--passWithNoTests` perché lo dica invece di fallire:

```bash
npm --prefix modern-ui test
```

Test Rust dell'applicazione:

```bash
cd modern-ui/src-tauri && cargo test
```

Compilazione nativa completa (lenta, produce il bundle):

```bash
npm --prefix modern-ui run tauri build
```

Release completa (bump versione → build → firma → GitHub release → aggiornamento Gist). Si pubblica
**solo per Windows**, con la finestra del release manager:

```bash
python release_manager_windows.py
```

Doppio clic: `Avvia_Release_Manager.bat`. Le operazioni sono in `tecno_release`; qui restano la
finestra e la configurazione (`release_config.py`).

**Il manifest dell'updater è uno per tutte le piattaforme, ma le release si fanno una piattaforma
alla volta.** Usa `pubblica_manifest`, che rilegge le voci esistenti e sostituisce solo quelle
passate: scrivere `platforms` da capo cancellerebbe la piattaforma non toccata il giorno in cui
FreschiTech venisse pubblicata anche per macOS.

## Architettura

### Flusso dei dati

Non esiste un server: il frontend parla solo via IPC Tauri.

```
React (src/) --invoke('nome_comando')--> commands.rs --> tecno_core::db --> SQLite
                                              |
                                              +--> tecno_core::backup / logging / diagnostics
```

**Aggiungere un comando richiede tre modifiche**: la `#[tauri::command(async)]` in `commands.rs`,
la riga in `generate_handler!` di `lib.rs`, e la chiamata `invoke()` nel componente React.
Dimenticare la seconda produce un errore solo a runtime, al primo clic.

I comandi sono `async` di proposito: un comando sincrono viene eseguito da Tauri sul **main
thread**, lo stesso che disegna la finestra su macOS, e bloccherebbe il rendering.

### Database

- Percorso di default `~/Library/Application Support/com.freschitech.app/freschitech.db`
  (`db::percorso_storico`), **non** quello standard di TauriKit: le installazioni esistenti hanno
  il file lì e spostare il default le farebbe ripartire su un database vuoto. Sovrascrivibile
  dall'utente da `~/.freschitech/db_config.json` (comandi `get_current_db_path` / `set_db_path`).
- **Lo schema vive in `src-tauri/src/db.rs`**, nella costante `SCHEMA`. L'ordine di esecuzione è
  `crea_tabelle` → migrazioni → `crea_indici` → `valori_predefiniti`, e lo applica
  `tecno_core::avvia`.
- Le migrazioni sono **versionate con `PRAGMA user_version`** e girano in un'unica transazione: una
  volta applicate non vengono ritentate, e una che fallisce non lascia il database a metà. Per
  aggiungerne una: scrivi la `fn`, aggiungila a `MIGRAZIONI` con la versione successiva, porta
  `SCHEMA.versione` allo stesso numero. Per una colonna usa
  `tecno_core::db::add_column_if_missing`, che verifica `pragma_table_info` invece di ingoiare
  l'errore di `ALTER TABLE`.
- Indici e valori predefiniti stanno **fuori** dalle migrazioni versionate, di proposito: un indice
  UNIQUE fallisce se esistono duplicati e deve essere ritentato a ogni avvio perché venga creato
  quando l'utente li ha corretti.
- All'avvio gira `PRAGMA integrity_check`. Su database danneggiato l'app offre di salvarne una
  copia prima di chiudere, invece di sparire senza spiegazioni.
- Le **date sono sempre ISO `AAAA-MM-GG` nel database**. La conversione da/verso `GG/MM/AAAA`
  avviene ai bordi, nei comandi. Non introdurre date in formato italiano nelle query.

### Backup

`tecno_core::backup` usa l'**API di backup online di SQLite**, non `fs::copy`: copiare il file
mentre SQLite ci scrive produce copie incoerenti. Un backup automatico parte all'avvio se l'ultimo
ha più di 24 ore, e ne vengono conservati 7. I prefissi `freschitech_auto_` e `freschitech_backup_`
sono distinti e non intercambiabili: il primo viene ruotato, il secondo (manuale) mai.

### Diagnostica

Il logger è registrato **nella catena del builder, prima di `setup`**, così le diagnostiche
dell'inizializzazione del database finiscono nel file. È attivo anche in release.

I comandi che modificano dati o toccano l'esterno sono avvolti da `NOME` → `NOME_impl`, con
`tecno_core::log_esito`. Le sole letture non sono strumentate. Viene registrato **l'esito, mai il
payload**: contiene dati personali e il file viene inviato all'assistenza. Per la stessa ragione i
percorsi passano da `tecno_core::paths::etichetta_file`, che tiene solo il nome del file.

Gli errori del frontend arrivano allo stesso file via `log_frontend_error`, alimentato da
`ErrorBoundary` e da tre handler globali in `main.jsx`.

I panic del backend finiscono in `~/.freschitech/crash.log`.

### Frontend

- **Niente `window.alert` / `window.confirm`**: in WKWebView sono modali sul processo e bloccano il
  rendering. Si usano `useToast()` (`toast.success` / `toast.error`) e `useConfirm()` da
  **`@tecno/ui/feedback`**, forniti da `<FeedbackProvider>` in `main.jsx`. La conferma restituisce
  una `Promise<boolean>`, quindi il chiamante resta lineare:
  `if (!(await confirm({...}))) return`.
- `ConfirmModal` usa **`confirmLabel` / `cancelLabel`**, non `confirmText` / `cancelText`. Una prop
  sconosciuta in React viene ignorata senza errore: sbagliando nome i pulsanti tornano in silenzio
  alle etichette predefinite, ed è successo — cinque punti ne avevano di personalizzate, fra cui un
  salvataggio che sarebbe diventato "Elimina".
- **Per gli importi si usa `formatAmount`, non `formatNumber`.** Il `formatNumber` di `@tecno/ui`
  non raggruppa le migliaia, perché serve dentro i campi modificabili; `formatAmount` sì e impone
  due decimali. Sono nomi diversi da quelli che c'erano qui: il vecchio `formatNumber` locale
  faceva quello che ora si chiama `formatAmount`.
- **Validazione fiscale da `@tecno/ui`.** `validateTaxCode` accetta anche la partita IVA a undici
  cifre usata come codice fiscale, che per le persone giuridiche è il caso normale: quello locale
  pretendeva sedici caratteri e la rifiutava.
- Il colore brand vive in **due file**: il blocco `@theme` di `src/index.css`
  (`--color-accent`, che genera le classi `bg-accent`/`text-accent`/`hover:bg-accent-hover`) e
  `src/styles/variables.css` (`--accent-color`, `--accent-rgb`), da cui lo prendono i componenti di
  `@tecno/ui`. Mai il valore esadecimale. Il `tailwind.config.js` in cartella **non viene letto**:
  con Tailwind 4 servirebbe un `@config` nel CSS, ed è il blocco `@theme` a fare quel lavoro.
- **`src/index.css` deve dichiarare `@source` per `@tecno/ui`.** Tailwind non analizza
  `node_modules`: senza quella riga le classi usate solo dai componenti condivisi non finiscono nel
  CSS e quei componenti appaiono senza stile — senza alcun errore a segnalarlo.
- Ogni `invoke` va con il suo `catch`: il backend restituisce messaggi già scritti per l'utente, e
  una promise rifiutata senza `catch` sparisce nella console del webview.

### Anteprima web

`vite --mode web` alias-a i moduli `@tauri-apps/*` su `src/utils/tauriMock.js`, che risponde con
dati plausibili tenuti in `localStorage`.

**Il mock deve imitare il backend, non accontentarlo.** Dove il comando Rust rifiuta
un'operazione, il mock rifiuta allo stesso modo e con lo stesso messaggio. Un mock più permissivo
del backend fa sembrare funzionante codice che in produzione si rompe. Quello che richiede il
sistema operativo (backup, diagnostica, selettore di file) solleva un errore esplicito invece di
fingere successo.

Superare l'anteprima web **non è una prova** che il nativo funzioni: verifica sempre anche lì.

### Sicurezza

La CSP in `tauri.conf.json` è ancora `null`, cioè assente. Stringerla come nel template di
TauriKit è il passo successivo, ma prima va tolto il caricamento dei font da Google Fonts in
`index.html`: l'app deve funzionare offline e quella richiesta remota bloccherebbe il primo paint.

**La chiave di firma degli aggiornamenti va rigenerata.** Era una stringa letterale in
`release_manager_windows.py`, su un repository **pubblico**, protetta da una password vuota:
chiunque poteva leggerla e firmare un pacchetto che tutte le installazioni accettano come autentico.
Ora la legge `signing_key.py` da `signing_key.txt`, non versionato — ma **resta nella storia di git**
dal commit `8f566bf`, quindi spostarla non la rende segreta. Le istruzioni per rigenerarla, e il suo
costo (le installazioni esistenti rifiuteranno gli aggiornamenti firmati con la nuova chiave e
andranno reinstallate una volta), sono in cima a `signing_key.py`.

**La diagnostica non deve mai spedire dati.** Una versione precedente caricava su Telegram il file
di database completo — a ogni panic e a ogni record di livello `Error` — e teneva il token del bot
dentro il bundle JavaScript via `import.meta.env.VITE_TELEGRAM_BOT_TOKEN`. Ora l'invio passa da
`send_logs_to_developer`, parte solo su richiesta esplicita dell'utente e allega **solo il file di
log**, che per costruzione riporta esiti e mai payload. Non reintrodurre invii automatici di dati.

## Compilare su un'altra macchina (Windows)

`tecno-core` e `@tecno/ui` arrivano dal repository **privato** `massimosico-gif/TauriKit`. Non
serve clonarlo a mano: li scaricano cargo e npm. Servono però due cose sulla macchina.

**1. Cargo e npm devono potersi autenticare.** `src-tauri/.cargo/config.toml` imposta già
`net.git-fetch-with-cli = true`, così cargo delega a `git` invece di usare libgit2, che su un
repository privato fallisce con un messaggio poco chiaro. Su Windows le credenziali le gestisce
Git Credential Manager: basta che un `git clone` o `git fetch` verso GitHub sia già andato a buon
fine una volta, e la stessa condizione basta a npm.

`package.json` dichiara `@tecno/ui` come `git+https://…`. Nel `package-lock.json` npm registra
comunque la forma `git+ssh://`: non è un problema, perché quando la chiave SSH manca npm ritenta in
HTTPS. La forma esplicita nel `package.json` dice però qual è il canale su cui contare.

**3. Per pubblicare, anche `tecno_release`**, che pip non installa da solo:

```bash
pip install "git+https://github.com/massimosico-gif/TauriKit#subdirectory=core/tecno-release"
```

**2. I segreti locali, che non stanno nel repository.** Su Windows vanno in `%USERPROFILE%\.freschitech\`,
l'equivalente di `~/.freschitech/` su macOS:

| File | Serve per |
| --- | --- |
| `db_key` | migrare i database cifrati delle installazioni più vecchie |
| `diagnostics.json` | far funzionare "Invia Report" dai computer dei clienti |

Senza, la build **riesce lo stesso** ma stampa un warning e quelle due funzioni restano inattive:
è un compromesso voluto, non un errore da ignorare.

Per aggiornare `tecno-core` a una versione più recente: `cargo update -p tecno-core`. Finché non lo
fai, `Cargo.lock` tiene fisso il commit, quindi le due macchine compilano lo stesso codice.

## Segreti e configurazione locale

Nessun segreto sta nel codice sorgente. Servono file locali **non versionati**:

| Cosa | Dove | Serve per |
| --- | --- | --- |
| Chiave privata di firma | `signing_key.txt` o `TAURI_SIGNING_PRIVATE_KEY` | Pubblicare aggiornamenti accettati dalle installazioni esistenti |
| Chiave migrazione DB cifrati | `modern-ui/src-tauri/secrets/db_key` o `~/.freschitech/db_key` | Letta da `build.rs` e incorporata nel binario |
| Credenziali Telegram diagnostica | `~/.freschitech/diagnostics.json` | `send_logs_to_developer`, anche dai computer dei clienti |
| Token GitHub | `GitHubToken.env` / `.env` / `GITHUB_TOKEN` | Script di release |

Il token in `GitHubToken.env` è **scaduto** (GitHub risponde 401 "Bad credentials"): va rigenerato
prima della prossima release. La procedura ora si ferma con un messaggio esplicito invece di
proseguire su un manifest letto vuoto.

I valori incorporati da `build.rs` **finiscono nel binario** e restano estraibili con `strings`:
il segreto sta fuori dal repository, non fuori dall'app. Usare un bot Telegram dedicato solo a
questo.

## Versionamento

La versione va tenuta allineata in **tre file**: `VERSION` (fonte di verità),
`modern-ui/package.json` e `modern-ui/src-tauri/tauri.conf.json`. `tecno_release.scrivi_versione`
lo fa automaticamente; se bumpi a mano, aggiornali tutti e tre.

Attenzione: su `main` il file `VERSION` dice **1.2.1**, ma la release pubblicata è la **1.3.0** (il
lavoro sta sul ramo `release/1.3.0`). Il release manager propone quello che legge da `VERSION`,
quindi va corretto prima di pubblicare, altrimenti si ripubblica all'indietro.

Nota: `env!("CARGO_PKG_VERSION")` restituisce `0.1.0`, la versione di `Cargo.toml`, non quella
dell'app. Per la versione vera usa `app.package_info().version`.
