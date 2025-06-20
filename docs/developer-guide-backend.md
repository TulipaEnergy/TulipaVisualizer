# Backend Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Service Layer Patterns](#service-layer-patterns)
5. [Database Integration](#database-integration)
6. [IPC Communication](#ipc-communication)
7. [Testing Patterns](#testing-patterns)
8. [Performance Guidelines](#performance-guidelines)

## Architecture Overview

### Technology Stack

- **Rust 2021**: Systems programming language for performance and safety
- **Tauri 2.x**: Cross-platform desktop framework with IPC
- **DuckDB 1.2.2**: Embedded analytical database engine
- **Apache Arrow**: Columnar data format for efficient serialization
- **Once Cell**: Lazy static initialization for connection pooling

### Design Principles

- **Memory Safety**: Rust's ownership system prevents common bugs
- **Performance First**: Zero-cost abstractions and efficient data processing
- **Type Safety**: Comprehensive compile-time error checking
- **Modular Architecture**: Domain-driven service organization
- **Error Handling**: Consistent Result types with detailed error messages

### Request Flow

```
Frontend IPC Call → Tauri Command → Service Layer → Database Query → Apache Arrow Serialization → Response
```

## Development Setup

### Prerequisites

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# Platform-specific dependencies
# Linux: sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev
# macOS: xcode-select --install
# Windows: Microsoft C++ Build Tools
```

### Development Commands

```bash
# Build and test
cargo build                 # Development build
cargo build --release       # Production build
cargo test                  # Run tests
cargo clippy                # Linting
cargo fmt                   # Code formatting
cargo doc --open            # Generate documentation

# Tauri integration
npm run tauri dev            # Full-stack development
npm run tauri build          # Application bundle
```

### IDE Setup

- **VS Code**: Rust Analyzer extension
- **CLion**: Rust plugin
- **Vim/Neovim**: rust.vim or coc-rust-analyzer

## Project Structure

```
src-tauri/src/
├── lib.rs                  # Command registration and exports
├── main.rs                 # Binary entry point
├── duckdb_conn.rs         # Database connection management
└── services/              # Domain service modules
    ├── mod.rs             # Service module exports
    ├── capacity.rs        # Asset capacity analysis
    ├── system_cost.rs     # Economic cost calculations
    ├── production_price.rs # Production pricing analysis
    ├── storage_price.rs   # Storage system pricing
    ├── transport_price.rs # Transportation cost analysis
    ├── residual_load.rs   # Renewable energy supply analysis
    ├── import_export.rs   # Geographic energy flow analysis
    ├── metadata.rs        # Database schema operations
    ├── query.rs           # Direct SQL execution
    └── query_builder.rs   # SQL construction utilities
```

### Naming Conventions

- **Files**: snake_case (`system_cost.rs`)
- **Functions**: snake_case (`get_capacity`)
- **Types**: PascalCase (`GraphConfig`)
- **Constants**: SCREAMING_SNAKE_CASE (`CAPACITY_SQL`)

## Service Layer Patterns

### Tauri Command Pattern

```rust
use tauri::ipc::Response;
use duckdb::{ types::Value, arrow::{array::RecordBatch, datatypes::Schema} };

/// Calculates asset capacity evolution over time.
///
/// # Parameters
/// * `db_path` - Database file path (validated for .duckdb extension)
/// * `asset_name` - Asset identifier for analysis
///
/// # Returns
/// * `Ok(Response)` - Apache Arrow serialized capacity data
/// * `Err(String)` - Error message with context
#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
) -> Result<Response, String> {
    // Input validation
    if asset_name.trim().is_empty() {
        return Err("Asset name cannot be empty".to_string());
    }

    // Database query execution
    let res: (Vec<RecordBatch>, Schema) = run_query_rb(
        db_path,
        CAPACITY_SQL.to_string(),
        vec![Value::from(asset_name)]
    )?;

    // Apache Arrow serialization
    serialize_recordbatch(res.0, res.1)
}
```

### SQL Query Organization

```rust
/// Complex capacity evolution query with business logic documentation.
///
/// Algorithm:
/// 1. Discovers all milestone years with capacity data
/// 2. Calculates point-in-time investments and decommissions
/// 3. Computes cumulative capacity changes over time
/// 4. Handles missing solution data with -1 sentinel values
const CAPACITY_SQL: &str = "
    WITH years AS (
        -- Comprehensive year discovery across capacity tables
        SELECT DISTINCT year FROM (
            SELECT milestone_year AS year FROM asset_both WHERE asset = $1
            UNION
            SELECT milestone_year AS year FROM var_assets_investment WHERE asset = $1
            UNION
            SELECT milestone_year AS year FROM var_assets_decommission WHERE asset = $1
        ) t
    )
    -- Main query with cumulative capacity calculations
    SELECT y.year,
           COALESCE(i.solution * af.capacity, -1) AS investment,
           COALESCE(d.solution * af.capacity, -1) AS decommission,
           -- Business logic: Final = Initial + Investments - Decommissions
           (COALESCE(SUM(ab.initial_units), 0) +
            COALESCE(inv_sum.total, 0) -
            COALESCE(dec_sum.total, 0)) * af.capacity AS final_capacity
    FROM years y
    CROSS JOIN asset af
    -- Additional joins and calculations...
    WHERE af.asset = $1
    ORDER BY y.year;
";
```

### Error Handling Pattern

```rust
use std::fmt;

/// Custom error type for service operations
#[derive(Debug)]
pub enum ServiceError {
    DatabaseError(String),
    ValidationError(String),
    QueryError(String),
}

impl fmt::Display for ServiceError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ServiceError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            ServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ServiceError::QueryError(msg) => write!(f, "Query error: {}", msg),
        }
    }
}

