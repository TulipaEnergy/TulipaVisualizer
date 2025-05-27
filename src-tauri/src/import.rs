use crate::duckdb::{ get_id_from_category, serialize_recordbatch, get_import_from_id, get_export_from_id };
use tauri::ipc::Response;

// gets the import/ export between categories which are not level-0
#[tauri::command]
pub fn get_import(cat_name: String) -> Result<Response, String> {
    let cat_id: u32 = get_id_from_category(cat_name)?;

    return serialize_recordbatch(get_import_from_id(cat_id)?);
}

#[tauri::command]
pub fn get_export(cat_name: String) -> Result<Response, String> {
    let cat_id: u32 = get_id_from_category(cat_name)?;

    return serialize_recordbatch(get_export_from_id(cat_id)?);
}
