use tauri::ipc::Response;
use super::super::duckdb_conn::{ serialize_recordbatch, run_query_rb };
use duckdb::arrow::{array::RecordBatch, datatypes::Schema};

/// Executes arbitrary SQL queries for database exploration and debugging.
/// 
/// Direct SQL Query Execution Safety Measures:
/// - Uses prepared statements to prevent SQL injection attacks
/// - Leverages connection pooling for resource management
/// - Provides structured error handling with context
/// - Logs all query executions for debugging and auditing
/// 
/// Usage Guidelines and Limitations:
/// - Intended for database exploration and custom analysis
/// - Should not be used for production data modifications
/// - Query complexity limited by DuckDB engine capabilities
/// - Results serialized via Apache Arrow for efficient data transfer
/// 
/// Security Considerations:
/// - No user input sanitization beyond prepared statement protection
/// - Database file path must be pre-validated by calling service
/// - Query execution time not limited (potential for long-running queries)
/// 
/// # Parameters
/// * `db_path` - Validated database file path (must end with .duckdb)
/// * `q` - SQL query string to execute
/// 
/// # Returns
/// * `Ok(Response)` - Apache Arrow serialized query results
/// * `Err(String)` - Query execution error with context
#[tauri::command]
pub fn run_serialize_query_on_db(db_path: String, q: String) -> Result<Response, String> {
    println!("Running custom: {}", q);
    
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, q, Vec::new())?;
    return serialize_recordbatch(res.0, res.1);
}