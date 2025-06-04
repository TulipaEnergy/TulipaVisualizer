use duckdb::arrow::{array::RecordBatch, datatypes::Schema};
use tauri::ipc::Response;
use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[tauri::command]
pub fn get_storage_price(db_path: String) -> Result<Response, String> {
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, STORAGE_PRICE_SQL.to_string(), [].to_vec())?;

    return serialize_recordbatch(res.0, res.1);
}

const STORAGE_PRICE_SQL: &str = "
    SELECT st.asset,
    st.year AS milestone_year,
    SUM(-st.dual_balance_storage_rep_period * (st.time_block_end - st.time_block_start + 1) * d.resolution * m.weight
    ) AS assets_storage_price
    FROM cons_balance_storage_rep_period AS st
    JOIN
        rep_periods_mapping AS m ON m.year = st.year AND m.rep_period = st.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    GROUP BY
        st.year,
        st.asset;
";