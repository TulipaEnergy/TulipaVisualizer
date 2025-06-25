# Tulipa Energy Visualizer

A cross-platform desktop application for visualizing [Tulipa Energy Model](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/) optimization results from DuckDB files.

## Table of Contents

- [GUI for Visualizing and Comparing Energy Scenarios - Tauri + React + Typescript](#gui-for-visualizing-and-comparing-energy-scenarios---tauri--react--typescript)
  - [Table of Contents](#table-of-contents)
  - [About the Project](#about-the-project)
  - [Recommended IDE Setup](#recommended-ide-setup)
  - [Prerequisites](#prerequisites)
  - [Setup Instructions, Development and Build](#setup-instructions-development-and-build)
  - [How it works](#how-it-works)
  - [Project Structure](#project-structure)
  - [Development Commands](#development-commands)
    - [Basic Commands](#basic-commands)
    - [Testing Commands](#testing-commands)
    - [Code Quality](#code-quality)
    - [Updating Data Files](#updating-data-files)
  - [Testing](#testing)
  - [Contributing](#contributing)
  - [License](#license)
  - [Code Analysis \& Quality Metrics](#code-analysis--quality-metrics)
    - [Quick Start](#quick-start)
    - [Analysis Tools Included](#analysis-tools-included)
    - [Advanced Metrics Analysis](#advanced-metrics-analysis)
      - [Metrics Thresholds](#metrics-thresholds)
      - [Report Structure](#report-structure)
    - [Troubleshooting](#troubleshooting)

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

## Prerequisites

Before running or building the project, ensure the following are installed:

- **Node.js (LTS version)** – [https://nodejs.org/](https://nodejs.org/)
- **Rust** – [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)

## Technology Stack

- **Backend**: Rust + Tauri for secure, performant desktop integration
- **Frontend**: React 18 + TypeScript for modern, responsive UI
- **Visualization**: Apache ECharts for interactive data visualization
- **Database**: DuckDB for high-performance analytical queries
- **State Management**: Zustand for predictable state handling
- **UI Framework**: Mantine for consistent, accessible components

## Quick Start

### System Requirements

- **Windows**: Windows 10 (1909) or later, WebView2
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Modern distribution with WebKit2GTK 4.1

### Installation

1. Download the latest release for your platform from [GitHub Releases](../../releases)
2. Install following platform-specific instructions
3. Launch the Energy Model Visualizer
4. Load a `.duckdb` file using "Add Database"
5. Explore your energy data through interactive visualizations

## Development Setup

### Prerequisites

1. **Node.js** (18.0+) - [Download](https://nodejs.org/)
2. **Rust** (1.70+) - [Install](https://www.rust-lang.org/tools/install)
3. **Platform-specific requirements**:
   - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`
   - **macOS**: Xcode Command Line Tools
   - **Windows**: Microsoft C++ Build Tools

### Setup Instructions

```bash
# Clone repository
git clone <repository-url>
cd energy-model-visualizer

# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

## Development Commands

### Essential Commands

```bash
npm run tauri dev     # Start full application in development
npm run tauri build   # Build complete application
npm run test              # Run all tests
npm run test:coverage # Run tests with coverage
npx prettier . --write --end-of-line auto        # Format code with Prettier
npm run analyze       # Run code quality analysis
npm run docs:rust:build      # Generate and open documentation
npm run analyze:build      # Set up analysis tool and run analysis
```

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

### Updating Data Files

- `git pull lfs` - updates files like the `.json` map which are stored using `git LFS`

## Testing

### Testing Stack

- **Frontend**: Vitest + React Testing Library
- **Backend**: Rust native testing
- **Coverage**: V8 provider with enforced thresholds

### Coverage Requirements

- **Statements**: 70% minimum
- **Branches**: 80% minimum
- **Functions**: 50% minimum
- **Lines**: 70% minimum

### Test Commands

```bash
npm test                    # Run all tests
```

For detailed testing guidelines, see [Testing.md](docs/Testing.md).

## Documentation

### 📖 **User Documentation**

- **[User Guide](docs/user-guide.md)** - Complete user manual
- Installation, features, troubleshooting

### 🛠️ **Developer Documentation**

- **[Frontend Guide](docs/developer-guide-frontend.md)** - React/TypeScript development
- **[Backend Guide](docs/developer-guide-backend.md)** - Rust/Tauri development
- **[API Reference](docs/api-reference.md)** - Complete IPC command reference
- **[Analysis & Data Processing](docs/analysis-and-data-processing.md)** - Code quality tools and Python utilities

### 🔧 **Generated Documentation**

- **[RustDoc](docs/rustdoc/tauri_app_lib/index.html)** - Complete Rust API documentation

## Code Quality

### Quality Standards

- **Type Safety**: Full TypeScript with strict mode
- **Testing**: Comprehensive unit, integration testing
- **Documentation**: Inline docs and comprehensive guides
- **Security**: Input validation, restricted file access
- **Performance**: Lazy loading, memoization, efficient data transfer

### Quality Tools

```bash
npm run analyze           # Code quality analysis
npm run lint              # ESLint checking
npx prettier . --write --end-of-line auto        # Format code with Prettier
```

## Support

### Getting Help

- **User Issues**: See [User Guide](docs/user-guide.md) troubleshooting
- **Development**: Check [Developer Guides](docs/)
- **API Usage**: Refer to [API Reference](docs/api-reference.md)
- **Bug Reports**: Open GitHub issue

## License

Licensed under Apache License 2.0 - see [LICENSE.txt](LICENSE.txt).

---

**Built with ❤️ for the energy research community**