impl From<ServiceError> for String {
    fn from(error: ServiceError) -> String {
        error.to_string()
    }
}

/// Enhanced error handling with context
pub fn handle_query_error(error: duckdb::Error, context: &str) -> String {
    match error {
        duckdb::Error::SqliteFailure(code, msg) => {
            format!("{}: SQLite error {}: {}", context, code, msg.unwrap_or_default())
        }
        duckdb::Error::InvalidColumnName(name) => {
            format!("{}: Column '{}' not found", context, name)
        }
        _ => format!("{}: {}", context, error),
    }
}
```

## Database Integration

### Connection Management

```rust
use duckdb::{Connection, Result as DuckResult};
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;

/// Thread-safe connection pool with path-based caching
static CONN_HANDLER: Lazy<Mutex<ConnectionHandler>> =
    Lazy::new(|| Mutex::new(ConnectionHandler::new()));

struct ConnectionHandler {
    connections: HashMap<String, Connection>,
}

impl ConnectionHandler {
    fn new() -> Self {
        Self {
            connections: HashMap::new(),
        }
    }

    /// Gets or creates database connection with validation
    fn get_connection(&mut self, db_path: &str) -> DuckResult<&Connection> {
        // Validate file extension
        if !db_path.ends_with(".duckdb") {
            return Err(duckdb::Error::InvalidPath(
                "Database path must end with .duckdb".into()
            ));
        }

        // Get existing or create new connection
        if !self.connections.contains_key(db_path) {
            let conn = Connection::open(db_path)?;
            self.connections.insert(db_path.to_string(), conn);
        }

        Ok(self.connections.get(db_path).unwrap())
    }
}
```

### Query Execution Patterns

```rust
/// Execute query returning Apache Arrow RecordBatch for efficient data transfer
pub fn run_query_rb(
    db_path: String,
    query: String,
    params: Vec<Value>,
) -> Result<(Vec<RecordBatch>, Schema), String> {
    let mut conn_handler = CONN_HANDLER.lock()
        .map_err(|e| format!("Failed to acquire connection lock: {}", e))?;

    let conn = conn_handler.get_connection(&db_path)
        .map_err(|e| format!("Database connection failed: {}", e))?;

    // Prepare statement with parameters
    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Query preparation failed: {}", e))?;

    // Execute with Apache Arrow result
    let arrow_result = stmt.query_arrow(params.as_slice())
        .map_err(|e| format!("Query execution failed: {}", e))?;

    Ok((arrow_result.0, arrow_result.1))
}

/// Execute query with custom row mapping for complex data structures
pub fn run_query_row<F, T>(
    db_path: String,
    query: String,
    params: Vec<Value>,
    row_mapper: F,
) -> Result<Vec<T>, String>
where
    F: Fn(&duckdb::Row) -> DuckResult<T>,
{
    let mut conn_handler = CONN_HANDLER.lock()
        .map_err(|e| format!("Failed to acquire connection lock: {}", e))?;

    let conn = conn_handler.get_connection(&db_path)
        .map_err(|e| format!("Database connection failed: {}", e))?;

    let mut stmt = conn.prepare(&query)
        .map_err(|e| format!("Query preparation failed: {}", e))?;

    let rows = stmt.query_map(params.as_slice(), row_mapper)
        .map_err(|e| format!("Query execution failed: {}", e))?;

    rows.collect::<DuckResult<Vec<T>>>()
        .map_err(|e| format!("Row mapping failed: {}", e))
}
```

### Schema Compatibility Handling

```rust
/// Checks if a specific column exists in a table for graceful degradation
pub fn check_column_in_table(
    db_path: String,
    table_name: &str,
    column_name: &str,
) -> Result<bool, String> {
    let query = "SELECT COUNT(*) FROM pragma_table_info(?) WHERE name = ?";
    let params = vec![Value::from(table_name), Value::from(column_name)];

    let row_mapper = |row: &duckdb::Row| {
        let count: i64 = row.get(0)?;
        Ok(count > 0)
    };

    let results = run_query_row(db_path, query.to_string(), params, row_mapper)?;
    Ok(results.into_iter().next().unwrap_or(false))
}

