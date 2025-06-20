# Testing Guide

## Overview

Tulipa Energy Visualizer uses a comprehensive testing strategy with **Vitest** and **React Testing Library**, focusing on behavior-driven testing and user-centric scenarios.

### Current Coverage Status

- **Overall Coverage**: 70% statements, 80% branches, 50% functions, 70% lines
- **Services**: High coverage for data operations and query management
- **Store**: Complete state management coverage (Zustand)
- **Hooks**: Full custom hooks coverage
- **Components**: Well-tested core components and KPI visualizations

### Testing Philosophy

- **Behavior over Implementation**: Test what users see and do
- **Integration Focus**: Test component interactions and data flow
- **Realistic Testing**: Use real user events and scenarios
- **Fast Feedback**: Quick test execution for development workflow

## Quick Start

### Essential Commands

```bash
npm test                    # Run all tests(front and back end) once
npm run test:coverage      # Run front end tests with coverage report
npm run tauri:test         # Run Rust backend tests
```

## Testing Stack

### Frontend Testing

- **Vitest**: Fast, Vite-native test runner
- **React Testing Library**: User-centric component testing
- **Jest DOM**: Additional DOM assertion matchers
- **User Event**: Realistic user interaction simulation

### Backend Testing

- **Cargo Test**: Native Rust testing framework
- **LLVM Coverage**: Rust code coverage reporting

### Configuration

```typescript
// vitest.config.ts - Key settings
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        global: {
          statements: 70,
          branches: 80,
          functions: 50,
          lines: 70,
        },
      },
    },
  },
});
```

## Test Organization

### Directory Structure

```
src/
├── components/__tests__/        # Component unit tests
├── components/kpis/__tests__/   # KPI component tests
├── services/__tests__/          # Service layer tests
├── hooks/__tests__/             # Custom hook tests
├── __tests__/                   # Integration tests
└── test/                        # Test utilities and setup
```

### File Naming

- **Components**: `ComponentName.test.tsx`
- **Hooks**: `useHookName.test.ts`
- **Services**: `serviceName.test.ts`
- **Integration**: `feature.integration.test.tsx`

## Core Testing Patterns

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Expected Result')).toBeInTheDocument();
  });
});
```

### Service Layer Testing

```typescript
import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getCapacity } from "../capacityQuery";

vi.mock("@tauri-apps/api/core");

describe("capacityQuery", () => {
  it("calls correct IPC command with parameters", async () => {
    const mockResponse = [{ year: 2025, investment: 100 }];
    vi.mocked(invoke).mockResolvedValue(mockResponse);

    const result = await getCapacity("/path/to/db.duckdb", "wind_farm_1");

    expect(invoke).toHaveBeenCalledWith("get_capacity", {
      dbPath: "/path/to/db.duckdb",
      assetName: "wind_farm_1",
    });
    expect(result).toEqual(mockResponse);
  });
});
```

### Store Testing

```typescript
import { renderHook, act } from "@testing-library/react";
import useVisualizationStore from "../visualizationStore";

describe("visualizationStore", () => {
  it("adds database correctly", () => {
    const { result } = renderHook(() => useVisualizationStore());

    act(() => {
      result.current.addDatabase("/path/to/test.duckdb");
    });

    expect(result.current.databases).toContain("/path/to/test.duckdb");
  });
});
```

## Essential Mocking Strategies

### Tauri IPC Mocking

```typescript
// Global test setup (src/test/setup.ts)
import { vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@tauri-apps/api/dialog", () => ({
  open: vi.fn(() => Promise.resolve(null)),
}));
```

### Chart Component Mocking

```typescript
vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: any }) => (
    <div data-testid="chart-mock" data-option={JSON.stringify(option)}>
      Chart Rendered
    </div>
  )
}));
```

### Store Mocking

```typescript
import useVisualizationStore from "../store/visualizationStore";

vi.mock("../store/visualizationStore");

const mockStore = {
  databases: ["/path/to/test.duckdb"],
  addDatabase: vi.fn(),
  removeDatabase: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useVisualizationStore).mockReturnValue(mockStore);
});
```

## Coverage Guidelines

### Target Thresholds

- **Statements**: 70% minimum
- **Branches**: 80% minimum
- **Functions**: 50% minimum
- **Lines**: 70% minimum

### Priority Areas

- **High Priority (>90%)**: Core components, state management, data services
- **Medium Priority (>70%)**: KPI components, UI components, utilities
- **Standard Priority (>50%)**: Database viewer, metadata filters

### Coverage Commands

```bash
npm run test:coverage        # Generate coverage report
npm run test:coverage:ui     # Interactive coverage viewer
npm run test:coverage:watch  # Coverage with watch mode
npm run test:coverage:clean  # Clean coverage artifacts
```

## KPI Component Testing

Each KPI component should test:

- **Data Visualization**: Chart rendering with correct data
- **User Interactions**: Filtering, selection, zoom functionality
- **Error Handling**: Invalid data, network failures
- **Loading States**: Spinner display during data fetch
- **Data Transformation**: Correct processing of raw data

```typescript
describe('CapacityChart', () => {
  it('renders chart with correct data structure', () => {
    const chartData = [
      { year: 2025, final_capacity: 100 },
      { year: 2030, final_capacity: 150 }
    ];

    render(<CapacityChart data={chartData} />);

    const chart = screen.getByTestId('chart-mock');
    const chartOption = JSON.parse(chart.getAttribute('data-option')!);

    expect(chartOption.series[0].data).toEqual([100, 150]);
    expect(chartOption.xAxis.data).toEqual([2025, 2030]);
  });
});
```

## Backend Testing

### Rust Testing Commands

```bash
cd src-tauri
cargo test              # Run all Rust tests
cargo test --coverage   # Run with LLVM coverage
cargo clippy            # Lint Rust code
```

### Test Organization

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capacity_query() {
        // Test implementation
    }
}
```

## Best Practices

### Test Writing Guidelines

1. **Descriptive Names**: Use clear, action-focused test descriptions
2. **Single Responsibility**: One assertion per test when possible
3. **User Perspective**: Test what users see and do
4. **Data Isolation**: Each test should be independent
5. **Real Interactions**: Use userEvent over fireEvent

### Performance Considerations

- Mock heavy dependencies (charts, database operations)
- Use `vi.resetAllMocks()` in `beforeEach` for clean state
- Prefer integration tests over deep unit testing
- Test critical user flows comprehensively

### Debugging Tests

```bash
# Run specific test file
npm test -- GraphCard.test.tsx

# Run tests with debugging
npm test -- --no-coverage ComponentName.test.tsx

# Debug with screen.debug()
screen.debug(); // Prints DOM to console
```

## Troubleshooting

### Common Issues

- **Tests Timing Out**: Increase timeout for async operations, check for unresolved promises
- **Mocks Not Working**: Ensure mocks are setup before imports, check path spelling
- **State Not Updating**: Use `waitFor()` for async state changes
- **Charts Not Rendering**: Verify chart library mocking is correct

### CI/CD Integration

```bash
npm run test:coverage    # Used in CI pipeline
npm run tauri:test      # Backend tests in CI
```

The testing strategy emphasizes fast feedback, comprehensive coverage, and maintainable test code aligned with user behavior and business requirements.
