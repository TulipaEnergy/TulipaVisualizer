use crate::duckdb_conn::{ serialize_recordbatch, run_query_rb, run_query_row };
use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value };
use tauri::ipc::Response;

/// Retrieves energy import flows for a specific geographic category.
/// 
/// Geographic Flow Data Processing:
/// - Processes hierarchical category relationships (province → country)
/// - Aggregates flows across time blocks and representative periods
/// - Calculates annual flows using representative period weights
/// - Handles bidirectional energy trade analysis
/// 
/// Spatial Data Handling:
/// - Maps category names to database IDs for efficient querying
/// - Processes flows between regions at same hierarchical level
/// - Excludes intra-regional flows (same category imports/exports)
/// 
/// # Parameters
/// * `cat_name` - Geographic category name (e.g., "Netherlands", "South-Holland")
/// 
/// # Returns
/// Import flow data with partner breakdowns and temporal aggregation
#[tauri::command]
pub fn get_import(db_path: String, cat_name: String) -> Result<Response, String> {
    let cat_id: u32 = get_id_from_category(db_path.to_string(), cat_name)?;
    let q: String = IMPORT_EXPORT_SQL_TEMPLATE.replace("{{1}}", "in");

    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, q, vec![Value::from(cat_id), Value::from(cat_id)])?;

    return serialize_recordbatch(res.0, res.1);
}

/// Retrieves energy export flows for a specific geographic category.
/// 
/// Uses identical processing logic as imports but focuses on outbound flows.
/// Provides symmetric analysis for complete trade balance understanding.
#[tauri::command]
pub fn get_export(db_path: String, cat_name: String) -> Result<Response, String> {
    let cat_id: u32 = get_id_from_category(db_path.to_string(), cat_name)?;
    let q: String = IMPORT_EXPORT_SQL_TEMPLATE.replace("{{1}}", "out");

    let res: (Vec<RecordBatch>, Schema) = run_query_rb(db_path, q, vec![Value::from(cat_id), Value::from(cat_id)])?;

    return serialize_recordbatch(res.0, res.1);
}

// fn get_category_from_id(db_path: String, id: u32) -> Result<String, String> {
//     let row_mapper = |row: &duckdb::Row<'_>| {let res: String = row.get(0)?; Ok(res)};
//     let res: Vec<String> = run_query_row(db_path, CATEGORY_FROM_ID_SQL.to_string(), vec![Value::from(id)], row_mapper)?;
//     let cat: &String = res.first().ok_or("id not found!")?;

//     return Ok(cat.to_string());
// }

/// Maps geographic category names to database identifiers.
/// 
/// Category Validation:
/// - Ensures category exists in database before processing
/// - Provides clear error messages for missing categories
/// - Enables efficient ID-based database operations
fn get_id_from_category(db_path: String, cat: String) -> Result<u32, String> {
    let row_mapper = |row: &duckdb::Row<'_>| {let res: u32 = row.get(0)?; return Ok(res)};
    let res: Vec<u32> = run_query_row(db_path, ID_FROM_CATEGORY_SQL.to_string(), vec![Value::from(cat)], row_mapper)?;
    let cat: &u32 = res.first().ok_or("cat not found!")?;

    return Ok(*cat);
}


// --- TESTING ---

// --- QUERIES ---

// const CATEGORY_FROM_ID_SQL: &str = "SELECT name FROM category WHERE id = ?";
const ID_FROM_CATEGORY_SQL: &str = "SELECT id FROM category WHERE name = ?";

/// Complex SQL template for geographic energy flow analysis.
/// 
/// Algorithm Overview:
/// 1. Recursive CTE to find all descendant categories in hierarchy
/// 2. Identifies sibling categories at same geographic level
/// 3. Aggregates energy flows between assets in different categories
/// 4. Applies representative period weights for annual scaling
/// 5. Groups results by category pairs and years
/// 
/// Template Parameters:
/// - {{1}}: Direction filter ("in" for imports, "out" for exports)
/// 
/// Spatial Data Processing:
/// - Handles hierarchical geographic relationships
/// - Processes flows only between different root categories
/// - Aggregates time block durations for accurate energy totals
/// - Applies resolution and weight factors for annual projections
const IMPORT_EXPORT_SQL_TEMPLATE: &str = 
    "WITH cat_rp_flow AS (
    WITH RECURSIVE descendants AS (
        -- base case
        SELECT c.id AS root_id, c.id, c.parent_id, c.level
            FROM category c

        UNION ALL

        -- recursive case
        SELECT d.root_id, c.id, c.parent_id, c.level
            FROM descendants d
            JOIN category c ON c.parent_id = d.id
    ),
    -- gets all siblings (same level) for a given id
    siblings AS (
        SELECT c2.id AS id, c2.name
            FROM category c1
            JOIN category c2 ON c2.level = c1.level
            WHERE c1.id = ?
    )

    -- get for each cat_in, cat_out, rep_period the amount of flow 
    SELECT cat_in.root_id AS root_cat_in_id,
        cat_out.root_id AS root_cat_out_id,
        vf.rep_period,
        SUM((vf.time_block_end - vf.time_block_start + 1) * vf.solution) AS flow_rp
        FROM descendants cat_in
        JOIN descendants cat_out ON cat_out.root_id != cat_in.root_id
        JOIN asset_metadata am_in ON am_in.category_id = cat_in.id
        JOIN asset_metadata am_out ON am_out.category_id = cat_out.id
        JOIN var_flow vf ON vf.from_asset = am_out.asset AND vf.to_asset = am_in.asset
        WHERE cat_in.level = 0
        AND cat_out.level = 0
        AND cat_in.root_id IN (SELECT id FROM siblings)
        AND cat_out.root_id IN (SELECT id FROM siblings)
        AND cat_{{1}}.root_id = ?
        GROUP BY cat_in.root_id, cat_out.root_id, vf.rep_period
    )

    -- now using the weighted sum, calculate the total anual flow for any two categories (on same level)
    SELECT
        crf.root_cat_in_id,
        c_in.name AS cat_in_name,
        crf.root_cat_out_id,
        c_out.name AS cat_out_name,
        rpm.year,
        SUM(rpd.resolution * rpm.weight * crf.flow_rp) AS tot_flow
        FROM rep_periods_mapping rpm
        JOIN cat_rp_flow crf ON crf.rep_period = rpm.rep_period 
        JOIN rep_periods_data rpd ON rpd.rep_period = rpm.rep_period
        JOIN category c_in ON c_in.id = crf.root_cat_in_id
        JOIN category c_out ON c_out.id = crf.root_cat_out_id
        GROUP BY crf.root_cat_in_id, c_in.name, crf.root_cat_out_id, c_out.name, rpm.year
        ORDER BY crf.root_cat_in_id, crf.root_cat_out_id, rpm.year";