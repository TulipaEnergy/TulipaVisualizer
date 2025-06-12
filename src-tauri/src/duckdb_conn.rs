use std::{collections::HashMap, io::Cursor, path::Path, sync::Mutex, vec::Vec };
use once_cell::sync::Lazy;
use tauri::ipc::Response;
use duckdb::{ arrow::{array::RecordBatch, datatypes::Schema}, types::Value, Arrow, Connection };
use arrow_ipc::{ writer::StreamWriter, };

// Connection pool for multi-database support
static CONN_HANDLER: Lazy<Mutex<ConnectionHandler>> = Lazy::new(|| Mutex::new(ConnectionHandler::new()));

// serializes result from apache arrow query
pub fn serialize_recordbatch(rec_batch: Vec<RecordBatch>, schema: Schema) -> Result<Response, String> {
    let mut vec_writer = Cursor::new(Vec::new()); // creates a writer to save the result    

    let mut writer: StreamWriter<_> = StreamWriter::try_new(&mut vec_writer, &schema)
        .map_err(|e| format!("write error: {}", e))?;
    for batch in rec_batch {
        writer.write(&batch).map_err(|e| format!("write error: {}", e))?;
    }
    writer.finish().map_err(|e| format!("finish error: {}", e))?;

    println!("serialized successfully!");
    let response: Response = Response::new(vec_writer.into_inner());

    Ok(response)
}


// public methods for querying, which use singleton underneath which does not need to be tested
pub fn run_query_rb(db_path: String, q: String, args: Vec<Value>) -> Result<(Vec<RecordBatch>, Schema), String> {
    CONN_HANDLER.lock().unwrap().run_query_rb(db_path, q, args)
}

