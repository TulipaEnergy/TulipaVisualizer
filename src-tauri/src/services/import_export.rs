use duckdb::types::Value;
use serde::Deserialize;
use tauri::ipc::Response;

use crate::duckdb_conn::{run_query_rb, serialize_recordbatch};

#[derive(Deserialize)]
pub struct EnergyFlowOptions {
    level: u32,
    year: u32,
}

#[tauri::command]
pub fn get_all_aggregate_flows(db_path: String, options: EnergyFlowOptions) -> Result<Response, String> {
    let res = run_query_rb(db_path, RESULT_INCOMPLETE_SQL.to_string() + AGGREGATE_FLOW_SQL, vec![Value::from(options.level), Value::from(options.year)])?;
    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_all_detailed_flows(db_path: String, options: EnergyFlowOptions) -> Result<Response, String> {
    let res = run_query_rb(db_path, RESULT_INCOMPLETE_SQL.to_string() + DETAILED_FLOW_SQL, vec![Value::from(options.level), Value::from(options.year)])?;
    return serialize_recordbatch(res.0, res.1);
}

#[tauri::command]
pub fn get_available_years_flows(db_path: String) -> Result<Response, String> {
    let res = run_query_rb(db_path, FETCH_YEARS_SQL.to_string(), vec![])?;
    return serialize_recordbatch(res.0, res.1);
}

// --- TESTING ---

// --- QUERIES ---
const FETCH_YEARS_SQL: &str = "SELECT DISTINCT year FROM rep_periods_mapping";

const RESULT_INCOMPLETE_SQL: &str = "
    WITH RECURSIVE location_nodes AS ( -- all nodes which are under location
        -- base case
        SELECT c.id, c.level
            FROM category c
            WHERE c.name = 'location'

        UNION ALL

        -- recursive case
        SELECT c.id, c.level
            FROM location_nodes ln
            JOIN category c ON c.parent_id = ln.id
    ), recursive_trees AS ( -- recursively constructs trees starting in every node
        -- base case
        SELECT c.id AS root_id, c.level AS root_level, c.id, c.name, c.parent_id, c.level
            FROM category c
            WHERE c.id IN (SELECT id FROM location_nodes)

        UNION ALL

        -- recursive case
        SELECT rt.root_id, rt.root_level, c.id, c.name, c.parent_id, c.level
            FROM recursive_trees rt
            JOIN category c ON c.parent_id = rt.id
            WHERE c.id IN (SELECT id FROM location_nodes)
    ), root_leaf AS ( -- goes from our target level (i.e. countries) to their leaves
        SELECT rt.root_id, rt.id
            FROM recursive_trees rt
            WHERE rt.level = 0
            AND rt.root_level = $1
    ), root_asset AS ( -- from target level to assets
        SELECT rl.root_id, a.asset
            FROM asset_category ac
            RIGHT JOIN root_leaf rl ON rl.id = ac.leaf_id
            JOIN asset a ON a.asset = ac.asset
    ), result_incomplete AS ( -- calculates the total flow for each location group to each other location group
        SELECT 
            ra_from.root_id AS from_id,
            ra_to.root_id AS to_id,
            SUM(rpd.resolution * rpm.weight * (vf.time_block_end - vf.time_block_start + 1) * vf.solution) AS tot_flow
            FROM var_flow vf
            LEFT JOIN root_asset ra_from ON ra_from.asset = vf.from_asset
            LEFT JOIN root_asset ra_to ON ra_to.asset = vf.to_asset
            JOIN rep_periods_mapping rpm ON rpm.rep_period = vf.rep_period
            JOIN rep_periods_data rpd ON rpd.rep_period = rpm.rep_period
            WHERE ra_from.root_id != ra_to.root_id AND 
            rpm.year = $2
            GROUP BY ra_from.root_id, ra_to.root_id
    )
";

const AGGREGATE_FLOW_SQL: &str = "
    SELECT
        ln.id AS id,
        c.name AS group,
        COALESCE(SUM(ri_import.tot_flow), 0) AS totalImport, -- sum from ALL countries, in 1 year, to 1 country
        COALESCE(SUM(ri_export.tot_flow), 0) AS totalExport -- sum from 1 country, in 1 year, to ALL countries
        FROM location_nodes ln
        LEFT JOIN result_incomplete ri_import ON ri_import.to_id = ln.id
        LEFT JOIN result_incomplete ri_export ON ri_export.from_id = ln.id
        JOIN category c ON c.id = ln.id
        WHERE ln.level = $1
        GROUP BY ln.id, c.name
        ORDER BY ln.id
";

const DETAILED_FLOW_SQL: &str = "
    SELECT -- fills in any missing information
        root_from.id AS fromId,
        c_from.name AS fromName,
        root_to.id AS toId,
        c_to.name AS toName,
        COALESCE(res.tot_flow, 0) AS totFlow
        FROM location_nodes root_from
        CROSS JOIN location_nodes root_to
        JOIN category c_from ON c_from.id = root_from.id
        JOIN category c_to ON c_to.id = root_to.id
        LEFT JOIN result_incomplete res ON (
            res.from_id = root_from.id AND
            res.to_id = root_to.id
        ) WHERE root_from.level = $1 AND root_to.level = $1
        ORDER BY root_from.id, root_to.id
";