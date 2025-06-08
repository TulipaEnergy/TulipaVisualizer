use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value };
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::query_builder::build_resolution_query;

#[tauri::command]
pub fn get_transportation_price_yearly(db_path: String, year: u32, carrier: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, TRANSPORTATION_PRICE_SQL.to_string(), vec![Value:: from(year), Value::from(carrier)])?;

    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_transportation_price_resolution(db_path: String, year: u32, carrier: String, resolution: u32) -> Result<Response, String> {
    
    let pre_table_sql = format!(
    "
    WITH transportation_table AS (
        SELECT 
            tr.from_asset || ' -> ' || tr.to_asset AS route,
            tr.year,
            tr.rep_period,
            tr.time_block_start,
            tr.time_block_end,
            -tr.dual_max_transport_flow_limit_simple_method AS dual_max_transport_flow_limit_simple_method
        FROM cons_transport_flow_limit_simple_method AS tr
        JOIN flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
        WHERE f.carrier = '{}'
    )", carrier);

    let sql = build_resolution_query(
        "transportation_table",
        "dual_max_transport_flow_limit_simple_method",
        &["route"],
        "avg",
        &resolution.to_string(),
    ).trim_end_matches(';').trim_end().to_string();
    let wrapped_sql = format!(
    "
    {}
    SELECT * FROM (
        {}
    ) AS subquery
    ",
    pre_table_sql,
    sql
    );
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, wrapped_sql, vec![Value::from(year)])?;

    if res.0.iter().all(|batch| batch.num_rows() == 0) {
        return Err("No data available for this combination of inputs.".to_string());
    }

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

const TRANSPORTATION_PRICE_SQL: &str = "
    SELECT
    tr.from_asset || ' -> ' || tr.to_asset AS route,
    tr.year AS milestone_year,
    0 AS global_start,
    1 AS global_end,
    SUM(
        -tr.dual_max_transport_flow_limit_simple_method * (tr.time_block_end - tr.time_block_start + 1) * d.resolution * m.weight
    ) AS y_axis
    FROM
        cons_transport_flow_limit_simple_method AS tr
    JOIN
        rep_periods_mapping AS m ON m.year = tr.year AND m.rep_period = tr.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    JOIN
        flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
    WHERE
        f.is_transport = TRUE AND tr.year = ? AND f.carrier = ?
    GROUP BY
        route,
        tr.year,
        global_start,
        global_end;
";

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