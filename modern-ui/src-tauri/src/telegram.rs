//! Invio della diagnostica (log ed errori) sul canale Telegram di supporto.
//!
//! Sostituisce le invocazioni al binario esterno `curl`, che non e' garantito
//! su Windows e costringeva a lanciare un processo per ogni riga di log.
//!
//! # Runtime
//!
//! Le funzioni di invio usano `reqwest::blocking`, che va in panic se chiamato
//! dall'interno di un runtime tokio (come quello su cui Tauri esegue i
//! comandi). Vanno quindi invocate solo da un thread OS "puro": usare
//! [`dispatch`] quando il chiamante potrebbe trovarsi sul runtime.
//!
//! # Privacy
//!
//! Il database contiene l'anagrafica completa dei clienti (P.IVA, codici
//! fiscali, email, PEC, telefoni). Per questo [`send_document`] non viene mai
//! chiamata automaticamente sul file `.db`: l'invio del database avviene solo
//! su azione esplicita dell'utente dal pannello "Dati & Log".

use std::path::{Path, PathBuf};
use std::time::Duration;

const API_BASE: &str = "https://api.telegram.org";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Lunghezza massima (in byte) del testo inviato in un singolo messaggio.
/// Telegram accetta 4096 caratteri; restiamo sotto per lasciare spazio
/// all'intestazione HTML.
pub const MAX_PAYLOAD_BYTES: usize = 3500;

/// Credenziali del bot, lette dalle impostazioni globali.
///
/// In fallback usa le variabili d'ambiente valorizzate a build time. Il
/// prefisso NON e' `VITE_` di proposito: Vite sostituisce le variabili
/// `VITE_*` nel bundle JavaScript, esponendo il token a chiunque abbia
/// l'applicazione installata.
pub fn credentials() -> Option<(String, String)> {
    let conn = crate::db::get_connection().ok()?;

    let read = |key: &str| -> String {
        conn.query_row(
            "SELECT value FROM global_settings WHERE key = ?1",
            [key],
            |row| row.get(0),
        )
        .unwrap_or_default()
    };

    let mut bot_token: String = read("telegram_bot_token");
    let mut chat_id: String = read("telegram_chat_id");

    if bot_token.is_empty() {
        bot_token = option_env!("FRESCHITECH_TELEGRAM_BOT_TOKEN")
            .unwrap_or("")
            .to_string();
    }
    if chat_id.is_empty() {
        chat_id = option_env!("FRESCHITECH_TELEGRAM_CHAT_ID")
            .unwrap_or("")
            .to_string();
    }

    if bot_token.is_empty() || chat_id.is_empty() {
        return None;
    }
    Some((bot_token, chat_id))
}

/// Esegue `f` su un thread OS dedicato e ne attende l'esito.
///
/// Serve ai chiamanti che potrebbero girare sul runtime tokio di Tauri, dove
/// `reqwest::blocking` andrebbe in panic.
pub fn dispatch<T, F>(f: F) -> Result<T, String>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
{
    std::thread::spawn(f)
        .join()
        .map_err(|_| "Il thread di invio diagnostica e' terminato in modo anomalo".to_string())
}

/// Esegue l'escape dei caratteri riservati dal `parse_mode: HTML` di Telegram.
pub fn escape_html(raw: &str) -> String {
    raw.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// Tronca `s` ad al massimo `max_bytes`, arretrando fino al confine di
/// carattere UTF-8 piu' vicino.
///
/// `&s[..n]` va in panic se `n` cade a meta' di un carattere multibyte, cosa
/// frequente con il testo italiano (`à`, `è`, `€`).
pub fn truncate_at_char_boundary(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes {
        return s;
    }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    &s[..end]
}

/// Applica escape e troncamento sicuro, aggiungendo un marcatore se il testo
/// e' stato tagliato.
pub fn prepare_payload(raw: &str) -> String {
    let escaped = escape_html(raw);
    if escaped.len() <= MAX_PAYLOAD_BYTES {
        return escaped;
    }
    format!(
        "{}... [Troncato]",
        truncate_at_char_boundary(&escaped, MAX_PAYLOAD_BYTES)
    )
}

fn client() -> Result<reqwest::blocking::Client, String> {
    reqwest::blocking::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| format!("Impossibile creare il client HTTP: {e}"))
}

/// Invia un messaggio di testo. Bloccante: vedi le note sul runtime.
pub fn send_message(token: &str, chat_id: &str, text: &str) -> Result<(), String> {
    let response = client()?
        .post(format!("{API_BASE}/bot{token}/sendMessage"))
        .json(&serde_json::json!({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        }))
        .send()
        .map_err(|e| format!("Invio del messaggio fallito: {e}"))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Telegram ha risposto con stato {}",
            response.status()
        ))
    }
}

/// Invia un file come documento. Bloccante: vedi le note sul runtime.
pub fn send_document(
    token: &str,
    chat_id: &str,
    path: &Path,
    caption: &str,
) -> Result<(), String> {
    if !path.exists() {
        return Err(format!("Il file '{}' non esiste", path.display()));
    }

    let form = reqwest::blocking::multipart::Form::new()
        .text("chat_id", chat_id.to_string())
        .text("caption", caption.to_string())
        .file("document", path)
        .map_err(|e| format!("Impossibile leggere il file da inviare: {e}"))?;

    let response = client()?
        .post(format!("{API_BASE}/bot{token}/sendDocument"))
        .multipart(form)
        .send()
        .map_err(|e| format!("Invio del documento fallito: {e}"))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Telegram ha risposto con stato {}",
            response.status()
        ))
    }
}

/// Percorso del file di log applicativo, se presente.
pub fn app_log_path(app: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::Manager;

    let log_dir = app.path().app_log_dir().ok()?;
    ["app.log", "current.log"]
        .iter()
        .map(|name| log_dir.join(name))
        .find(|path| path.exists())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn troncamento_non_spezza_i_caratteri_multibyte() {
        // 'è' occupa 2 byte: troncare a 1 byte spezzerebbe il carattere.
        let s = "aè";
        assert_eq!(truncate_at_char_boundary(s, 2), "a");
        assert_eq!(truncate_at_char_boundary(s, 3), "aè");
    }

    #[test]
    fn troncamento_lascia_intatte_le_stringhe_corte() {
        assert_eq!(truncate_at_char_boundary("breve", 100), "breve");
    }

    #[test]
    fn troncamento_gestisce_una_stringa_tutta_multibyte() {
        // Nessun confine valido prima di max_bytes: deve restituire "" senza panic.
        assert_eq!(truncate_at_char_boundary("€", 1), "");
    }

    #[test]
    fn payload_lungo_con_accenti_non_va_in_panic() {
        let raw = "è".repeat(5000);
        let payload = prepare_payload(&raw);
        assert!(payload.ends_with("... [Troncato]"));
        assert!(payload.is_char_boundary(payload.len()));
    }

    #[test]
    fn escape_html_neutralizza_i_caratteri_riservati() {
        assert_eq!(escape_html("<b>a & b</b>"), "&lt;b&gt;a &amp; b&lt;/b&gt;");
    }

    #[test]
    fn escape_html_converte_la_e_commerciale_per_prima() {
        // Se '&' non fosse sostituito per primo, "&lt;" verrebbe ri-escapato.
        assert_eq!(escape_html("&<"), "&amp;&lt;");
    }
}
