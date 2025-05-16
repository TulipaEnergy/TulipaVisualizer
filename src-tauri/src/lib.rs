mod duckdb;
mod queries;
use tauri_plugin_dialog;


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            duckdb::set_path,
            duckdb::get_path,
            duckdb::run_serialize_query,
            queries::capacity::get_capacity_over_period,
            queries::capacity::get_capacity_at_year])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
