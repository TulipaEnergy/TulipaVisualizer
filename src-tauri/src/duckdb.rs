use std::{io::Cursor, sync::Mutex, vec::Vec, collections::HashMap, };
use once_cell::sync::Lazy;
use tauri::ipc::Response;
use duckdb::{ arrow::array::RecordBatch, types::Value, Connection };
use arrow_ipc::{ writer::StreamWriter, };
// use mockall::{ predicate::* };

// Connection pool for multi-database support
static DB_POOL: Lazy<Mutex<HashMap<String, Connection>>> = Lazy::new(|| Mutex::new(HashMap::new()));

// serializes result from apache arrow query
pub fn serialize_recordbatch(rec_batch: Vec<RecordBatch>) -> Result<Response, String> {
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result

    if rec_batch.is_empty() {
        println!("no rows returned for query, returning empty result");
        return Ok(Response::new(vec_writer.into_inner()));
    }

    let mut writer: StreamWriter<_> = StreamWriter::try_new(&mut vec_writer, &rec_batch[0].schema())
        .map_err(|e| format!("write error: {}", e))?;
    for batch in rec_batch {
        writer.write(&batch).map_err(|e| format!("write error: {}", e))?;
    }
    writer.finish().map_err(|e| format!("finish error: {}", e))?;

    println!("succesfully parsed query!");
    let response: Response = Response::new(vec_writer.into_inner());

    Ok(response)
}

fn fetch_connection<F, T>(db_path: &String, with_conn: F) -> Result<T, String>
where
    F: FnOnce(&Connection) -> Result<T, String> 
{
    // assert path is plausible
    if !db_path.ends_with(".duckdb") {
        return Err("Database path must end with .duckdb".to_string());
    }

    // Check if we need to create a new connection or use existing one
    let mut pool = DB_POOL.lock().unwrap();
    if !pool.contains_key(db_path) {
        let new_conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database '{}': {}", db_path, e))?;
        pool.insert(db_path.clone(), new_conn);
         println!("Opened new database succesfully: '{}'", db_path);
    } else {
        println!("Reusing existing connection for '{}'", db_path);
    }

    // Always use the connection from the pool
    let conn: &Connection = pool.get(db_path).expect("Connection should exist in pool");
    with_conn(conn)
}

pub fn run_query_rb(db_path: String, q: String, args: Vec<Value>) -> Result<Vec<RecordBatch>, String> {
    println!("parsing query '{}' on database: '{}'", q, db_path);

    fetch_connection(&db_path, |conn| {
        // Execute query using the specific connection
        let mut prepared_statement = conn.prepare(&q).map_err(|e| format!("error parsing query: '{}'", e.to_string()))?;
        let res: Vec<RecordBatch> = prepared_statement
            .query_arrow(duckdb::params_from_iter(args.iter()))
            .map_err(|e| format!("error executing query: '{}'", e.to_string()))?
            .collect();

        return Ok(res);
    })
}

pub fn run_query_row<F, T>(db_path: String, q: String, args: Vec<Value>, row_mapper: F) -> Result<Vec<T>, String> 
where 
    F: FnMut(&duckdb::Row<'_>) -> Result<T, duckdb::Error>
{
    println!("parsing query '{}' on database: '{}'", q, db_path);

    fetch_connection(&db_path, |conn| {
        // Execute query using the specific connection
        let mut prepared_statement = conn.prepare(&q).map_err(|e| format!("error parsing query: '{}'", e.to_string()))?;
        let res: Vec<T> = prepared_statement
            .query_map(duckdb::params_from_iter(args.iter()), row_mapper)
            .map_err(|e| format!("error executing query: '{}'", e.to_string()))?
            .filter_map(Result::ok)
            .collect();

        return Ok(res);
    })
}


// --- TESTING ---
