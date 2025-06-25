//! Production price analysis service using dual values from optimization constraints.
//! 
//! This module calculates energy production prices by extracting dual values from
//! capacity constraint equations in the Tulipa Energy Model optimization results.
//! Supports multiple optimization methods and provides time-resolution aggregation.
//! 
//! ## Price Calculation Methodology
//! 
//! - **Dual Values**: Marginal cost of capacity constraint relaxation
//! - **Economic Interpretation**: Value of additional production capacity
//! - **Asset Types**: Producer, storage, and conversion assets
//! - **Time Resolution**: Configurable aggregation (hourly, daily, etc.)
//! 
//! ## Optimization Method Support
//! 
//! - **Simple Method**: Individual asset constraints
//! - **Compact Method**: Aggregated constraint formulations
//! - **Hybrid Support**: Combines both methods when available
//! - **Graceful Fallback**: Handles missing constraint tables
//! 
//! ## Business Applications
//! 
//! - Energy pricing analysis and forecasting
//! - Investment decision support and ROI calculations
//! - Market price discovery and benchmarking
//! - Capacity planning and optimization insights

use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::services::query_builder::{build_resolution_query, build_resolution_query_with_filters, build_resolution_query_with_filters_and_breakdown, build_breakdown_columns,
    build_breakdown_joins, build_breakdown_case_conditions, build_filter_conditions, build_breakdown_selects, build_breakdown_group_by};
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::{check_column_in_table, apply_carrier_filter};
use std::collections::HashMap;

#[tauri::command]
pub fn get_production_price_resolution(
    db_path: String,
    year: u32,
    resolution: u32,
    carrier: String,
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool) -> Result<Response, String> {
    let sql: String;
    let has_breakdown = !grouper.is_empty();

    if enable_metadata {
        if has_breakdown {
            // With filters and breakdown
            let breakdown_cols = build_breakdown_columns(&grouper);
            sql = build_resolution_query_with_filters_and_breakdown(
                "production_table",
                "dual_value",
                &breakdown_cols,
                "avg",
                &resolution.to_string(),
                &filters,
                &grouper,
                "ac.asset".to_string(),
                "ac.asset".to_string(),
                false
            ).trim_end_matches(';').trim_end().to_string();
        }
        else {
            // With filters without breakdown
            sql = build_resolution_query_with_filters(
                "production_table",
                "dual_value",
                &["asset"],
                "avg",
                &resolution.to_string(),
                &filters,
                "ac.asset".to_string(),
                false
            ).trim_end_matches(';').trim_end().to_string();
        }
    }
     else {
        sql = build_resolution_query(
            "production_table",
            "dual_value",
            &["asset"],
            "avg",
            &resolution.to_string(),
            false
        ).trim_end_matches(';').trim_end().to_string();
    }

    println!("Filtering on nodes: {:#?}", filters);
    println!("Grouping on nodes: {:#?}", grouper);
    
    let query: String;
    
    // Conditional query adaptation based on available optimization method tables
    if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_compact_method", "dual_max_output_flows_limit_compact_method")? {
        if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_simple_method", "dual_max_output_flows_limit_simple_method")? {
            let temp_query = format!(
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
            )
            .replace("{breakdown_selects}", &build_breakdown_selects(&grouper))
            .replace("{breakdown_group_by}", &build_breakdown_group_by(&grouper))
            .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
            .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
            if enable_metadata {
            query = temp_query.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())))
            } else {
                query = temp_query.replace("{filtered_assets}", &"SELECT * FROM asset")
            }
        } else {
            let temp_query = format!(
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
            )
            .replace("{breakdown_selects}", &build_breakdown_selects(&grouper))
            .replace("{breakdown_group_by}", &build_breakdown_group_by(&grouper))
            .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
            .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
            if enable_metadata {
            query = temp_query.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())))
            } else {
                query = temp_query.replace("{filtered_assets}", &"SELECT * FROM asset")
            }
        }
        
    }
    else {
        if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_simple_method", "dual_max_output_flows_limit_simple_method")? {
           let temp_query = format!(
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
            )
            .replace("{breakdown_selects}", &build_breakdown_selects(&grouper))
            .replace("{breakdown_group_by}", &build_breakdown_group_by(&grouper))
            .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
            .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
            if enable_metadata {
            query = temp_query.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())))
            } else {
                query = temp_query.replace("{filtered_assets}", &"SELECT * FROM asset")
            }
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
            CASE 
                {breakdown_case_conditions}
            ELSE 'Other'
            END AS asset,
            simple.year,
            simple.rep_period,
            simple.time_block_start,
            simple.time_block_end,
            simple.dual_max_output_flows_limit_simple_method as dual_value
            {breakdown_selects}
        FROM cons_capacity_outgoing_simple_method AS simple
        JOIN ({filtered_assets}) AS a ON simple.asset = a.asset
        {breakdown_joins}
        WHERE a.type = 'producer' OR a.type = 'storage' OR a.type = 'conversion'
        GROUP BY
        simple.year,
            simple.rep_period,
            simple.time_block_start,
            simple.time_block_end,
            dual_value
        {breakdown_group_by},
        CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
        END
    ";

    const PRODUCTION_DATA_COMPACT_SQL: &str = "
        SELECT
            CASE 
                {breakdown_case_conditions}
            ELSE 'Other'
            END AS asset,
            compact.year,
            compact.rep_period,
            compact.time_block_start,
            compact.time_block_end,
            compact.dual_max_output_flows_limit_compact_method as dual_value
            {breakdown_selects}
        FROM cons_capacity_outgoing_compact_method AS compact
        JOIN ({filtered_assets}) AS a ON compact.asset = a.asset
        {breakdown_joins}
        WHERE a.type = 'producer' OR a.type = 'storage' OR a.type = 'conversion'
        GROUP BY
         compact.year,
            compact.rep_period,
            compact.time_block_start,
            compact.time_block_end,
            dual_value
        {breakdown_group_by},
        CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
        END
    ";

const EMPTY_SQL: &str = "
                SELECT 
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END AS asset,
                    0 AS year,
                    0 AS rep_period,
                    0 AS time_block_start,
                    0 AS time_block_end,
                    0 AS dual_value
                FROM cons_capacity_outgoing_simple_method AS simple
                JOIN ({filtered_assets}) AS a ON simple.asset = a.asset
                {breakdown_joins}
                GROUP BY
                simple.year,
                simple.rep_period,
                simple.time_block_start,
                simple.time_block_end,
                dual_value
                {breakdown_group_by},
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END
                ";