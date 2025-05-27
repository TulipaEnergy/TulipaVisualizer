use std::{io::Cursor, sync::Mutex, vec::Vec, };
use once_cell::sync::Lazy;
use std::option::Option;
use tauri::ipc::Response;
use duckdb::{ arrow::array::RecordBatch, Connection, Arrow };
use arrow_ipc::{ writer::StreamWriter, };
use mockall::{ automock, predicate::* };

static DUCKDB_PATH: Lazy<Mutex<Option<String>>> = Lazy::new(|| Mutex::new(None));
pub static DB_CONN: Mutex<Option<Connection>> = Mutex::new(None);

// to allow for test-mocking:
//#[cfg_attr(test, automock)]
#[automock]
pub trait ConnectionFactory {
    fn open(&self, path: String) -> Connection;
}

pub struct RealConnectionFactory;

impl ConnectionFactory for RealConnectionFactory {
    fn open(&self, path: String) -> Connection {
        Connection::open(path).expect("Unable to open provided.duckDB file!")
    }
}

#[tauri::command]
pub fn set_path (path: String) -> Result<(), String> {
    if path.ends_with(".duckdb") {
        let mut db_path = DUCKDB_PATH.lock().unwrap();
        *db_path = Some(path.clone());

        let conn_fact = RealConnectionFactory;
        let conn: Connection = conn_fact.open(path);
        *(DB_CONN.lock().unwrap()) = Some(conn);
        println!("database connection established!");

        Ok(())
    }
    else {
        Err(String::from("Please upload a .duckdb file."))
    }
}

#[tauri::command]
pub fn get_path() -> Option<String> {
    DUCKDB_PATH.lock().unwrap().clone()
}

// runs the given sql and returns the result as a serialized byte-array of the apache-table
// https://docs.rs/arrow-ipc/55.0.0/arrow_ipc/writer/struct.StreamWriter.html
#[tauri::command]
pub fn run_serialize_query(q: String) -> Result<Response, String> {
    println!("parsing: '{}'", q);

    // parsing and running query
    let binding = DB_CONN.lock().unwrap();
    let conn: &Connection = binding.as_ref().ok_or_else(|| "No database open. Please select a DuckDB file first.".to_string())?; 
    let mut res_stmt = conn.prepare(&q).map_err(|e| format!("Error parsing query: {}", e))?;

    let rec_batch: Vec<RecordBatch> = res_stmt.query_arrow([]).expect("error executing query").collect();

    serialize_recordbatch(rec_batch)
}

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


#[cfg(test)]
mod tests {
    use super::*;

    // example tests
    #[test]
    fn it_works() {
        let result = 4;
        assert_eq!(result, 4, "result was not 4!");
    }

    #[test]
    #[should_panic(expected = "WHA")]
    fn panic_test() {
        panic!("WHA AAAAA!")
    }

    // this test fails intentionally
    // #[test]
    // #[should_panic(expected = "WHA")]
    // fn panic_fail_test() {
    //     panic!("nothing's up")
    // }

    // real tests
    #[test]
    fn set_path_test_pass() {
        let mut mock: MockConnectionFactory = MockConnectionFactory::new();
        mock.expect_open()
            .returning(|_| {Connection::open_in_memory().unwrap()});

        assert!(set_path("fake_path.duckdb".to_string()).is_ok());
    }

    #[test]
    fn run_serialize_query_test_no_db_open() {
        assert!(run_serialize_query("SHOW TABLES;".to_string()).is_err(), "DB was open! (impossible)");
    }
}
