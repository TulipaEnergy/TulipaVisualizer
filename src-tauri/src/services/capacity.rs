use duckdb::arrow::datatypes::Schema;
use duckdb::{ types::Value, arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::services::metadata::check_column_in_table;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

/// Calculates asset capacity evolution over time including investments and decommissions.
/// 
/// This function builds a complex SQL query that handles different database schemas
/// by conditionally including investment and decommission data based on column availability.
/// 
/// # Business Logic
/// - Initial capacity: Base asset units from asset_both table
/// - Investment capacity: New capacity additions from optimization solution
/// - Decommission capacity: Capacity removals from optimization solution
/// - Final capacity: Initial + investments - decommissions
/// 
/// # Parameters
/// * `asset_name` - Specific asset to analyze (e.g., "wind_onshore_NL")
/// * `start_year` - Beginning of analysis period
/// * `end_year` - End of analysis period
#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
    start_year: u32,
    end_year: u32,
) -> Result<Response, String> {
    // Conditional column handling: Check if solution columns exist in database schema
    let inv_has = check_column_in_table(db_path.clone(), "var_assets_investment", "solution")?;
    let dec_has = check_column_in_table(db_path.clone(), "var_assets_decommission", "solution")?;

    // Build dynamic SQL expressions based on available columns
    let invest_expr = if inv_has {
        "COALESCE(i.solution * c.capacity, -1) AS investment"
    } else {
        "-1 AS investment" // frontend handles -1
    };

    let decomm_expr = if dec_has {
        "COALESCE(d.solution * c.capacity, -1) AS decommission"
    } else {
        "-1 AS decommission"
    };

    // Cumulative investment calculations up to specific years
    let inv_upto = if inv_has {
    "
    (
      SELECT COALESCE(SUM(solution), 0)
      FROM var_assets_investment
      WHERE asset = $1 AND milestone_year <= y.year
    )
    "
    } else {
        "0"
    };

    let inv_before = if inv_has {
        "
        (
        SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_investment
        WHERE asset = $1 AND milestone_year < y.year
        )
        "
    } else {
        "0"
    };

    // Cumulative decommission calculations up to specific years
    let dec_upto = if dec_has {
        "
        (
        SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_decommission
        WHERE asset = $1 AND milestone_year <= y.year
        )
        "
    } else {
        "0"
    };
    let dec_before = if dec_has {
        "
        (
        SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_decommission
        WHERE asset = $1 AND milestone_year < y.year
        )
        "
    } else {
        "0"
    };

    // Dynamic SQL generation with conditional expressions
    let sql = format!(r#"
WITH years AS (
  SELECT DISTINCT year FROM (
    SELECT milestone_year AS year FROM asset_both WHERE asset = $1
    UNION
    SELECT milestone_year AS year FROM var_assets_investment WHERE asset = $1
    UNION
    SELECT milestone_year AS year FROM var_assets_decommission WHERE asset = $1
  ) t
  WHERE year BETWEEN $2 AND $3
),
capacity_val AS (
  SELECT capacity FROM asset WHERE asset = $1
)
SELECT
  y.year,
  {invest_expr},
  {decomm_expr},
  (
    (
      SELECT COALESCE(SUM(initial_units),0)
      FROM asset_both
      WHERE asset = $1 AND milestone_year = y.year
    )
    + {inv_upto}
    - {dec_upto}
  ) * c.capacity AS final_capacity,
  (
    (
      SELECT COALESCE(SUM(initial_units),0)
      FROM asset_both
      WHERE asset = $1 AND milestone_year = y.year
    )
    + {inv_before}
    - {dec_before}
  ) * c.capacity AS initial_capacity
FROM years y
LEFT JOIN var_assets_investment AS i ON (i.asset = $1 AND i.milestone_year = y.year)
LEFT JOIN var_assets_decommission AS d ON (d.asset = $1 AND d.milestone_year = y.year)
CROSS JOIN capacity_val c
ORDER BY y.year;
"#,
        invest_expr = invest_expr,
        decomm_expr = decomm_expr,
        inv_upto = inv_upto,
        inv_before = inv_before,
        dec_upto = dec_upto,
        dec_before = dec_before,
    );

    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, sql, vec![
            Value::from(asset_name.clone()),
            Value::from(start_year),
            Value::from(end_year),
        ])?;
    serialize_recordbatch(res.0, res.1)
}

/// Retrieves all available milestone years for a specific asset across all capacity-related tables.
/// Used for populating year selection dropdowns in the frontend.
#[tauri::command]
pub fn get_available_years(db_path: String, asset_name: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, AVAILABLE_YEARS_SQL.to_string(), vec![Value::from(asset_name)])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---

/// SQL query to find all milestone years where an asset has capacity data.
/// Unions data from initial capacity, investment, and decommission tables.
const AVAILABLE_YEARS_SQL: &str = "
SELECT DISTINCT year FROM (
    SELECT milestone_year AS year, asset FROM asset_both
    UNION
    SELECT milestone_year AS year, asset FROM var_assets_investment
    UNION
    SELECT milestone_year AS year, asset FROM var_assets_decommission
) year
WHERE asset = ?
ORDER BY year;
";