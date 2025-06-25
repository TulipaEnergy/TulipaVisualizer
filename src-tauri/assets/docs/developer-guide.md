## Specifics

Please see [Front-end development guide](./developer-guide-frontend.md) and [Back-end development guide](./developer-guide-backend.md).

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
