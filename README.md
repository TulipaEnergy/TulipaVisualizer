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

---

## Testing

The project uses Vitest as the test runner, with React Testing Library for component testing and Jest DOM for DOM assertions.

### Test Structure

- Unit tests for components are located in `src/components/__tests__/`
- Unit tests for hooks are located in `src/hooks/__tests__/`
- Unit tests for utilities are located next to the files they test

### Writing Tests

We follow these testing principles:

- Test behavior, not implementation
- Each test should be independent
- Use descriptive test names
- Mock external dependencies

Example test structure:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MyComponent from "../MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Expected text")).toBeInTheDocument();
  });
});
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests before committing (`npm test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request
