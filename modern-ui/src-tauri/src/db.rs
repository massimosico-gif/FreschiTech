use rusqlite::{Connection, Result};
use std::fs;
use directories::ProjectDirs;
use std::path::PathBuf;

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
    Connection::open(path)
}

pub fn init_db() -> Result<()> {
    let conn = get_connection()?;
    
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
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Tabella Materiali
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

    // Tabella Manodopera (Labor)
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

    // Migrazione: aggiunta colonne se non esistono
    let _ = conn.execute("ALTER TABLE labor ADD COLUMN is_travel INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE labor ADD COLUMN vehicle TEXT", []);
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN distance INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE projects ADD COLUMN km_cost REAL DEFAULT 0.50", []);
    let _ = conn.execute("ALTER TABLE labor ADD COLUMN travel_cost REAL DEFAULT 0.0", []);

    // Tabella Spese (Expenses)
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

    Ok(())
}
