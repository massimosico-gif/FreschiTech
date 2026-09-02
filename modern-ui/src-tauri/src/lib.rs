//! Punto di ingresso di FreschiTech.
//!
//! Database, backup, log, crash e diagnostica stanno in `tecno_core`: qui
//! restano l'identita' dell'applicazione, lo schema e i comandi di dominio.
//!
//! COSA E' STATO TOLTO DA QUI, E PERCHE'
//! ------------------------------------
//! Questo file conteneva ~320 righe di telemetria automatica verso Telegram.
//! Il panic hook e il dispatcher del logger, a ogni record di livello `Error`,
//! caricavano su una chat Telegram **il file di database completo** oltre al
//! log. Dentro ci sono anagrafiche clienti, partite IVA, indirizzi, commesse e
//! importi: dati che non devono lasciare il computer dell'utente senza che
//! l'utente lo decida in quel momento.
//!
//! Al suo posto c'e' `send_logs_to_developer` di `tecno_core`, che parte solo
//! su richiesta esplicita dal pannello di manutenzione e allega **solo il file
//! di log** — che per costruzione riporta esiti (`CMD [nome] ok` / `fallito`) e
//! mai i payload.
//!
//! Altri due problemi che quel codice aveva:
//!   * il panic hook chiamava `log::error!` **dentro l'hook**, e il dispatcher
//!     apriva connessioni al database e lanciava thread. Il record passa per il
//!     dispatcher del logger, che a sua volta puo' andare in panic: e' una
//!     ricorsione innescata proprio mentre il processo sta morendo. Il crash
//!     report di `tecno_core` si scrive con `std::fs`, che non dipende da nulla;
//!   * le credenziali arrivavano da `option_env!`, che cargo non rivaluta
//!     quando la variabile cambia: la prima build a variabile assente incide
//!     `None` nel binario e tutte le successive riusano l'artefatto in cache.
//!     `tecno-core-build` genera invece un file dentro `OUT_DIR`, che e' un
//!     input tracciato.
//!
//! AGGIUNGERE UN COMANDO RICHIEDE TRE MODIFICHE
//! -------------------------------------------
//!   1. la `#[tauri::command(async)]` in `commands.rs`;
//!   2. la riga in `generate_handler!` qui sotto;
//!   3. la chiamata `invoke()` nel componente React.

mod commands;
mod db;
mod segreti;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // PRIMA DI TUTTO IL RESTO: `tecno_core` ricava da qui la cartella di
    // configurazione, il percorso del database e i nomi dei backup.
    tecno_core::init(tecno_core::AppInfo {
        app_id: "freschitech",
        nome_visualizzato: "FreschiTech",
        cartella_dati: "FreschiTech/Database",
        file_database: "freschitech.db",
        // Le installazioni esistenti hanno il database in Application Support:
        // spostare il percorso predefinito le farebbe ripartire su un file
        // vuoto. Vedi `db::percorso_storico`.
        percorso_predefinito: Some(db::percorso_storico),
        segreti: tecno_core::Segreti {
            legacy_db_key: segreti::LEGACY_DB_KEY,
            telegram_token: segreti::TELEGRAM_TOKEN,
            telegram_chat_id: segreti::TELEGRAM_CHAT_ID,
        },
    });

    tecno_core::installa_hook_panic();

    tauri::Builder::default()
        // Il logger va registrato PRIMA di `setup`, altrimenti le diagnostiche
        // dell'inizializzazione del database non finirebbero nel file: sono
        // proprio le righe che servono quando l'applicazione non parte.
        //
        // Livello Info in release (prima era Debug anche li', con il rumore di
        // reqwest e hyper dentro il file inviato all'assistenza) e Debug in
        // sviluppo.
        .plugin(tecno_core::plugin_log())
        // Prima: `db::init_db().expect(...)`, con dentro un
        // `panic!("Database corrotto")`. Su un file danneggiato l'applicazione
        // spariva, e per giunta il panic hook apriva quello stesso database per
        // spedirlo. Ora `avvia` esegue `integrity_check`, offre all'utente di
        // salvare una copia del file prima di chiudere, applica le migrazioni
        // versionate e fa partire il backup giornaliero.
        .setup(|app| tecno_core::avvia(app.handle(), &db::SCHEMA))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // Comuni a tutte le applicazioni. Il percorso e' alla radice di
            // `tecno_core` e non al modulo interno: la macro generata da
            // `#[tauri::command]` e' esportata con `#[macro_export]` e vive
            // solo li'.
            tecno_core::log_frontend_error,
            tecno_core::get_current_db_path,
            tecno_core::set_db_path,
            tecno_core::select_db_file,
            tecno_core::backup_database,
            tecno_core::get_backup_info,
            tecno_core::send_logs_to_developer,
            // L'elenco dei comuni italiani: localizzazione, non dominio.
            tecno_core::search_municipalities,
            // Di FreschiTech.
            commands::get_stats,
            commands::get_clients,
            commands::save_client,
            commands::delete_client,
            commands::get_projects,
            commands::save_project,
            commands::delete_project,
            commands::get_cost_centers,
            commands::save_cost_center,
            commands::delete_cost_center,
            commands::get_materials,
            commands::save_material,
            commands::delete_material,
            commands::move_materials_cost_center,
            commands::update_materials_phase,
            commands::move_labor_cost_center,
            commands::update_labor_phase,
            commands::get_labor,
            commands::save_labor,
            commands::delete_labor,
            commands::get_expenses,
            commands::save_expense,
            commands::delete_expense,
            commands::get_employees,
            commands::save_employee,
            commands::delete_employee,
            commands::get_global_settings,
            commands::save_global_settings,
            commands::read_app_log,
            commands::export_database,
            commands::save_pdf_file,
            commands::get_catalog_summary,
            commands::clear_catalog_materials,
            commands::get_catalog_materials,
            commands::save_catalog_material,
            commands::delete_catalog_material,
            commands::search_catalog_materials,
            commands::import_catalog_materials,
            commands::get_catalog_preview,
            commands::search_suppliers,
            commands::get_quotes,
            commands::save_quote,
            commands::get_quote_details,
            commands::delete_quote,
            commands::parse_invoice_xml,
            commands::import_invoice_mappings,
        ])
        .run(tauri::generate_context!())
        .expect("errore nell'avvio dell'applicazione");
}
