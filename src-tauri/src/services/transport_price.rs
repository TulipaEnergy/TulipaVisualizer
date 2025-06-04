use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value };
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_transportation_price(db_path: String, carrier: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, TRANSPORTATION_PRICE_SQL.to_string(), vec![Value::from(carrier)])?;

    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---

const TRANSPORTATION_PRICE_SQL: &str = "
    SELECT
    tr.year AS milestone_year,
    tr.from_asset || ' -> ' || tr.to_asset AS route,
    SUM(
        -tr.dual_max_transport_flow_limit_simple_method * (tr.time_block_end - tr.time_block_start + 1) * d.resolution * m.weight
    ) AS flows_transportation_price
    FROM
        cons_transport_flow_limit_simple_method AS tr
    JOIN
        rep_periods_mapping AS m ON m.year = tr.year AND m.rep_period = tr.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    JOIN
        flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
    WHERE
        f.is_transport = TRUE AND f.carrier = ?
    GROUP BY
        tr.year,
        route;`;
";