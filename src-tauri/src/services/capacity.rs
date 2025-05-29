use duckdb::{ types::Value, arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::duckdb::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_capacity(db_path: String, asset_name: String, start_year: u32, end_year: u32) -> Result<Response, String> {
    let res: Vec<RecordBatch> = run_query_rb(db_path, CAPACITY_SQL.to_string(), vec![Value::from(asset_name), Value::from(start_year), Value::from(end_year)])?;

    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_available_years(db_path: String, asset_name: String) -> Result<Response, String> {
    let res: Vec<RecordBatch> = run_query_rb(db_path, AVAILABLE_YEARS_SQL.to_string(), vec![Value::from(asset_name)])?;

    return serialize_recordbatch(res);
}

// --- TESTING ---

// --- QUERIES ---

const CAPACITY_SQL: &str = "
WITH years AS (
    SELECT DISTINCT year
    FROM (
        SELECT commission_year AS year
        FROM asset_both
        WHERE asset = $1
        UNION
        SELECT milestone_year AS year
        FROM var_assets_investment
        WHERE asset = $1
        UNION
        SELECT milestone_year AS year
        FROM var_assets_decommission
        WHERE asset = $1
    ) t
    WHERE year BETWEEN $2 AND $3
)
SELECT y.year, COALESCE(i.solution, -1) AS investment, COALESCE(d.solution, -1) AS decommission,
(
    (
        SELECT COALESCE(SUM(initial_units), 0)
        FROM asset_both
        WHERE asset = $1
        AND commission_year <= y.year
    ) + (
        SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_investment
        WHERE asset = $1
        AND milestone_year <= y.year
    ) - (
        SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_decommission
        WHERE asset = $1
        AND milestone_year <= y.year
    )
) * (
    SELECT capacity
    FROM asset
    WHERE asset = $1
) AS installed_capacity
FROM years y
LEFT JOIN var_assets_investment AS i
ON i.asset = $1 AND i.milestone_year = y.year
LEFT JOIN var_assets_decommission AS d
ON d.asset = $1 AND d.milestone_year = y.year
ORDER BY y.year;
";

const AVAILABLE_YEARS_SQL: &str = "
SELECT DISTINCT year FROM (
    SELECT commission_year AS year, asset FROM asset_both
    UNION
    SELECT milestone_year AS year, asset FROM var_assets_investment
    UNION
    SELECT milestone_year AS year, asset FROM var_assets_decommission
) year
WHERE asset = ?
ORDER BY year;
";