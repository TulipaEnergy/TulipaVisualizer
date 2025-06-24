use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::types::Value;
use tauri::ipc::Response;
use std::collections::HashMap;

use crate::services::query_builder::{build_resolution_query_with_filters, 
  build_resolution_query_with_filters_and_breakdown, 
  build_breakdown_columns,
  build_resolution_query};
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_supply(
    db_path: String, 
    year: u32, 
    resolution: u32,
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool
) -> Result<Response, String> {
    
    let sql;
    let has_breakdown = !grouper.is_empty();

    if enable_metadata {
      if has_breakdown {
        // With filters and breakdown
        let breakdown_cols = build_breakdown_columns(&grouper);
        sql = build_resolution_query_with_filters_and_breakdown(
            SUPPLY_SQL_WITH_FILTERS_AND_BREAKDOWN,
            "solution",
            &breakdown_cols,
            "sum",
            &resolution.to_string(),
            &filters,
            &grouper,
            "ac.asset".to_string(),
            "bf.from_asset".to_string()
        )
      } else {
        // With filters without breakdown
        sql = build_resolution_query_with_filters(
            SUPPLY_SQL_WITH_FILTERS,
            "solution",
            &["asset"],
            "sum",
            &resolution.to_string(),
            &filters,
            "ac.asset".to_string()
        );
    } 
  } else {
    // Without categories
    sql = build_resolution_query(
        SUPPLY_SQL_WITHOUT_FILTERS,
        "solution",
        &["asset"],
        "sum",
        &resolution.to_string(),
        false
    );
  }
  let res: (Vec<RecordBatch>, Schema) =
      run_query_rb(db_path, sql, vec![Value::from(year)])?;
  serialize_recordbatch(res.0, res.1)
}

// --- TESTING ---

// --- QUERIES ---

const SUPPLY_SQL_WITHOUT_FILTERS: &str = "
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
  ) AS supply_flows";

const SUPPLY_SQL_WITH_FILTERS: &str = "
  (
    SELECT DISTINCT
      f.from_asset AS asset,
      f.year,
      f.time_block_start,
      f.time_block_end,
      f.solution,
      f.rep_period,
      a.type
    FROM var_flow AS f
    JOIN asset AS a ON f.to_asset = a.asset
    JOIN asset_category AS ac ON f.from_asset = ac.asset
    WHERE a.type = 'consumer'
      {filter_conditions} 
  ) AS supply_flows";

const SUPPLY_SQL_WITH_FILTERS_AND_BREAKDOWN: &str = "
  (
    -- The sql above:
    WITH base_flows AS (
      SELECT DISTINCT
        f.from_asset,
        f.year,
        f.time_block_start,
        f.time_block_end,
        f.solution,
        f.rep_period
      FROM var_flow AS f
      JOIN asset AS a ON f.to_asset = a.asset
      JOIN asset_category AS ac ON f.from_asset = ac.asset
      WHERE a.type = 'consumer'
        {filter_conditions}
    )
    SELECT
      -- Group by breakdown categories and include 'Other' category
      CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
      END AS asset,
      bf.year,
      bf.time_block_start,
      bf.time_block_end,
      SUM(bf.solution) AS solution,
      bf.rep_period,
      'consumer' AS type{breakdown_selects}
    FROM base_flows bf
    {breakdown_joins}
    GROUP BY 
      CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
      END,
      bf.year,
      bf.time_block_start,
      bf.time_block_end,
      bf.rep_period{breakdown_group_by}
  ) AS supply_flows";
