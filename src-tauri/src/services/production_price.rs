use duckdb::arrow::array::RecordBatch;
use tauri::ipc::Response;
use crate::duckdb::{run_query_rb, serialize_recordbatch};
use crate::services::query_builder::build_time_weighted_query;


#[tauri::command]
pub fn get_production_price(db_path: String) -> Result<Response, String> {
    let res: Vec<RecordBatch> = run_query_rb(db_path, PRODUCTION_PRICE_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res);
}

#[tauri::command]
pub fn get_production_price_period(db_path: String) -> Result<Response, String> {
    let sql = build_time_weighted_query(
        "cons_balance_consumer",
        "dual_balance_consumer",
        &["asset"]
    );
    let res: Vec<RecordBatch> = run_query_rb(db_path, sql, [].to_vec())?;

    return serialize_recordbatch(res);

}
// --- TESTING ---

// --- QUERIES ---

const PRODUCTION_PRICE_SQL: &str = "
    SELECT
    bc.asset,
    bc.year AS milestone_year,
    SUM(bc.dual_balance_consumer * (bc.time_block_end - time_block_start + 1) * d.resolution * m.weight
    ) AS assets_production_price

    FROM cons_balance_consumer as bc
    JOIN
        rep_periods_mapping AS m ON m.year = bc.year AND m.rep_period = bc.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    GROUP BY
        bc.year,
        bc.asset;
";