//! Backup automatico del database.
//!
//! All'avvio, se l'ultimo backup ha piu' di 24 ore, ne viene creato uno nuovo
//! e vengono conservate le [`KEEP_COUNT`] copie piu' recenti.
//!
//! # Perche' non `fs::copy`
//!
//! Copiare il file a livello di filesystem mentre SQLite ci sta scrivendo puo'
//! produrre una copia incoerente. Usiamo l'API di backup online di SQLite, che
//! garantisce uno snapshot consistente anche a database aperto.

use rusqlite::{Connection, DatabaseName};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

/// Intervallo minimo fra due backup automatici.
const MIN_INTERVAL: Duration = Duration::from_secs(24 * 60 * 60);

/// Quante copie conservare. Le piu' vecchie vengono eliminate.
pub const KEEP_COUNT: usize = 7;

/// Prefisso dei file di backup. Serve anche a delimitare cosa la rotazione
/// puo' eliminare: qualsiasi altro file nella cartella viene ignorato.
const FILE_PREFIX: &str = "freschitech_backup_";
const FILE_EXTENSION: &str = "db";

/// Cartella dei backup, accanto al database.
pub fn backup_dir() -> PathBuf {
    crate::db::get_db_path()
        .parent()
        .map(|parent| parent.join("backup"))
        .unwrap_or_else(|| PathBuf::from("backup"))
}

/// Elenco dei backup esistenti, dal piu' recente al piu' vecchio.
///
/// L'ordinamento e' per nome: il timestamp nel formato `AAAA-MM-GG_hhmmss`
/// ordina lessicograficamente come ordina cronologicamente.
pub fn list_backups(dir: &Path) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    let mut files: Vec<PathBuf> = entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| is_backup_file(path))
        .collect();

    files.sort();
    files.reverse();
    files
}

/// Riconosce un file prodotto da questo modulo.
fn is_backup_file(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    let has_extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case(FILE_EXTENSION));

    let has_prefix = path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with(FILE_PREFIX));

    has_extension && has_prefix
}

/// Da quanto tempo esiste il backup piu' recente, se ce n'e' uno.
fn age_of_latest(dir: &Path) -> Option<Duration> {
    let latest = list_backups(dir).into_iter().next()?;
    let modified = fs::metadata(&latest).ok()?.modified().ok()?;
    SystemTime::now().duration_since(modified).ok()
}

/// Timestamp locale in formato ordinabile, senza aggiungere dipendenze:
/// SQLite sa gia' formattare le date.
fn timestamp(conn: &Connection) -> String {
    conn.query_row(
        "SELECT strftime('%Y-%m-%d_%H%M%S', 'now', 'localtime')",
        [],
        |row| row.get::<_, String>(0),
    )
    .unwrap_or_else(|_| "sconosciuto".to_string())
}

/// Crea un backup e restituisce il percorso del file scritto.
pub fn create_backup() -> Result<PathBuf, String> {
    let dir = backup_dir();
    fs::create_dir_all(&dir)
        .map_err(|e| format!("Impossibile creare la cartella dei backup: {e}"))?;

    let conn = crate::db::get_connection()
        .map_err(|e| format!("Impossibile aprire il database: {e}"))?;

    let destination = dir.join(format!(
        "{FILE_PREFIX}{}.{FILE_EXTENSION}",
        timestamp(&conn)
    ));

    conn.backup(DatabaseName::Main, &destination, None)
        .map_err(|e| format!("Backup non riuscito: {e}"))?;

    Ok(destination)
}

/// Elimina i backup oltre i piu' recenti `keep`.
///
/// Agisce solo sui file che corrispondono a [`is_backup_file`]: qualsiasi
/// altra cosa nella cartella resta intatta.
pub fn prune(dir: &Path, keep: usize) {
    for stale in list_backups(dir).into_iter().skip(keep) {
        match fs::remove_file(&stale) {
            Ok(()) => log::info!("Backup ruotato: rimosso {}", file_label(&stale)),
            Err(e) => log::warn!("Impossibile rimuovere {}: {e}", file_label(&stale)),
        }
    }
}

/// Nome del file senza percorso: i percorsi assoluti contengono il nome utente.
fn file_label(path: &Path) -> String {
    path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("(sconosciuto)")
        .to_string()
}

