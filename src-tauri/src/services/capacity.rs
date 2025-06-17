use duckdb::arrow::datatypes::Schema;
use duckdb::{ types::Value, arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::services::metadata::check_column_in_table;
use crate::duckdb_conn::{execute_batch, run_query_rb, serialize_recordbatch};

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
) -> Result<Response, String> {
    // Conditional column handling: Check if solution columns exist in database schema
    let inv_has = check_column_in_table(db_path.clone(), "var_assets_investment", "solution")?;
    let dec_has = check_column_in_table(db_path.clone(), "var_assets_decommission", "solution")?;

    // if not exists, add columns with all nulls to table
    if !inv_has {
      println!("COLUMN '{}' MISSING FROM '{}', INSERTING NULL-COLUMN\n", "solution", "var_assets_investment");
      let _ = execute_batch(db_path.clone(), ADD_INV_COL_SQL.to_string());
    }

    if !dec_has {
      println!("COLUMN '{}' MISSING FROM '{}', INSERTING NULL-COLUMN\n", "solution", "var_assets_decommission");
      let _ = execute_batch(db_path.clone(), ADD_DEC_COL_SQL.to_string());
    }

    // regular query
    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, CAPACITY_SQL.to_string(), vec![Value::from(asset_name)])?;
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


const CAPACITY_SQL: &str = "
WITH years AS (
  SELECT DISTINCT year FROM (
    SELECT ab.milestone_year AS year FROM asset_both ab WHERE ab.asset = $1
    UNION
    SELECT i.milestone_year AS year FROM var_assets_investment i WHERE i.asset = $1
    UNION
    SELECT milestone_year AS year FROM var_assets_decommission d WHERE d.asset = $1
  ) t
)

SELECT
  -- af.asset,
  y.year,
  ANY_VALUE(CASE WHEN (i.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (i.solution * af.capacity) END) AS investment,
  ANY_VALUE(CASE WHEN (d.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (d.solution * af.capacity) END) AS decommission,
  (
    COALESCE(SUM(ab.initial_units),0)
    +
    (
      SELECT COALESCE(SUM(solution), 0)
      FROM var_assets_investment
      WHERE asset = af.asset AND milestone_year <= y.year
    )
    -
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_decommission
    WHERE asset = af.asset AND milestone_year <= y.year
    )
  ) * ANY_VALUE(af.capacity) AS final_capacity,
  (
    COALESCE(SUM(ab.initial_units),0)
    + 
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_investment
    WHERE asset = af.asset AND milestone_year < y.year
    )
    -
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_decommission
    WHERE asset = af.asset AND milestone_year < y.year
    )
  ) * ANY_VALUE(af.capacity) AS initial_capacity
FROM asset af
CROSS JOIN years y
LEFT JOIN var_assets_investment AS i ON (i.asset = af.asset AND i.milestone_year = y.year)
LEFT JOIN var_assets_decommission AS d ON (d.asset = af.asset AND d.milestone_year = y.year)
LEFT JOIN asset_both ab ON (ab.asset = af.asset AND ab.milestone_year = y.year)
WHERE af.asset = $1
GROUP BY af.asset, y.year
ORDER BY y.year;
";

// TNO specified columns should ALWAYS be present (but can be null)
// defaults to NULL
const ADD_INV_COL_SQL: &str = "
  ALTER TABLE var_assets_investment ADD COLUMN solution DOUBLE;
";

// defaults to NULL
const ADD_DEC_COL_SQL: &str = "
  ALTER TABLE var_assets_decommission ADD COLUMN solution DOUBLE;
";