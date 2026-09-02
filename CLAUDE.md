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
| `release_app.py` | Tooling di release (build, firma, pubblicazione GitHub + Gist) |

**L'infrastruttura non è qui.** Database, migrazioni, backup, logging, diagnostica e hook sui panic
vivono nel crate condiviso `tecno-core` di TauriKit. Un bug lì si corregge una volta sola, per
tutte le applicazioni: non ricopiare quel codice dentro questo repository.

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

Test JS (vitest):

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

Release completa (bump versione → build → tar.gz → firma → GitHub release → aggiornamento Gist):

```bash
python3 release_app.py
```

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
  `hooks/useFeedback`, forniti da `<FeedbackProvider>` in `main.jsx`. La conferma restituisce una
  `Promise<boolean>`, quindi il chiamante resta lineare:
  `if (!(await confirm({...}))) return`.
- Il colore brand vive in **due file soli**: `tailwind.config.js` (token `accent`) e
  `src/styles/variables.css` (`--accent-color`, `--accent-rgb`). Nei componenti si usa `bg-accent`,
  `text-accent`, `hover:bg-accent-hover` — mai il valore esadecimale.
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

**La diagnostica non deve mai spedire dati.** Una versione precedente caricava su Telegram il file
di database completo — a ogni panic e a ogni record di livello `Error` — e teneva il token del bot
dentro il bundle JavaScript via `import.meta.env.VITE_TELEGRAM_BOT_TOKEN`. Ora l'invio passa da
`send_logs_to_developer`, parte solo su richiesta esplicita dell'utente e allega **solo il file di
log**, che per costruzione riporta esiti e mai payload. Non reintrodurre invii automatici di dati.

## Segreti e configurazione locale

Nessun segreto sta nel codice sorgente. Servono file locali **non versionati**:

| Cosa | Dove | Serve per |
| --- | --- | --- |
| Chiave privata di firma | `signing_key.txt` o `TAURI_SIGNING_PRIVATE_KEY` | Pubblicare aggiornamenti accettati dalle installazioni esistenti |
| Chiave migrazione DB cifrati | `modern-ui/src-tauri/secrets/db_key` o `~/.freschitech/db_key` | Letta da `build.rs` e incorporata nel binario |
| Credenziali Telegram diagnostica | `~/.freschitech/diagnostics.json` | `send_logs_to_developer`, anche dai computer dei clienti |
| Token GitHub | `GitHubToken.env` / `.env` / `GITHUB_TOKEN` | Script di release |

I valori incorporati da `build.rs` **finiscono nel binario** e restano estraibili con `strings`:
il segreto sta fuori dal repository, non fuori dall'app. Usare un bot Telegram dedicato solo a
questo.

## Versionamento

La versione va tenuta allineata in **tre file**: `VERSION` (fonte di verità),
`modern-ui/package.json` e `modern-ui/src-tauri/tauri.conf.json`. `release_app.py` lo fa
automaticamente; se bumpi a mano, aggiornali tutti e tre.

Nota: `env!("CARGO_PKG_VERSION")` restituisce `0.1.0`, la versione di `Cargo.toml`, non quella
dell'app. Per la versione vera usa `app.package_info().version`.
