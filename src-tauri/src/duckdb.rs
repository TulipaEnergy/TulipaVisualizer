use std::{io::Cursor, sync::Mutex, vec::Vec, };
use once_cell::sync::Lazy;
use std::option::Option;
use tauri::ipc::Response;
use duckdb::{ Connection, arrow::array::RecordBatch, };
use arrow_ipc::{ writer::StreamWriter, };

static DUCKDB_PATH: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
pub static DB_CONN: Mutex<Option<Connection>> = Mutex::new(None);

#[tauri::command]
pub fn set_path (path: String) -> Result<(), String> {
    if path.ends_with(".duckdb") {
        let mut db_path = DUCKDB_PATH.lock().unwrap();
        *db_path = Some(path.clone());

        let conn: Connection = Connection::open(path).expect("Unable to open provided .duckDB file!");
        *(DB_CONN.lock().unwrap()) = Some(conn);
        println!("database connection established!");

        Ok(())
    }
    else {
        Err(String::from("Please upload a .duckdb file."))
    }
}

#[tauri::command]
pub fn get_path() -> Option<String> {
    DUCKDB_PATH.lock().unwrap().clone()
}


// runs the given sql and returns the result as a serialized byte-array of the apache-table
// https://docs.rs/arrow-ipc/55.0.0/arrow_ipc/writer/struct.StreamWriter.html
#[tauri::command]
pub fn run_serialize_query(q: String) -> Result<Response, String> {
    println!("parsing: '{}'", q);

    // parsing and running query
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 
    let mut res_stmt = conn.prepare(&q).map_err(|e| format!("Error parsing query: {}", e))?;

    let rec_batch: Vec<RecordBatch> = res_stmt.query_arrow([]).expect("error executing query").collect();

    // serializing result
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
    Ok(Response::new(vec_writer.into_inner()))
}

// Connection as parameter allows running queries on multiple databases active
pub fn run_specific_query(conn: &Connection, sql: &str) -> Result<Response, String> {
    println!("parsing: '{}'", sql);

    // parsing and running query
    let mut res_stmt  = conn.prepare(sql).map_err(|e| format!("Error parsing query: {}", e))?;

    let rec_batch: Vec<RecordBatch> = res_stmt.query_arrow([]).expect("error executing query").collect();

    // serializing result
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result

    if rec_batch.is_empty() {
        println!("no rows returned for query, returning empty result");
        return Ok(Response::new(vec_writer.into_inner()));  // empty response instead of panicking
    }

    let mut writer: StreamWriter<_> = StreamWriter::try_new(&mut vec_writer, &rec_batch[0].schema())
        .map_err(|e| format!("write error: {}", e))?;
    for batch in rec_batch {
        writer.write(&batch).map_err(|e| format!("write error: {}", e))?;
    }
    writer.finish().map_err(|e| format!("finish error: {}", e))?;

    println!("succesfully parsed query!");
    Ok(Response::new(vec_writer.into_inner()))
}
