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
            capacity::get_capacity,
            capacity::get_available_years,
            import_export::get_all_aggregate_flows,
            import_export::get_all_detailed_flows,
            import_export::get_available_years_flows,
            metadata::get_assets,
            metadata::get_tables,
            metadata::get_assets_carriers,
            metadata::get_years,
            production_price::get_production_price_resolution,
            query::run_serialize_query_on_db,
            residual_load::get_supply,
            storage_price::get_storage_price_resolution,
            system_cost::get_fixed_asset_cost,
            system_cost::get_fixed_flow_cost,
            system_cost::get_variable_flow_cost,
            system_cost::get_unit_on_cost,
            transport_price::get_transportation_carriers,
            transport_price::get_transportation_price_resolution,])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
