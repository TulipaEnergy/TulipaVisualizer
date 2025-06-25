use duckdb::arrow::datatypes::Schema;
use duckdb::arrow::array::RecordBatch;
use tauri::ipc::Response;
use std::collections::HashMap;
use crate::services::metadata::check_column_in_table;
use crate::duckdb_conn::{execute_batch, run_query_rb, serialize_recordbatch};
use crate::services::query_builder::{build_breakdown_case_conditions, build_breakdown_group_by, build_breakdown_joins, build_breakdown_selects, build_filter_conditions};

#[tauri::command]
pub fn get_capacity(
    db_path: String,
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool,
) -> Result<Response, String> {
    // Check for solution columns
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

    // Build the SQL query with optional filters and breakdown
    let query = if enable_metadata && (!filters.is_empty() || !grouper.is_empty()) {
        // Build breakdown components
        let breakdown_case_conditions = build_breakdown_case_conditions(&grouper, "bc.asset".to_string());
        let breakdown_joins = build_breakdown_joins(&grouper);
        let breakdown_selects = build_breakdown_selects(&grouper);
        let breakdown_group_by = build_breakdown_group_by(&grouper);
        
        // Build filter conditions
        let filter_conditions = if !filters.is_empty() {
            build_filter_conditions(&filters, "af.asset".to_string())
        } else {
            String::new()
        };

        // Create the modified query with breakdown and filters
        CAPACITY_SQL_WITH_BREAKDOWN
            .replace("{breakdown_case_conditions}", &breakdown_case_conditions)
            .replace("{breakdown_selects}", &breakdown_selects)
            .replace("{breakdown_joins}", &breakdown_joins)
            .replace("{filter_conditions}", &filter_conditions)
            .replace("{breakdown_group_by}", &breakdown_group_by)
    } else {
        CAPACITY_SQL.to_string()
    };

    // Execute query
    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, query, vec![])?;
    serialize_recordbatch(res.0, res.1)
}

// --- TESTING ---

// --- QUERIES ---

const CAPACITY_SQL: &str = "
WITH years AS (
  SELECT DISTINCT year FROM (
    SELECT ab.milestone_year AS year FROM asset_both ab
    UNION
    SELECT i.milestone_year AS year FROM var_assets_investment i
    UNION
    SELECT milestone_year AS year FROM var_assets_decommission d
  ) t
),
assets AS (
  SELECT DISTINCT asset FROM asset_both
  UNION
  SELECT DISTINCT asset FROM var_assets_investment
  UNION
  SELECT DISTINCT asset FROM var_assets_decommission
)

SELECT
  af.asset,
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
WHERE af.asset IN (SELECT asset FROM assets)
GROUP BY af.asset, y.year
ORDER BY af.asset, y.year";

const CAPACITY_SQL_WITH_BREAKDOWN: &str = "
WITH years AS (
  SELECT DISTINCT year FROM (
    SELECT ab.milestone_year AS year FROM asset_both ab
    UNION
    SELECT i.milestone_year AS year FROM var_assets_investment i
    UNION
    SELECT milestone_year AS year FROM var_assets_decommission d
  ) t
),
assets AS (
  SELECT DISTINCT asset FROM asset_both
  UNION
  SELECT DISTINCT asset FROM var_assets_investment
  UNION
  SELECT DISTINCT asset FROM var_assets_decommission
),
base_capacity AS (
  SELECT
    af.asset,
    y.year,
    CASE WHEN (i.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (i.solution * af.capacity) END AS investment,
    CASE WHEN (d.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (d.solution * af.capacity) END AS decommission,
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
    ) * af.capacity AS final_capacity,
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
    ) * af.capacity AS initial_capacity
  FROM asset af
  CROSS JOIN years y
  LEFT JOIN var_assets_investment AS i ON (i.asset = af.asset AND i.milestone_year = y.year)
  LEFT JOIN var_assets_decommission AS d ON (d.asset = af.asset AND d.milestone_year = y.year)
  LEFT JOIN asset_both ab ON (ab.asset = af.asset AND ab.milestone_year = y.year)
  WHERE af.asset IN (SELECT asset FROM assets){filter_conditions}
  GROUP BY af.asset, y.year, i.solution, d.solution, af.capacity
)

SELECT
  -- Group by breakdown categories and include 'Other' category
  CASE 
    {breakdown_case_conditions}
    ELSE 'Other'
  END AS asset,
  bc.year,
  SUM(bc.investment) AS investment,
  SUM(bc.decommission) AS decommission,
  SUM(bc.final_capacity) AS final_capacity,
  SUM(bc.initial_capacity) AS initial_capacity{breakdown_selects}
FROM base_capacity bc
{breakdown_joins}
GROUP BY 
  CASE 
    {breakdown_case_conditions}
    ELSE 'Other'
  END,
  bc.year{breakdown_group_by}
ORDER BY 
  CASE 
    {breakdown_case_conditions}
    ELSE 'Other'
  END, bc.year";

// TNO specified columns should ALWAYS be present (but can be null)
// defaults to NULL
const ADD_INV_COL_SQL: &str = "
  ALTER TABLE var_assets_investment ADD COLUMN solution DOUBLE;
";

// defaults to NULL
const ADD_DEC_COL_SQL: &str = "
  ALTER TABLE var_assets_decommission ADD COLUMN solution DOUBLE;
";