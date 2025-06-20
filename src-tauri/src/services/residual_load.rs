use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::types::Value;
use tauri::ipc::Response;
use std::collections::HashMap;

use crate::services::query_builder::{build_resolution_query_with_filters, build_resolution_query};
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

/// Retrieves renewable energy supply data with time resolution aggregation.
/// 
/// Renewable Classification Logic:
/// - Assets with 'availability' profiles are considered renewable
/// - Includes wind, solar, hydro, and other variable renewable sources
/// - Filters flows going to consumer assets (demand satisfaction)
/// 
/// # Parameters
/// * `year` - Analysis year for data filtering
/// * `resolution` - Time aggregation resolution in hours
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
    if enable_metadata {
      sql = build_resolution_query_with_filters(
          SUPPLY_SQL_WITH_FILTERS,
          "solution",
          &["asset"],
          "sum",
          &resolution.to_string(),
          &filters,
      );
      println!("Filtering on nodes: {:#?}", filters);
      println!("Grouping on nodes: {:#?}", grouper);
    } else {
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
    JOIN asset_category AS ac ON f.from_asset = ac.asset
    WHERE a.type = 'consumer'
      {filter_conditions} 
  ) AS supply_flows";