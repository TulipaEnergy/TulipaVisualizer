use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::query_builder::build_resolution_query;

#[tauri::command]
pub fn get_storage_price_yearly(db_path: String, year: u32) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, STORAGE_PRICE_SQL.to_string(), vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_storage_price_resolution(db_path: String, year: u32, resolution: u32) -> Result<Response, String> {
    let sql = build_resolution_query(
        "cons_balance_storage_rep_period",
        "dual_balance_storage_rep_period",
        &["asset"],
        "avg",
        &resolution.to_string(),
    ).trim_end_matches(';').trim_end().to_string();
    let wrapped_sql = format!(
    "
    SELECT 
        asset,
        milestone_year,
        global_start,
        global_end,
        -y_axis AS y_axis,
    FROM (
        {}
    ) AS subquery
    ",
    sql
    );
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, wrapped_sql, vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);

}

#[tauri::command]
pub fn get_storage_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, STORAGE_YEARS_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---
const STORAGE_PRICE_SQL: &str = "
    SELECT st.asset,
    st.year AS milestone_year,
    0 AS global_start,
    1 AS global_end,
    SUM(-st.dual_balance_storage_rep_period * (st.time_block_end - st.time_block_start + 1) * d.resolution * m.weight
    ) AS y_axis
    FROM cons_balance_storage_rep_period AS st
    JOIN
        rep_periods_mapping AS m ON m.year = st.year AND m.rep_period = st.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    WHERE st.year = ?
    GROUP BY
        st.year,
        global_start,
        global_end,
        st.asset;
";

const STORAGE_YEARS_SQL: &str = "
    SELECT DISTINCT year
    FROM cons_balance_storage_rep_period
    ORDER BY year;
";