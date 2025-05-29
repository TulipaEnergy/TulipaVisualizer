use duckdb::{ arrow::array::RecordBatch };
use tauri::ipc::Response;
use crate::duckdb::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_system_cost(db_path: String) -> Result<Response, String> {
    println!("querying system costs");
    let res: Vec<RecordBatch> = run_query_rb(db_path, FIXED_ASSET_COST_SQL.to_string(), [].to_vec())?;
    println!("done!");

    return serialize_recordbatch(res);
}

// --- TESTING ---

// --- QUERIES ---

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