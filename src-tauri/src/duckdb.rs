use std::{io::Cursor, sync::Mutex, vec::Vec, collections::HashMap, };
use once_cell::sync::Lazy;
use std::option::Option;
use tauri::ipc::Response;
use duckdb::{ Connection, arrow::array::RecordBatch, };
use arrow_ipc::{ writer::StreamWriter, };
use mockall::{ predicate::* };

pub static DB_CONN: Mutex<Option<Connection>> = Mutex::new(None);

// Connection pool for multi-database support
static DB_POOL: Lazy<Mutex<HashMap<String, Connection>>> = Lazy::new(|| Mutex::new(HashMap::new()));

// serializes result from apache arrow query
pub fn serialize_recordbatch(rec_batch: Vec<RecordBatch>) -> Result<Response, String> {
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result

    if rec_batch.is_empty() {
        println!("no rows returned for query, returning empty result");
        return Ok(Response::new(vec_writer.into_inner()));
    }

    let mut writer: StreamWriter<_> = StreamWriter::try_new(&mut vec_writer, &rec_batch[0].schema())
        .map_err(|e| format!("write error: {}", e))?;
    for batch in rec_batch {
        writer.write(&batch).map_err(|e| format!("write error: {}", e))?;
    }
    writer.finish().map_err(|e| format!("finish error: {}", e))?;

    println!("succesfully parsed query!");
    let response: Response = Response::new(vec_writer.into_inner());

    Ok(response)
}

pub fn get_category_from_id(id: u32) -> Result<String, String> {
    // fetch connection
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 

    let q: &str = "SELECT name FROM category WHERE id = ?";
    let res: Result<String, duckdb::Error> = conn.prepare(q).unwrap().query_row([id], |row| {let res: String = row.get(0).expect(format!("no category found for [{}]", id).as_str()); return Ok(res)});

    return res.map_err(|e| e.to_string());
}

// given an id, gets the corresponding category
pub fn get_id_from_category(cat: String) -> Result<u32, String> {
    // fetch connection
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 

    let q: &str = "SELECT id FROM category WHERE name = ?";
    let res: Result<u32, duckdb::Error> = conn.prepare(q).unwrap().query_row([cat.to_string()], |row| {let res: u32 = row.get(0).expect(format!("no category found for ['{}']", cat).as_str()); return Ok(res)});

    return res.map_err(|e| e.to_string());
}

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

pub fn get_import_from_id(cat_id: u32) -> Result<Vec<RecordBatch>, String> {
    println!("fetching imports for: [id: {}, name: {}]", cat_id, get_category_from_id(cat_id).unwrap_or("err".to_string()));

    // fetch connection
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 

    let q: String = IMPORT_EXPORT_SQL_TEMPLATE.replace("{{1}}", "in");
    let res: Vec<RecordBatch> = conn.prepare(&q).unwrap().query_arrow([cat_id, cat_id]).map_err(|e| format!("import query error: <{}>", e.to_string()))?.collect();

    return Ok(res)
}

pub fn get_export_from_id(cat_id: u32) -> Result<Vec<RecordBatch>, String> {
    println!("fetching imports for: [id: {}, name: {}]", cat_id, get_category_from_id(cat_id).unwrap_or("err".to_string()));

    // fetch connection
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 

    let q: String = IMPORT_EXPORT_SQL_TEMPLATE.replace("{{1}}", "out");
    let res: Vec<RecordBatch> = conn.prepare(&q).unwrap().query_arrow([cat_id, cat_id]).map_err(|e| format!("export query error: <{}>", e.to_string()))?.collect();

    return Ok(res)
}

// New command for querying specific database by path
#[tauri::command]
pub fn run_serialize_query_on_db(db_path: String, q: String) -> Result<Response, String> {
    println!("Aparsing query '{}' on database: '{}'", q, db_path);

    // Check if we need to create a new connection or use existing one
    let mut pool = DB_POOL.lock().unwrap();

    // Only open a new connection if one does not already exist for this path
    if !pool.contains_key(&db_path) {
        println!("Creating new connection for {}", db_path);
        if !db_path.ends_with(".duckdb") {
            return Err("Database path must end with .duckdb".to_string());
        }
        let new_conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database '{}': {}", db_path, e))?;
         println!("AA Returned successfully");
        pool.insert(db_path.clone(), new_conn);
         println!(" BBB Returned successfully");
    } else {
        println!("Reusing existing connection for {}", db_path);
    }

    // Always use the connection from the pool
    let conn = pool.get(&db_path).expect("Connection should exist in pool");
   

    // Execute query using the specific connection
    run_specific_query(conn, &q)

}

pub fn run_specific_query(conn: &Connection, sql: &str) -> Result<Response, String> {
    println!("parsing: '{}'", sql);

    // parsing and running query
    let mut res_stmt  = conn.prepare(sql).map_err(|e| format!("Error parsing query: {}", e))?;

    let rec_batch: Vec<RecordBatch> = res_stmt.query_arrow([]).expect("error executing query").collect();

    // serializing result
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result

    if rec_batch.is_empty() {
        println!("no rows returned for query, returning empty result");
        return Ok(Response::new(vec_writer.into_inner()));  // empty response instead of panicking
    }

    let mut writer: StreamWriter<_> = StreamWriter::try_new(&mut vec_writer, &rec_batch[0].schema())
        .map_err(|e| format!("write error: {}", e))?;
    for batch in rec_batch {
        writer.write(&batch).map_err(|e| format!("write error: {}", e))?;
    }
    writer.finish().map_err(|e| format!("finish error: {}", e))?;

    println!("succesfully parsed query!");
    Ok(Response::new(vec_writer.into_inner()))
}