/// Conditionally adds missing columns for backward compatibility
pub fn ensure_schema_compatibility(db_path: String) -> Result<(), String> {
    if !check_column_in_table(db_path.clone(), "var_assets_investment", "solution")? {
        execute_batch(
            db_path.clone(),
            "ALTER TABLE var_assets_investment ADD COLUMN solution DOUBLE".to_string()
        )?;
    }
    Ok(())
}
```

## IPC Communication

### Apache Arrow Serialization

```rust
use arrow_ipc::writer::StreamWriter;
use tauri::ipc::Response;

/// Serializes Apache Arrow data for efficient frontend transfer
pub fn serialize_recordbatch(
    batches: Vec<RecordBatch>,
    schema: Schema,
) -> Result<Response, String> {
    let mut buffer = Vec::new();

    {
        let mut writer = StreamWriter::try_new(&mut buffer, &schema)
            .map_err(|e| format!("Failed to create Arrow writer: {}", e))?;

        for batch in batches {
            writer.write(&batch)
                .map_err(|e| format!("Failed to write batch: {}", e))?;
        }

        writer.finish()
            .map_err(|e| format!("Failed to finalize Arrow stream: {}", e))?;
    }

    Ok(Response::new(buffer))
}
```

### Command Registration

```rust
// lib.rs
use tauri::Builder;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Metadata operations
            services::metadata::get_assets,
            services::metadata::get_tables,

            // Capacity analysis
            services::capacity::get_capacity,
            services::capacity::get_available_years,

            // Cost analysis
            services::system_cost::get_fixed_asset_cost,
            services::system_cost::get_unit_on_cost,
            services::system_cost::get_fixed_flow_cost,
            services::system_cost::get_variable_flow_cost,

            // Price analysis
            services::production_price::get_production_price_resolution,
            services::storage_price::get_storage_price_resolution,
            services::transport_price::get_transportation_price_resolution,
            services::transport_price::get_transportation_carriers,

            // Flow analysis
            services::residual_load::get_supply,
            services::import_export::get_import,
            services::import_export::get_export,

            // Direct queries
            services::query::run_serialize_query_on_db,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Testing Patterns

### Unit Testing with Mock Data

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use duckdb::{Connection, Result as DuckResult};
    use tempfile::NamedTempFile;

    fn create_test_database() -> DuckResult<NamedTempFile> {
        let temp_file = NamedTempFile::new().unwrap();
        let conn = Connection::open(temp_file.path())?;

        // Create test schema
        conn.execute_batch(
            "CREATE TABLE asset (asset VARCHAR, capacity DOUBLE);
             INSERT INTO asset VALUES ('wind_onshore', 100.0), ('solar_pv', 50.0);"
        )?;

        Ok(temp_file)
    }

    #[test]
    fn test_get_assets_success() {
        let temp_db = create_test_database().unwrap();
        let db_path = temp_db.path().to_str().unwrap().to_string() + ".duckdb";

        // Copy test file to .duckdb extension
        std::fs::copy(temp_db.path(), &db_path).unwrap();

        let result = get_assets(db_path);
        assert!(result.is_ok());

        // Cleanup
        std::fs::remove_file(db_path).ok();
    }

    #[test]
    fn test_invalid_database_path() {
        let result = get_assets("invalid_file.txt".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Database path must end with .duckdb"));
    }
}
```

### Integration Testing

```rust
#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::path::PathBuf;

    fn get_test_db_path() -> String {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/fixtures/test_energy_model.duckdb");
        path.to_str().unwrap().to_string()
    }

    #[test]
    fn test_capacity_analysis_workflow() {
        let db_path = get_test_db_path();

        // Test asset discovery
        let assets_result = get_assets(db_path.clone()).unwrap();
        // Verify assets are returned

        // Test capacity analysis for first asset
        // let capacity_result = get_capacity(db_path, first_asset).unwrap();
        // Verify capacity data structure
    }

    #[test]
    fn test_cross_service_consistency() {
        let db_path = get_test_db_path();

        // Test that all services work with same database
        let _assets = get_assets(db_path.clone()).unwrap();
        let _tables = get_tables(db_path.clone()).unwrap();
        // Verify no conflicts or state issues
    }
}
```

## Performance Guidelines

### Query Optimization

```rust
/// Optimized query patterns for large datasets
impl QueryOptimization {
    /// Use prepared statements for repeated queries
    fn use_prepared_statements() {
        // ✅ Good: Reuse prepared statement
        let mut stmt = conn.prepare(CAPACITY_SQL)?;
        for asset in assets {
            let result = stmt.query_arrow(&[Value::from(asset)])?;
        }

        // ❌ Bad: Prepare query each time
        for asset in assets {
            let query = format!("SELECT * FROM asset WHERE name = '{}'", asset);
            let result = conn.execute(&query)?;
        }
    }

