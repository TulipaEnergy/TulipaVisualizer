mod services;
mod duckdb_conn;
use tauri_plugin_dialog;
use services::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
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
            metadata::get_assets_carriers,
            system_cost::get_fixed_asset_cost,
            system_cost::get_fixed_flow_cost,
            system_cost::get_variable_flow_cost,
            system_cost::get_unit_on_cost,
            transport_price::get_transportation_price_resolution,
            transport_price::get_transportation_years,
            transport_price::get_transportation_carriers,
            production_price::get_production_price_resolution,
            production_price::get_production_years,
            storage_price::get_storage_price_resolution,
            storage_price::get_storage_years,
            residual_load::get_supply_years,
            residual_load::get_supply])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
