use tauri::ipc::Response;
use duckdb::{ Connection };
use crate::duckdb::{ DB_CONN, run_specific_query };

#[tauri::command]
pub fn get_capacity_over_period(asset: String, start_year: i32, end_year: i32) -> Result<Response, String> {
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().expect("DB connection missing!");
    let sql = format!(r#"
    WITH years AS (
    SELECT generate_series AS year FROM generate_series({start_year}, {end_year})
    ),
    cum_inv AS (
    SELECT milestone_year, solution
        FROM var_assets_investment
    WHERE asset = '{asset}'
    ),
    cum_dec AS (
    SELECT milestone_year, solution
        FROM var_assets_decommission
    WHERE asset = '{asset}'
    ),
    asset_init AS (
    SELECT initial_units, commission_year FROM asset_both WHERE asset = '{asset}'
    ),
    asset_cap AS (
    SELECT capacity FROM asset WHERE asset = '{asset}'
    )
    SELECT
    y.year,
    (ai.initial_units
    + COALESCE((SELECT SUM(solution) FROM cum_inv iv WHERE iv.milestone_year <= y.year), 0)
    - COALESCE((SELECT SUM(solution) FROM cum_dec dc WHERE dc.milestone_year <= y.year), 0))
    * ac.capacity AS installed_capacity
    FROM years y, asset_init ai, asset_cap ac
    WHERE ai.commission_year <= y.year
    ORDER BY y.year;
    "#);
    Ok(run_specific_query(conn, &sql))
}

#[tauri::command]
pub fn get_capacity_at_year(asset: String, year: i32) -> Result<Response, String> {
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().expect("DB connection missing!");
    let sql = format!(r#"
    WITH cum_inv AS (
    SELECT COALESCE(SUM(solution), 0) AS total_invest
        FROM var_assets_investment
    WHERE asset = '{asset}' AND milestone_year <= {year}
    ), cum_dec AS (
    SELECT COALESCE(SUM(solution), 0) AS total_decomm
        FROM var_assets_decommission
    WHERE asset = '{asset}' AND milestone_year <= {year}
    )
    SELECT
    a.asset,
    (a.initial_units + ci.total_invest - cd.total_decomm) * m.capacity AS installed_capacity
    FROM asset_both a
    JOIN asset m ON a.asset = m.asset,
        cum_inv ci,
        cum_dec cd
    WHERE a.asset = '{asset}' AND a.commission_year <= {year};
    "#);
    Ok(run_specific_query(conn, &sql))
}