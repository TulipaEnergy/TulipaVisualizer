
use duckdb::{ arrow::array::RecordBatch };
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

pub fn check_column_in_table(db_path: String, table_name: &str, column_name: &str) -> Result<bool, String> {
    let check: Vec<RecordBatch> = run_query_rb(
        db_path, 
        format!("PRAGMA table_info('{}');", table_name).to_string(),
        [].to_vec()
    )?;
    
    Ok(check.iter().any(|batch| {
        batch
            .column_by_name("name")
            .and_then(|col| col.as_any().downcast_ref::<duckdb::arrow::array::StringArray>())
            .map(|array| array.iter().any(|name| name == Some(column_name)))
            .unwrap_or(false)
    }))
}

const ASSET_SQL: &str = "SELECT asset FROM asset;";
const TABLES_SQL: &str = "SHOW TABLES";