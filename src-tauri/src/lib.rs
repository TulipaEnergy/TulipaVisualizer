mod duckdb;
mod import;
use tauri_plugin_dialog;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            duckdb::run_serialize_query_on_db,
            import::get_import,
            import::get_export])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
