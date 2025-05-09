use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::option::Option;

static DUCKDB_PATH: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));

#[tauri::command]
pub fn set_path (path: String) -> Result<(), String> {
    if path.ends_with(".duckdb") {
        let mut db_path = DUCKDB_PATH.lock().unwrap();
        *db_path = Some(path);
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