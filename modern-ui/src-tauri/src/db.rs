//! Schema del database di FreschiTech.
//!
//! L'infrastruttura (apertura, `integrity_check`, esecuzione delle migrazioni,
//! backup) sta in `tecno_core`: qui c'e' solo il dominio.
//!
//! COSA E' CAMBIATO CON IL PASSAGGIO A tecno-core
//! ---------------------------------------------
//! Prima le migrazioni erano dodici `let _ = conn.execute("ALTER TABLE ...")`
//! che giravano a **ogni avvio**. Funzionavano scartando l'errore "duplicate
//! column", ma nascondevano allo stesso modo anche i fallimenti reali: una
//! migrazione non riuscita restava invisibile fino al primo salvataggio andato
//! storto. Anche le due varianti "sicure" — quelle con il controllo su
//! `pragma_table_info` seguito da `let _ = ALTER TABLE` — ingoiavano l'errore
//! a valle del controllo.
//!
//! Ora sono raccolte in [`MIGRAZIONI`], girano una volta sola dentro una
//! transazione, e usano `tecno_core::db::add_column_if_missing`, che propaga
//! gli errori veri.
//!
//! COME SI AGGIUNGE UNA MIGRAZIONE
//! -------------------------------
//!   1. si scrive una `fn` che modifica lo schema;
//!   2. la si aggiunge a [`MIGRAZIONI`] con la versione successiva;
//!   3. si porta `versione` di [`SCHEMA`] allo stesso numero.
//!
//! Una migrazione gia' applicata non viene mai ritentata: il conto lo tiene
//! `PRAGMA user_version`.

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tecno_core::db::add_column_if_missing;
use tecno_core::{Migrazione, Schema};

/// Descrizione completa dello schema, passata a `tecno_core::avvia`.
pub static SCHEMA: Schema = Schema {
    versione: 1,
    crea_tabelle,
    migrazioni: MIGRAZIONI,
    crea_indici: Some(crea_indici),
    valori_predefiniti: None,
};

/// Percorso storico del database di FreschiTech.
///
/// NON VA CAMBIATO
/// ---------------
/// Le installazioni esistenti hanno il file qui, dove lo metteva
/// `ProjectDirs::from("com", "freschitech", "app")`. Spostarlo sul percorso
/// predefinito di `tecno-core` (la cartella Documenti) farebbe ripartire
/// l'applicazione su un database vuoto: i dati resterebbero dov'erano,
/// invisibili, e sembrerebbero persi.
///
/// Chi vuole spostarlo puo' farlo dall'interfaccia (`set_db_path`), che ha la
/// precedenza su questo percorso.
pub fn percorso_storico() -> PathBuf {
    // Niente `expect`: `ProjectDirs::from` puo' restituire `None` in ambienti
    // sandbox o con le variabili d'ambiente assenti, e prima l'applicazione
    // andava in panic all'avvio senza spiegazioni.
    if let Some(dirs) = directories::ProjectDirs::from("com", "freschitech", "app") {
        let config_dir = dirs.config_dir();
        match std::fs::create_dir_all(config_dir) {
            Ok(()) => return config_dir.join("freschitech.db"),
            Err(e) => log::warn!(
                "Impossibile creare la cartella di configurazione: {}. \
                 Si ripiega sulla cartella Documenti.",
                e
            ),
        }
    }

    tecno_core::paths::documenti()
        .join("FreschiTech")
        .join("freschitech.db")
}

/// Migrazioni versionate, in ordine crescente.
static MIGRAZIONI: &[Migrazione] = &[Migrazione {
    versione: 1,
    nome: "colonne aggiunte dopo il primo rilascio",
    esegui: migra_a_v1,
}];

/// Migrazione 1 - allineamento dei database antecedenti al versionamento.
///
/// Raccoglie tutti gli `ALTER TABLE` che prima giravano a ogni avvio. Su un
/// database creato da zero le colonne esistono gia' grazie al DDL e questa
/// migrazione e' un no-op; su un database esistente aggiunge solo cio' che
/// manca.
fn migra_a_v1(conn: &Connection) -> Result<()> {
    add_column_if_missing(conn, "clients", "pec", "TEXT")?;

    for (colonna, definizione) in [
        ("address", "TEXT"),
        ("distance", "INTEGER DEFAULT 0"),
        ("km_cost", "REAL DEFAULT 0.50"),
    ] {
        add_column_if_missing(conn, "projects", colonna, definizione)?;
    }

    for (colonna, definizione) in [
        ("is_travel", "INTEGER DEFAULT 0"),
        ("vehicle", "TEXT"),
        ("travel_cost", "REAL DEFAULT 0.0"),
    ] {
        add_column_if_missing(conn, "labor", colonna, definizione)?;
    }

    for (colonna, definizione) in [
        ("accepted_budget", "REAL DEFAULT 0.0"),
        ("install_fee_percent", "REAL DEFAULT 0.06"),
    ] {
        add_column_if_missing(conn, "cost_centers", colonna, definizione)?;
    }

    add_column_if_missing(conn, "catalog_materials", "markup", "REAL DEFAULT 0.0")?;

    Ok(())
}

