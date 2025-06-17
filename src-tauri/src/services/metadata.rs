//! # Metadata Service
//! 
//! This module provides database metadata operations for the Energy Model Visualizer.
//! It handles asset discovery, table information, and schema validation for DuckDB files
//! containing Tulipa Energy Model optimization results.
//! 
//! ## Features
//! 
//! - Asset enumeration from database
//! - Table structure inspection
//! - Column existence validation
//! - Schema compatibility checking
//! 
//! ## Usage
//! 
//! These functions are exposed as Tauri commands and called from the frontend
//! via IPC communication.

use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, Row };
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, run_query_row, serialize_recordbatch};

/// Retrieves all available assets from the database.
/// 
/// This command queries the `asset` table to get a list of all energy assets
/// defined in the Tulipa Energy Model optimization results.
/// 
/// # Arguments
/// 
/// * `db_path` - Path to the DuckDB database file (must end with .duckdb)
/// 
/// 
/// # Examples
/// 
/// ```typescript
/// // Called from frontend via IPC
/// const assets = await invoke('get_assets', {
///   db_path: '/path/to/energy_model.duckdb'
/// });
/// ```
/// 
/// # Database Schema
/// 
/// Expects an `asset` table with at least:
/// - `asset` (VARCHAR): Unique asset identifier
#[tauri::command]
pub fn get_assets(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, ASSET_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1);
}

/// Retrieves metadata about all tables in the database.
/// 
/// This command provides information about the database schema, including
/// all available tables and their structure. Useful for debugging and
/// schema validation.
/// 
/// # Arguments
/// 
/// * `db_path` - Path to the DuckDB database file
/// 
/// 
/// # Examples
/// 
/// ```typescript
/// // Called from frontend via IPC
/// const tables = await invoke('get_tables', {
///   db_path: '/path/to/energy_model.duckdb'
/// });
/// ```
#[tauri::command]
pub fn get_tables(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, TABLES_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1); 
}

/// Checks if a specific column exists in a given table.
/// 
/// This utility function is used internally by other services to validate
/// database schema and handle optional columns gracefully. It enables
/// the application to work with different versions of Tulipa Energy Model
/// outputs that may have varying table structures.
/// 
/// # Arguments
/// 
/// * `db_path` - Path to the DuckDB database file
/// * `table_name` - Name of the table to check
/// * `column_name` - Name of the column to look for
/// 
/// # Returns
/// 
/// * `Ok(true)` - Column exists in the specified table
/// * `Ok(false)` - Column does not exist in the table
/// * `Err(String)` - Error message if database access or table query fails
/// 
/// # Examples
/// 
/// ```rust
/// // Check if investment table has solution column
/// let has_solution = check_column_in_table(
///     db_path.clone(),
///     "var_assets_investment", 
///     "solution"
/// )?;
/// 
/// if has_solution {
///     // Use investment data
/// } else {
///     // Handle missing investment data gracefully
/// }
/// ```
/// 
/// # Implementation Notes
/// 
/// Uses SQLite's `PRAGMA table_info()` to get column information,
/// which is compatible with DuckDB's SQLite compatibility layer.
pub fn check_column_in_table(db_path: String, table_name: &str, column_name: &str) -> Result<bool, String> {
    let check: Vec<String> = run_query_row(db_path, TABLE_INFO_SQL.replace("{{1}}", table_name), vec![], |row: &Row<'_>| Ok(row.get::<&str, String>("name")?))?;
    
    Ok(check.iter().any(|name: &String| name == column_name))
}

/// SQL query to retrieve all assets from the asset table.
const ASSET_SQL: &str = "SELECT asset FROM asset;";

/// SQL query to show all tables in the database.
const TABLES_SQL: &str = "SHOW TABLES";

/// SQL template to get column information for a specific table.
/// The `{{1}}` placeholder is replaced with the actual table name.
const TABLE_INFO_SQL: &str = "PRAGMA table_info({{1}});";