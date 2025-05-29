
use duckdb::{ types::Value, arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::duckdb::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_assets(db_path: String) -> Result<Response, String> {
    let res: Vec<RecordBatch> = run_query_rb(db_path, ASSET_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_tables(db_path: String) -> Result<Response, String> {
    let res: Vec<RecordBatch> = run_query_rb(db_path, TABLES_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res); 
}

const ASSET_SQL: &str = "SELECT asset FROM asset;";
const TABLES_SQL: &str = "SHOW TABLES";