/// DDL idempotente. Gira a ogni avvio.
fn crea_tabelle(conn: &Connection) -> Result<()> {
    // Clienti
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

    // Commesse
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

    // Centri di costo
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

    // Materiali
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

    // Manodopera
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

    // Spese
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

    // Dipendenti
    conn.execute(
        "CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            default_hourly_cost REAL DEFAULT 30.0
        )",
        [],
    )?;

    // Impostazioni globali
    conn.execute(
        "CREATE TABLE IF NOT EXISTS global_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Catalogo materiali (listini)
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

    // Preventivi
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

    // Voci di preventivo
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

/// Indici a supporto delle query piu' frequenti.
///
/// Girano a ogni avvio e NON dentro una migrazione versionata: un indice che
/// oggi non puo' essere creato deve poterlo essere al riavvio successivo.
///
/// Gli indici su `project_id` sono nuovi: ogni schermata di dettaglio commessa
/// fa quattro letture filtrate per quella colonna (materiali, manodopera,
/// spese, centri di costo) e senza indice erano quattro scansioni complete.
fn crea_indici(conn: &Connection) -> Result<()> {
    for (nome, tabella, colonna) in [
        ("idx_projects_client", "projects", "client_id"),
        ("idx_cost_centers_project", "cost_centers", "project_id"),
        ("idx_materials_project", "materials", "project_id"),
        ("idx_labor_project", "labor", "project_id"),
        ("idx_expenses_project", "expenses", "project_id"),
        ("idx_catalog_code", "catalog_materials", "code"),
        ("idx_catalog_desc", "catalog_materials", "description"),
        ("idx_catalog_supplier", "catalog_materials", "supplier"),
        ("idx_quote_client", "quotes", "client_id"),
        ("idx_quote_item_quote", "quote_items", "quote_id"),
    ] {
        // Identificatori letterali definiti qui sopra, mai input utente.
        conn.execute(
            &format!(
                "CREATE INDEX IF NOT EXISTS {} ON {}({})",
                nome, tabella, colonna
            ),
            [],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Database in memoria con lo stesso schema di produzione.
    fn db_memoria() -> Connection {
        let conn = Connection::open_in_memory().expect("db in memoria");
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        crea_tabelle(&conn).expect("creazione tabelle");
        conn
    }

    fn ha_colonna(conn: &Connection, tabella: &str, colonna: &str) -> bool {
        let n: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info(?1) WHERE name = ?2",
                rusqlite::params![tabella, colonna],
                |row| row.get(0),
            )
            .unwrap();
        n == 1
    }

    #[test]
    fn il_ddl_e_idempotente() {
        let conn = db_memoria();
        crea_tabelle(&conn).expect("una seconda esecuzione non deve fallire");
        crea_indici(&conn).expect("indici");
        crea_indici(&conn).expect("indici, seconda volta");
    }

    #[test]
    fn la_migrazione_e_un_no_op_su_uno_schema_nuovo() {
        let conn = db_memoria();
        migra_a_v1(&conn).expect("le colonne ci sono gia'");
        assert!(ha_colonna(&conn, "labor", "travel_cost"));
        assert!(ha_colonna(&conn, "cost_centers", "install_fee_percent"));
    }

    #[test]
    fn la_migrazione_recupera_un_database_vecchio() {
        // Schema com'era prima delle colonne aggiunte dopo il primo rilascio:
        // e' il caso che gli `ALTER TABLE` a ogni avvio coprivano e che non
        // deve smettere di funzionare.
        let conn = Connection::open_in_memory().unwrap();
        for ddl in [
            "CREATE TABLE clients (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
            "CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL)",
            "CREATE TABLE labor (id INTEGER PRIMARY KEY, operator TEXT NOT NULL)",
            "CREATE TABLE cost_centers (id INTEGER PRIMARY KEY, model TEXT NOT NULL)",
            "CREATE TABLE catalog_materials (id INTEGER PRIMARY KEY, description TEXT NOT NULL)",
        ] {
            conn.execute(ddl, []).unwrap();
        }

        migra_a_v1(&conn).expect("migrazione");

        assert!(ha_colonna(&conn, "clients", "pec"));
        for colonna in ["address", "distance", "km_cost"] {
            assert!(ha_colonna(&conn, "projects", colonna), "projects.{}", colonna);
        }
        for colonna in ["is_travel", "vehicle", "travel_cost"] {
            assert!(ha_colonna(&conn, "labor", colonna), "labor.{}", colonna);
        }
        for colonna in ["accepted_budget", "install_fee_percent"] {
            assert!(
                ha_colonna(&conn, "cost_centers", colonna),
                "cost_centers.{}",
                colonna
            );
        }
        assert!(ha_colonna(&conn, "catalog_materials", "markup"));
    }

    #[test]
    fn la_versione_dichiarata_copre_tutte_le_migrazioni() {
        // Una migrazione con versione superiore a quella dello schema non
        // verrebbe mai applicata, in silenzio.
        let massima = MIGRAZIONI.iter().map(|m| m.versione).max().unwrap_or(0);
        assert!(
            SCHEMA.versione >= massima,
            "SCHEMA.versione ({}) e' inferiore alla migrazione piu' alta ({})",
            SCHEMA.versione,
            massima
        );
    }
}
