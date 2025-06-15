use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value };
use tauri::ipc::Response;
use crate::{duckdb_conn::{run_query_rb, serialize_recordbatch}, services::metadata::check_column_in_table};
use crate::services::query_builder::build_resolution_query;

#[tauri::command]
pub fn get_transportation_price_resolution(db_path: String, year: u32, carrier: String, resolution: u32, column_type: String) -> Result<Response, String> {
let dual = &format!("dual_{}_transport_flow_limit_simple_method", column_type);
    let pre_table_sql: String;
    let wrapped_sql: String;
    if check_column_in_table(db_path.clone(), "cons_transport_flow_limit_simple_method", dual)? {
    pre_table_sql =  format!(
    "
    WITH transportation_table AS (
        SELECT 
            f.carrier,
            tr.year,
            tr.rep_period,
            tr.time_block_start,
            tr.time_block_end,
            dual_{}_transport_flow_limit_simple_method AS dual_value
        FROM cons_transport_flow_limit_simple_method AS tr
        JOIN flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
        WHERE f.carrier = '{}'
    )", column_type, carrier);
    let sql = build_resolution_query(
        "transportation_table",
        "dual_value",
        &["carrier"],
        "avg",
        &resolution.to_string(),
        false,
    ).trim_end_matches(';').trim_end().to_string();
    wrapped_sql = format!(
    "
    {}
    SELECT * FROM (
        {}
    ) AS subquery
    ",
    pre_table_sql,
    sql
    );
    }
    else {
        wrapped_sql = format!("
    SELECT
    '{}' AS carrier,
    {} AS milestone_year,
    0 AS period,
    0 AS start_hour,
    0 AS end_hour,
    0 AS y_axis
    FROM cons_transport_flow_limit_simple_method
    WHERE year = ?", carrier, year);
    }
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, wrapped_sql, vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);

}

#[tauri::command]
pub fn get_transportation_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, TRANSPORTATION_YEARS_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_transportation_carriers(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, CARRIER_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---

const TRANSPORTATION_YEARS_SQL: &str = "
    SELECT DISTINCT year
    FROM cons_transport_flow_limit_simple_method
    ORDER BY year;
";

const CARRIER_SQL: &str = "
    SELECT DISTINCT carrier
    FROM flow
    WHERE is_transport = TRUE
    ORDER BY carrier;
    ";