/**
 * Service modules for the Energy Model Visualizer.
 * 
 * This module organizes domain-specific business logic into separate service modules,
 * each handling a specific aspect of energy model data analysis and visualization.
 * 
 * ## Service Domains
 * 
 * ### Data Analysis Services
 * - **capacity**: Asset capacity analysis with investment and decommission tracking
 * - **system_cost**: System-wide economic cost analysis across different cost categories
 * - **production_price**: Production price analysis using dual values from optimization constraints
 * - **storage_price**: Storage system pricing analysis for batteries and seasonal storage
 * - **transport_price**: Transportation and transmission cost analysis
 * - **residual_load**: Renewable energy supply analysis and demand-supply balance
 * 
 * ### Data Management Services  
 * - **metadata**: Database schema introspection and asset/table information
 * - **query**: Direct SQL query execution with security and performance controls
 * - **import_export**: Geographic energy flow analysis for import/export trade calculations
 * - **documentation**: Documentation file reading service for in-app help system
 * 
 * ## Architecture
 * 
 * Each service module:
 * - Exposes Tauri commands for IPC communication
 * - Implements domain-specific business logic
 * - Handles data transformation and validation
 * - Provides comprehensive error handling
 * - Includes detailed documentation and examples
 * 
 * ## Security
 * 
 * - All database operations use parameterized queries
 * - File access is restricted to whitelisted paths
 * - Input validation prevents injection attacks
 * - Error messages avoid exposing sensitive information
 */

pub mod capacity;
pub mod import_export;
pub mod metadata;
pub mod production_price;
pub mod query;
pub mod residual_load;
pub mod storage_price;
pub mod system_cost;
pub mod transport_price;
pub mod documentation;