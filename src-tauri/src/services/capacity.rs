use duckdb::arrow::datatypes::Schema;
use duckdb::{ types::Value, arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::services::metadata::check_column_in_table;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
    start_year: u32,
    end_year: u32,
) -> Result<Response, String> {
    // Check for solution columns
    let inv_has = check_column_in_table(db_path.clone(), "var_assets_investment", "solution")?;
    let dec_has = check_column_in_table(db_path.clone(), "var_assets_decommission", "solution")?;

    // 2) Build the parts SELECT that based on the above check
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

    // plug into sql
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

#[tauri::command]
pub fn get_available_years(db_path: String, asset_name: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, AVAILABLE_YEARS_SQL.to_string(), vec![Value::from(asset_name)])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---

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