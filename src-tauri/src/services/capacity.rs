//! Asset capacity analysis service providing investment and decommission tracking.
//! 
//! This module handles capacity evolution analysis for energy assets over time,
//! including capacity investments, decommissions, and year-over-year changes.
//! Supports graceful degradation for databases missing investment/decommission data.
//! 
//! ## Key Features
//! 
//! - Initial capacity tracking from asset specifications
//! - Investment capacity additions from optimization solutions
//! - Decommission capacity removals from optimization solutions
//! - Cumulative capacity calculations over milestone years
//! - Schema compatibility handling for optional solution columns
//! 
//! ## Business Logic
//! 
//! The service calculates capacity evolution using the formula:
//! `Final Capacity = Initial Units + Cumulative Investments - Cumulative Decommissions`
//! 
//! Missing solution data is represented as -1 to distinguish from actual zero values.

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
-- Comprehensive year discovery across all capacity-related tables
-- Ensures complete timeline coverage for asset capacity analysis
SELECT DISTINCT year FROM (
    -- Initial capacity years from asset commissioning data
    SELECT milestone_year AS year, asset FROM asset_both
    UNION
    -- Investment milestone years from optimization solution
    SELECT milestone_year AS year, asset FROM var_assets_investment
    UNION
    -- Decommission milestone years from optimization solution  
    SELECT milestone_year AS year, asset FROM var_assets_decommission
) year
WHERE asset = ?
ORDER BY year;
";

/// Complex capacity evolution query with cumulative calculations and fallback handling.
/// 
/// Business Logic Implementation:
/// 1. Finds all relevant years across capacity tables
/// 2. Calculates point-in-time investments and decommissions
/// 3. Computes cumulative capacity including historical changes
/// 4. Handles missing solution data with -1 sentinel values
/// 
/// Key Features:
/// - Graceful handling of NULL solution values (outputs -1)
/// - Cumulative calculations using subqueries with year filtering
/// - Cross joins to ensure complete year coverage
/// - Conversion from units to MW using capacity factor
const CAPACITY_SQL: &str = "
-- CTE to gather all milestone years where asset has any capacity data
WITH years AS (
  SELECT DISTINCT year FROM (
    -- Initial capacity from commissioned assets
    SELECT ab.milestone_year AS year FROM asset_both ab WHERE ab.asset = $1
    UNION
    -- Investment years from optimization decisions
    SELECT i.milestone_year AS year FROM var_assets_investment i WHERE i.asset = $1
    UNION
    -- Decommission years from optimization decisions
    SELECT milestone_year AS year FROM var_assets_decommission d WHERE d.asset = $1
  ) t
)

SELECT
  y.year,
  -- Point-in-time investment for this specific year (MW)
  -- Returns -1 if solution data unavailable to distinguish from zero investment
  ANY_VALUE(CASE WHEN (i.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (i.solution * af.capacity) END) AS investment,
  
  -- Point-in-time decommission for this specific year (MW)  
  -- Returns -1 if solution data unavailable to distinguish from zero decommission
  ANY_VALUE(CASE WHEN (d.solution IS NULL OR af.capacity IS NULL) THEN (-1) ELSE (d.solution * af.capacity) END) AS decommission,
  
  -- Cumulative capacity at end of year (MW)
  -- Formula: Initial Units + All Investments <= year - All Decommissions <= year
  (
    COALESCE(SUM(ab.initial_units),0)
    +
    -- Cumulative investments up to and including current year
    (
      SELECT COALESCE(SUM(solution), 0)
      FROM var_assets_investment
      WHERE asset = af.asset AND milestone_year <= y.year
    )
    -
    -- Cumulative decommissions up to and including current year
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_decommission
    WHERE asset = af.asset AND milestone_year <= y.year
    )
  ) * ANY_VALUE(af.capacity) AS final_capacity,
  
  -- Capacity at beginning of year (before current year's changes)
  -- Formula: Initial Units + All Investments < year - All Decommissions < year
  (
    COALESCE(SUM(ab.initial_units),0)
    + 
    -- Cumulative investments up to but excluding current year
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_investment
    WHERE asset = af.asset AND milestone_year < y.year
    )
    -
    -- Cumulative decommissions up to but excluding current year
    (
    SELECT COALESCE(SUM(solution), 0)
    FROM var_assets_decommission
    WHERE asset = af.asset AND milestone_year < y.year
    )
  ) * ANY_VALUE(af.capacity) AS initial_capacity
FROM asset af
CROSS JOIN years y  -- Ensures we get data for all years even if no investments/decommissions
LEFT JOIN var_assets_investment AS i ON (i.asset = af.asset AND i.milestone_year = y.year)
LEFT JOIN var_assets_decommission AS d ON (d.asset = af.asset AND d.milestone_year = y.year)
LEFT JOIN asset_both ab ON (ab.asset = af.asset AND ab.milestone_year = y.year)
WHERE af.asset = $1
GROUP BY af.asset, y.year
ORDER BY y.year;
";

// Schema compatibility: TNO specified columns should ALWAYS be present (but can be null)
// Adding missing solution columns with NULL defaults for graceful degradation
const ADD_INV_COL_SQL: &str = "
  -- Add missing solution column to investment table for schema compatibility
  ALTER TABLE var_assets_investment ADD COLUMN solution DOUBLE;
";

const ADD_DEC_COL_SQL: &str = "
  -- Add missing solution column to decommission table for schema compatibility  
  ALTER TABLE var_assets_decommission ADD COLUMN solution DOUBLE;
";