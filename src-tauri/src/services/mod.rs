//! # Service Modules
//! 
//! This module contains all business logic services for the Energy Model Visualizer.
//! Each service module handles a specific domain of energy model data and provides
//! Tauri command handlers for IPC communication with the frontend.
//! 
//! ## Service Domains
//! 
//! - **[`metadata`]**: Database schema and asset information
//! - **[`capacity`]**: Asset capacity, investment, and decommissioning analysis
//! - **[`system_cost`]**: Economic analysis including fixed and variable costs
//! - **[`production_price`]**: Production pricing and dual value analysis
//! - **[`storage_price`]**: Storage system pricing and optimization results
//! - **[`transport_price`]**: Transportation and transmission cost analysis
//! - **[`residual_load`]**: Renewable and non-renewable supply analysis
//! - **[`import_export`]**: Geographic energy flow and trade analysis
//! - **[`query`]**: Direct SQL query execution capabilities
//! - **[`query_builder`]**: Utilities for dynamic SQL query construction
//! 
//! ## Architecture Pattern
//! 
//! All service modules follow a consistent pattern:
//! 1. **Tauri Commands**: Public functions decorated with `#[tauri::command]`
//! 2. **Business Logic**: Domain-specific query construction and data processing
//! 3. **Data Validation**: Input sanitization and schema validation
//! 4. **Error Handling**: Consistent error responses with context
//! 5. **Apache Arrow Serialization**: Efficient data transfer to frontend

pub mod metadata;
pub mod capacity;
pub mod system_cost;
pub mod production_price;
pub mod storage_price;
pub mod transport_price;
pub mod residual_load;
pub mod import_export;
pub mod query;
pub mod query_builder;