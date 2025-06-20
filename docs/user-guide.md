# Energy Model Visualizer - User Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Using the Application](#using-the-application)
4. [Chart Types](#chart-types)
5. [Data Requirements](#data-requirements)
6. [Troubleshooting](#troubleshooting)

## Quick Start

Tulipa Energy Visualizer is a cross-platform desktop application for analyzing [Tulipa Energy Model](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/) optimization results stored in DuckDB files.

### Key Features

- **Interactive Visualizations**: Capacity, costs, prices, and geographic energy flows
- **Multi-Database Support**: Compare multiple scenarios simultaneously
- **Flexible Analysis**: Configurable time resolutions (hourly to yearly)
- **Geographic Mapping**: EU-wide energy flow visualization
- **SQL Query Interface**: Direct database exploration

## Installation

### System Requirements

- **Windows**: Windows 10+ with WebView2 Runtime
- **macOS**: macOS 10.15+
- **Linux**: Ubuntu 18.04+ with WebKit2GTK 4.1+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space plus database files

### Download and Install

1. Download the installer for your platform from the releases page
2. **Windows**: Run `.exe` installer
3. **macOS**: Open `.dmg` and drag to Applications folder
4. **Linux**: Install `.deb`/`.rpm` package or use `.AppImage`

## Using the Application

### Loading Data

1. **Launch** the Energy Model Visualizer
2. **Click "Upload Database File"** and select a `.duckdb` file
3. **Add graphs** using the "Add Graph" button
4. **Select chart types** and configure parameters

### Interface Layout

- **Left Panel**: Database management and file list
- **Center Area**: Visualization workspace with configurable charts
- **Graph Controls**: Chart type selector, database assignment, metadata filters

### Database Management

- **Multiple Files**: Load several `.duckdb` files for comparison
- **Remove Files**: Use trash icon to remove databases
- **File Validation**: Automatic compatibility checking

## Chart Types

### Asset Capacity Analysis

Tracks capacity evolution including investments and decommissions over time.

- **Use Case**: Investment planning, asset lifecycle management
- **Data Source**: `asset_both`, `var_assets_investment`, `var_assets_decommission` tables

### System Costs

Economic analysis of energy system costs broken down by asset and flow categories.

- **Components**: Fixed asset costs, unit commitment costs, transmission costs
- **Visualization**: Cost trends by year and energy carrier

### Production Prices

Energy pricing analysis using dual values from optimization constraints.

- **Features**: Configurable time resolution, carrier filtering
- **Applications**: Market analysis, investment guidance

### Storage Prices

Storage system valuation and pricing analysis.

- **Types**: Short-term (batteries), long-term (seasonal) storage
- **Analysis**: Marginal value, arbitrage opportunities

### Transportation Prices

Transmission and transport cost analysis with directional flow pricing.

- **Features**: Import/export pricing, carrier-specific analysis
- **Applications**: Infrastructure planning, congestion analysis

### Geographic Energy Flows

EU-wide energy trade visualization with province-level detail.

- **Features**: Import/export flows, trade balance analysis
- **Visualization**: Interactive maps with flow arrows and trade breakdowns

### Residual Load Analysis

Renewable energy supply patterns and demand-supply balance.

- **Focus**: Variable renewable sources, grid integration analysis
- **Features**: Metadata filtering, supply pattern visualization

### Database Browser

Direct SQL query interface for custom data exploration.

- **Features**: Custom queries, table exploration, data export
- **Security**: Read-only access, parameterized queries

## Data Requirements

### File Format

- **Extension**: `.duckdb` files only
- **Source**: Tulipa Energy Model optimization results
- **Size**: Up to 500MB (larger files may affect performance)

### Required Database Schema

Your DuckDB file must contain Tulipa Energy Model output tables:

- **Assets**: `asset`, `asset_both`, `asset_commission`
- **Flows**: `flow`, `var_flow`, `flow_both`
- **Costs**: Cost-related tables for economic analysis
- **Time**: `year_data`, `rep_periods_data`, `rep_periods_mapping`

### Enhanced Metadata (Optional)

For advanced filtering features, databases should include:

- **Categories**: `category`, `asset_category` tables
- **Geographic**: Hierarchical location data
- **Technology**: Asset technology categorization

Files with enhanced metadata enable advanced filtering and breakdown analysis.

## Troubleshooting

### Common Issues

**Database Loading Fails**

- Verify file is a valid `.duckdb` file
- Check file permissions and accessibility
- Ensure file contains Tulipa Energy Model schema

**Charts Show No Data**

- Verify selected database contains relevant tables
- Check year and asset selections
- Review database schema compatibility

**Application Performance Issues**

- Close unused charts to free memory
- Use appropriate time resolution for analysis
- Consider system RAM availability for large datasets

**File Dialog Not Opening**

- **Windows**: Ensure WebView2 Runtime is installed
- **Linux**: Verify WebKit2GTK dependencies
- **macOS**: Check application permissions

### Error Messages

- **"Column not found"**: Database schema missing expected columns
- **"No data for parameters"**: No matching data for selected filters
- **"Database path invalid"**: File path or permissions issue
- **"Query execution failed"**: SQL syntax or database access error

### Getting Help

- Check application logs for detailed error information
- Verify database file integrity with DuckDB tools
- Consult [Tulipa Energy Model documentation](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/) for data format requirements

## Tips for Effective Use

### Performance Optimization

- **Start with lower time resolutions** for initial exploration
- **Close unused charts** to conserve system resources
- **Use appropriate filters** to reduce data processing load

### Data Analysis Workflow

1. **Load representative database** to understand data structure
2. **Start with overview charts** (system costs, capacity trends)
3. **Drill down** into specific assets or time periods
4. **Use geographic charts** for spatial analysis
5. **Apply metadata filters** for focused analysis
