mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|_app| {
      db::init_db().expect("Errore inizializzazione database");
      Ok(())
    })
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
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
        commands::save_global_settings
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
