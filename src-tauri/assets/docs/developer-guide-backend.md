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

- **Rust**: Systems programming language for performance and safety
- **Tauri**: Cross-platform desktop framework with IPC
- **DuckDB**: Embedded analytical database engine
- **Apache Arrow**: Columnar data format for efficient serialization
- **Once Cell**: Lazy static initialization for connection pooling

### Design Principles

- **Memory Safety**: Rust's ownership system prevents common bugs
- **Performance First**: Zero-cost abstractions and efficient data processing
- **Type Safety**: Comprehensive compile-time error checking
- **Modular Architecture**: Domain-driven service organization
- **Error Handling**: Consistent Result types with detailed error messages

### Request Flow

The application follows a structured request flow: Frontend IPC calls are received by Tauri commands, which delegate to the service layer for business logic processing. The service layer executes database queries and returns data serialized in Apache Arrow format for efficient transfer back to the frontend.

## Development Setup

### Prerequisites

The development environment requires the Rust toolchain with the latest stable version. Platform-specific dependencies include WebKit development libraries on Linux, Xcode command line tools on macOS, and Microsoft C++ Build Tools on Windows.

### Development Commands

Standard Rust development commands are used for building, testing, and maintaining code quality. The project integrates with Tauri for full-stack development and application bundling. Code formatting, linting, and documentation generation follow Rust ecosystem conventions.

For documentation generation, use the configured npm scripts: `npm run docs:rust` to generate documentation without dependencies and including private items, `npm run docs:rust:copy` to copy generated docs to the docs directory, or `npm run docs:rust:build` to generate and copy documentation in one command.

### IDE Setup

Recommended development environments include VS Code with Rust Analyzer, CLion with the Rust plugin, or Vim/Neovim with appropriate Rust language server integration.

## Project Structure

The backend code is organized in the `src-tauri/src/` directory with the following structure:

- **lib.rs**: Contains command registration and module exports for Tauri integration
- **main.rs**: Binary entry point for the application
- **duckdb_conn.rs**: Manages database connection pooling and lifecycle
- **services/**: Domain-specific service modules organized by functionality
  - **mod.rs**: Service module exports and common utilities
  - **capacity.rs**: Asset capacity analysis operations
  - **system_cost.rs**: Economic cost calculation services
  - **production_price.rs**: Production pricing analysis
  - **storage_price.rs**: Storage system pricing calculations
  - **transport_price.rs**: Transportation cost analysis
  - **residual_load.rs**: Renewable energy supply analysis
  - **import_export.rs**: Geographic energy flow analysis
  - **metadata.rs**: Database schema and metadata operations
  - **query.rs**: Direct SQL execution utilities
  - **query_builder.rs**: Dynamic SQL construction helpers

### Naming Conventions

The codebase follows Rust naming conventions: snake_case for files and functions, PascalCase for types and structs, and SCREAMING_SNAKE_CASE for constants.

## Service Layer Patterns

### Tauri Command Pattern

Each service function is exposed as a Tauri command with consistent parameter validation, error handling, and response formatting. Commands accept database path and domain-specific parameters, validate inputs, execute database queries, and return Apache Arrow serialized data or detailed error messages.

The pattern includes comprehensive input validation to prevent empty or invalid parameters, database connection management through the connection pool, query execution with parameterized statements to prevent SQL injection, and standardized error handling with contextual messages.

### Error Handling Pattern

The application implements a custom error type hierarchy for different categories of failures including database errors, validation errors, and query execution errors. Each error type provides detailed context and implements standard Rust error traits for consistent handling across the application.

Error handling includes graceful degradation strategies, detailed error messages with context, and proper error propagation through the Result type system. Database-specific errors are mapped to application-level error types with additional context.

## Database Integration

### Connection Management

The application uses a thread-safe connection pool with path-based caching to efficiently manage DuckDB connections. The connection handler maintains a map of database paths to active connections, ensuring optimal resource utilization and preventing connection leaks.

Connection management includes validation of database file paths, lazy initialization of connections when first accessed, thread-safe access through mutex protection, and automatic cleanup of unused connections.

### Query Execution Patterns

Two primary query execution patterns are implemented: Apache Arrow-based execution for efficient data transfer to the frontend, and custom row mapping for complex data structures that require specific processing.

The Arrow-based pattern executes parameterized queries and returns results as RecordBatch objects with associated schema information, optimizing data transfer through columnar format serialization. The row mapping pattern allows for custom data transformations during query execution, enabling complex business logic processing at the database layer.

### Schema Compatibility Handling

The system includes utilities for checking database schema compatibility and handling version differences gracefully. This includes functions to verify column existence, add missing columns for backward compatibility, and handle schema evolution without breaking existing installations.

Schema handling ensures smooth upgrades by detecting missing database features and applying necessary migrations automatically while maintaining data integrity.

## IPC Communication

### Apache Arrow Serialization

Data serialization for frontend communication uses Apache Arrow's efficient columnar format. The serialization process converts query results into Arrow RecordBatch objects, creates an Arrow stream writer, and produces binary data optimized for fast deserialization on the frontend.

This approach minimizes data transfer overhead and enables efficient processing of large datasets in the frontend visualization components.

### Command Registration

All service functions are registered as Tauri commands in the main application builder. The registration process includes metadata operations, capacity analysis functions, cost analysis services, price analysis utilities, flow analysis tools, and direct query execution capabilities.

Command registration ensures type-safe communication between frontend and backend with automatic parameter validation and response serialization.

## Testing Patterns

### Unit Testing with Mock Data

Unit tests are implemented using temporary DuckDB databases with controlled test data. Test databases are created programmatically with known schemas and data sets, enabling predictable and repeatable test execution.

Testing patterns include creation of temporary test databases, insertion of known test data, execution of service functions with test parameters, validation of expected results, and cleanup of temporary resources.

### Integration Testing

Integration tests verify the interaction between multiple services using shared test databases. These tests ensure that services work correctly together and maintain consistency across the application.

Integration testing covers cross-service workflows, database state consistency, error handling across service boundaries, and performance characteristics under realistic conditions.

## Performance Guidelines

### Query Optimization

Performance optimization focuses on efficient query patterns including the use of prepared statements for repeated queries, appropriate column selection to minimize data transfer, and proper indexing strategies for common query patterns.

Query optimization includes parameterized statement reuse, selective data retrieval, batch processing for large datasets, and connection pooling to reduce overhead.

### Memory Management

Memory management strategies include efficient batch processing for large datasets, connection pool cleanup for long-running applications, and proper resource disposal to prevent memory leaks.

The application implements streaming data processing for large results, automatic cleanup of database connections, and efficient memory allocation patterns to maintain optimal performance.

### Error Recovery

Robust error handling includes retry logic for transient failures, graceful degradation when optional features are unavailable, and comprehensive logging for debugging and monitoring.

Error recovery mechanisms ensure application stability under various failure conditions while providing detailed diagnostic information for troubleshooting.

## Common Patterns

### Dynamic SQL Construction

The application includes utilities for building SQL queries dynamically while preventing SQL injection vulnerabilities. Query builders construct safe parameterized queries for various analysis patterns including time resolution queries, aggregation functions, and filtering conditions.

Dynamic query construction enables flexible data analysis while maintaining security and performance characteristics.

### Configuration Management

Application configuration supports environment variable overrides for deployment flexibility. Configuration includes database connection limits, query timeouts, logging levels, and other operational parameters.

Configuration management enables easy deployment across different environments while maintaining secure defaults and operational flexibility.
