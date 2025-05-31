use duckdb::{ arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::duckdb::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::check_column_in_table;


#[tauri::command]
pub fn get_fixed_asset_cost(db_path: String) -> Result<Response, String> {
    println!("querying system costs (fixed asset)");
    let res: Vec<RecordBatch> = run_query_rb(db_path, FIXED_ASSET_COST_SQL.to_string(), [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_fixed_flow_cost(db_path: String) -> Result<Response, String> {
    println!("querying flow costs (fixed)");
    let res: Vec<RecordBatch> = run_query_rb(db_path, FIXED_FLOW_COST_SQL.to_string(), [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_variable_flow_cost(db_path: String) -> Result<Response, String> {
    let query = if check_column_in_table(db_path.clone(), "var_flow", "solution")? {
        VARIABLE_FLOW_COST_SQL.to_string()
    } else {
        println!("querying system costs (flow variable), but var_flow doesn't have solution");
        VARIABLE_FLOW_COST_SQL_FALLBACK.to_string()
    };

    let res: Vec<RecordBatch> = run_query_rb(db_path, query, [].to_vec())?;
    println!("done!");
    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_unit_on_cost(db_path: String) -> Result<Response, String> {
    let query = if check_column_in_table(db_path.clone(), "var_units_on", "solution")? {
        UNIT_ON_COST_SQL.to_string()
    } else {
        println!("querying system costs (unit on), but var_units_on doesn't have solution");
        UNIT_ON_COST_SQL_FALLBACK.to_string()
    };

    let res: Vec<RecordBatch> = run_query_rb(db_path, query, [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res);
}

// --- TESTING ---

// --- QUERIES ---

const VARIABLE_FLOW_COST_SQL: &str = "
SELECT
    yd.year AS milestone_year,
    SUM(
        f.discount_rate * rpm.weight * (vf.time_block_end - vf.time_block_start + 1) * fm.variable_cost * vf.solution
    ) AS flow_variable_cost
FROM
    year_data AS yd
JOIN
    rep_periods_mapping AS rpm ON yd.year = rpm.year
JOIN
    flow_milestone AS fm ON yd.year = fm.milestone_year
JOIN    
    flow AS f ON f.from_asset = fm.from_asset AND f.to_asset = fm.to_asset -- Corrected join condition
JOIN
    var_flow AS vf ON f.from_asset = vf.from_asset AND f.to_asset = vf.to_asset AND vf.year = rpm.year AND rpm.rep_period = vf.rep_period -- Corrected join condition
WHERE
    yd.is_milestone = TRUE
GROUP BY
    yd.year;
";

const VARIABLE_FLOW_COST_SQL_FALLBACK: &str = "
SELECT 
            yd.year AS milestone_year,
            0 AS flow_variable_cost
        FROM
            year_data AS yd
        WHERE
            yd.is_milestone = TRUE
        GROUP BY
            yd.year
";

const FIXED_FLOW_COST_SQL: &str = "
SELECT
    yd.year AS milestone_year,
    SUM(
        0.5 * f.discount_rate * fc.fixed_cost * f.capacity *
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
WHERE
    yd.is_milestone = TRUE
    AND f.is_transport = TRUE
    AND yd.year BETWEEN fb.commission_year AND (fb.commission_year + f.technical_lifetime)
GROUP BY
    yd.year;
";

const UNIT_ON_COST_SQL: &str = "
SELECT
    yd.year AS milestone_year,
    a.asset,
    SUM(
        a.discount_rate
        * COALESCE(am.units_on_cost, 0) 
        * (vuo.solution / a.capacity) 
        * rpm.weight
        * (vuo.time_block_end - vuo.time_block_start + 1) 
    ) AS unit_on_cost
FROM
    year_data AS yd
JOIN
    rep_periods_mapping AS rpm ON yd.year = rpm.year
JOIN
    asset_milestone AS am ON yd.year = am.milestone_year
JOIN
    asset AS a ON am.asset = a.asset
JOIN
    var_units_on AS vuo ON a.asset = vuo.asset 
                         AND rpm.rep_period = vuo.rep_period
                         AND rpm.year = vuo.year
WHERE
    yd.is_milestone = TRUE
    AND a.unit_commitment = TRUE
GROUP BY
    yd.year,
    a.asset;
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
    SELECT
        yd.year AS milestone_year,
        a.asset,
        SUM(
            a.discount_rate * a.capacity * ac.fixed_cost * ab.initial_units
            +
            CASE
                WHEN a.type = 'storage' THEN
                    a.discount_rate * a.capacity_storage_energy * ac.fixed_cost_storage_energy * ab.initial_storage_units
                ELSE
                    0
            END
        ) AS assets_fixed_cost
    FROM
        year_data AS yd
    JOIN
        asset_both AS ab ON ab.milestone_year = yd.year
    JOIN
        asset AS a ON ab.asset = a.asset
    JOIN
        asset_commission AS ac ON a.asset = ac.asset
    WHERE
        yd.is_milestone = TRUE
    AND yd.year BETWEEN ab.commission_year AND (ab.commission_year + a.technical_lifetime)
    GROUP BY
        yd.year,
        a.asset;
";