use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::option::Option;
use duckdb::{ Connection, Statement };

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