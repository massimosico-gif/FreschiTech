use directories::ProjectDirs;
use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;

/// Versione dello schema attesa dal codice corrente.
///
/// Viene confrontata con `PRAGMA user_version`, che SQLite memorizza
/// nell'header del file: le migrazioni gia' applicate non vengono ritentate a
/// ogni avvio.
const SCHEMA_VERSION: i32 = 1;

/// Motivo per cui il database non ha potuto essere inizializzato.
///
/// La corruzione e' distinta dagli altri errori perche' richiede una
/// gestione diversa: il file puo' contenere dati ancora recuperabili, quindi
/// all'utente va offerta la possibilita' di salvarne una copia prima di
/// chiudere.
#[derive(Debug)]
pub enum InitError {
    /// `PRAGMA integrity_check` ha segnalato un problema. Contiene il dettaglio.
    Corrupted(String),
    /// Errore SQL nella creazione dello schema o nelle migrazioni.
    Sql(rusqlite::Error),
}

impl std::fmt::Display for InitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Corrupted(detail) => write!(f, "database danneggiato: {detail}"),
            Self::Sql(err) => write!(f, "errore SQL: {err}"),
        }
    }
}

impl std::error::Error for InitError {}

impl From<rusqlite::Error> for InitError {
    fn from(err: rusqlite::Error) -> Self {
        Self::Sql(err)
    }
}

pub fn get_db_path() -> PathBuf {
    let proj_dirs = ProjectDirs::from("com", "freschitech", "app")
        .expect("Could not determine config directory");
    let config_dir = proj_dirs.config_dir();

    if !config_dir.exists() {
        fs::create_dir_all(config_dir).expect("Could not create config directory");
    }

    config_dir.join("freschitech.db")
}

pub fn get_connection() -> Result<Connection> {
    let path = get_db_path();
    let conn = Connection::open(path)?;

    // I vincoli di chiave esterna sono attivi anche senza questa riga, perche'
    // `rusqlite` con feature `bundled` compila SQLite con
    // -DSQLITE_DEFAULT_FOREIGN_KEYS=1. Lo impostiamo comunque in modo
    // esplicito: le ON DELETE CASCADE dello schema sono parte della logica
    // applicativa e non devono dipendere da un flag di compilazione.
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;

    Ok(conn)
}

/// Aggiunge una colonna solo se non esiste gia'.
///
/// Sostituisce il pattern `let _ = conn.execute("ALTER TABLE ...")`, che
/// funzionava scartando l'errore "duplicate column" ma nascondeva allo stesso
/// modo anche i fallimenti reali.
fn add_column_if_missing(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<()> {
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pragma_table_info(?1) WHERE name = ?2",
        rusqlite::params![table, column],
        |row| row.get(0),
    )?;

    if exists == 0 {
        // `table`, `column` e `definition` sono letterali definiti in questo
        // modulo, mai input utente: l'interpolazione e' sicura (ALTER TABLE non
        // accetta parametri legati per gli identificatori).
        conn.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            [],
        )?;
        log::info!("Migrazione schema: aggiunta colonna {table}.{column}");
    }
    Ok(())
}

