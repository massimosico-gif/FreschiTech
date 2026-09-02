//! Segreti incorporati al momento della build da `tecno-core-build`.
//!
//! Il file incluso e' generato da `build.rs` dentro `OUT_DIR` e definisce tre
//! costanti `Option<&str>`: `LEGACY_DB_KEY`, `TELEGRAM_TOKEN`,
//! `TELEGRAM_CHAT_ID`. Sono `None` quando la build non ha trovato i file
//! locali corrispondenti (`~/.freschitech/db_key`,
//! `~/.freschitech/diagnostics.json`).
//!
//! PERCHE' UN FILE IN OUT_DIR E NON `option_env!`
//! ----------------------------------------------
//! Con `option_env!` il valore viene risolto quando il crate viene compilato,
//! ma cargo NON ricompila il crate quando quella variabile d'ambiente cambia:
//! la prima build a variabile assente incide `None` nel binario e tutte le
//! successive riusano l'artefatto in cache. Era il caso di
//! `option_env!("VITE_TELEGRAM_BOT_TOKEN")` nella versione precedente.
//!
//! ATTENZIONE: i valori finiscono comunque nel binario e restano estraibili
//! con `strings`. Il segreto sta fuori dal repository, non fuori dall'app:
//! usare un bot Telegram dedicato solo alla diagnostica.

include!(concat!(env!("OUT_DIR"), "/segreti_incorporati.rs"));
