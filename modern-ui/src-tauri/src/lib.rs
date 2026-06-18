mod commands;
mod db;

use std::sync::OnceLock;
use std::sync::Mutex;
use std::time::{Instant, Duration};
use tauri::Manager;

static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();

struct LogLimiter {
    last_text_time: Instant,
    last_file_time: Instant,
}

static LIMITER: OnceLock<Mutex<LogLimiter>> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Panic Hook personalizzato per intercettare i crash catastrofici del backend
  std::panic::set_hook(Box::new(|panic_info| {
    let payload = panic_info.payload();
    let message = if let Some(s) = payload.downcast_ref::<&str>() {
      *s
    } else if let Some(s) = payload.downcast_ref::<String>() {
      s.as_str()
    } else {
      "Unknown panic payload"
    };

    let location = panic_info.location()
      .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
      .unwrap_or_else(|| "unknown location".to_string());
    
    let error_msg = format!("BACKEND_CRITICAL_PANIC at {}: {}", location, message);
    log::error!("{}", error_msg);

    // Eseguiamo l'invio sincrono a Telegram
    if let Ok(conn) = crate::db::get_connection() {
      let mut bot_token: String = conn.query_row(
        "SELECT value FROM global_settings WHERE key = 'telegram_bot_token'",
        [],
        |row| row.get(0),
      ).unwrap_or_default();
      
      let mut chat_id: String = conn.query_row(
        "SELECT value FROM global_settings WHERE key = 'telegram_chat_id'",
        [],
        |row| row.get(0),
      ).unwrap_or_default();
      
      if bot_token.is_empty() {
        bot_token = option_env!("VITE_TELEGRAM_BOT_TOKEN").unwrap_or("").to_string();
      }
      if chat_id.is_empty() {
        chat_id = option_env!("VITE_TELEGRAM_CHAT_ID").unwrap_or("").to_string();
      }
      
      if !bot_token.is_empty() && !chat_id.is_empty() {
        let escaped_payload = error_msg.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        let text = format!(
          "🚨 <b>FRESCHITECH CRITICAL CRASH (PANIC)</b>\n\n<pre>{}</pre>",
          escaped_payload
        );
        
        let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
        let body = serde_json::json!({
          "chat_id": chat_id,
          "text": text,
          "parse_mode": "HTML"
        });
        
        let body_str = body.to_string();
        let _ = std::process::Command::new("curl")
          .arg("-s")
          .arg("-X")
          .arg("POST")
          .arg("-H")
          .arg("Content-Type: application/json")
          .arg("-d")
          .arg(&body_str)
          .arg(&url)
          .output();
          
        // Sync upload logs & DB
        if let Some(app) = APP_HANDLE.get() {
          if let Ok(log_dir) = app.path().app_log_dir() {
            let possible_files = vec!["app.log", "current.log"];
            for filename in possible_files {
              let log_path = log_dir.join(filename);
              if log_path.exists() {
                let doc_url = format!("https://api.telegram.org/bot{}/sendDocument", bot_token);
                let doc_arg = format!("document=@{}", log_path.to_string_lossy());
                let _ = std::process::Command::new("curl")
                  .arg("-s")
                  .arg("-X")
                  .arg("POST")
                  .arg("-F")
                  .arg(format!("chat_id={}", chat_id))
                  .arg("-F")
                  .arg(&doc_arg)
                  .arg("-F")
                  .arg("caption=File di log app.log associato al panic.")
                  .arg(&doc_url)
                  .output();
                break;
              }
            }
          }
        }
        
        let db_path = crate::db::get_db_path();
        if db_path.exists() {
          let doc_url = format!("https://api.telegram.org/bot{}/sendDocument", bot_token);
          let doc_arg = format!("document=@{}", db_path.to_string_lossy());
          let _ = std::process::Command::new("curl")
            .arg("-s")
            .arg("-X")
            .arg("POST")
            .arg("-F")
            .arg(format!("chat_id={}", chat_id))
            .arg("-F")
            .arg(&doc_arg)
            .arg("-F")
            .arg("caption=File database freschitech.db associato al panic.")
            .arg(&doc_url)
            .output();
        }
      }
    }
  }));

  tauri::Builder::default()
    .setup(|app| {
      APP_HANDLE.set(app.handle().clone()).ok();
      db::init_db().expect("Errore inizializzazione database");
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
              .filter(|metadata| {
                metadata.level() <= log::Level::Warn
              })
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
                  || target.contains("http")
                  || target.contains("curl");

                if !is_network {
                  let payload = record.args().to_string();
                  let target_str = target.to_string();
                  let level = record.level();
                  
                  std::thread::spawn(move || {
                    // Check rate limits
                    let limiter_mutex = LIMITER.get_or_init(|| {
                      Mutex::new(LogLimiter {
                        last_text_time: Instant::now() - Duration::from_secs(60),
                        last_file_time: Instant::now() - Duration::from_secs(600),
                      })
                    });

                    let mut limiter = limiter_mutex.lock().unwrap();
                    let now = Instant::now();

                    let allow_text = now.duration_since(limiter.last_text_time) >= Duration::from_secs(5);
                    let allow_file = (level == log::Level::Error) && (now.duration_since(limiter.last_file_time) >= Duration::from_secs(300));

                    if !allow_text {
                      return; // Block text and file if we are logging too frequently
                    }

                    limiter.last_text_time = now;
                    if allow_file {
                      limiter.last_file_time = now;
                    }
                    drop(limiter); // release lock

                    if let Ok(conn) = crate::db::get_connection() {
                      let mut bot_token: String = conn.query_row(
                        "SELECT value FROM global_settings WHERE key = 'telegram_bot_token'",
                        [],
                        |row| row.get(0),
                      ).unwrap_or_default();
                      
                      let mut chat_id: String = conn.query_row(
                        "SELECT value FROM global_settings WHERE key = 'telegram_chat_id'",
                        [],
                        |row| row.get(0),
                      ).unwrap_or_default();
                      
                      if bot_token.is_empty() {
                        bot_token = option_env!("VITE_TELEGRAM_BOT_TOKEN").unwrap_or("").to_string();
                      }
                      if chat_id.is_empty() {
                        chat_id = option_env!("VITE_TELEGRAM_CHAT_ID").unwrap_or("").to_string();
                      }
                      
                      if !bot_token.is_empty() && !chat_id.is_empty() {
                        let escaped_payload = payload.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
                        let escaped_target = target_str.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
                        
                        let max_payload_len = 3500;
                        let truncated_payload = if escaped_payload.len() > max_payload_len {
                          format!("{}... [Truncated]", &escaped_payload[..max_payload_len])
                        } else {
                          escaped_payload
                        };
                        
                        let text = format!(
                          "⚠️ <b>FreschiTech App Log</b>\n<b>Livello:</b> {:?}\n<b>Modulo:</b> {}\n\n<pre>{}</pre>",
                          level,
                          escaped_target,
                          truncated_payload
                        );
                        
                        let url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);
                        let body = serde_json::json!({
                          "chat_id": chat_id,
                          "text": text,
                          "parse_mode": "HTML"
                        });
                        
                        let body_str = body.to_string();
                        let _ = std::process::Command::new("curl")
                          .arg("-s")
                          .arg("-X")
                          .arg("POST")
                          .arg("-H")
                          .arg("Content-Type: application/json")
                          .arg("-d")
                          .arg(&body_str)
                          .arg(&url)
                          .output();

                        // Send files if allowed
                        if allow_file {
                          // 1. Upload log file
                          if let Some(app) = APP_HANDLE.get() {
                            if let Ok(log_dir) = app.path().app_log_dir() {
                              let possible_files = vec!["app.log", "current.log"];
                              for filename in possible_files {
                                let log_path = log_dir.join(filename);
                                if log_path.exists() {
                                  let doc_url = format!("https://api.telegram.org/bot{}/sendDocument", bot_token);
                                  let doc_arg = format!("document=@{}", log_path.to_string_lossy());
                                  let _ = std::process::Command::new("curl")
                                    .arg("-s")
                                    .arg("-X")
                                    .arg("POST")
                                    .arg("-F")
                                    .arg(format!("chat_id={}", chat_id))
                                    .arg("-F")
                                    .arg(&doc_arg)
                                    .arg("-F")
                                    .arg("caption=File di log app.log associato all'errore.")
                                    .arg(&doc_url)
                                    .output();
                                  break;
                                }
                              }
                            }
                          }

                          // 2. Upload database file
                          let db_path = crate::db::get_db_path();
                          if db_path.exists() {
                            let doc_url = format!("https://api.telegram.org/bot{}/sendDocument", bot_token);
                            let doc_arg = format!("document=@{}", db_path.to_string_lossy());
                            let _ = std::process::Command::new("curl")
                              .arg("-s")
                              .arg("-X")
                              .arg("POST")
                              .arg("-F")
                              .arg(format!("chat_id={}", chat_id))
                              .arg("-F")
                              .arg(&doc_arg)
                              .arg("-F")
                              .arg("caption=File database freschitech.db associato all'errore.")
                              .arg(&doc_url)
                              .output();
                          }
                        }
                      }
                    }
                  });
                }
              }))
          )
        ))
        .build()
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
        commands::delete_quote
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