/// Crea le tabelle se mancanti. Idempotente: gira a ogni avvio.
fn create_tables(conn: &Connection) -> Result<()> {
    // Tabella Clienti
    conn.execute(
        "CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            street TEXT,
            city TEXT,
            zip_code TEXT,
            province TEXT,
            vat_id TEXT,
            tax_code TEXT,
            email TEXT,
            pec TEXT,
            phone TEXT,
            notes TEXT,
            distance INTEGER DEFAULT 0
        )",
        [],
    )?;

    // Tabella Commesse (Projects)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'active',
            start_date TEXT,
            end_date TEXT,
            budget REAL DEFAULT 0.0,
            distance INTEGER DEFAULT 0,
            km_cost REAL DEFAULT 0.50,
            address TEXT,
            FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabella Centri di Costo (Cost Centers)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cost_centers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            brand TEXT,
            model TEXT NOT NULL,
            category TEXT,
            base_cost REAL DEFAULT 0.0,
            markup REAL DEFAULT 0.0,
            shipping REAL DEFAULT 0.0,
            install_fee REAL DEFAULT 0.0,
            install_fee_percent REAL DEFAULT 0.06,
            accepted_budget REAL DEFAULT 0.0,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabella Materiali.
    //
    // La ON DELETE SET NULL e' una rete di sicurezza a livello di database: se
    // un centro di costo sparisse per altre vie, le righe resterebbero valide
    // scollegate. Il flusso applicativo e' pero' un altro: `delete_cost_center`
    // elimina esplicitamente materiali, manodopera e spese collegati, perche'
    // eliminare un centro di costo significa eliminarne le voci.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            cost_center_id INTEGER,
            phase TEXT,
            date TEXT,
            code TEXT,
            description TEXT NOT NULL,
            supplier TEXT,
            quantity REAL DEFAULT 1.0,
            unit TEXT DEFAULT 'pz',
            unit_price REAL DEFAULT 0.0,
            markup REAL DEFAULT 0.25,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (cost_center_id) REFERENCES cost_centers (id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Tabella Manodopera (Labor). Vedi la nota su materials per la SET NULL.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS labor (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            cost_center_id INTEGER,
            phase TEXT,
            date TEXT,
            operator TEXT NOT NULL,
            description TEXT,
            hours REAL DEFAULT 0.0,
            hourly_cost REAL DEFAULT 0.0,
            markup REAL DEFAULT 0.0,
            is_travel INTEGER DEFAULT 0,
            vehicle TEXT,
            travel_cost REAL DEFAULT 0.0,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (cost_center_id) REFERENCES cost_centers (id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Tabella Spese (Expenses). Vedi la nota su materials per la SET NULL.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            cost_center_id INTEGER,
            phase TEXT,
            date TEXT,
            description TEXT NOT NULL,
            amount REAL DEFAULT 0.0,
            markup REAL DEFAULT 0.0,
            supplier TEXT,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
            FOREIGN KEY (cost_center_id) REFERENCES cost_centers (id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Tabella Dipendenti (Employees/Operators)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            default_hourly_cost REAL DEFAULT 30.0
        )",
        [],
    )?;

    // Tabella Impostazioni Globali
    conn.execute(
        "CREATE TABLE IF NOT EXISTS global_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Tabella Catalogo Materiali (Listini)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS catalog_materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT,
            description TEXT NOT NULL,
            unit TEXT DEFAULT 'pz',
            unit_price REAL DEFAULT 0.0,
            supplier TEXT,
            markup REAL DEFAULT 0.0
        )",
        [],
    )?;

    // Tabella Preventivi
    conn.execute(
        "CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT NOT NULL,
            FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabella Voci Preventivo
    conn.execute(
        "CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL,
            code TEXT,
            description TEXT NOT NULL,
            unit TEXT DEFAULT 'pz',
            unit_price REAL DEFAULT 0.0,
            quantity REAL DEFAULT 1.0,
            markup REAL DEFAULT 0.0,
            FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(())
}

/// Indici a supporto delle query piu' frequenti. `IF NOT EXISTS` li rende
/// idempotenti, quindi girano a ogni avvio insieme al DDL.
fn create_indexes(conn: &Connection) -> Result<()> {
    // Ricerca nel listino.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_catalog_code ON catalog_materials (code)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_catalog_desc ON catalog_materials (description)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_catalog_supplier ON catalog_materials (supplier)",
        [],
    )?;

    // Preventivi.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_quote_client ON quotes (client_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_quote_item_quote ON quote_items (quote_id)",
        [],
    )?;

    // `project_id` e' la colonna con cui si filtrano materiali, manodopera e
    // spese a ogni apertura di commessa, ed e' il lato figlio delle
    // ON DELETE CASCADE: senza indice ogni eliminazione di commessa richiede
    // una scansione completa di queste tabelle.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_materials_project ON materials (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_labor_project ON labor (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses (project_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cost_centers_project ON cost_centers (project_id)",
        [],
    )?;

    // Le JOIN con cost_centers e le UPDATE massive per centro di costo.
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_materials_cc ON materials (cost_center_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_labor_cc ON labor (cost_center_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_expenses_cc ON expenses (cost_center_id)",
        [],
    )?;

    Ok(())
}

/// Migrazione 1: colonne aggiunte dopo il rilascio iniziale.
///
/// Sui database creati da zero le colonne esistono gia' grazie al DDL, quindi
/// e' un no-op; sui database esistenti (che partono da `user_version = 0`)
/// vengono aggiunte una sola volta.
fn migrate_to_v1(conn: &Connection) -> Result<()> {
    add_column_if_missing(conn, "projects", "address", "TEXT")?;
    add_column_if_missing(conn, "projects", "distance", "INTEGER DEFAULT 0")?;
    add_column_if_missing(conn, "projects", "km_cost", "REAL DEFAULT 0.50")?;
    add_column_if_missing(conn, "clients", "pec", "TEXT")?;
    add_column_if_missing(conn, "labor", "is_travel", "INTEGER DEFAULT 0")?;
    add_column_if_missing(conn, "labor", "vehicle", "TEXT")?;
    add_column_if_missing(conn, "labor", "travel_cost", "REAL DEFAULT 0.0")?;
    add_column_if_missing(conn, "cost_centers", "accepted_budget", "REAL DEFAULT 0.0")?;
    add_column_if_missing(
        conn,
        "cost_centers",
        "install_fee_percent",
        "REAL DEFAULT 0.06",
    )?;
    add_column_if_missing(conn, "catalog_materials", "markup", "REAL DEFAULT 0.0")?;
    Ok(())
}

