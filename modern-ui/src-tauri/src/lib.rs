mod backup;
mod commands;
mod db;
mod telegram;

use std::sync::mpsc::{sync_channel, SyncSender};
use std::sync::OnceLock;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();

/// Intervallo minimo fra due messaggi di testo inviati su Telegram.
const TEXT_RATE_LIMIT: Duration = Duration::from_secs(5);
/// Intervallo minimo fra due invii del file di log.
const FILE_RATE_LIMIT: Duration = Duration::from_secs(300);
/// Numero di record accodabili prima di iniziare a scartarli. Il limite evita
/// che una raffica di errori faccia crescere la coda senza controllo.
const LOG_QUEUE_CAPACITY: usize = 32;

/// Un record di log da inoltrare al canale di diagnostica.
struct LogJob {
    level: log::Level,
    target: String,
    payload: String,
}

/// Canale verso l'unico worker che parla con Telegram.
///
/// In precedenza ogni record di log faceva `std::thread::spawn` e lanciava un
/// processo `curl`: con un worker singolo e una coda limitata il costo resta
/// costante anche sotto raffica.
static LOG_SENDER: OnceLock<SyncSender<LogJob>> = OnceLock::new();

fn log_sender() -> &'static SyncSender<LogJob> {
    LOG_SENDER.get_or_init(|| {
        let (tx, rx) = sync_channel::<LogJob>(LOG_QUEUE_CAPACITY);

        let spawned = std::thread::Builder::new()
            .name("telegram-diagnostics".into())
            .spawn(move || {
                // Lo stato del rate limiter vive nel worker: essendo l'unico
                // consumatore non serve alcun Mutex (e nessun rischio che un
                // lock avvelenato faccia rientrare il panic hook).
                let mut last_text = Instant::now() - TEXT_RATE_LIMIT;
                let mut last_file = Instant::now() - FILE_RATE_LIMIT;

                for job in rx {
                    let now = Instant::now();
                    if now.duration_since(last_text) < TEXT_RATE_LIMIT {
                        continue;
                    }
                    last_text = now;

                    let send_file = job.level == log::Level::Error
                        && now.duration_since(last_file) >= FILE_RATE_LIMIT;
                    if send_file {
                        last_file = now;
                    }

                    forward_to_telegram(job, send_file);
                }
            });

        if let Err(e) = spawned {
            // Senza worker la diagnostica remota e' disattivata, ma l'app
            // continua a funzionare: i log restano comunque su file.
            eprintln!("Impossibile avviare il worker di diagnostica: {e}");
        }

        tx
    })
}

/// Inoltra un record al canale Telegram. Gira sul worker dedicato, quindi
/// fuori dal runtime tokio: puo' usare direttamente le API bloccanti.
fn forward_to_telegram(job: LogJob, send_file: bool) {
    let Some((token, chat_id)) = telegram::credentials() else {
        return;
    };

    let text = format!(
        "⚠️ <b>FreschiTech App Log</b>\n<b>Livello:</b> {:?}\n<b>Modulo:</b> {}\n\n<pre>{}</pre>",
        job.level,
        telegram::escape_html(&job.target),
        telegram::prepare_payload(&job.payload)
    );

    let _ = telegram::send_message(&token, &chat_id, &text);

    // Nota: il file di log viene allegato, il database no. Il `.db` contiene
    // l'anagrafica completa dei clienti e viene inviato solo su richiesta
    // esplicita dell'utente (comando `send_database_to_telegram`).
    if send_file {
        if let Some(app) = APP_HANDLE.get() {
            if let Some(log_path) = telegram::app_log_path(app) {
                let _ = telegram::send_document(
                    &token,
                    &chat_id,
                    &log_path,
                    "File di log associato all'errore.",
                );
            }
        }
    }
}

/// Notifica sincrona di un panic del backend.
///
/// Il processo sta per terminare, quindi non possiamo accodare al worker:
/// l'invio avviene su un thread dedicato di cui attendiamo la conclusione.
fn notify_panic(error_msg: String) {
    let Some((token, chat_id)) = telegram::credentials() else {
        return;
    };

    let text = format!(
        "🚨 <b>FRESCHITECH CRITICAL CRASH (PANIC)</b>\n\n<pre>{}</pre>",
        telegram::prepare_payload(&error_msg)
    );

    let _ = telegram::dispatch(move || telegram::send_message(&token, &chat_id, &text));
}

