use tauri::ipc::Response;
use super::super::duckdb::{ serialize_recordbatch, run_query_rb };
use duckdb::{ arrow::array::RecordBatch };

// runs arbitrary SQL query
#[tauri::command]
pub fn run_serialize_query_on_db(db_path: String, q: String) -> Result<Response, String> {
    println!("Running custom: {}", q);
    
    let res: Vec<RecordBatch> = run_query_rb(db_path, q, Vec::new())?;
    return serialize_recordbatch(res);
}