/// Crea un backup se e' passato abbastanza tempo dall'ultimo, poi ruota.
///
/// Restituisce il percorso del backup creato, oppure `None` se non era ancora
/// il momento. Gli errori vengono registrati ma non propagati: un backup non
/// riuscito non deve impedire l'avvio dell'applicazione.
pub fn run_if_due() -> Option<PathBuf> {
    let dir = backup_dir();

    if let Some(age) = age_of_latest(&dir) {
        if age < MIN_INTERVAL {
            return None;
        }
    }

    match create_backup() {
        Ok(path) => {
            log::info!("Backup automatico creato: {}", file_label(&path));
            prune(&dir, KEEP_COUNT);
            Some(path)
        }
        Err(e) => {
            // `warn` e non `error`: l'errore e' segnalato ma non fa scattare
            // l'invio del file di log, che sarebbe sproporzionato.
            log::warn!("Backup automatico non riuscito: {e}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    /// Crea una cartella temporanea isolata per il test.
    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("freschitech_test_{name}"));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn touch(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        File::create(&path).unwrap();
        path
    }

    #[test]
    fn riconosce_solo_i_propri_file() {
        let dir = temp_dir("riconosce");

        let valido = touch(&dir, "freschitech_backup_2026-08-24_120000.db");
        let altro_db = touch(&dir, "freschitech.db");
        let testo = touch(&dir, "freschitech_backup_2026-08-24_120000.txt");

        assert!(is_backup_file(&valido));
        assert!(!is_backup_file(&altro_db), "il database attivo non e' un backup");
        assert!(!is_backup_file(&testo), "l'estensione deve essere .db");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn elenca_i_backup_dal_piu_recente() {
        let dir = temp_dir("elenco");

        touch(&dir, "freschitech_backup_2026-08-22_090000.db");
        touch(&dir, "freschitech_backup_2026-08-24_090000.db");
        touch(&dir, "freschitech_backup_2026-08-23_090000.db");

        let elenco = list_backups(&dir);
        let nomi: Vec<String> = elenco.iter().map(|p| file_label(p)).collect();

        assert_eq!(
            nomi,
            vec![
                "freschitech_backup_2026-08-24_090000.db",
                "freschitech_backup_2026-08-23_090000.db",
                "freschitech_backup_2026-08-22_090000.db",
            ]
        );

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn l_elenco_e_vuoto_se_la_cartella_non_esiste() {
        let inesistente = std::env::temp_dir().join("freschitech_test_inesistente_xyz");
        assert!(list_backups(&inesistente).is_empty());
    }

    #[test]
    fn la_rotazione_conserva_solo_i_piu_recenti() {
        let dir = temp_dir("rotazione");

        for giorno in 18..=24 {
            touch(&dir, &format!("freschitech_backup_2026-08-{giorno}_090000.db"));
        }
        assert_eq!(list_backups(&dir).len(), 7);

        prune(&dir, 3);

        let rimasti: Vec<String> = list_backups(&dir).iter().map(|p| file_label(p)).collect();
        assert_eq!(
            rimasti,
            vec![
                "freschitech_backup_2026-08-24_090000.db",
                "freschitech_backup_2026-08-23_090000.db",
                "freschitech_backup_2026-08-22_090000.db",
            ]
        );

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn la_rotazione_non_tocca_i_file_estranei() {
        let dir = temp_dir("estranei");

        touch(&dir, "freschitech_backup_2026-08-24_090000.db");
        touch(&dir, "freschitech_backup_2026-08-23_090000.db");
        let da_preservare = touch(&dir, "note_importanti.txt");
        let db_attivo = touch(&dir, "freschitech.db");

        prune(&dir, 0);

        assert!(list_backups(&dir).is_empty(), "i backup dovevano essere rimossi");
        assert!(da_preservare.exists(), "un file estraneo non va mai eliminato");
        assert!(db_attivo.exists(), "il database attivo non va mai eliminato");

        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn il_backup_online_produce_un_database_leggibile() {
        let dir = temp_dir("online");
        let destination = dir.join("copia.db");

        // Database di partenza con un dato riconoscibile.
        let source = Connection::open(dir.join("origine.db")).unwrap();
        source
            .execute("CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT)", [])
            .unwrap();
        source
            .execute("INSERT INTO clients (name) VALUES ('ACME')", [])
            .unwrap();

        source
            .backup(DatabaseName::Main, &destination, None)
            .unwrap();

        // La copia deve contenere gli stessi dati ed essere integra.
        let copy = Connection::open(&destination).unwrap();
        let name: String = copy
            .query_row("SELECT name FROM clients", [], |row| row.get(0))
            .unwrap();
        assert_eq!(name, "ACME");

        let integrity: String = copy
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .unwrap();
        assert_eq!(integrity, "ok");

        drop(source);
        drop(copy);
        fs::remove_dir_all(&dir).unwrap();
    }
}
