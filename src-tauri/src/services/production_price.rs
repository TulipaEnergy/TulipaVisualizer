use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::services::query_builder::build_resolution_query;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::{check_column_in_table, apply_carrier_filter};

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
pub fn get_production_price_resolution(db_path: String, year: u32, resolution: u32, carrier: String) -> Result<Response, String> {
    let sql = build_resolution_query(
        "production_table",
        "dual_value",
        &["carrier"],
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
                apply_carrier_filter(PRODUCTION_DATA_SIMPLE_SQL, &carrier),
                apply_carrier_filter(PRODUCTION_DATA_COMPACT_SQL, &carrier),
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
                apply_carrier_filter(PRODUCTION_DATA_COMPACT_SQL, &carrier),
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
                apply_carrier_filter(PRODUCTION_DATA_SIMPLE_SQL, &carrier),
                sql
            );
        } else {
            query = format!(
                "
                {}
                ",
                EMPTY_SQL
            );
        }
    }
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, query, vec![Value::from(year)])?;

    return serialize_recordbatch(res.0, res.1);

}

// --- TESTING ---

// --- QUERIES ---
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

    const EMPTY_SQL: &str = "
                SELECT 
                    '' AS carrier,
                    0 AS year,
                    0 AS rep_period,
                    0 AS time_block_start,
                    0 AS time_block_end,
                    0 AS dual_value
                FROM cons_capacity_outgoing_simple_method
                ";