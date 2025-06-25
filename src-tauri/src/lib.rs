//! # Energy Model Visualizer Backend
//! 
//! This is the main backend library for the Energy Model Visualizer, a cross-platform
//! desktop application for visualizing Tulipa Energy Model optimization results.
//! 
//! ## Overview
//! 
//! The backend is built using the Tauri framework with Rust, providing:
//! - High-performance DuckDB database operations
//! - Secure IPC communication with the React frontend
//! - Apache Arrow data serialization for efficient data transfer
//! - Multiple service modules for different data domains
//! 
//! ## Architecture
//! 
//! The backend follows a service-oriented architecture:
//! - **Service Layer**: Domain-specific business logic modules
//! - **Database Layer**: Connection management and query execution
//! - **IPC Layer**: Tauri command handlers for frontend communication
//! 
//! ## Modules
//! 
//! - [`services`]: Business logic modules for different data types
//! - [`duckdb_conn`]: Database connection management and query execution
//! 
//! ## Example Usage
//! 
//! ```rust,no_run
//! // This function is called by Tauri to initialize the application
//! energy_model_visualizer::run();
//! ```

mod services;
mod duckdb_conn;
use tauri_plugin_dialog;
use services::*;

/// Main application entry point for the Energy Model Visualizer.
/// 
/// This function initializes the Tauri application with all necessary plugins
/// and command handlers for IPC communication with the frontend.
/// 
/// ## Plugins
/// 
/// - **File System**: Access to local file system for database operations
/// - **Opener**: System file/URL opening capabilities  
/// - **Dialog**: Native file dialog support
/// 
/// ## Command Handlers
/// 
/// Registers all IPC command handlers organized by service domain:
/// - **Query**: Direct SQL execution capabilities
/// - **Import/Export**: Geographic flow data operations
/// - **Capacity**: Asset capacity and investment analysis
/// - **Metadata**: Database schema and asset information
/// - **System Cost**: Economic analysis of energy systems
/// - **Transport Price**: Transportation cost analysis
/// - **Production Price**: Production pricing data
/// - **Storage Price**: Storage cost analysis
/// - **Residual Load**: Renewable and non-renewable supply analysis
/// - **Documentation**: In-app documentation file reading
/// 
/// ## Panics
/// 
/// This function will panic if the Tauri application fails to initialize,
/// which typically indicates a critical system configuration issue.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            capacity::get_capacity,
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
            production_price::get_production_price_resolution,
            storage_price::get_storage_price_resolution,
            residual_load::get_supply,
            documentation::read_documentation_file,
            documentation::get_available_documentation_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