/// Gestisce l'avvio con database danneggiato.
///
/// Prima si andava semplicemente in panic: l'applicazione spariva senza
/// spiegazioni e senza lasciare all'utente alcun modo di recuperare i dati.
/// Un file che fallisce `integrity_check` resta spesso leggibile in buona
/// parte, quindi offriamo di salvarne una copia prima di chiudere.
fn handle_corrupted_database(app: &tauri::AppHandle, detail: String) {
    let handle = app.clone();

    // I dialoghi bloccanti non possono girare sul thread principale: e' quello
    // che deve disegnarli, e si bloccherebbe. Li eseguiamo su un thread
    // dedicato, che al termine chiude l'applicazione.
    std::thread::spawn(move || {
        // L'interfaccia non ha dati validi da mostrare: resta nascosta.
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.hide();
        }

        let message = format!(
            "Il database di FreschiTech risulta danneggiato e l'applicazione non puo' avviarsi.\n\n\
             Dettaglio tecnico: {}\n\n\
             Puoi salvare una copia del file per tentare il recupero dei dati, \
             oppure chiudere e ripartire da un backup.",
            telegram::truncate_at_char_boundary(&detail, 300)
        );

        let vuole_salvare = handle
            .dialog()
            .message(message)
            .title("Database danneggiato")
            .kind(MessageDialogKind::Error)
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Salva una copia...".to_string(),
                "Chiudi".to_string(),
            ))
            .blocking_show();

        if vuole_salvare {
            export_corrupted_database(&handle);
        }

        handle.exit(1);
    });
}

/// Chiede dove salvare una copia del database danneggiato e la scrive.
fn export_corrupted_database(app: &tauri::AppHandle) {
    let source = db::get_db_path();

    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let suggested = format!("freschitech_danneggiato_{epoch}.db");

    let Some(destination) = app
        .dialog()
        .file()
        .set_title("Salva una copia del database danneggiato")
        .set_file_name(&suggested)
        .add_filter("Database SQLite", &["db"])
        .blocking_save_file()
    else {
        return; // l'utente ha annullato
    };

    let Ok(destination) = destination.into_path() else {
        return;
    };

    let (title, body, kind) = match std::fs::copy(&source, &destination) {
        Ok(_) => (
            "Copia salvata",
            format!(
                "Copia salvata in:\n{}\n\n\
                 Conservala e inviala all'assistenza per tentare il recupero dei dati.",
                destination.display()
            ),
            MessageDialogKind::Info,
        ),
        Err(err) => (
            "Salvataggio non riuscito",
            format!("Impossibile salvare la copia: {err}"),
            MessageDialogKind::Error,
        ),
    };

    app.dialog()
        .message(body)
        .title(title)
        .kind(kind)
        .blocking_show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Panic hook personalizzato per intercettare i crash catastrofici del backend.
    std::panic::set_hook(Box::new(|panic_info| {
        let payload = panic_info.payload();
        let message = if let Some(s) = payload.downcast_ref::<&str>() {
            *s
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.as_str()
        } else {
            "Unknown panic payload"
        };

        let location = panic_info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let error_msg = format!("BACKEND_CRITICAL_PANIC at {location}: {message}");

        // Deliberatamente `eprintln!` e non `log::error!`: quest'ultimo
        // rientrerebbe nel dispatcher, che a sua volta puo' fare panic,
        // innescando una ricorsione fra hook e logger.
        eprintln!("{error_msg}");

        notify_panic(error_msg);
    }));

    tauri::Builder::default()
        .setup(|app| {
            APP_HANDLE.set(app.handle().clone()).ok();

            if let Err(error) = db::init_db() {
                match error {
                    db::InitError::Corrupted(detail) => {
                        handle_corrupted_database(app.handle(), detail);
                        // Nessun backup su un database danneggiato: sovrascriverebbe
                        // una copia sana con una rotta.
                        return Ok(());
                    }
                    // Un errore SQL non e' recuperabile dall'utente: resta un
                    // panic, cosi' finisce nel canale di diagnostica.
                    db::InitError::Sql(err) => {
                        panic!("Errore inizializzazione database: {err}");
                    }
                }
            }

            // Backup giornaliero, su un thread dedicato: la copia di un
            // database grande non deve ritardare l'apertura della finestra.
            std::thread::spawn(|| {
                backup::run_if_due();
            });

            Ok(())
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Debug)
                .max_file_size(10_485_760) // 10 MB
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(5)) // Mantieni gli ultimi 5 file
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Dispatch(
                        tauri_plugin_log::fern::Dispatch::new()
                            .filter(|metadata| metadata.level() <= log::Level::Warn)
                            .chain(tauri_plugin_log::fern::Output::call(|record| {
                                let target = record.target();
                                let is_network = target.starts_with("reqwest")
                                    || target.starts_with("hyper")
                                    || target.starts_with("h2")
                                    || target.starts_with("rustls")
                                    || target.starts_with("telegram")
                                    || target.starts_with("tokio_util")
                                    || target.starts_with("native_tls")
                                    || target.contains("network")
                                    || target.contains("http");

                                if is_network {
                                    return;
                                }

                                // `try_send` non blocca mai il chiamante: se la
                                // coda e' piena il record viene scartato invece
                                // di rallentare il thread che sta loggando.
                                let _ = log_sender().try_send(LogJob {
                                    level: record.level(),
                                    target: target.to_string(),
                                    payload: record.args().to_string(),
                                });
                            })),
                    ),
                ))
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::log_frontend_error,
            commands::get_stats,
            commands::search_municipalities,
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
            commands::send_log_to_telegram,
            commands::send_database_to_telegram,
            commands::get_backup_info,
            commands::create_backup_now,
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
            commands::import_invoice_mappings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
