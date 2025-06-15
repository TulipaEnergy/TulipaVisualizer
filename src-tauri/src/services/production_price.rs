use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use duckdb::{ types::Value};
use tauri::ipc::Response;
use crate::services::query_builder::build_resolution_query;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};
use crate::services::metadata::check_column_in_table;

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
    if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_compact_method", "dual_max_output_flows_limit_compact_method")? {
        if check_column_in_table(db_path.clone(), "cons_capacity_outgoing_simple_method", "dual_max_output_flows_limit_simple_method")? {
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

#[tauri::command]
pub fn get_production_years(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, PRODUCTION_YEARS_SQL.to_string(), vec![])?;

    return serialize_recordbatch(res.0, res.1);
}
// --- TESTING ---

// --- QUERIES ---

const PRODUCTION_YEARS_SQL: &str = "
    SELECT DISTINCT year
    FROM cons_balance_consumer
    ORDER BY year;
";
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