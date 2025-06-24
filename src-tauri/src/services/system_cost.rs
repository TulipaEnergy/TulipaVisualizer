//! System-wide economic cost analysis service for energy model optimization results.
//! 
//! This module provides comprehensive cost calculations for Tulipa Energy Model results,
//! including fixed asset costs, variable flow costs, and financial analysis with discount factors.
//! Implements the economic methodology from TulipaEnergyModel.jl for consistent cost accounting.
//! 
//! ## Cost Categories
//! 
//! - **Fixed Asset Costs**: CAPEX, fixed O&M, construction costs
//! - **Fixed Flow Costs**: Transmission infrastructure, transport capacity
//! - **Variable Flow Costs**: Energy transmission per MWh, variable O&M
//! - **Unit Commitment Costs**: Start-up costs, operational switching costs
//! 
//! ## Financial Methodology
//! 
//! - Discount factor calculations using compound interest formula
//! - Multi-year analysis with milestone year progression
//! - Commission year tracking for asset lifetime management
//! - Representative period weighting for annual cost scaling
//! 
//! ## Schema Compatibility
//! 
//! Handles optional database columns gracefully with fallback queries
//! when optimization solution data is unavailable.

use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::check_column_in_table;
use crate::services::query_builder::{build_filter_conditions,
build_breakdown_joins,
build_breakdown_case_conditions};
use std::collections::HashMap;

/// Calculates fixed asset costs with discount factor applications.
/// 
/// Fixed asset costs include:
/// - Capital expenditure (CAPEX) for asset construction
/// - Fixed operation and maintenance (O&M) costs
/// - Discount factors applied based on commission year and milestone year
#[tauri::command]
pub fn get_fixed_asset_cost(
    db_path: String,
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool
) -> Result<Response, String> {
    println!("querying system costs (fixed asset)");

    let mut sql =  FIXED_ASSET_COST_SQL.to_string()
                .replace("{discount_factor_assets_cte}", &DISCOUNT_FACTOR_ASSETS_CTE)
                .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
                .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
    
    if enable_metadata {
        sql = sql.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())));   
    } else {
        sql = sql.replace("{filtered_assets}", &"SELECT * FROM asset");
    };
    
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, sql, [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res.0, res.1);
}

/// Calculates fixed flow costs for transmission and transport infrastructure.
/// 
/// Fixed flow costs include:
/// - Transmission line construction costs
/// - Fixed maintenance costs for transport infrastructure
/// - Capacity-based cost calculations
#[tauri::command]
pub fn get_fixed_flow_cost(db_path: String) -> Result<Response, String> {
    println!("querying flow costs (fixed)");
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, format!("{DISCOUNT_FACTOR_FLOWS_CTE}{FIXED_FLOW_COST_SQL}"), [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res.0, res.1);
}

/// Calculates variable flow costs based on energy transport volumes.
/// 
/// Variable flow costs include:
/// - Energy transmission costs per MWh
/// - Variable O&M costs for transport operations
/// - Time-weighted cost calculations using representative periods
#[tauri::command]
pub fn get_variable_flow_cost(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, format!("{DISCOUNT_FACTOR_FLOWS_CTE}{VARIABLE_FLOW_COST_SQL}"), [].to_vec())?;
    println!("done!");
    return serialize_recordbatch(res.0, res.1);
}

