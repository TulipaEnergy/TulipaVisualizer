use tauri::ipc::Response;
use super::super::duckdb_conn::{ serialize_recordbatch, run_query_rb };
use duckdb::arrow::{array::RecordBatch, datatypes::Schema};

// runs arbitrary SQL query
#[tauri::command]
pub fn run_serialize_query_on_db(db_path: String, q: String) -> Result<Response, String> {
    println!("Running custom: {}", q);
    
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, q, Vec::new())?;
    return serialize_recordbatch(res.0, res.1);
}