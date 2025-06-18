# GUI for Visualizing and Comparing Energy Scenarios - Tauri + React + Typescript

## Table of Contents

- [About the Project](#about-the-project)
- [Recommended IDE Setup](#recommended-ide-setup)
- [Prerequisites](#prerequisites)
- [Setup Instructions, Development and Build](#setup-instructions-development-and-build)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Code Analysis & Quality Metrics](#code-analysis--quality-metrics)

## About the Project

This is a cross-platform desktop application for visualizing output data of the [Tulipa Energy Model](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/), stored in a `.duckdb` file. Users can simply upload a file, and the app automatically runs SQL queries and renders the results as interactive visualizations (bar charts, line charts, etc.).

It is built using:

- **Rust (Tauri backend)** – Handles file access, SQL execution, and secure communication with the frontend.
- **React + TypeScript** – Provides a responsive and modern user interface.
- **Apache ECharts** – Powers the data visualizations.

---

## Recommended IDE Setup

We recommend using [Visual Studio Code](https://code.visualstudio.com/) with the following extensions:

- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — for debugging and building Tauri apps
- [Rust Analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — for Rust language support

---

## Prerequisites

Before running or building the project, ensure the following are installed:

- **Node.js (LTS version)** – [https://nodejs.org/](https://nodejs.org/)
- **Rust** – [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)

---

## Setup Instructions, Development and Build

1. **Install JavaScript Dependecies**

```
npm install
```

2. **Start the development server**

```
npm run tauri dev
```

This will:

- Launch the React + TypeScript frontend

- Start the Rust backend via Tauri

- Open the application in a native window with hot reload support

3. **Create a production-ready build of the application**

```
npm run tauri build
```

---

## How it works

1. The user uploads a `.duckdb` file through the interface.
2. The frontend sends a request to the backend using Tauri's IPC (Inter-Process Communication).
3. The Rust backend opens the file using the DuckDB engine.
4. Predefined SQL queries are executed on the uploaded file.
5. Query results are returned to the frontend as JSON.
6. The frontend renders the data using Apache ECharts.

---

## Project Structure

```
src/
├── components/      # React components
├── hooks/           # Custom React hooks
├── store/           # Zustand state management
├── services/        # API and database services
├── test/            # Test setup and utilities
├── data/            # Data utilities and mock data
├── styles/          # Global styles
└── assets/          # Static assets

src-tauri/
├── src/             # Rust backend code
│   ├── main.rs      # Entry point
│   └── lib.rs       # Core setup
└── Cargo.toml       # Rust dependencies
```

---

## Development Commands

### Basic Commands

- `npm run dev` - Start the Vite development server
- `npm run tauri dev` - Start the Tauri development server (frontend + backend)
- `npm run build` - Build the frontend
- `npm run preview` - Preview the built frontend
- `npm run tauri build` - Build the Tauri application for distribution

### Testing Commands

- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode (automatically reruns on changes)
- `npm run test:coverage` - Run tests with coverage reporting

### Code Quality

- `npx prettier . --write --end-of-line auto` - Format code using Prettier

## Testing

See [Testing Guide](Testing.md)

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests before committing (`npm test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE.txt](LICENSE.txt) file for details.

## Code Analysis & Quality Metrics

This project includes comprehensive static code analysis tools for maintaining high code quality.

### Quick Start

```bash
# 1. Install dependencies and setup analysis tools. If this fails, make sure to have all dependencies installed first.
npm run analyze:setup

# 2. Run comprehensive analysis
npm run analyze
```

### Analysis Tools Included

- **ESLint**: Code linting and style checking
- **Prettier**: Code formatting
- **Jest**: Unit testing with coverage
- **Rust Clippy**: Rust code linting
- **Rust Tests**: Rust unit testing
- **Security**: Dependency vulnerability scanning

### Advanced Metrics Analysis

The project includes advanced software metrics analysis that provides insights into:

- **🔄 LCoM (Lack of Cohesion of Methods)**: Measures how well functions/methods work together
- **🔗 Coupling**: Analyzes dependencies between modules (efferent and afferent coupling)
- **🌀 Cyclomatic Complexity**: Measures code complexity and number of execution paths
- **🛠️ Maintainability Index**: Composite metric for code maintainability (0-100 scale)
- **📊 Halstead Metrics**: Software science metrics including difficulty and effort

#### Metrics Thresholds

The analysis uses configurable thresholds defined in `analysis-config.json`:

- **Complexity**: ≤ 15 (cyclomatic complexity)
- **Maintainability**: ≥ 60 (maintainability index)
- **LCoM**: ≤ 0.7 (lack of cohesion)
- **Coupling**: ≤ 10 (efferent coupling)

#### Report Structure

```
analysis-reports/
├── index.html              # Unified dashboard
├── metrics/
│   ├── index.html          # Advanced metrics report
│   └── detailed-metrics.json # Raw metrics data
├── eslint/                 # ESLint reports
├── typescript/             # TypeScript analysis
└── rust/                   # Rust analysis
```

### Troubleshooting

If you encounter issues after cloning:

1. **Script permission errors**: `chmod +x scripts/*.sh`
2. **Dependencies missing**: `npm install`
3. **Rust tools missing**: `rustup component add clippy`
