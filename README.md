# Energy Model Visualizer - Tauri + React + TypeScript

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## About the Project

The **Energy Model Visualizer** is a cross-platform desktop application designed for visualizing and comparing energy scenario data from the [Tulipa Energy Model](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/). This tool enables energy researchers, analysts, and policymakers to interactively explore optimization results stored in `.duckdb` files through rich, interactive visualizations.

### Technology Stack

- **Backend**: Rust with Tauri framework for secure, performant desktop integration
- **Frontend**: React 18 + TypeScript for modern, responsive user interface
- **Visualization**: Apache ECharts for interactive data visualization
- **Database**: DuckDB for high-performance analytical queries
- **State Management**: Zustand for predictable state handling
- **UI Framework**: Mantine for consistent, accessible component library

### Target Audience

- **Energy System Researchers**: Analyze optimization model outputs
- **Policy Analysts**: Compare energy scenarios and policies
- **Data Scientists**: Explore large-scale energy datasets
- **Decision Makers**: Understand energy system trade-offs

## Key Features

### 📊 **Comprehensive Data Visualization**
- **Capacity Analysis**: Asset investment, decommissioning, and capacity evolution
- **System Costs**: Fixed, variable, and unit commitment cost breakdowns
- **Price Analysis**: Production, storage, and transportation price dynamics
- **Load Analysis**: Renewable vs. non-renewable supply patterns
- **Geographic Flows**: EU energy import/export visualization

### 🔄 **Multi-Database Support**
- Load and compare multiple `.duckdb` files simultaneously
- Side-by-side scenario comparison
- Synchronized filtering and time range selection

### ⚡ **High-Performance Analytics**
- Connection pooling for multi-database operations
- Apache Arrow data serialization for efficient transfer
- Configurable time resolution (hourly to yearly aggregation)

### 🎛️ **Interactive Controls**
- Dynamic filtering by assets, years, and categories
- Zoom and pan capabilities for detailed analysis
- Export functionality for charts and data
- Responsive design for various screen sizes

### 🔒 **Security & Privacy**
- Local-only data processing (no external data transmission)
- File system access validation
- SQL injection prevention

## Quick Start

### System Requirements
- **Windows**: Windows 10 (1909) or later, WebView2
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Modern distribution with WebKit2GTK 4.1

### Installation

1. **Download** the latest release for your platform from [GitHub Releases](../../releases)
2. **Install** the application following platform-specific instructions
3. **Launch** the Energy Model Visualizer
4. **Load** a `.duckdb` file using the "Add Database" button
5. **Explore** your energy data through interactive visualizations

For detailed installation instructions, see the [User Guide](docs/user-guide.md).

## Documentation

### 📖 **User Documentation**
- **[User Guide](docs/user-guide.md)** - Complete user manual with step-by-step instructions
  - Installation and setup
  - File format requirements
  - Feature overview and usage
  - Data interpretation guide
  - Troubleshooting

### 🛠️ **Developer Documentation**
- **[Frontend Developer Guide](docs/developer-guide-frontend.md)** - React/TypeScript development
  - Architecture and patterns
  - Component development
  - State management with Zustand
  - Testing strategies
  - Performance optimization

- **[Backend Developer Guide](docs/developer-guide-backend.md)** - Rust/Tauri development
  - Service architecture
  - Database integration
  - IPC communication
  - Security considerations
  - Build and deployment

### 📋 **API Documentation**
- **[API Reference](docs/api-reference.md)** - Complete IPC command reference
  - All available commands with parameters
  - Request/response formats
  - Error handling
  - Database schema documentation
  - Usage examples

### 📐 **Project Documentation**
- **[Documentation Plan](docs/documentation-plan.md)** - Documentation structure and standards
- **[Documentation Maintenance Guide](docs/documentation-maintenance.md)** - How to maintain and update documentation
- **[Testing Guide](Testing.md)** - Testing approaches and setup

### 🔧 **Generated Documentation**
- **[RustDoc API Documentation](docs/rustdoc/tauri_app_lib/index.html)** - Generated Rust backend documentation
  - Complete API reference for all backend modules
  - Service layer documentation with examples
  - Database connection layer documentation

