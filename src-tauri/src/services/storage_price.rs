//! Storage pricing analysis service for energy storage systems.
//! 
//! This module analyzes storage pricing using dual values from energy balance constraints
//! in the Tulipa Energy Model optimization results. Supports both short-term and long-term
//! storage systems with different constraint formulations and temporal resolutions.
//! 
//! ## Storage Analysis Types
//! 
//! - **Short-term Storage**: Intra-period balance constraints (batteries, pumped hydro)
//! - **Long-term Storage**: Inter-period balance constraints (seasonal storage)
//! - **Combined Analysis**: Comparative analysis of both storage types
//! 
//! ## Price Calculation Methodology
//! 
//! - **Dual Values**: Marginal value of storage balance constraints
//! - **Time Resolution**: Configurable aggregation for different analysis needs
//! - **Representative Periods**: Weighted scaling for annual projections
//! - **Carrier Filtering**: Analysis by energy carrier type
//! 
//! ## Business Applications
//! 
//! - Storage system valuation and pricing
//! - Optimal storage sizing and placement analysis
//! - Energy arbitrage opportunity identification
//! - Storage technology comparison and selection

use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::query_builder::{build_resolution_query, build_resolution_query_both, 
    build_resolution_query_with_filters, build_resolution_query_with_filters_and_breakdown,
    build_resolution_query_with_filters_and_breakdown_both,
    build_breakdown_columns, build_breakdown_joins, build_breakdown_case_conditions,
    build_resolution_query_with_filters_both, build_breakdown_selects, build_breakdown_group_by,
    build_filter_conditions};
use crate::services::metadata::{check_column_in_table, apply_carrier_filter};
use std::collections::HashMap;

/// Calculates storage pricing using dual values from energy balance constraints.
/// 
/// Storage Price Analysis:
/// - Extracts dual values from storage balance constraint equations
/// - Supports short-term (intra-period) and long-term (inter-period) storage
/// - Applies time resolution aggregation and carrier filtering
/// - Handles missing constraint tables with empty result fallbacks
/// 
/// Constraint Types:
/// - **Short-term**: `cons_balance_storage_rep_period` for hourly/daily storage
/// - **Long-term**: `cons_balance_storage_over_clustered_year` for seasonal storage
/// - **Combined**: Both constraint types for comprehensive analysis
/// 
/// # Parameters
/// * `year` - Analysis year for milestone data
/// * `resolution` - Time aggregation resolution in hours
/// * `storage_type` - Storage analysis type: "short-term", "long-term", or "both"
/// * `carrier` - Energy carrier filter for specific energy types
#[tauri::command]
pub fn get_storage_price_resolution(
    db_path: String,
    year: u32,
    resolution: u32,
    storage_type: String,
    carrier: String,
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool
) -> Result<Response, String> {

    let has_breakdown = !grouper.is_empty();
    
    let short_term_sql = if !check_column_in_table(db_path.clone(), "cons_balance_storage_rep_period", "dual_balance_storage_rep_period")? {
                EMPTY_SHORT_TERM_SQL.to_string()
            } else {
                apply_carrier_filter(SHORT_TERM_SQL, &carrier)
            };
    let long_term_sql = if !check_column_in_table(db_path.clone(), "cons_balance_storage_over_clustered_year", "dual_balance_storage_over_clustered_year")? {
                EMPTY_LONG_TERM_SQL.to_string()
            } else {
                apply_carrier_filter(LONG_TERM_SQL, &carrier)
            };
    let pre_table_sql = match storage_type.as_str() {
        "short-term" => format!(" WITH storage_table AS ({})", short_term_sql),
        "long-term" => format!(" WITH storage_table AS ({})", long_term_sql),
        "both" =>
            format!("
            WITH storage_table AS (
                {}
            ), storage_table_1 AS (
                {}
            )", short_term_sql, long_term_sql)
            ,
        _ => return Err("Invalid storage type".to_string()),
    };
    
    let sql;

    if enable_metadata {
        if has_breakdown {
            // With filters and breakdown
            let breakdown_cols = build_breakdown_columns(&grouper);
            sql = match storage_type.as_str() {
                "short-term" => build_resolution_query_with_filters_and_breakdown(
                    "storage_table",
                    "dual_value",
                    &breakdown_cols,
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    &grouper,
                    "asset".to_string(),
                    "asset".to_string(),
                    false
                ).trim_end_matches(';').trim_end().to_string(),
                "long-term" => build_resolution_query_with_filters_and_breakdown(
                    "storage_table",
                    "dual_value",
                    &breakdown_cols,
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    &grouper,
                    "asset".to_string(),
                    "asset".to_string(),
                    true
                ).trim_end_matches(';').trim_end().to_string(),
                "both" => build_resolution_query_with_filters_and_breakdown_both(
                    "storage_table",
                    "storage_table_1",
                    "dual_value",
                    &breakdown_cols,
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    &grouper,
                    "asset".to_string(),
                    "asset".to_string(),
                ).trim_end_matches(';').trim_end().to_string(),
                _ => return Err("Invalid storage type".to_string()),
            };
        } else {
            // With filters without breakdown
            sql = match storage_type.as_str() {
                "short-term" => build_resolution_query_with_filters(
                    "storage_table",
                    "dual_value",
                    &["asset"],
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    "asset".to_string(),
                    false
                ).trim_end_matches(';').trim_end().to_string(),
                "long-term" => build_resolution_query_with_filters(
                    "storage_table",
                    "dual_value",
                    &["asset"],
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    "asset".to_string(),
                    true
                ).trim_end_matches(';').trim_end().to_string(),
                "both" => build_resolution_query_with_filters_both(
                    "storage_table",
                    "storage_table_1",
                    "dual_value",
                    &["asset"],
                    "avg",
                    &resolution.to_string(),
                    &filters,
                    "asset".to_string(),
                ).trim_end_matches(';').trim_end().to_string(),
                _ => return Err("Invalid storage type".to_string()),
            }
        }
    }
    else {
        // Without categories
        sql = match storage_type.as_str() {
       "short-term" => build_resolution_query(
        "storage_table",
        "dual_value",
        &["asset"],
        "avg",
        &resolution.to_string(),
        false,
    ).trim_end_matches(';').trim_end().to_string(),
    "long-term" => build_resolution_query(
        "storage_table",
        "dual_value",
        &["asset"],
        "avg",
        &resolution.to_string(),
        true,
    ).trim_end_matches(';').trim_end().to_string(),
    "both" => build_resolution_query_both(
        "storage_table",
        "storage_table_1",
        "dual_value",
        &["asset"],
        "avg",
        &resolution.to_string(),
    ).trim_end_matches(';').trim_end().to_string(),
    _ => return Err("Invalid storage type".to_string()),};
    }

    
    let wrapped_sql: String;
    let temp_wrapped_sql = format!(
    "
    {}
    SELECT * FROM (
        {}
    ) AS subquery
    ",
    pre_table_sql,
    sql
    )
    .replace("{breakdown_selects}", &build_breakdown_selects(&grouper))
            .replace("{breakdown_group_by}", &build_breakdown_group_by(&grouper))
            .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
            .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
    if enable_metadata {
    wrapped_sql = temp_wrapped_sql.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())))
    } else {
     wrapped_sql = temp_wrapped_sql.replace("{filtered_assets}", &"SELECT * FROM asset")
    }
    let res: (Vec<RecordBatch>, Schema) = match storage_type.as_str() {
        "short-term" | "long-term" => run_query_rb(db_path, wrapped_sql, vec![Value::from(year)])?,
        "both" => run_query_rb(db_path, wrapped_sql, vec![Value::from(year), Value::from(year)])?,
        _ => return Err("Invalid storage type".to_string())   
    };

    return serialize_recordbatch(res.0, res.1);

}