    /// Limit data transfer with appropriate SELECT clauses
    fn optimize_data_selection() {
        // ✅ Good: Select only needed columns
        const OPTIMIZED_QUERY: &str = "
            SELECT year, investment, final_capacity
            FROM capacity_analysis
            WHERE asset = $1";

        // ❌ Bad: Select all columns
        const INEFFICIENT_QUERY: &str = "SELECT * FROM capacity_analysis WHERE asset = $1";
    }
}
```

### Memory Management

```rust
/// Efficient batch processing for large datasets
pub fn process_large_dataset(
    db_path: String,
    batch_size: usize,
) -> Result<Vec<RecordBatch>, String> {
    let mut results = Vec::new();
    let mut offset = 0;

    loop {
        let query = format!(
            "SELECT * FROM large_table LIMIT {} OFFSET {}",
            batch_size, offset
        );

        let (mut batches, _schema) = run_query_rb(
            db_path.clone(),
            query,
            vec![]
        )?;

        if batches.is_empty() {
            break;
        }

        results.append(&mut batches);
        offset += batch_size;
    }

    Ok(results)
}

/// Connection pool cleanup for long-running applications
pub fn cleanup_connections() {
    if let Ok(mut handler) = CONN_HANDLER.lock() {
        handler.connections.clear();
    }
}
```

### Error Recovery

```rust
/// Robust error handling with retry logic
pub fn execute_with_retry<T, F>(
    operation: F,
    max_retries: usize,
) -> Result<T, String>
where
    F: Fn() -> Result<T, String>,
{
    let mut last_error = None;

    for attempt in 0..=max_retries {
        match operation() {
            Ok(result) => return Ok(result),
            Err(error) => {
                last_error = Some(error.clone());

                if attempt < max_retries {
                    std::thread::sleep(std::time::Duration::from_millis(100 * (attempt + 1) as u64));
                    continue;
                }
            }
        }
    }

    Err(last_error.unwrap_or_else(|| "Operation failed".to_string()))
}
```

## Common Patterns

### Dynamic SQL Construction

```rust
pub mod query_builder {
    /// Builds time resolution queries with proper SQL injection prevention
    pub fn build_resolution_query(
        table_name: &str,
        value_column: &str,
        group_columns: &[&str],
        aggregate_function: &str,
        resolution_hours: &str,
        is_period_based: bool,
    ) -> String {
        let time_columns = if is_period_based {
            "period_block_start, period_block_end"
        } else {
            "time_block_start, time_block_end"
        };

        format!(
            "SELECT {},
                    {}({}::DOUBLE) as y_axis,
                    FLOOR({}/{}) * {} as period
             FROM ({})
             WHERE year = $1
             GROUP BY {}, period
             ORDER BY period",
            group_columns.join(", "),
            aggregate_function,
            value_column,
            time_columns.split(',').next().unwrap().trim(),
            resolution_hours,
            resolution_hours,
            table_name,
            group_columns.join(", ")
        )
    }
}
```

### Configuration Management

```rust
/// Application configuration with environment variable support
#[derive(Debug)]
pub struct Config {
    pub max_connections: usize,
    pub query_timeout: u64,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            max_connections: std::env::var("MAX_CONNECTIONS")
                .unwrap_or_else(|_| "10".to_string())
                .parse()
                .unwrap_or(10),
            query_timeout: std::env::var("QUERY_TIMEOUT")
                .unwrap_or_else(|_| "30".to_string())
                .parse()
                .unwrap_or(30),
            log_level: std::env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".to_string()),
        }
    }
}
```
