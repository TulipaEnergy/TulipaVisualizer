use std::{io::Cursor, sync::Mutex, vec::Vec, };
use once_cell::sync::Lazy;
use std::option::Option;
use duckdb::{ Connection, Statement, Arrow, arrow::array::RecordBatch, };
use arrow_ipc::{ writer::StreamWriter, };

static DUCKDB_PATH: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
static DB_CONN: Mutex<Option<Connection>> = Mutex::new(None);

#[tauri::command]
pub fn set_path (path: String) -> Result<(), String> {
    if path.ends_with(".duckdb") {
        let mut db_path = DUCKDB_PATH.lock().unwrap();
        *db_path = Some(path.clone());

        let conn: Connection = Connection::open(path).expect("Unable to open provided .duckDB file!");
        *(DB_CONN.lock().unwrap()) = Some(conn);
        println!("database connection established!");

        test_query();

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

// perhaps attach this to a test button later
fn test_query() -> Result<(), String> {
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().expect("DB connection missing!");
    let mut stmt: Statement = conn.prepare("SHOW TABLES").expect("error parsing query");
    let rows = stmt.query_map([], |row| row.get::<_, String>(0)).expect("no rows!");

    for name_result in rows {
        println!("{}", name_result.unwrap());
    }

    Ok(())
}


// runs the given sql and returns the result as a serialized byte-array of the apache-table
// https://docs.rs/arrow-ipc/55.0.0/arrow_ipc/writer/struct.StreamWriter.html
#[tauri::command]
pub fn run_serialize_query(q: String) -> Vec<u8> {
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result

    // run actual query
    let res: Arrow<'_> = run_query(q);
    let rec_batch: Vec<RecordBatch> = res.collect();
    {
        let mut writer: StreamWriter<_> = StreamWriter::try_new(vec_writer, res.get_schema().as_ref()).unwrap();
        writer.write(&res).unwrap();
        writer.finish().unwrap();
    }

    vec_writer.into_inner()
}

// runs the query and returns an apache arrow table
// if an error occured, returns an empty table
fn run_query(q: String) -> Arrow<'_> {
    println!("parsing: '{}'", q);

    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().expect("DB connection missing!");
    let mut res_stmt: Result<Statement> = conn.prepare("q");

    if (res_stmt.is_ok()) {
        let res_table: Result<Arrow<'_>> = res_stmt.unwrap().query_arrow([]);
        if (res_table.is_ok()) {
            return res_table.unwrap();
        }
    }

    // error occured
    let err_ret = record_batch!(
        ("msg", Utf8, ["error"])
    );

    return err_ret;
}