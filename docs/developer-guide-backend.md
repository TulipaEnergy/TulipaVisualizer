# Backend Developer Guide

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)
- [Project Architecture](#project-architecture)
- [Database Layer](#database-layer)
- [Service Layer](#service-layer)
- [IPC Communication](#ipc-communication)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)
- [Build and Deployment](#build-and-deployment)
- [Security Considerations](#security-considerations)
- [Code Style and Patterns](#code-style-and-patterns)

## Overview

The backend of the Energy Model Visualizer is built with Rust using the Tauri framework. It provides a secure, performant bridge between the React frontend and DuckDB data sources, handling data queries, processing, and serialization.

### Key Responsibilities
- **Database Management**: Connection pooling and query execution for multiple DuckDB files
- **Data Processing**: Complex SQL query building and result transformation
- **IPC Communication**: Secure command handlers for frontend-backend communication
- **Data Serialization**: Efficient Apache Arrow-based data transfer
- **Security**: File access validation and SQL injection prevention

## Technology Stack

### Core Technologies
- **Rust 2021**: Systems programming language for performance and safety
- **Tauri 2.x**: Cross-platform desktop app framework
- **DuckDB 1.2.2**: Embedded analytical database
- **Apache Arrow**: Columnar data format for efficient serialization

### Key Dependencies
```toml
tauri = { version = "2", features = [] }
duckdb = { version = "1.2.2", features = ["bundled"] }
arrow-ipc = "54.3.1"
once_cell = "1.21.3"
serde = { version = "1", features = ["derive"] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2.2.1"
tauri-plugin-opener = "2"
```

### Development Dependencies
- **mockall**: Mocking framework for unit tests
- **serial_test**: Test serialization for shared resources

## Development Setup

### Prerequisites
1. **Rust Toolchain** (1.70+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup update
   ```

2. **Platform-specific Requirements**
   - **Linux**: WebKit2GTK development libraries
     ```bash
     sudo apt update
     sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
     ```
   - **macOS**: Xcode Command Line Tools
   - **Windows**: Microsoft C++ Build Tools

### Development Environment
1. **IDE Setup**: VS Code with Rust Analyzer extension
2. **Code Formatting**: 
   ```bash
   rustup component add rustfmt
   cargo fmt
   ```
3. **Linting**:
   ```bash
   rustup component add clippy
   cargo clippy
   ```

### Build Commands
```bash
# Development build
cargo build

# Release build
cargo build --release

# Run tests
cargo test

# Generate documentation
cargo doc --open
```

## Project Architecture

### Directory Structure
```
src-tauri/src/
├── lib.rs              # Main application entry and command registration
├── main.rs             # Binary entry point
├── duckdb_conn.rs      # Database connection layer
└── services/           # Business logic modules
    ├── mod.rs          # Service module exports
    ├── capacity.rs     # Asset capacity queries
    ├── metadata.rs     # Database metadata operations
    ├── system_cost.rs  # System cost calculations
    ├── production_price.rs   # Production pricing data
    ├── storage_price.rs      # Storage pricing data
    ├── transport_price.rs    # Transportation pricing
    ├── residual_load.rs      # Renewable/non-renewable load
    ├── import_export.rs      # Geographic flow data
    ├── query.rs             # Arbitrary SQL execution
    └── query_builder.rs     # SQL query construction utilities
```

### Architectural Patterns

#### Service Layer Pattern
Each domain-specific service module provides:
- **Command Handlers**: Tauri-decorated functions for IPC
- **Business Logic**: Domain-specific query construction
- **Data Validation**: Input sanitization and validation
- **Error Handling**: Consistent error responses

```rust
#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
    start_year: u32,
    end_year: u32,
) -> Result<Response, String> {
    // Input validation, query building, execution
}
```

#### Connection Pool Pattern
Singleton connection manager for multi-database support:
- **Lazy Initialization**: Connections created on first access
- **Resource Sharing**: Reuse connections across requests
- **Error Recovery**: Graceful handling of connection failures

## Database Layer

### Connection Management

The `duckdb_conn.rs` module provides a centralized database layer with connection pooling:

```rust
static CONN_HANDLER: Lazy<Mutex<ConnectionHandler>> = 
    Lazy::new(|| Mutex::new(ConnectionHandler::new()));
```

#### Key Features
- **Connection Pool**: Maintains multiple database connections
- **Thread Safety**: Mutex-protected shared state
- **Path Validation**: Ensures `.duckdb` file extension
- **Error Handling**: Detailed error messages with context

#### Public Interface
```rust
// Execute query returning Apache Arrow RecordBatch
pub fn run_query_rb(
    db_path: String, 
    q: String, 
    args: Vec<Value>
) -> Result<(Vec<RecordBatch>, Schema), String>

// Execute query with row mapping
pub fn run_query_row<F, T>(
    db_path: String,
    q: String, 
    args: Vec<Value>,
    row_mapper: F
) -> Result<Vec<T>, String>
```

### Data Serialization

Apache Arrow integration for efficient data transfer:

```rust
pub fn serialize_recordbatch(
    rec_batch: Vec<RecordBatch>, 
    schema: Schema
) -> Result<Response, String> {
    let mut vec_writer = Cursor::new(Vec::new());
    let mut writer = StreamWriter::try_new(&mut vec_writer, &schema)?;
    
    for batch in rec_batch {
        writer.write(&batch)?;
    }
    writer.finish()?;
    
    Ok(Response::new(vec_writer.into_inner()))
}
```

### Query Construction

The `query_builder.rs` module provides utilities for dynamic SQL generation:

#### Resolution Query Builder
```rust
pub fn build_resolution_query(
    source_table: &str,
    value_col: &str,
    group_cols: &[&str],
    agg: &str,
    resolution: &str,
    clustered: bool,
) -> String
```

Features:
- **Time Resolution**: Configurable data aggregation periods
- **Clustering Support**: Both clustered and non-clustered queries
- **SQL Injection Prevention**: Parameterized query construction
- **Flexible Grouping**: Dynamic GROUP BY clause generation

## Service Layer

### Service Module Organization

Each service module follows a consistent pattern:

```rust
// Command handler
#[tauri::command]
pub fn service_function(params: Type) -> Result<Response, String> {
    // 1. Input validation
    // 2. Query construction  
    // 3. Database execution
    // 4. Result serialization
}

// SQL constants
const QUERY_SQL: &str = "SELECT ...";

// Helper functions (private)
fn build_dynamic_query(params: &Params) -> String { ... }
```

### Key Service Modules

#### Metadata Service (`metadata.rs`)
- **Asset Discovery**: `get_assets()` - List available assets
- **Table Information**: `get_tables()` - Database schema inspection
- **Column Validation**: `check_column_in_table()` - Schema verification

```rust
#[tauri::command]
pub fn get_assets(db_path: String) -> Result<Response, String> {
    let res = run_query_rb(db_path, ASSET_SQL.to_string(), vec![])?;
    serialize_recordbatch(res.0, res.1)
}
```

#### Capacity Service (`capacity.rs`)
- **Investment Analysis**: Asset capacity changes over time
- **Conditional Logic**: Handles optional database columns
- **Complex Queries**: Multi-table joins with subqueries

```rust
#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
    start_year: u32,
    end_year: u32,
) -> Result<Response, String>
```

#### System Cost Service (`system_cost.rs`)
- **Cost Categories**: Fixed asset, flow, variable, and unit costs
- **Discount Factors**: Time-value calculations
- **Conditional Queries**: Adapts to available database columns

#### Price Services
- **Production Prices** (`production_price.rs`)
- **Storage Prices** (`storage_price.rs`) 
- **Transportation Prices** (`transport_price.rs`)

Common patterns:
- Time resolution configuration
- Year-based filtering
- Dual value calculations from optimization constraints

#### Load Analysis Service (`residual_load.rs`)
- **Renewable Sources**: Assets with availability profiles
- **Non-renewable Sources**: Conventional generation
- **Temporal Aggregation**: Configurable time resolutions

### Service Testing

Each service includes comprehensive test suites:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::duckdb_conn::serialize_recordbatch;
    
    #[test]
    fn test_service_function() {
        // Test implementation
    }
}
```

## IPC Communication

### Command Registration

Commands are registered in `lib.rs` using Tauri's `generate_handler!` macro:

```rust
.invoke_handler(tauri::generate_handler![
    query::run_serialize_query_on_db,
    capacity::get_capacity,
    capacity::get_available_years,
    metadata::get_assets,
    metadata::get_tables,
    // ... additional commands
])
```

### Command Handler Pattern

All command handlers follow a consistent pattern:

```rust
#[tauri::command]
pub fn command_name(
    param1: String,
    param2: u32,
) -> Result<Response, String> {
    // Input validation
    if param1.is_empty() {
        return Err("Parameter cannot be empty".to_string());
    }
    
    // Business logic
    let result = process_data(param1, param2)?;
    
    // Serialization
    serialize_recordbatch(result.0, result.1)
}
```

### Security Considerations

#### Path Validation
```rust
if !db_path.ends_with(".duckdb") {
    return Err("Database path must end with .duckdb".to_string());
}

if !Path::new(db_path).exists() {
    return Err(format!("File not found: '{}'", db_path));
}
```

#### SQL Injection Prevention
- **Parameterized Queries**: Use `duckdb::params_from_iter()`
- **Input Sanitization**: Validate all user inputs
- **Query Construction**: Use compile-time SQL constants

## Error Handling

### Error Types and Patterns

#### Result Pattern
All functions return `Result<T, String>` for consistent error handling:

```rust
pub fn database_operation() -> Result<Data, String> {
    let connection = get_connection()
        .map_err(|e| format!("Connection failed: {}", e))?;
    
    let result = execute_query(&connection)
        .map_err(|e| format!("Query failed: {}", e))?;
    
    Ok(result)
}
```

#### Error Context
Provide meaningful error messages with context:

```rust
.map_err(|e| format!("Failed to open database '{}': {}", db_path, e))
```

#### Error Categories
- **Database Errors**: Connection, query execution, schema issues
- **Validation Errors**: Invalid parameters, missing files
- **Serialization Errors**: Arrow format conversion issues
- **Business Logic Errors**: Domain-specific validation failures

### Error Handling Best Practices

1. **Early Validation**: Check inputs before expensive operations
2. **Contextual Messages**: Include relevant details in error messages
3. **Error Propagation**: Use `?` operator for clean error propagation
4. **Graceful Degradation**: Handle optional features gracefully
5. **Logging**: Use `println!` for development debugging

```rust
// Example: Graceful handling of optional columns
let has_solution = check_column_in_table(db_path.clone(), "table", "solution")?;
let expression = if has_solution {
    "COALESCE(solution, 0)"
} else {
    "0"
};
```

## Testing

### Test Organization

#### Unit Tests
Located in each module using `#[cfg(test)]`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_function_name() {
        // Test implementation
    }
    
    #[test]
    fn test_error_handling() {
        // Error case testing
    }
}
```

#### Integration Tests
For cross-module functionality and database operations:

```rust
#[test]
#[serial] // Serialize database tests
fn test_database_integration() {
    // Database setup
    // Test execution
    // Cleanup
}
```

### Test Utilities

#### Mock Database
Use `mockall` for service layer testing:

```rust
use mockall::predicate::*;
use mockall::mock;

mock! {
    DatabaseConnection {
        fn execute_query(&self, sql: &str) -> Result<RecordBatch, String>;
    }
}
```

#### Test Data Serialization
Utility functions for testing Apache Arrow serialization:

```rust
pub fn deserialize_rb<A, E, R, F>(
    response: Response, 
    idx: usize, 
    mapper: F
) -> Result<Vec<R>, String>
where 
    A: Array + 'static,
    F: Fn(&E) -> R,
```

### Testing Best Practices

1. **Test Coverage**: Aim for >80% code coverage
2. **Error Testing**: Test both success and error cases
3. **Edge Cases**: Test boundary conditions and invalid inputs
4. **Database Tests**: Use test databases, not production data
5. **Serialization Tests**: Verify Arrow format compatibility

### Running Tests

```bash
# Run all tests
cargo test

# Run specific test module
cargo test capacity

# Run tests with output
cargo test -- --nocapture

# Run tests serially (for database tests)
cargo test -- --test-threads=1
```

## Performance Optimization

### Database Performance

#### Connection Pooling
- **Reuse Connections**: Avoid repeated connection overhead
- **Lazy Loading**: Create connections only when needed
- **Resource Management**: Proper cleanup and lifecycle management

#### Query Optimization
- **Prepared Statements**: Use parameterized queries for repeated operations
- **Index Usage**: Understand DuckDB indexing for query optimization
- **Result Streaming**: Use Apache Arrow for efficient data transfer

```rust
// Efficient query execution
let mut prepared_statement = conn.prepare(&sql)?;
let arrow_result = prepared_statement
    .query_arrow(duckdb::params_from_iter(args.iter()))?;
```

### Memory Management

#### Rust Ownership
- **Zero-copy Operations**: Use references where possible
- **RAII Pattern**: Automatic resource cleanup
- **Memory Safety**: Rust's ownership system prevents leaks

#### Apache Arrow Optimization
- **Columnar Format**: Efficient for analytical queries
- **Compression**: Built-in compression for data transfer
- **Streaming**: Process large datasets incrementally

### Compilation Optimizations

#### Release Build
```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
```

#### Target-specific Optimization
```bash
# CPU-specific optimizations
RUSTFLAGS="-C target-cpu=native" cargo build --release
```

## Build and Deployment

### Development Build
```bash
# Standard development build
cargo build

# Watch mode for continuous compilation
cargo watch -x build
```

### Release Build
```bash
# Optimized release build
cargo build --release

# Cross-compilation for different targets
cargo build --release --target x86_64-pc-windows-gnu
```

### Tauri Integration

#### Bundle Configuration
The backend is automatically bundled with the frontend during Tauri build:

```bash
# Build complete application
npm run tauri build

# Development mode with hot reload
npm run tauri dev
```

#### Platform-specific Considerations

##### Windows
- **WebView2**: Automatic installation handling
- **Code Signing**: Configure for distribution
- **Windows Subsystem**: GUI mode configuration

##### macOS
- **App Notarization**: For macOS distribution
- **Universal Binary**: ARM64 + x86_64 support
- **Bundle Identifier**: Unique app identification

##### Linux
- **AppImage**: Self-contained application format
- **System Dependencies**: WebKit2GTK requirements
- **Desktop Integration**: .desktop file generation

### CI/CD Pipeline

#### GitHub Actions Example
```yaml
name: Build Backend
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Install dependencies
        run: sudo apt-get install libwebkit2gtk-4.1-dev
      - name: Build
        run: cargo build --release
      - name: Test
        run: cargo test
```

## Security Considerations

### File System Security

#### Path Validation
```rust
// Validate file extensions
if !db_path.ends_with(".duckdb") {
    return Err("Invalid file type".to_string());
}

// Check file existence and accessibility
if !Path::new(&db_path).exists() {
    return Err("File not found".to_string());
}
```

#### Tauri Security Context
- **Allowlist System**: Explicitly enable required APIs
- **CSP Headers**: Content Security Policy for web content
- **IPC Validation**: All command parameters are validated

### SQL Injection Prevention

#### Parameterized Queries
```rust
// Safe: Using parameters
let result = conn.prepare(&sql)?
    .query_arrow(duckdb::params_from_iter(args.iter()))?;

// Unsafe: String concatenation (NEVER DO THIS)
// let sql = format!("SELECT * FROM {} WHERE id = {}", table, id);
```

#### Input Sanitization
```rust
fn validate_asset_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name.len() > 100 {
        return Err("Invalid asset name".to_string());
    }
    if name.contains(';') || name.contains('--') {
        return Err("Invalid characters in asset name".to_string());
    }
    Ok(())
}
```

### Data Privacy

#### Local Processing
- **No Network Requests**: All data processing happens locally
- **No Data Collection**: No telemetry or analytics
- **File Permissions**: Respect operating system file permissions

## Code Style and Patterns

### Rust Style Guidelines

#### Naming Conventions
```rust
// Functions: snake_case
pub fn get_asset_capacity() -> Result<Data, String> { }

// Types: PascalCase
pub struct DatabaseConnection { }

// Constants: SCREAMING_SNAKE_CASE
const MAX_QUERY_SIZE: usize = 1024;

// Modules: snake_case
mod database_connection;
```

#### Documentation
```rust
/// Retrieves asset capacity data for a given time range.
/// 
/// # Arguments
/// * `db_path` - Path to the DuckDB database file
/// * `asset_name` - Name of the asset to query
/// * `start_year` - Starting year for the query range
/// * `end_year` - Ending year for the query range
/// 
/// # Returns
/// * `Ok(Response)` - Serialized capacity data
/// * `Err(String)` - Error message describing the failure
/// 
/// # Examples
/// ```
/// let response = get_capacity(
///     "/path/to/db.duckdb".to_string(),
///     "WindFarm_1".to_string(),
///     2025,
///     2030
/// )?;
/// ```
#[tauri::command]
pub fn get_capacity(
    db_path: String,
    asset_name: String,
    start_year: u32,
    end_year: u32,
) -> Result<Response, String>
```

#### Error Handling Patterns
```rust
// Use ? operator for error propagation
fn process_data(input: &str) -> Result<Data, String> {
    let validated = validate_input(input)?;
    let processed = transform_data(validated)?;
    Ok(processed)
}

// Provide context in error messages
.map_err(|e| format!("Failed to process {}: {}", input_name, e))
```

### Project-specific Patterns

#### Service Module Structure
```rust
// Public command handlers
#[tauri::command]
pub fn public_command() -> Result<Response, String> { }

// Private helper functions
fn helper_function() -> Result<InternalType, String> { }

// SQL constants at module bottom
const QUERY_SQL: &str = "SELECT ...";
```

#### Database Query Pattern
```rust
pub fn database_operation(params: Params) -> Result<Response, String> {
    // 1. Input validation
    validate_params(&params)?;
    
    // 2. Query construction
    let sql = build_query(&params);
    
    // 3. Database execution
    let result = run_query_rb(params.db_path, sql, params.args)?;
    
    // 4. Serialization
    serialize_recordbatch(result.0, result.1)
}
```

#### Conditional Logic Pattern
```rust
// Check for optional database features
let has_feature = check_column_in_table(db_path.clone(), "table", "column")?;
let query_part = if has_feature {
    "complex_calculation(column)"
} else {
    "default_value"
};
```

### Code Quality Tools

#### Formatting
```bash
# Format code
cargo fmt

# Check formatting
cargo fmt -- --check
```

#### Linting
```bash
# Run Clippy linter
cargo clippy

# Clippy with all features
cargo clippy --all-features --all-targets
```

#### Documentation
```bash
# Generate and open documentation
cargo doc --open

# Check documentation links
cargo doc --document-private-items
```

### Generated Documentation

#### RustDoc Integration
The project includes comprehensive RustDoc documentation for all backend modules:

**Generate RustDoc:**
```bash
# From project root
npm run docs:rust:build

# Or manually from src-tauri directory
cd src-tauri
cargo doc --no-deps --document-private-items
```

**View Documentation:**
```bash
# Open generated documentation in browser
npm run docs:rust:open

# Or manually open
open docs/rustdoc/tauri_app_lib/index.html
```

**Documentation Location:**
- **Generated HTML**: `docs/rustdoc/tauri_app_lib/index.html`
- **Service Modules**: `docs/rustdoc/tauri_app_lib/services/index.html`
- **Database Layer**: `docs/rustdoc/tauri_app_lib/duckdb_conn/index.html`

#### Documentation Standards
- **Module Documentation**: All modules have comprehensive `//!` comments
- **Function Documentation**: All public functions have `///` doc comments
- **Examples**: Code examples included where appropriate
- **Cross-references**: Links between related modules and functions
- **Error Documentation**: Return types and error conditions documented

---

For more information, see:
- **[Generated RustDoc](../docs/rustdoc/tauri_app_lib/index.html)** - Complete API documentation
- [Tauri Documentation](https://tauri.app/v1/guides/)
- [DuckDB Rust API](https://docs.rs/duckdb/latest/duckdb/)
- [Apache Arrow Rust](https://docs.rs/arrow/latest/arrow/)
- [User Guide](./user-guide.md)
- [Frontend Developer Guide](./developer-guide-frontend.md) 