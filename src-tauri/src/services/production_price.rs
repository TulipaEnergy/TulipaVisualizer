use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::services::query_builder::build_resolution_query;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::check_column_in_table;

/// Calculates production prices using dual values from optimization constraints.
/// 
/// Price Calculation Methodology:
/// - Extracts dual values from capacity constraint equations
/// - Supports both simple and compact optimization methods
/// - Applies time resolution aggregation (hourly, daily, etc.)
/// - Handles different asset types: producer, storage, conversion
/// 
/// Dual Value Interpretation:
/// - Represents marginal cost of capacity constraint relaxation
/// - Indicates economic value of additional production capacity
/// - Used for pricing analysis and investment decision support
/// 
/// # Parameters
/// * `year` - Milestone year for analysis
/// * `resolution` - Time aggregation resolution in hours
#[tauri::command]
pub fn get_production_price_resolution(db_path: String, year: u32, resolution: u32) -> Result<Response, String> {
    let sql = build_resolution_query(
        "production_table",
        "dual_value",
        &["asset"],
        "avg",
        &resolution.to_string(),
        false,
    ).trim_end_matches(';').trim_end().to_string();
    let query: String;
    
    // Conditional query adaptation based on available optimization method tables
    if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_compact_method", "dual_max_output_flows_limit_compact_method")? {
        if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_simple_method", "dual_max_output_flows_limit_simple_method")? {
            // Both methods available - combine data sources
            query = format!(
                "
                WITH production_table AS (
                    {}
                    UNION ALL
                    {}
                )
                SELECT * FROM (
                    {}
                ) AS subquery
                ",
                PRODUCTION_DATA_SIMPLE_SQL,
                PRODUCTION_DATA_COMPACT_SQL,
                sql
            );
        } else {
            // Only compact method available
            query = format!(
                "
                WITH production_table AS (
                    {}
                )
                SELECT * FROM (
                    {}
                ) AS subquery
                ",
                PRODUCTION_DATA_COMPACT_SQL,
                sql
            );
        }
        
    }
    else {
        if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_simple_method", "dual_max_output_flows_limit_simple_method")? {
            // Only simple method available
            query = format!(
                "
                WITH production_table AS (
                    {}
                )
                SELECT * FROM (
                    {}
                ) AS subquery
                ",
                PRODUCTION_DATA_SIMPLE_SQL,
                sql
            );
        } else {
            return Err("No valid production data found in the database.".to_string());
        }
    }
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, query, vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);

}

/// Retrieves all available years with production price data.
/// Used for populating year selection UI components.
#[tauri::command]
pub fn get_production_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, PRODUCTION_YEARS_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}
// --- TESTING ---

// --- QUERIES ---

/// SQL query to find all years with consumer balance data.
/// Uses consumer balance table as proxy for production data availability.
const PRODUCTION_YEARS_SQL: &str = "
    SELECT DISTINCT year
    FROM cons_balance_consumer
    ORDER BY year;
";

/// SQL query for production dual values using simple optimization method.
/// 
/// Data Sources:
/// - cons_capacity_outgoing_simple_method: Simple constraint dual values
/// - asset table: Asset type filtering (producer, storage, conversion)
/// 
/// Dual Value Context:
/// - dual_max_output_flows_limit_simple_method: Marginal value of output capacity
const PRODUCTION_DATA_SIMPLE_SQL: &str = "
    SELECT
        simple.asset,
        simple.year,
        simple.rep_period,
        simple.time_block_start,
        simple.time_block_end,
        simple.dual_max_output_flows_limit_simple_method as dual_value
    FROM cons_capacity_outgoing_simple_method AS simple
    JOIN asset AS a ON a.asset = simple.asset
    WHERE a.type = 'producer' OR a.type = 'storage' OR a.type = 'conversion'
";

/// SQL query for production dual values using compact optimization method.
/// 
/// Data Sources:
/// - cons_capacity_outgoing_compact_method: Compact constraint dual values
/// - asset table: Asset type filtering
/// 
/// Dual Value Context:
/// - dual_max_output_flows_limit_compact_method: Marginal value of output capacity
const PRODUCTION_DATA_COMPACT_SQL: &str = "
    SELECT
        compact.asset,
        compact.year,
        compact.rep_period,
        compact.time_block_start,
        compact.time_block_end,
        compact.dual_max_output_flows_limit_compact_method as dual_value
    FROM cons_capacity_outgoing_compact_method AS compact
    JOIN asset AS a ON a.asset = compact.asset
    WHERE a.type = 'producer' OR a.type = 'storage' OR a.type = 'conversion'
";