/// Calculates unit commitment costs with conditional query adaptation.
/// 
/// Handles different database schemas by checking for solution column availability.
/// Falls back to simplified query when optimization solution data is not available.
#[tauri::command]
pub fn get_unit_on_cost(
    db_path: String, 
    filters: HashMap<i32, Vec<i32>>,
    grouper: Vec<i32>,
    enable_metadata: bool
) -> Result<Response, String> {
    println!("querying system costs (unit on)");
    let sql = if check_column_in_table(db_path.clone(), "var_units_on", "solution") ? {
        let intermediary_sql = UNIT_ON_COST_SQL.to_string()
                .replace("{discount_factor_assets_cte}", &DISCOUNT_FACTOR_ASSETS_CTE)
                .replace("{breakdown_joins}", &build_breakdown_joins(&grouper))
                .replace("{breakdown_case_conditions}",  &build_breakdown_case_conditions(&grouper, "a.asset".to_string()));
        if enable_metadata {
            intermediary_sql.replace("{filtered_assets}", &format!("SELECT * FROM asset AS a WHERE 1 {}", build_filter_conditions(&filters, "a.asset".to_string())))
        } else {
            intermediary_sql.replace("{filtered_assets}", &"SELECT * FROM asset")
        }
    } else {
        println!("var_units_on doesn't have solution, falling to 0");
        UNIT_ON_COST_SQL_FALLBACK.to_string()
    };


    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, sql, [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---

/// Common Table Expression (CTE) for calculating discount factors for flow-based costs.
/// 
/// Financial Calculation Methodology:
/// - Applies compound discount rate formula: (1 + discount_rate)^-(year - commission_year)
/// - Accounts for asset lifetime and commission timing
/// - Handles multi-year scenarios with milestone year progression
const DISCOUNT_FACTOR_FLOWS_CTE: &str = "
-- see DISCOUNT_FACTOR_ASSETS_CTE for explanations
WITH MilestoneYearsWithNext AS (
    SELECT
        yd.year AS milestone_year,
        LEAD(yd.year, 1) OVER (ORDER BY yd.year) AS next_milestone_year
    FROM
        year_data AS yd
    WHERE
        yd.is_milestone = TRUE
),
ComissionedFlowsByMilestoneYear AS (
    SELECT
        m.milestone_year,
        m.next_milestone_year,
        f.from_asset,
  		f.to_asset,
        f.discount_rate,
        fc.commission_year
    FROM
        MilestoneYearsWithNext AS m
    CROSS JOIN
        flow AS f
    JOIN
        flow_commission AS fc ON f.from_asset = fc.from_asset AND f.to_asset = fc.to_asset
    WHERE fc.commission_year <= m.milestone_year
),
DiscountFactorPerYearAndFlow AS (
    SELECT
        fm.milestone_year,
        fm.from_asset,
  		fm.to_asset,
        SUM(
            POWER(
                (1 + fm.discount_rate),
                -(year_val_table.year_val - fm.commission_year)
            )
        ) AS discount_factor
    FROM
        ComissionedFlowsByMilestoneYear fm
    CROSS JOIN LATERAL (
        SELECT s_val AS year_val
        FROM GENERATE_SERIES(
            fm.milestone_year,
            COALESCE(fm.next_milestone_year - 1, fm.milestone_year)
        ) AS s(s_val)
    ) AS year_val_table
    GROUP BY
        fm.milestone_year,
        fm.from_asset,
  		fm.to_asset,
)
";

/// SQL query for variable flow cost calculation with time-weighted representative periods.
/// 
/// Cost Components:
/// - Variable cost per unit of flow ($/MWh)
/// - Time block duration weighting
/// - Representative period weights for annual scaling
/// - Optimization solution values for actual flows
const VARIABLE_FLOW_COST_SQL: &str = "
-- using DISCOUNT_FACTOR_FLOWS_CTE
SELECT
    yd.year AS milestone_year,
    f.carrier,
    SUM(
        df.discount_factor * rpm.weight * (vf.time_block_end - vf.time_block_start + 1) * fm.variable_cost * vf.solution
    ) AS flow_variable_cost
FROM
    year_data AS yd
JOIN
    rep_periods_mapping AS rpm ON yd.year = rpm.year
JOIN
    flow_milestone AS fm ON yd.year = fm.milestone_year
JOIN    
    flow AS f ON f.from_asset = fm.from_asset AND f.to_asset = fm.to_asset
JOIN
    var_flow AS vf ON f.from_asset = vf.from_asset AND f.to_asset = vf.to_asset AND vf.year = rpm.year AND rpm.rep_period = vf.rep_period
JOIN 
	DiscountFactorPerYearAndFlow AS df ON df.from_asset = vf.from_asset AND df.to_asset = vf.to_asset AND df.milestone_year = yd.year
WHERE
    yd.is_milestone = TRUE
GROUP BY
    yd.year,
    f.carrier;
";

/// SQL query for fixed flow cost calculation based on transmission capacity.
/// 
/// Cost Components:
/// - Fixed cost per unit of capacity ($/MW)
/// - Import and export capacity units
/// - 0.5 factor for bidirectional flow cost allocation
const FIXED_FLOW_COST_SQL: &str = "
-- using DISCOUNT_FACTOR_FLOWS_CTE
SELECT
    yd.year AS milestone_year,
    f.carrier,
    SUM(
        0.5 * df.discount_factor * fc.fixed_cost * f.capacity *
        (fb.initial_export_units + fb.initial_import_units)
    ) AS flow_fixed_cost
FROM
    year_data AS yd
JOIN
    flow_both AS fb ON fb.milestone_year = yd.year
JOIN
    flow AS f ON fb.from_asset = f.from_asset AND fb.to_asset = f.to_asset
JOIN
    flow_commission AS fc ON f.from_asset = fc.from_asset AND f.to_asset = fc.to_asset
JOIN DiscountFactorPerYearAndFlow AS df ON df.from_asset = f.from_asset AND df.to_asset = f.to_asset AND df.milestone_year = yd.year
WHERE
    yd.is_milestone = TRUE
    AND f.is_transport = TRUE
    AND yd.year BETWEEN fb.commission_year AND (fb.commission_year + f.technical_lifetime)
GROUP BY
    yd.year,
    f.carrier;
";

/// Common Table Expression for calculating discount factors for asset-based costs.
/// 
/// Implementation of TulipaEnergyModel.jl discounting methodology:
/// https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/40-formulation/#Discounting-Factor-for-Operation-Costs
/// 
/// Discount Factor Calculation:
/// - Accounts for asset commission year and technical lifetime
/// - Applies compound interest formula for present value calculation
/// - Handles milestone year progression in multi-year scenarios
const DISCOUNT_FACTOR_ASSETS_CTE: &str = "
WITH MilestoneYearsWithNext AS (
    -- e.g. for Multi-Year scenario:
    -- 2030 ... 2050
    -- 2050 ... NULL
    SELECT
        yd.year AS milestone_year,
        LEAD(yd.year, 1) OVER (ORDER BY yd.year) AS next_milestone_year
    FROM
        year_data AS yd
    WHERE
        yd.is_milestone = TRUE
),
ComissionedAssetsByMilestoneYear AS (
    -- e.g. for Multi-Year scenario:
    -- milestone year 2030 will contain the batteries comissioned in 2020, 2025, 2030 (+ other assets)
    -- milestone year 2050 will contain the batteries comissioned in 2020, 2025, 2030, 2040, 2050 (+ other assets)
    SELECT
        m.milestone_year,
        m.next_milestone_year,
        a.asset,
        a.discount_rate,
        ac.commission_year
    FROM
        MilestoneYearsWithNext AS m
    CROSS JOIN
        asset AS a
    JOIN
        asset_commission AS ac ON a.asset = ac.asset
    WHERE ac.commission_year <= m.milestone_year
),
DiscountFactorPerYearAndAsset AS (
    -- Computes https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/40-formulation/#Discounting-Factor-for-Operation-Costs
    -- resulting a discount factor per (milestone year, asset) tuple
    -- Thus, one milestone year's costs also include the next non-milestone years' costs, accounting for inflation
    -- e.g. for Multi-Year scenario:
    -- for milestone year 2030, for battery comissioned in 2020, will account for years 2030 to 2049
    -- for milestone year 2030, for battery comissioned in 2025, will account for years 2030 to 2049
    -- so on for batteries comissioned up to year 2030, then the analogous for other types of assets
    -- next for milestone year 2050, for the battery comissioned in 2020, will account for year 2050
    -- so on for batteries comissioned up to year 2050, then the analogous for other types of assets
    SELECT
        am.milestone_year,
        am.asset,
        SUM(
            POWER(
                (1 + am.discount_rate),
                -(year_val_table.year_val - am.commission_year)
            )
        ) AS discount_factor
    FROM
        ComissionedAssetsByMilestoneYear am
    CROSS JOIN LATERAL (
        SELECT s_val AS year_val
        FROM GENERATE_SERIES(
            am.milestone_year,
            COALESCE(am.next_milestone_year - 1, am.milestone_year)
        ) AS s(s_val)
    ) AS year_val_table
    GROUP BY
        am.milestone_year,
        am.asset
)
";

const UNIT_ON_COST_SQL: &str = "
{discount_factor_assets_cte}
SELECT
    yd.year AS milestone_year,
    CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
    END AS asset,
    SUM(
        df.discount_factor
        * COALESCE(am.units_on_cost, 0) 
        * (vuo.solution / a.capacity) 
        * rpm.weight
        * (vuo.time_block_end - vuo.time_block_start + 1) 
        * rpd.resolution
    ) AS unit_on_cost
FROM
    year_data AS yd
JOIN
    rep_periods_mapping AS rpm ON yd.year = rpm.year
JOIN
    rep_periods_data AS rpd ON yd.year = rpm.year AND rpd.rep_period = rpm.rep_period  
JOIN
    asset_milestone AS am ON yd.year = am.milestone_year
JOIN
    ({filtered_assets}) AS a ON am.asset = a.asset
JOIN
    var_units_on AS vuo ON a.asset = vuo.asset 
                         AND rpm.rep_period = vuo.rep_period
                         AND rpm.year = vuo.year
JOIN
    DiscountFactorPerYearAndAsset AS df ON yd.year = df.milestone_year AND a.asset = df.asset
{breakdown_joins}
WHERE
    yd.is_milestone = TRUE
    AND a.unit_commitment = TRUE
GROUP BY
    yd.year,
    CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
    END;
";

const UNIT_ON_COST_SQL_FALLBACK: &str = "
SELECT 
    yd.year AS milestone_year,
    a.asset,
    0 AS unit_on_cost
FROM
    year_data AS yd, asset AS a
WHERE
    yd.is_milestone = TRUE
    AND a.unit_commitment = TRUE
GROUP BY
    yd.year,
    a.asset;
";

const FIXED_ASSET_COST_SQL: &str = "
{discount_factor_assets_cte}
SELECT
    yd.year AS milestone_year,
    CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
    END AS asset,
    SUM(
        df.discount_factor * a.capacity * ac.fixed_cost * ab.initial_units
        +
        CASE
            WHEN a.type = 'storage' THEN
                df.discount_factor * a.capacity_storage_energy * ac.fixed_cost_storage_energy * ab.initial_storage_units
            ELSE
                0
        END
    ) AS assets_fixed_cost
FROM
    year_data AS yd
JOIN
    asset_both AS ab ON ab.milestone_year = yd.year
JOIN
    ({filtered_assets}) AS a ON ab.asset = a.asset
JOIN
    asset_commission AS ac ON a.asset = ac.asset
JOIN
    DiscountFactorPerYearAndAsset AS df ON yd.year = df.milestone_year AND a.asset = df.asset
{breakdown_joins}
WHERE
    yd.is_milestone = TRUE
    AND yd.year BETWEEN ab.commission_year AND (ab.commission_year + a.technical_lifetime)
GROUP BY
    yd.year,
    CASE 
        {breakdown_case_conditions}
        ELSE 'Other'
    END
ORDER BY
    yd.year;
";
