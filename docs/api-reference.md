# API Reference

## Table of Contents
- [Overview](#overview)
- [Authentication and Security](#authentication-and-security)
- [Common Data Types](#common-data-types)
- [Error Handling](#error-handling)
- [Metadata APIs](#metadata-apis)
- [Capacity Management APIs](#capacity-management-apis)
- [System Cost APIs](#system-cost-apis)
- [Price Analysis APIs](#price-analysis-apis)
- [Load Analysis APIs](#load-analysis-apis)
- [Geographic Flow APIs](#geographic-flow-apis)
- [Query APIs](#query-apis)
- [Database Schema](#database-schema)
- [Response Formats](#response-formats)

## Overview

The Energy Model Visualizer API provides access to Tulipa Energy Model data through a set of IPC (Inter-Process Communication) commands. All commands are executed locally within the Tauri application and operate on DuckDB database files.

### API Characteristics
- **Protocol**: Tauri IPC (JSON-based communication)
- **Data Format**: Apache Arrow (binary columnar format)
- **Security**: Local execution only, file system access validation
- **Performance**: Connection pooling and query optimization
- **Error Handling**: Structured error responses with context

### Base URL
All API calls are made through Tauri's `invoke` function:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('command_name', { parameter: value });
```

## Authentication and Security

### File Access Validation
All database operations require valid `.duckdb` file paths:
- Files must exist and be accessible
- File extensions must be `.duckdb`
- No remote database connections allowed

### Input Sanitization
- All parameters are validated for type and format
- SQL injection prevention through parameterized queries
- Asset names and identifiers are sanitized

## Common Data Types

### Database Path
```typescript
type DatabasePath = string; // Must end with .duckdb
```

### Year Range
```typescript
type Year = number; // e.g., 2025, 2030
type YearRange = {
  start_year: number;
  end_year: number;
};
```

### Asset Identifier
```typescript
type AssetName = string; // e.g., "WindFarm_1", "PowerPlant_A"
```

### Resolution
```typescript
type Resolution = number; // Time aggregation period (hours)
```

### Response Format
All successful responses return Apache Arrow data:
```typescript
type ApiResponse = Uint8Array; // Serialized Apache Arrow data
```

## Error Handling

### Error Response Format
```typescript
type ApiError = string; // Human-readable error message
```

### Common Error Categories

#### Database Errors
- `"Database path must end with .duckdb"`
- `"File not found: '/path/to/file.duckdb'"`
- `"Failed to open database: [details]"`

#### Query Errors
- `"Error parsing query: [SQL syntax error]"`
- `"Error executing query: [execution details]"`

#### Validation Errors
- `"Parameter cannot be empty"`
- `"Invalid asset name"`
- `"Year out of range"`

#### Data Errors
- `"No data found for specified parameters"`
- `"Column '[column_name]' not found in table '[table_name]'"`

## Metadata APIs

### Get Assets
Retrieves a list of all available assets in the database.

**Command**: `get_assets`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with columns:
- `asset` (string): Asset identifier

**Example**:
```typescript
const assets = await invoke('get_assets', {
  db_path: '/path/to/energy_model.duckdb'
});
```

**SQL Query**:
```sql
SELECT asset FROM asset;
```

---

### Get Tables
Retrieves metadata about available tables in the database.

**Command**: `get_tables`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with database table information

**Example**:
```typescript
const tables = await invoke('get_tables', {
  db_path: '/path/to/energy_model.duckdb'
});
```

**SQL Query**:
```sql
SHOW TABLES;
```

## Capacity Management APIs

### Get Capacity
Retrieves capacity data for a specific asset over a year range, including investment and decommissioning information.

**Command**: `get_capacity`

**Parameters**:
```typescript
{
  db_path: string,
  asset_name: string,
  start_year: number,
  end_year: number
}
```

**Returns**: Apache Arrow data with columns:
- `year` (number): Milestone year
- `investment` (number): Investment capacity (-1 if not available)
- `decommission` (number): Decommissioned capacity (-1 if not available)
- `final_capacity` (number): Total capacity at year end
- `initial_capacity` (number): Total capacity at year start

**Example**:
```typescript
const capacity = await invoke('get_capacity', {
  db_path: '/path/to/energy_model.duckdb',
  asset_name: 'WindFarm_1',
  start_year: 2025,
  end_year: 2030
});
```

**Business Logic**:
- Handles optional investment and decommissioning tables
- Calculates cumulative capacity changes
- Returns -1 for unavailable data (graceful degradation)

---

### Get Available Years
Retrieves years for which capacity data is available for a specific asset.

**Command**: `get_available_years`

**Parameters**:
```typescript
{
  db_path: string,
  asset_name: string
}
```

**Returns**: Apache Arrow data with available milestone years

**Example**:
```typescript
const years = await invoke('get_available_years', {
  db_path: '/path/to/energy_model.duckdb',
  asset_name: 'WindFarm_1'
});
```

## System Cost APIs

### Get Fixed Asset Cost
Retrieves fixed costs associated with assets, including discount factor calculations.

**Command**: `get_fixed_asset_cost`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with asset cost information including:
- `milestone_year` (number): Year of cost occurrence
- `asset` (string): Asset identifier
- `fixed_cost` (number): Discounted fixed cost

**Example**:
```typescript
const fixedCosts = await invoke('get_fixed_asset_cost', {
  db_path: '/path/to/energy_model.duckdb'
});
```

---

### Get Fixed Flow Cost
Retrieves fixed costs associated with energy flows between assets.

**Command**: `get_fixed_flow_cost`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with flow cost information

**Example**:
```typescript
const flowCosts = await invoke('get_fixed_flow_cost', {
  db_path: '/path/to/energy_model.duckdb'
});
```

---

### Get Variable Flow Cost
Retrieves variable costs for energy flows, typically per unit of energy transferred.

**Command**: `get_variable_flow_cost`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with variable cost information

**Example**:
```typescript
const variableCosts = await invoke('get_variable_flow_cost', {
  db_path: '/path/to/energy_model.duckdb'
});
```

---

### Get Unit On Cost
Retrieves costs associated with unit commitment (turning units on/off).

**Command**: `get_unit_on_cost`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with unit commitment costs

**Example**:
```typescript
const unitCosts = await invoke('get_unit_on_cost', {
  db_path: '/path/to/energy_model.duckdb'
});
```

**Business Logic**:
- Handles databases with and without unit commitment data
- Falls back to zero costs when data unavailable

## Price Analysis APIs

### Get Production Price Resolution
Retrieves production price data with configurable time resolution.

**Command**: `get_production_price_resolution`

**Parameters**:
```typescript
{
  db_path: string,
  year: number,
  resolution: number
}
```

**Returns**: Apache Arrow data with columns:
- `asset` (string): Producer asset identifier
- `milestone_year` (number): Year of data
- `period` (number): Time period identifier
- `start_hour` (number): Period start time
- `end_hour` (number): Period end time
- `y_axis` (number): Average dual value (price)

**Example**:
```typescript
const productionPrices = await invoke('get_production_price_resolution', {
  db_path: '/path/to/energy_model.duckdb',
  year: 2030,
  resolution: 168 // Weekly resolution
});
```

**Business Logic**:
- Combines simple and compact constraint methods
- Handles databases with different constraint formulations
- Filters for producer, storage, and conversion assets

---

### Get Production Years
Retrieves years for which production price data is available.

**Command**: `get_production_years`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with available years

**Example**:
```typescript
const years = await invoke('get_production_years', {
  db_path: '/path/to/energy_model.duckdb'
});
```

---

### Get Storage Price Resolution
Retrieves storage price data for short-term, long-term, or combined storage.

**Command**: `get_storage_price_resolution`

**Parameters**:
```typescript
{
  db_path: string,
  year: number,
  resolution: number,
  storage_type: 'short-term' | 'long-term' | 'both'
}
```

**Returns**: Apache Arrow data with storage price information

**Example**:
```typescript
const storagePrices = await invoke('get_storage_price_resolution', {
  db_path: '/path/to/energy_model.duckdb',
  year: 2030,
  resolution: 24, // Daily resolution
  storage_type: 'both'
});
```

**Business Logic**:
- Handles different storage constraint formulations
- Combines short-term and long-term storage when requested
- Graceful handling of missing constraint tables

---

### Get Storage Years
Retrieves years for which storage price data is available.

**Command**: `get_storage_years`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with available years

---

### Get Transportation Price Resolution
Retrieves transportation price data for energy flows between regions.

**Command**: `get_transportation_price_resolution`

**Parameters**:
```typescript
{
  db_path: string,
  year: number,
  carrier: string,
  resolution: number,
  column_type: string
}
```

**Returns**: Apache Arrow data with transportation price information

**Example**:
```typescript
const transportPrices = await invoke('get_transportation_price_resolution', {
  db_path: '/path/to/energy_model.duckdb',
  year: 2030,
  carrier: 'electricity',
  resolution: 168,
  column_type: 'max'
});
```

---

### Get Transportation Years
Retrieves years for which transportation data is available.

**Command**: `get_transportation_years`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with available years

---

### Get Transportation Carriers
Retrieves available energy carriers for transportation analysis.

**Command**: `get_transportation_carriers`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with carrier information

**Example**:
```typescript
const carriers = await invoke('get_transportation_carriers', {
  db_path: '/path/to/energy_model.duckdb'
});
```

## Load Analysis APIs

### Get Renewables
Retrieves renewable energy supply data with configurable time resolution.

**Command**: `get_renewables`

**Parameters**:
```typescript
{
  db_path: string,
  year: number,
  resolution: number
}
```

**Returns**: Apache Arrow data with renewable supply information

**Example**:
```typescript
const renewables = await invoke('get_renewables', {
  db_path: '/path/to/energy_model.duckdb',
  year: 2030,
  resolution: 24
});
```

**Business Logic**:
- Identifies renewable assets by availability profiles
- Filters flows to consumer assets
- Aggregates by specified time resolution

---

### Get Non-renewables
Retrieves non-renewable energy supply data.

**Command**: `get_nonrenewables`

**Parameters**:
```typescript
{
  db_path: string,
  year: number,
  resolution: number
}
```

**Returns**: Apache Arrow data with non-renewable supply information

**Example**:
```typescript
const nonrenewables = await invoke('get_nonrenewables', {
  db_path: '/path/to/energy_model.duckdb',
  year: 2030,
  resolution: 24
});
```

---

### Get Yearly Renewables
Retrieves annual renewable energy supply totals.

**Command**: `get_yearly_renewables`

**Parameters**:
```typescript
{
  db_path: string,
  year: number
}
```

**Returns**: Apache Arrow data with annual renewable totals

---

### Get Yearly Non-renewables
Retrieves annual non-renewable energy supply totals.

**Command**: `get_yearly_nonrenewables`

**Parameters**:
```typescript
{
  db_path: string,
  year: number
}
```

**Returns**: Apache Arrow data with annual non-renewable totals

---

### Get Supply Years
Retrieves years for which supply data is available.

**Command**: `get_supply_years`

**Parameters**:
```typescript
{
  db_path: string
}
```

**Returns**: Apache Arrow data with available years

## Geographic Flow APIs

### Get Import
Retrieves energy import data for a specific geographic category.

**Command**: `get_import`

**Parameters**:
```typescript
{
  db_path: string,
  cat_name: string
}
```

**Returns**: Apache Arrow data with import flow information

**Example**:
```typescript
const imports = await invoke('get_import', {
  db_path: '/path/to/energy_model.duckdb',
  cat_name: 'Netherlands'
});
```

**Business Logic**:
- Maps category names to internal IDs
- Filters for incoming flows to the specified category
- Excludes level-0 categories (typically aggregated regions)

---

### Get Export
Retrieves energy export data for a specific geographic category.

**Command**: `get_export`

**Parameters**:
```typescript
{
  db_path: string,
  cat_name: string
}
```

**Returns**: Apache Arrow data with export flow information

**Example**:
```typescript
const exports = await invoke('get_export', {
  db_path: '/path/to/energy_model.duckdb',
  cat_name: 'Netherlands'
});
```

## Query APIs

### Run Serialize Query
Executes arbitrary SQL queries against the database.

**Command**: `run_serialize_query_on_db`

**Parameters**:
```typescript
{
  db_path: string,
  q: string
}
```

**Returns**: Apache Arrow data with query results

**Example**:
```typescript
const results = await invoke('run_serialize_query_on_db', {
  db_path: '/path/to/energy_model.duckdb',
  q: 'SELECT * FROM asset LIMIT 10'
});
```

**Security Note**: 
- Use with caution in production
- Input is validated but complex queries may impact performance
- Intended for advanced users and debugging

## Database Schema

### Core Tables

#### asset
Primary asset definition table:
- `asset` (VARCHAR): Unique asset identifier
- `type` (VARCHAR): Asset type (producer, consumer, storage, conversion)
- `capacity` (DOUBLE): Asset capacity
- `unit_commitment` (BOOLEAN): Whether asset supports unit commitment

#### var_flow
Energy flow variables from optimization:
- `from_asset` (VARCHAR): Source asset
- `to_asset` (VARCHAR): Destination asset
- `year` (INTEGER): Milestone year
- `rep_period` (INTEGER): Representative period
- `time_block_start` (INTEGER): Start time block
- `time_block_end` (INTEGER): End time block
- `solution` (DOUBLE): Optimal flow value

#### asset_milestone
Asset data by milestone year:
- `asset` (VARCHAR): Asset identifier
- `milestone_year` (INTEGER): Year of milestone
- `investment_cost` (DOUBLE): Investment cost per unit
- `fixed_cost` (DOUBLE): Fixed operation cost

### Constraint Tables

#### cons_capacity_outgoing_simple_method
Production capacity constraints:
- `asset` (VARCHAR): Producer asset
- `year` (INTEGER): Year
- `rep_period` (INTEGER): Representative period
- `time_block_start` (INTEGER): Start time
- `time_block_end` (INTEGER): End time
- `dual_max_output_flows_limit_simple_method` (DOUBLE): Dual value (price)

#### cons_balance_storage_rep_period
Short-term storage balance constraints:
- `asset` (VARCHAR): Storage asset
- `year` (INTEGER): Year
- `rep_period` (INTEGER): Representative period
- `time_block_start` (INTEGER): Start time
- `time_block_end` (INTEGER): End time
- `dual_balance_storage_rep_period` (DOUBLE): Dual value

### Time Structure Tables

#### rep_periods_mapping
Representative period mapping:
- `year` (INTEGER): Milestone year
- `period` (INTEGER): Period identifier
- `rep_period` (INTEGER): Representative period
- `weight` (DOUBLE): Period weight in optimization

#### rep_periods_data
Representative period data:
- `year` (INTEGER): Year
- `rep_period` (INTEGER): Representative period
- `num_timesteps` (INTEGER): Number of time steps
- `resolution` (DOUBLE): Time resolution (hours)

## Response Formats

### Apache Arrow Format
All API responses use Apache Arrow's binary columnar format:

#### Advantages
- **Performance**: Efficient serialization/deserialization
- **Memory**: Column-oriented storage reduces memory usage
- **Interoperability**: Cross-language data exchange
- **Compression**: Built-in compression for large datasets

#### Client-side Deserialization
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import * as arrow from 'apache-arrow';

async function fetchData(command: string, params: object) {
  const arrowData = await invoke(command, params);
  const table = arrow.tableFromIPC(arrowData);
  return table.toArray(); // Convert to JavaScript objects
}
```

#### Column Access
```typescript
// Access specific columns
const table = arrow.tableFromIPC(arrowData);
const assets = table.getColumn('asset').toArray();
const capacities = table.getColumn('capacity').toArray();
```

### Data Types Mapping

| SQL Type | Arrow Type | TypeScript Type |
|----------|------------|-----------------|
| INTEGER | Int32 | number |
| DOUBLE | Float64 | number |
| VARCHAR | Utf8 | string |
| BOOLEAN | Bool | boolean |
| TIMESTAMP | Timestamp | Date |

### Null Handling
- Missing data represented as `null` in Arrow format
- Graceful degradation: -1 values for optional features
- Empty result sets return valid Arrow schema with zero rows

---

For more information, see:
- [User Guide](./user-guide.md)
- [Frontend Developer Guide](./developer-guide-frontend.md)
- [Backend Developer Guide](./developer-guide-backend.md) 