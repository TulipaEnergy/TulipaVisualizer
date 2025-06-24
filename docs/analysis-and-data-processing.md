# Code Analysis & Data Processing Tools

This document provides an overview of the code analysis framework and Python data processing utilities included in the Tulipa Energy Visualizer project.

## Code Analysis Framework

The project includes a comprehensive static code analysis framework located in the `code-analysis/` directory that provides automated quality assessment for both frontend (TypeScript/React) and backend (Rust) code.

### Overview

The analysis framework consists of three main components:

1. **`analyze.js`** - Main analysis engine that orchestrates all quality checks
2. **`analysis-config.json`** - Configuration file defining analysis rules and thresholds
3. **`setup-analysis.sh`** - Setup script for installing required analysis tools

### Features

#### Multi-Language Analysis

- **Frontend (TypeScript/React)**: ESLint, code complexity metrics, test coverage
- **Backend (Rust)**: Clippy linting, security analysis with cargo-geiger, code metrics with tokei

#### Quality Metrics

- **Code Complexity**: Cyclomatic and cognitive complexity analysis
- **Test Coverage**: Line, branch, and function coverage with configurable thresholds
- **Maintainability Index**: Code maintainability scoring
- **Security Analysis**: Vulnerability scanning for unsafe Rust code
- **Dependency Analysis**: Coupling and cohesion metrics

#### Comprehensive Reporting

- **Unified HTML Reports**: Single dashboard combining all analysis results
- **Individual Tool Reports**: Detailed reports for each analysis tool
- **JSON Output**: Machine-readable results for CI/CD integration
- **Coverage Visualization**: Interactive coverage reports

### Configuration

The analysis framework uses threshold-based quality gates defined in `analysis-config.json`:

### Usage

```bash
# Setup analysis tools and run analysis (run once for fresh repository)
npm run analyze:build

# Run complete analysis
npm run analyze

# View results
open analysis-reports/index.html
```

The analysis generates reports in the `analysis-reports/` directory with a unified dashboard accessible at `index.html`.

## Python Data Processing Scripts

The `src-python/` directory contains utility scripts for preparing and processing energy model data for visualization.

### 1. Database Enhancement (`prepare_db_file.py`)

**Purpose**: Enhances DuckDB files with hierarchical categorization and metadata for improved visualization.

The script prompts for a DuckDB file and creates an enhanced version with `Enhanced` suffix.

### 2. European Geographic Data (`conversion2EU.py`)

**Purpose**: Extracts and processes European administrative boundaries from Natural Earth data for geographic visualizations.

**Output**: Creates `eu_provinces.geo.json` with European administrative boundaries suitable for mapping.

### 3. Global Geographic Data (`prepare_geo_json.py`)

**Purpose**: Simple utility for converting Natural Earth shapefiles to GeoJSON format for web visualization.

Requires Natural Earth shapefile `ne_10m_admin_1_states_provinces.shp` in the working directory.

## Integration with Main Application

### Analysis Integration

- The analysis framework integrates with the project's npm scripts
- Results can be used for continuous integration quality gates
- Reports provide insights for code review and refactoring decisions

### Data Processing Integration

- Enhanced DuckDB files from `prepare_db_file.py` work directly with the main application
- Geographic data from conversion scripts supports the mapping features
- Hierarchical categories enable advanced filtering and grouping in visualizations

## Dependencies

### Code Analysis

- Node.js and npm (for frontend analysis)
- Rust and Cargo (for backend analysis)
- Optional: cargo-geiger, tokei (installed via setup script)