## Development Setup

### Prerequisites

1. **Node.js** (18.0 or later) - [Download here](https://nodejs.org/)
2. **Rust** (1.70 or later) - [Install here](https://www.rust-lang.org/tools/install)
3. **Platform-specific requirements**:
   - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
   - **macOS**: Xcode Command Line Tools
   - **Windows**: Microsoft C++ Build Tools

### Recommended IDE Setup

- **[Visual Studio Code](https://code.visualstudio.com/)** with extensions:
  - [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [Rust Analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [ES7+ React/Redux/React-Native snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets)
  - [TypeScript Importer](https://marketplace.visualstudio.com/items?itemName=pmneo.tsimporter)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd energy-model-visualizer
   ```

2. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run tauri dev
   ```
   This launches both frontend and backend with hot reload.

4. **Build for production**
   ```bash
   npm run tauri build
   ```

For detailed development setup, see the [Frontend](docs/developer-guide-frontend.md) and [Backend](docs/developer-guide-backend.md) developer guides.

## Project Structure

```
├── docs/                           # Documentation
│   ├── user-guide.md              # User documentation
│   ├── developer-guide-frontend.md # Frontend dev guide
│   ├── developer-guide-backend.md  # Backend dev guide
│   ├── api-reference.md           # API documentation
│   └── rustdoc/                   # Generated Rust API documentation
│       └── tauri_app_lib/         # Main library documentation
├── src/                           # Frontend source code
│   ├── components/                # React components
│   │   ├── charts/               # Chart components
│   │   ├── database/             # Database management
│   │   └── layout/               # Layout components
│   ├── services/                 # API and service layers
│   ├── store/                    # Zustand state management
│   ├── hooks/                    # Custom React hooks
│   ├── test/                     # Test utilities
│   └── styles/                   # Global styles
├── src-tauri/                    # Backend source code
│   ├── src/
│   │   ├── services/             # Business logic modules
│   │   ├── duckdb_conn.rs        # Database connection layer
│   │   └── lib.rs                # Main application setup
│   └── Cargo.toml               # Rust dependencies
├── Testing.md                    # Testing documentation
└── README.md                     # This file
```

## Development Commands

### Frontend Development
```bash
npm run dev           # Start Vite development server
npm run build         # Build frontend for production
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run type-check    # TypeScript type checking
```

### Full Application Development
```bash
npm run tauri dev     # Start full application in development mode
npm run tauri build   # Build complete application for distribution
```

### Backend Development
```bash
cd src-tauri
cargo build           # Build Rust backend
cargo test            # Run Rust tests
cargo clippy          # Run Rust linter
cargo doc --open      # Generate and open Rust documentation
```

### Testing
```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Code Quality
```bash
npx prettier . --write --end-of-line auto  #Format code using Prettier
npm run lint:fix      # Fix ESLint issues automatically
```

### Documentation
```bash
npm run docs:rust:build    # Generate and copy RustDoc documentation
npm run docs:rust:open     # Generate and open RustDoc in browser
npm run docs:rust          # Generate RustDoc only (in src-tauri/target/doc)
```

## Testing

The project includes comprehensive testing at multiple levels:

- **Frontend**: Vitest + React Testing Library for component and integration tests
- **Backend**: Rust native testing with mock databases
- **E2E**: Planned Playwright integration for full application testing


For detailed development guidelines, see the [Developer Guides](docs/).

## Support

### Getting Help

- **User Issues**: See [User Guide](docs/user-guide.md) troubleshooting section
- **Development Questions**: Check [Developer Guides](docs/)
- **API Usage**: Refer to [API Reference](docs/api-reference.md)
- **Bug Reports**: Open an issue on GitHub

### Community

- Report bugs and request features via [GitHub Issues](../../issues)
- Contribute improvements via [Pull Requests](../../pulls)
- Ask questions in [GitHub Discussions](../../discussions)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE.txt](LICENSE.txt) file for details.

---

**Built with ❤️ for the energy research community**