/// Applica le migrazioni mancanti e aggiorna `PRAGMA user_version`.
fn run_migrations(conn: &Connection) -> Result<()> {
    let mut version: i32 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;

    if version >= SCHEMA_VERSION {
        return Ok(());
    }

    if version < 1 {
        migrate_to_v1(conn)?;
        version = 1;
    }

    // `PRAGMA user_version` non accetta parametri legati; `version` e' un i32
    // che deriva dalle costanti qui sopra, non da input esterno.
    conn.execute_batch(&format!("PRAGMA user_version = {version};"))?;
    log::info!("Schema del database allineato alla versione {version}");

    Ok(())
}

pub fn init_db() -> std::result::Result<(), InitError> {
    let conn = get_connection()?;

    // Controllo di integrita' del database SQLite. In caso di problema
    // restituiamo l'errore invece di andare in panic: chiudere l'applicazione
    // senza spiegazioni lascerebbe l'utente senza alcun modo di recuperare i
    // dati ancora leggibili nel file.
    if let Ok(integrity) = conn.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
    {
        if integrity != "ok" {
            log::error!("DATABASE_CORRUPT: PRAGMA integrity_check: {}", integrity);
            return Err(InitError::Corrupted(integrity));
        }
    }

    create_tables(&conn)?;
    run_migrations(&conn)?;
    create_indexes(&conn)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Prepara un database in memoria con lo stesso schema di produzione.
    fn memory_db() -> Connection {
        let conn = Connection::open_in_memory().expect("db in memoria");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        create_tables(&conn).expect("creazione tabelle");
        conn
    }

    #[test]
    fn add_column_if_missing_e_idempotente() {
        let conn = memory_db();
        // La colonna esiste gia' nel DDL: nessun errore, nessuna modifica.
        add_column_if_missing(&conn, "projects", "address", "TEXT").unwrap();
        add_column_if_missing(&conn, "projects", "address", "TEXT").unwrap();
    }

    #[test]
    fn add_column_if_missing_aggiunge_una_colonna_assente() {
        let conn = memory_db();
        conn.execute("CREATE TABLE t (id INTEGER)", []).unwrap();

        add_column_if_missing(&conn, "t", "nuova", "TEXT DEFAULT 'x'").unwrap();

        let exists: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('t') WHERE name = 'nuova'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(exists, 1);
    }

    #[test]
    fn le_migrazioni_stampano_la_versione_e_non_si_ripetono() {
        let conn = memory_db();
        assert_eq!(
            conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i32>(0))
                .unwrap(),
            0
        );

        run_migrations(&conn).unwrap();
        assert_eq!(
            conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i32>(0))
                .unwrap(),
            SCHEMA_VERSION
        );

        // Una seconda esecuzione non deve fallire ne' cambiare la versione.
        run_migrations(&conn).unwrap();
        assert_eq!(
            conn.query_row("PRAGMA user_version", [], |r| r.get::<_, i32>(0))
                .unwrap(),
            SCHEMA_VERSION
        );
    }

    #[test]
    fn migrazione_v1_recupera_un_database_legacy() {
        // Simula un database antecedente alle colonne trasferta.
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE labor (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                operator TEXT NOT NULL
            )",
            [],
        )
        .unwrap();
        conn.execute(
            "CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)",
            [],
        )
        .unwrap();
        conn.execute("CREATE TABLE clients (id INTEGER PRIMARY KEY AUTOINCREMENT)", [])
            .unwrap();
        conn.execute(
            "CREATE TABLE cost_centers (id INTEGER PRIMARY KEY AUTOINCREMENT)",
            [],
        )
        .unwrap();
        conn.execute(
            "CREATE TABLE catalog_materials (id INTEGER PRIMARY KEY AUTOINCREMENT)",
            [],
        )
        .unwrap();

        migrate_to_v1(&conn).unwrap();

        for column in ["is_travel", "vehicle", "travel_cost"] {
            let exists: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('labor') WHERE name = ?1",
                    [column],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(exists, 1, "colonna labor.{column} mancante");
        }
    }

    #[test]
    fn le_chiavi_esterne_sono_applicate() {
        let conn = memory_db();
        // Nessuna commessa con id 999: l'inserimento deve essere rifiutato.
        let result = conn.execute(
            "INSERT INTO materials (project_id, description) VALUES (999, 'x')",
            [],
        );
        assert!(result.is_err(), "il vincolo di chiave esterna non e' attivo");
    }

    #[test]
    fn eliminare_una_commessa_cancella_a_cascata_i_materiali() {
        let conn = memory_db();
        conn.execute("INSERT INTO clients (id, type, name) VALUES (1, 'company', 'ACME')", [])
            .unwrap();
        conn.execute(
            "INSERT INTO projects (id, client_id, name) VALUES (1, 1, 'Commessa')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO materials (project_id, description) VALUES (1, 'Cavo')",
            [],
        )
        .unwrap();

        conn.execute("DELETE FROM projects WHERE id = 1", []).unwrap();

        let rimasti: i64 = conn
            .query_row("SELECT COUNT(*) FROM materials", [], |row| row.get(0))
            .unwrap();
        assert_eq!(rimasti, 0);
    }
}
