//! Transportation price analysis service for energy flow constraints.
//! 
//! This module analyzes transportation prices using dual values from transport flow limit
//! constraints in the Tulipa Energy Model optimization results. Provides pricing analysis
//! for energy transmission infrastructure and capacity limitations.
//! 
//! ## Transportation Analysis
//! 
//! - **Flow Constraints**: Transport flow limit constraint dual values
//! - **Directional Analysis**: Separate analysis for inbound and outbound flows
//! - **Carrier-specific**: Analysis by energy carrier type (electricity, gas, etc.)
//! - **Time Resolution**: Configurable temporal aggregation
//! 
//! ## Price Interpretation
//! 
//! - **Dual Values**: Marginal cost of transport capacity constraints
//! - **Economic Value**: Cost of additional transport capacity
//! - **Infrastructure Planning**: Guidance for transmission investment
//! - **Bottleneck Identification**: Highlights congested transport routes
//! 
//! ## Business Applications
//! 
//! - Transmission pricing and tariff design
//! - Infrastructure investment prioritization
//! - Congestion management and planning
//! - Energy market analysis and forecasting

use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value };
use tauri::ipc::Response;
use crate::{duckdb_conn::{run_query_rb, serialize_recordbatch}, services::metadata::check_column_in_table};
use crate::services::query_builder::build_resolution_query;

/// Calculates transportation prices using dual values from flow limit constraints.
/// 
/// Transportation Price Analysis:
/// - Extracts dual values from transport flow limit constraint equations
/// - Supports directional analysis with configurable column types
/// - Applies time resolution aggregation and carrier filtering
/// - Handles missing constraint tables with fallback empty results
/// 
/// Flow Direction Analysis:
/// - **Inbound**: Transportation capacity into regions/assets
/// - **Outbound**: Transportation capacity out of regions/assets
/// - **Bidirectional**: Combined analysis for comprehensive pricing
/// 
/// # Parameters
/// * `year` - Analysis year for milestone data
/// * `carrier` - Energy carrier type for filtering (electricity, gas, etc.)
/// * `resolution` - Time aggregation resolution in hours
/// * `column_type` - Flow direction: "max" for inbound, "min" for outbound flows
#[tauri::command]
pub fn get_transportation_price_resolution(db_path: String, year: u32, carrier: String, resolution: u32, column_type: String) -> Result<Response, String> {
let dual = &format!("dual_{}_transport_flow_limit_simple_method", column_type);
    let pre_table_sql: String;
    let wrapped_sql: String;

    if check_column_in_table(db_path.clone(), "cons_transport_flow_limit_simple_method", dual)? {
    let carrier_filter = if carrier == "all" {
    ""
} else {
    &format!("WHERE f.carrier = '{}'", carrier)
};
    pre_table_sql =  format!(
    "
        SELECT 
            f.carrier,
            tr.year,
            tr.rep_period,
            tr.time_block_start,
            tr.time_block_end,
            dual_{}_transport_flow_limit_simple_method AS dual_value
        FROM cons_transport_flow_limit_simple_method AS tr
        JOIN flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
        {}
    ", column_type, carrier_filter);
    let sql = build_resolution_query(
        "transportation_table",
        "dual_value",
        &["carrier"],
        "avg",
        &resolution.to_string(),
        false,
    ).trim_end_matches(';').trim_end().to_string();
    wrapped_sql = format!(
    "
    WITH transportation_table AS (
    {}
    )
    SELECT * FROM (
        {}
    ) AS subquery
    ",
    pre_table_sql,
    sql
    );
    }
    else {
        wrapped_sql = format!("
    SELECT
    '{}' AS carrier,
    ? AS milestone_year,
    0 AS global_start,
    0 AS global_end,
    0 AS y_axis
    FROM cons_transport_flow_limit_simple_method
    ", carrier);
    }
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, wrapped_sql, vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);

}

/// Retrieves all available transportation carriers from the database.
/// 
/// Carrier Discovery:
/// - Filters flow table for transport-enabled carriers only
/// - Returns sorted list of available energy carrier types
/// - Used for populating UI dropdowns and filter options
/// - Excludes non-transport flows to focus on transmission analysis
#[tauri::command]
pub fn get_transportation_carriers(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, CARRIER_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---
const CARRIER_SQL: &str = "
    SELECT DISTINCT carrier
    FROM flow
    WHERE is_transport = TRUE
    ORDER BY carrier;
    ";