// --- TESTING ---

// --- QUERIES ---

const SHORT_TERM_SQL: &str = "
                SELECT
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END AS asset,
                    year,
                    rep_period,
                    time_block_start,
                    time_block_end,
                    dual_balance_storage_rep_period AS dual_value
                    {breakdown_selects}
                FROM cons_balance_storage_rep_period AS st
                JOIN ({filtered_assets}) AS a ON st.asset = a.asset
                {breakdown_joins}
                GROUP BY
                st.year,
                st.rep_period,
                st.time_block_start,
                st.time_block_end,
                dual_value
                {breakdown_group_by},
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END";

const LONG_TERM_SQL: &str = "
                SELECT 
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END AS asset,
                    year,
                    period_block_start,
                    period_block_end,
                    dual_balance_storage_over_clustered_year AS dual_value
                    {breakdown_selects}
                FROM cons_balance_storage_over_clustered_year AS st_cl
                JOIN ({filtered_assets}) AS a ON st_cl.asset = a.asset
                {breakdown_joins}
                GROUP BY
                st_cl.year,
                st_cl.period_block_start,
                st_cl.period_block_end,
                dual_value
                {breakdown_group_by},
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END
                ";
const EMPTY_SHORT_TERM_SQL: &str = "
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
                FROM cons_balance_storage_rep_period AS st
                JOIN ({filtered_assets}) AS a ON st.asset = a.asset
                {breakdown_joins}
                GROUP BY
                st.year,
                st.rep_period,
                st.time_block_start,
                st.time_block_end,
                dual_value
                {breakdown_group_by},
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END
                ";
const EMPTY_LONG_TERM_SQL: &str = "
                SELECT 
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END AS asset,
                    0 AS year,
                    0 AS period_block_start,
                    0 AS period_block_end,
                    0 AS dual_value
                    {breakdown_selects}
                FROM cons_balance_storage_over_clustered_year AS st_cl
                JOIN ({filtered_assets}) AS a ON st_cl.asset = a.asset
                {breakdown_joins}
                GROUP BY
                st_cl.year,
                st_cl.period_block_start,
                st_cl.period_block_end,
                dual_value
                {breakdown_group_by},
                CASE 
                {breakdown_case_conditions}
                ELSE 'Other'
                END
                ";             