pub fn run_query_row<F, T>(db_path: String, q: String, args: Vec<Value>, row_mapper: F) -> Result<Vec<T>, String> 
where 
    F: FnMut(&duckdb::Row<'_>) -> Result<T, duckdb::Error>
{
    CONN_HANDLER.lock().unwrap().run_query_row(db_path, q, args, row_mapper)
}


#[derive(Default)]
struct ConnectionHandler {
    db_pool: Mutex<HashMap<String, Connection>>,
}

impl ConnectionHandler {
    pub fn new() -> Self {
        ConnectionHandler::default()
    }

    fn fetch_connection<F, T>(&self, db_path: &String, with_conn: F) -> Result<T, String>
    where
        F: FnOnce(&Connection) -> Result<T, String> 
    {
        // assert path is plausible
        if !db_path.ends_with(".duckdb") {
            return Err("Database path must end with .duckdb".to_string());
        }

        // Check if we need to create a new connection or use existing one
        let mut pool = self.db_pool.lock().unwrap();
        if !pool.contains_key(db_path) {
            if !Path::new(db_path).exists() {
                return Err(format!("Error<file not found>` connecting to: '{}'", db_path));
            }
            let new_conn = Connection::open(&db_path)
                .map_err(|e| format!("Failed to open database '{}': {}", db_path, e))?;
            pool.insert(db_path.clone(), new_conn);
            println!("Opened new database succesfully: '{}'", db_path);
        } else {
            println!("Reusing existing connection for '{}'", db_path);
        }

        // Always use the connection from the pool
        let conn: &Connection = pool.get(db_path).expect("Connection should exist in pool");
        with_conn(conn)
    }

    fn run_query_rb(&self, db_path: String, q: String, args: Vec<Value>) -> Result<(Vec<RecordBatch>, Schema), String> {
        println!("\n<<QUERY>>\nfetching recorbatch on db [{}]:\n{}", db_path, q);

        self.fetch_connection(&db_path, |conn| {
            // Execute query using the specific connection
            let mut prepared_statement = conn.prepare(&q).map_err(|e| format!("error parsing query: '{}'", e.to_string()))?;
            let arrow_res: Arrow<'_> = prepared_statement
                .query_arrow(duckdb::params_from_iter(args.iter()))
                .map_err(|e| format!("error executing query: '{}'", e.to_string()))?;

            let schema: Schema = (*arrow_res.get_schema()).clone();

            println!("fetched succesfully!");
            return Ok((arrow_res.collect::<Vec<RecordBatch>>(), schema));
        })
    }

    fn run_query_row<F, T>(&self, db_path: String, q: String, args: Vec<Value>, row_mapper: F) -> Result<Vec<T>, String> 
    where 
        F: FnMut(&duckdb::Row<'_>) -> Result<T, duckdb::Error>
    {
        println!("\n<<QUERY>>\nfetching row on db [{}]:\n{}", db_path, q);

        self.fetch_connection(&db_path, |conn| {
            // Execute query using the specific connection
            let mut prepared_statement = conn.prepare(&q).map_err(|e| format!("error parsing query: '{}'", e.to_string()))?;
            let res: Vec<T> = prepared_statement
                .query_map(duckdb::params_from_iter(args.iter()), row_mapper)
                .map_err(|e| format!("error executing query: '{}'", e.to_string()))?
                .filter_map(Result::ok)
                .collect();

            println!("fetched succesfully!");
            return Ok(res);
        })
    }
}


// --- TESTING ---
#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    const DB_PATH: &str = "TESTDB.duckdb";
    const MEM_DB_PATH: &str = "mem.duckdb";
    const CREATE_DEMO_TABLE_SQL: &str = "CREATE TABLE demoTable(id INTEGER, name VARCHAR);";
    const INSERT_DEMO_DATA_SQL: &str = "INSERT INTO demoTable VALUES (1, 'Belgium'), (2, 'Netherlands'), (3, 'France'), (4, 'Germany');";
    const SIMPLE_DEMO_SQL: &str = "SELECT name FROM demoTable;";
    const SINGLE_ARG_SQL: &str = "SELECT name FROM demoTable WHERE id = ?";
    const SHOW_TABLES_SQL: &str = "SHOW TABLES;"; 
    const SYNTAX_ERR_SQL: &str = "SELCT name FROM demoTable";

    // setup an in-memory database for integration testing
    fn mem_db_setup() -> Result<ConnectionHandler, duckdb::Error> {
        let conn_handler: ConnectionHandler = ConnectionHandler::new();
        {
            let mut pool = conn_handler.db_pool.lock().unwrap();

            // open DB-connection in memory
            pool.insert(MEM_DB_PATH.to_string(), Connection::open_in_memory().unwrap());
            let conn: &Connection = pool.get(MEM_DB_PATH).unwrap();

            let _ = conn.execute(CREATE_DEMO_TABLE_SQL, [])?;
            let _ = conn.execute(INSERT_DEMO_DATA_SQL, [])?;
        }

        Ok(conn_handler)
    }

    mod serialize_recordbatch {
        use super::*;
        use arrow_ipc::reader::StreamReader;
        use duckdb::{arrow::array::{Array, StringArray}, Row};
        use tauri::ipc::{ IpcResponse, Response };

        // deserializes response on one column
        pub fn deserialize_rb<A, E: ?Sized, R, F>(response: Response, idx: usize, mapper: F) -> Result<Vec<R>, String> 
        where A: Array + 'static,
        for<'a> &'a A: IntoIterator<Item = Option<&'a E>>,
        F: Fn(&E) -> R,
        {
            let serial_data: Vec<u8> = Response::body(response).unwrap().deserialize().unwrap();

            let rb_vec: Vec<RecordBatch> = StreamReader::try_new(Cursor::new(serial_data), None)
                .unwrap()
                .filter_map(Result::ok)
                .collect();

            let act_vec: Vec<R> = rb_vec.iter()
                .flat_map(|rb| {
                    rb.column(idx)
                    .as_any()
                    .downcast_ref::<A>()
                    .expect("downcast failed")
                    .into_iter()
                    .flatten()
                    .map(|e| mapper(e))
                    .collect::<Vec<_>>()
                }).collect();

            return Ok(act_vec);
        }

        // NOTE: this method is implemented for '1-column VARCHAR' returns, anything else will break
        fn serialize_recordbatch_test_helper(sql: String, args: Vec<Value>) -> Result<Vec<String>, String> {
            // this method is a mess...

            // (1) fetch data
            let conn_handler: ConnectionHandler = mem_db_setup().unwrap();
            let (vec_rb, schema) = conn_handler.run_query_rb(MEM_DB_PATH.to_string(), sql.to_string(), args.clone()).unwrap();

            let response: Response = serialize_recordbatch(vec_rb, schema).unwrap();
            let res: Vec<String> = deserialize_rb::<StringArray, str, String, _>(response, 0, |v:&str | {v.to_string()})?;
            let mut act_vec = res.clone();
            
            // (4) fetch original data
            let row_mapper = |row: &Row<'_>| {let str: String = row.get(0)?; Ok(str)};
            let mut exp_vec: Vec<String> = conn_handler.run_query_row(MEM_DB_PATH.to_string(), sql, args, row_mapper).unwrap().clone();

            // (5) check if equal
            act_vec.sort();
            exp_vec.sort();

            assert_eq!(act_vec, exp_vec);
            return Ok(act_vec);
        }

        #[test]
        fn serialize_recordbatch_ok_test() {
            let _ = serialize_recordbatch_test_helper(SIMPLE_DEMO_SQL.to_string(), vec![]).unwrap();
        }

        #[test]
        fn serialize_recordbatch_empty_test() {
            let _ = serialize_recordbatch_test_helper(SINGLE_ARG_SQL.to_string(), vec![Value::from(0)]).unwrap();
        }
    }

    mod fetch_connection {
        use super::*;

        #[test]
        #[serial] // same file, can only be opened once simultaneously 
        fn fetch_connection_ok_test() {
            let conn_handler: ConnectionHandler = ConnectionHandler::new();
            let res: Result<(), String> = conn_handler.fetch_connection(&DB_PATH.to_string(), |_| Ok(()));
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn fetch_connection_incorrect_file_extension_test() {
            let conn_handler: ConnectionHandler = ConnectionHandler::new();
            let res: Result<(), String> = conn_handler.fetch_connection(&".out".to_string(), |_| Ok(()));
            assert!(res.is_err() && res.unwrap_err().contains(".duckdb"));
        }

        #[test]
        #[serial] // same file, can only be opened once simultaneously 
        fn fetch_connection_reuse_connection_test() {
            let conn_handler: ConnectionHandler = ConnectionHandler::new();
            assert_eq!(conn_handler.db_pool.lock().unwrap().len(), 0);
            let _ = conn_handler.fetch_connection(&DB_PATH.to_string(), |_| Ok(()));
            assert_eq!(conn_handler.db_pool.lock().unwrap().len(), 1);
            let _ = conn_handler.fetch_connection(&DB_PATH.to_string(), |_| Ok(()));
            assert_eq!(conn_handler.db_pool.lock().unwrap().len(), 1);
        }

        #[test]
        fn fetch_connection_file_missing_test() {
            let conn_handler: ConnectionHandler = ConnectionHandler::new();
            let res: Result<(), String> = conn_handler.fetch_connection(&"fakeFile.duckdb".to_string(), |_| Ok(()));
            let exp_err: &str = "file not found";
            assert!(res.is_err());
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected: {} but got: {}", exp_err, res.unwrap_err());
        }
    }

    mod run_query_rb {
        use super::*;

        fn run_query_rb_test_helper(sql: String, exp_len: usize, args: Vec<Value>) -> Result<(), String> {
            let conn_handler: ConnectionHandler = mem_db_setup().map_err(|e| e.to_string())?;

            let res: Result<(Vec<RecordBatch>, Schema), String> = conn_handler.run_query_rb(MEM_DB_PATH.to_string(), sql, args);
            if res.is_err() {return res.map(|_| ());}

            let vec_rb: Vec<RecordBatch> = res.unwrap().0;
            let actual_len: usize = vec_rb.iter().fold(0, |acc, rb| acc + rb.num_rows());
            assert_eq!(actual_len, exp_len);

            Ok(())
        }

        #[test]
        fn run_query_rb_show_tables_test() {
            let res = run_query_rb_test_helper(SHOW_TABLES_SQL.to_string(), 1, vec![]);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_rb_simple_test() {
            let res = run_query_rb_test_helper(SIMPLE_DEMO_SQL.to_string(), 4, vec![]);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_rb_syntax_err_test() {
            let res = run_query_rb_test_helper(SYNTAX_ERR_SQL.to_string(), usize::MAX, vec![]);
            let exp_err: &str = "syntax";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());
        }

        #[test]
        fn run_query_rb_empty_test() {
            let res = run_query_rb_test_helper(SINGLE_ARG_SQL.to_string(), 0, vec![Value::from(0)]);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_rb_wrong_arg_count_test() {
            let res = run_query_rb_test_helper(SINGLE_ARG_SQL.to_string(), usize::MAX, vec![Value::from(1), Value::from(2)]);
            let exp_err: &str = "Wrong number of parameters";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());
        }

        #[test]
        fn run_query_rb_arg_test() {
            let res = run_query_rb_test_helper(SINGLE_ARG_SQL.to_string(), 1, vec![Value::from(1)]);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }
    }

    mod run_query_row {
        use super::*;

        fn run_query_row_test_helper<F, T>(sql: String, args: Vec<Value>, mapper: F,  exp_len: usize) -> Result<(), String> 
        where F: Fn(&duckdb::Row<'_>) -> Result<T, duckdb::Error> 
        {
            let conn_handler: ConnectionHandler = mem_db_setup().map_err(|e| e.to_string())?;

            let res: Result<Vec<T>, String> = conn_handler.run_query_row(MEM_DB_PATH.to_string(), sql, args, mapper);
            if res.is_err() {return res.map(|_| ());}

            let vec_data: Vec<T> = res.unwrap();
            assert_eq!(vec_data.len(), exp_len);

            Ok(())
        }

        #[test]
        fn run_query_row_ok_test() {
            let res = run_query_row_test_helper(SHOW_TABLES_SQL.to_string(), vec![], |r| Ok(r.get::<usize, String>(0)?), 1);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_row_syntax_err_test() {
            let res = run_query_row_test_helper(SYNTAX_ERR_SQL.to_string(), vec![], |r| Ok(r.get::<usize, String>(0)?), 1);
            let exp_err: &str = "syntax";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());
        }

        #[test]
        fn run_query_row_empty_query_test() {
            let res = run_query_row_test_helper(SINGLE_ARG_SQL.to_string(), vec![Value::from(0)], |r| Ok(r.get::<usize, String>(0)?), 0);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_row_empty_sql_test() {
            let res = run_query_row_test_helper("".to_string(), vec![], |r| Ok(r.get::<usize, String>(0)?), 0);
            let exp_err: &str = "No statement";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());
        }

        #[test]
        fn run_query_row_arg_test() {
            let res = run_query_row_test_helper(SINGLE_ARG_SQL.to_string(), vec![Value::from(1)], |r| Ok(r.get::<usize, String>(0)?), 1);
            assert!(res.is_ok(), "{:?}", res.unwrap_err());
        }

        #[test]
        fn run_query_row_inc_arg_count_test() {
            let res = run_query_row_test_helper(SINGLE_ARG_SQL.to_string(), vec![], |r| Ok(r.get::<usize, String>(0)?), 1);
            let exp_err: &str = "parameters";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());

        }

        #[test]
        fn run_query_row_inc_arg_type_test() {
            let res = run_query_row_test_helper(SHOW_TABLES_SQL.to_string(), vec![Value::from("Belgium".to_string())], |r| Ok(r.get::<usize, String>(0)?), 1);
            let exp_err: &str = "parameter";
            assert!(res.as_ref().unwrap_err().contains(exp_err), "expected Err with '{}', but got: {:?}", exp_err, res.unwrap_err());
        }
    }
}
