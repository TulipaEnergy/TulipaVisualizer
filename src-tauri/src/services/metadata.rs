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

#[tauri::command]
pub fn get_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, YEARS_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1); 
}

#[tauri::command]
pub fn get_assets_carriers(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, CARRIER_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1); 
}

pub fn apply_carrier_filter(base_sql: &str, carrier: &str) -> String {
    if carrier == "all" {
        // No filtering, no carrier column added
        format!(
            "
            SELECT
                s.*,
                '{}' AS carrier
            FROM (
                {}
            ) AS s
            ",
            carrier,
            base_sql,
        )
    } else {
        format!(
            "
            SELECT
                s.*,
                '{}' AS carrier
            FROM (
                {}
            ) AS s
            WHERE s.asset IN (
                SELECT asset FROM ({}) WHERE carrier = '{}'
            )
            ",
            carrier,
            base_sql,
            INFER_CARRIER_SQL_FROM_OUTGOING_FLOWS,
            carrier
        )
    }
} 

#[tauri::command]
pub fn get_categories(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, CATEGORY_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn has_metadata(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, HAS_META_SQL.to_string(), [].to_vec())?;
    return serialize_recordbatch(res.0, res.1);
}

const ASSET_SQL: &str = "SELECT asset FROM asset;";
const TABLES_SQL: &str = "SHOW TABLES";
const TABLE_INFO_SQL: &str = "PRAGMA table_info({{1}});";
const CARRIER_SQL: &str = "SELECT DISTINCT carrier FROM flow;";
const INFER_CARRIER_SQL_FROM_OUTGOING_FLOWS: &str = "
SELECT DISTINCT
a.asset,
f.carrier
FROM asset AS a
JOIN flow AS f
ON f.from_asset = a.asset
";
const YEARS_SQL: &str = "
    SELECT DISTINCT year
    FROM year_data AS y
    WHERE y.is_milestone = true
    ORDER BY year;
";
const CATEGORY_SQL: &str = "SELECT id, name, parent_id, level FROM category ORDER BY level;";
const HAS_META_SQL: &str = "SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'category'
) AS has_category,
EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'asset_category'
) AS has_asset_category;";