mod services;
mod duckdb;
use tauri_plugin_dialog;
use services::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            query::run_serialize_query_on_db,
            import_export::get_import,
            import_export::get_export,
            capacity::get_capacity,
            capacity::get_available_years,
            metadata::get_assets,
            metadata::get_tables,
            production_price::get_production_price,
            storage_price::get_storage_price,
            system_cost::get_fixed_asset_cost,
            system_cost::get_unit_on_cost,
            system_cost::get_fixed_flow_cost,
            system_cost::get_variable_flow_cost,
            transport_price::get_transportation_price,
            production_price::get_production_price_period])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
