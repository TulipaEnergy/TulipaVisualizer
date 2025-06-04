
use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, Row };
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, run_query_row, serialize_recordbatch};

#[tauri::command]
pub fn get_assets(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, ASSET_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_tables(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, TABLES_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1); 
}

pub fn check_column_in_table(db_path: String, table_name: &str, column_name: &str) -> Result<bool, String> {
    let check: Vec<String> = run_query_row(db_path, TABLE_INFO_SQL.replace("{{1}}", table_name), vec![], |row: &Row<'_>| Ok(row.get::<&str, String>("name")?))?;
    
    Ok(check.iter().any(|name: &String| name == column_name))
}

const ASSET_SQL: &str = "SELECT asset FROM asset;";
const TABLES_SQL: &str = "SHOW TABLES";
const TABLE_INFO_SQL: &str = "PRAGMA table_info({{1}});";