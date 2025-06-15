use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::types::Value;
use tauri::ipc::Response;

use crate::services::query_builder::build_resolution_query;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_renewables(db_path: String, year: u32, resolution: u32) -> Result<Response, String> {
    let sql = build_resolution_query(
        RENEWABLES_SUPPLY_SQL,
        "solution",
        &["asset"],
        "sum",
        &resolution.to_string(),
        false,
    );

    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, sql, vec![Value::from(year)])?;
    serialize_recordbatch(res.0, res.1)
}

#[tauri::command]
pub fn get_nonrenewables(db_path: String, year: u32, resolution: u32) -> Result<Response, String> {
    let sql = build_resolution_query(
        NONRENEWABLES_SUPPLY_SQL,
        "solution",
        &["asset"],
        "sum",
        &resolution.to_string(),
        false,
    );

    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, sql, vec![Value::from(year)])?;
    serialize_recordbatch(res.0, res.1)
}

#[tauri::command]
pub fn get_yearly_renewables(db_path: String, year: u32) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, RENEWABLES_YEARLY_SQL.to_string(), vec![Value::from(year)])?;
    serialize_recordbatch(res.0, res.1)
}

#[tauri::command]
pub fn get_yearly_nonrenewables(db_path: String, year: u32) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, NONRENEWABLES_YEARLY_SQL.to_string(), vec![Value::from(year)])?;
    serialize_recordbatch(res.0, res.1)
}

#[tauri::command]
pub fn get_supply_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) =
        run_query_rb(db_path, SUPPLY_YEARS_SQL.to_string(), vec![])?;
    serialize_recordbatch(res.0, res.1)
}


// --- TESTING ---

// --- QUERIES ---

const RENEWABLES_SUPPLY_SQL: &str = "
  (
    SELECT
      f.from_asset AS asset,
      f.year,
      f.time_block_start,
      f.time_block_end,
      f.solution,
      f.rep_period,
      a.type
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    JOIN assets_profiles AS ap ON f.from_asset = ap.asset
    WHERE a.type = 'consumer'
      AND ap.profile_type = 'availability'
  ) AS renewables_flows";

const NONRENEWABLES_SUPPLY_SQL: &str = "
  (
    SELECT
      f.from_asset AS asset,
      f.year,
      f.time_block_start,
      f.time_block_end,
      f.solution,
      f.rep_period,
      a.type
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    WHERE a.type = 'consumer'
      AND NOT EXISTS (
        SELECT 1
        FROM assets_profiles ap
        WHERE ap.asset = f.from_asset
          AND ap.profile_type = 'availability'
      )
  ) AS nonrenewables_flows";

  const RENEWABLES_YEARLY_SQL: &str = "
  SELECT
    bc.from_asset AS asset,
    0 AS global_start,
    1 AS global_end,
    SUM(bc.solution * (bc.time_block_end - bc.time_block_start + 1) * d.resolution * m.weight) AS y_axis
  FROM (
    SELECT f.*, a.type
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    JOIN assets_profiles ap ON f.from_asset = ap.asset
    WHERE a.type = 'consumer'
      AND ap.profile_type = 'availability'
  ) AS bc
  JOIN rep_periods_mapping AS m 
    ON m.year = bc.year AND m.rep_period = bc.rep_period
  JOIN rep_periods_data AS d
    ON d.year = m.year AND d.rep_period = m.rep_period
  WHERE bc.year = ?
  GROUP BY bc.from_asset
";

const NONRENEWABLES_YEARLY_SQL: &str = "
  SELECT
    bc.from_asset AS asset,
    0 AS global_start,
    1 AS global_end,
    SUM(bc.solution * (bc.time_block_end - bc.time_block_start + 1) * d.resolution * m.weight) AS y_axis
  FROM (
    SELECT f.*, a.type
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    WHERE a.type = 'consumer'
      AND NOT EXISTS (
        SELECT 1
        FROM assets_profiles ap
        WHERE ap.asset = f.from_asset
          AND ap.profile_type = 'availability'
      )
  ) AS bc
  JOIN rep_periods_mapping AS m 
    ON m.year = bc.year AND m.rep_period = bc.rep_period
  JOIN rep_periods_data AS d
    ON d.year = m.year AND d.rep_period = m.rep_period
  WHERE bc.year = ?
  GROUP BY bc.from_asset
";

const SUPPLY_YEARS_SQL: &str = "
    SELECT DISTINCT f.year
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    WHERE a.type = 'consumer'
    ORDER BY f.year
";