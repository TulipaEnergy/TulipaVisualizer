# GUI for Visualizing and Comparing Energy Scenarios - Tauri + React + Typescript

## About the Project

This is a cross-platform desktop application for visualizing output data of the [Tulipa Energy Model](https://tulipaenergy.github.io/TulipaEnergyModel.jl/dev/), stored in a `.duckdb` file. Users can simply upload a file, and the app automatically runs SQL queries and renders the results as interactive visualizations (bar charts, line charts, etc.).

It is built using:

- **Rust (Tauri backend)** – Handles file access, SQL execution, and secure communication with the frontend.
- **React + TypeScript** – Provides a responsive and modern user interface.
- **Apache ECharts** – Powers the data visualizations.

Developed for the CSE2000 course, 2025, TU Delft, by:
- C.A.Vasilescu@student.tudelft.nl
- B.H.P.Dockx@student.tudelft.nl
- T.B.Ilieva@student.tudelft.nl
- D.Hu-4@student.tudelft.nl
- F.Liu-14@student.tudelft.nl

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

Generally, the commands are meant to be run using `git bash`.

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

Please refer to the [User guide](./src-tauri/assets/docs/user-guide.md)

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

### Miscellaneous

- `npm run format` - Format code using Prettier
- `npm run clean` - Delete all untracked files, to be used for fresh builds
- `npm run analyze:setup` - Prepare local configuration for code analysis script
- `npm run analyze` - Run code analysis script
- `git pull lfs` - updates files like the `.json` map which are stored using `git LFS`

## Contributing

See [Developer guide](./src-tauri/assets/docs/developer-guide.md)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE.txt](LICENSE.txt) file for details.
