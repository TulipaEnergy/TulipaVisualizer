# Testing Guide for Energy Model Visualizer

This guide provides comprehensive documentation for testing patterns, examples, and best practices for the Energy Model Visualizer application.

## Table of Contents

1. [Overview](#overview)
2. [Testing Stack](#testing-stack)
3. [Project Structure](#project-structure)
4. [Test Organization](#test-organization)
5. [Writing Tests](#writing-tests)
6. [Common Patterns](#common-patterns)
7. [Component Testing](#component-testing)
8. [Service Testing](#service-testing)
9. [Store Testing](#store-testing)
10. [Integration Testing](#integration-testing)
11. [Performance Testing](#performance-testing)
12. [Accessibility Testing](#accessibility-testing)
13. [Coverage Expectations](#coverage-expectations)
14. [Troubleshooting](#troubleshooting)
15. [Quick Reference](#testing-quick-reference)

## Overview

The Energy Model Visualizer uses a comprehensive testing approach to ensure reliability, maintainability, and user experience quality. Our testing strategy focuses on behavior-driven testing rather than implementation details, with emphasis on user-centric scenarios.

### Current Coverage Status

- **Overall Coverage**: 65.63%
- **Components**: Well-tested core components with focus on user interactions
- **Services**: High coverage (84.31%) for data operations
- **Store**: Complete coverage (100%) for state management
- **Hooks**: Complete coverage (100%) for custom hooks

## Testing Stack

### Core Testing Libraries

- **Vitest**: Fast, Vite-native test runner
- **React Testing Library**: User-centric component testing
- **Jest DOM**: Enhanced DOM assertion matchers
- **Mantine Test Utils**: Testing utilities for Mantine components

### Supporting Libraries

- **@testing-library/user-event**: Realistic user interaction simulation
- **@vitest/coverage-v8**: Code coverage reporting
- **Mock Service Worker (MSW)**: API mocking (when needed)

## Project Structure

```
src/
├── __tests__/                 # Integration and app-level tests
├── components/
│   ├── __tests__/            # Component unit tests
│   └── kpis/
│       └── __tests__/        # KPI component tests
├── hooks/
│   └── __tests__/            # Custom hook tests
├── services/                 # Service layer (tested alongside components)
├── store/                    # Zustand store (tested separately)
└── test/                     # Test utilities and setup
    ├── setup.ts              # Global test configuration
    └── utils.tsx             # Common test helpers
```

## Test Organization

### File Naming Conventions

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Service tests: `serviceName.test.ts`
- Integration tests: `feature.integration.test.tsx`
- Utility tests: `utilityName.test.ts`

### Test Categories

1. **Unit Tests**: Individual components, hooks, and utilities
2. **Integration Tests**: Multi-component workflows and user journeys
3. **Performance Tests**: Render performance and memory management
4. **Accessibility Tests**: Screen reader and keyboard navigation

## Writing Tests

### Basic Test Structure

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders } from "../../test/utils";
import ComponentName from "../ComponentName";

describe("ComponentName", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders correctly with default props", () => {
    renderWithProviders(<ComponentName />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("handles user interactions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ComponentName />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Expected Result")).toBeInTheDocument();
  });
});
```

### Test Naming Conventions

Use descriptive test names that clearly state:

- **What** is being tested
- **When/Under what conditions**
- **Expected outcome**

```tsx
// Good examples
it("displays error message when database connection fails");
it("updates graph title when user types in input field");
it("shows loading spinner while data is being fetched");

// Avoid vague names
it("works correctly");
it("handles input");
```

## Common Patterns

### 1. Component Rendering

```tsx
import { renderWithProviders } from "../../test/utils";

describe("MyComponent", () => {
  it("renders without errors", () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByTestId("my-component")).toBeInTheDocument();
  });
});
```

### 2. User Interactions

```tsx
import userEvent from "@testing-library/user-event";

it("handles button click", async () => {
  const user = userEvent.setup();
  const mockFunction = vi.fn();

  renderWithProviders(<Button onClick={mockFunction} />);

  await user.click(screen.getByRole("button"));
  expect(mockFunction).toHaveBeenCalledOnce();
});
```

### 3. Mocking Tauri IPC

```tsx
import { vi } from "vitest";

// Mock Tauri invoke calls
vi.mock("@tauri-apps/api", () => ({
  invoke: vi.fn(() => Promise.resolve(mockData)),
}));
```

### 4. Store Mocking

```tsx
import { createMockStoreState } from "../../test/utils";

it("works with custom store state", () => {
  const mockStore = createMockStoreState({
    databases: [mockDatabase],
    graphs: [mockGraph],
  });

  renderWithProviders(<Component />, {
    initialStoreState: mockStore,
  });
});
```

### 5. Async Operations

```tsx
it("handles async data loading", async () => {
  renderWithProviders(<Component />);

  // Wait for loading state
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

## Component Testing

### Basic Component Tests

Every component should have tests for:

1. **Rendering**: Component renders without errors
2. **Props**: Different prop combinations work correctly
3. **User Interactions**: Click, type, select operations
4. **State Changes**: Component responds to state updates
5. **Error States**: Graceful error handling

### Example: Testing a KPI Component

```tsx
describe("Capacity Component", () => {
  it("renders loading state initially", () => {
    renderWithProviders(<Capacity graphId="test-graph" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("displays capacity data when loaded", async () => {
    const mockData = [{ year: 2023, technology: "Solar", capacity: 1000 }];

    renderWithProviders(<Capacity graphId="test-graph" />);

    await waitFor(() => {
      expect(screen.getByText("Solar")).toBeInTheDocument();
      expect(screen.getByText("1,000 MW")).toBeInTheDocument();
    });
  });

  it("handles filter changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Capacity graphId="test-graph" />);

    await user.selectOptions(screen.getByLabelText("Technology"), "Wind");

    await waitFor(() => {
      expect(screen.getByText("Wind capacity data")).toBeInTheDocument();
    });
  });
});
```

### Chart Component Testing

For chart components, focus on:

- Data transformation logic
- Chart configuration
- Responsive behavior
- Error states

```tsx
describe("Chart Component", () => {
  it("transforms data correctly for chart display", () => {
    const inputData = [{ year: 2023, value: 100 }];
    const expectedChartData = { series: [{ name: "2023", data: [100] }] };

    const { chartOptions } = renderChart(inputData);
    expect(chartOptions.series).toEqual(expectedChartData.series);
  });

  it("handles empty data gracefully", () => {
    renderWithProviders(<ChartComponent data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });
});
```

## Service Testing

Test service functions with mocked dependencies:

```tsx
import { describe, it, expect, vi } from "vitest";
import { capacityQuery } from "../capacityQuery";

vi.mock("@tauri-apps/api", () => ({
  invoke: vi.fn(),
}));

describe("capacityQuery", () => {
  it("fetches capacity data successfully", async () => {
    const mockData = [{ technology: "Solar", capacity: 1000 }];
    vi.mocked(invoke).mockResolvedValue(mockData);

    const result = await capacityQuery("test-db");

    expect(invoke).toHaveBeenCalledWith("capacity_query", {
      databasePath: "test-db",
    });
    expect(result).toEqual(mockData);
  });

  it("handles errors gracefully", async () => {
    vi.mocked(invoke).mockRejectedValue(new Error("Database error"));

    await expect(capacityQuery("invalid-db")).rejects.toThrow("Database error");
  });
});
```

## Store Testing

Test Zustand store actions and state updates:

```tsx
import { renderHook, act } from "@testing-library/react";
import useVisualizationStore from "../visualizationStore";

describe("visualizationStore", () => {
  it("adds database correctly", () => {
    const { result } = renderHook(() => useVisualizationStore());

    act(() => {
      result.current.addDatabase("/path/to/db.duckdb");
    });

    expect(result.current.databases).toHaveLength(1);
    expect(result.current.databases[0].path).toBe("/path/to/db.duckdb");
  });

  it("updates graph configuration", () => {
    const { result } = renderHook(() => useVisualizationStore());

    // First add a graph
    act(() => {
      result.current.addGraph("capacity");
    });

    const graphId = result.current.graphs[0].id;

    act(() => {
      result.current.updateGraph(graphId, { title: "New Title" });
    });

    expect(result.current.graphs[0].title).toBe("New Title");
  });
});
```

## Integration Testing

Integration tests verify complete user workflows:

```tsx
describe("Database Upload and Visualization Flow", () => {
  it("completes end-to-end visualization creation", async () => {
    const user = userEvent.setup();

    // Mock file upload
    vi.mocked(uploadDatabaseFile).mockResolvedValue("/path/to/test.duckdb");

    renderWithProviders(<App />);

    // Upload database
    await user.click(screen.getByRole("button", { name: /upload database/i }));

    await waitFor(() => {
      expect(screen.getByText("test.duckdb")).toBeInTheDocument();
    });

    // Add graph
    await user.click(screen.getByRole("button", { name: /add graph/i }));

    await waitFor(() => {
      expect(screen.getByTestId("graph-card")).toBeInTheDocument();
    });

    // Verify visualization
    expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
  });
});
```

## Performance Testing

Monitor component performance and prevent regressions:

```tsx
describe("Performance Testing", () => {
  it("renders efficiently with large datasets", () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      value: Math.random() * 100,
    }));

    const startTime = performance.now();
    renderWithProviders(<DataTable data={largeDataset} />);
    const endTime = performance.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(100); // Should render in under 100ms
  });

  it("prevents memory leaks", () => {
    const { unmount } = renderWithProviders(<ChartComponent />);

    // Check memory usage before unmount
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    unmount();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Memory should not increase significantly
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024); // Less than 1MB increase
  });
});
```

## Accessibility Testing

Ensure components are accessible to all users:

```tsx
describe("Accessibility", () => {
  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<NavigationMenu />);

    // Tab through menu items
    await user.tab();
    expect(screen.getByRole("menuitem", { name: "Home" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("menuitem", { name: "About" })).toHaveFocus();
  });

  it("provides proper ARIA labels", () => {
    renderWithProviders(<GraphCard graphId="test" />);

    expect(screen.getByLabelText("Graph settings")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove graph" }),
    ).toBeInTheDocument();
  });

  it("maintains color contrast requirements", () => {
    renderWithProviders(<StatusIndicator status="error" />);

    const errorElement = screen.getByText("Error");
    const styles = getComputedStyle(errorElement);

    // Check that error text has sufficient contrast
    expect(styles.color).toBe("rgb(220, 38, 38)"); // Tailwind red-600
  });
});
```

## Coverage Expectations

### Minimum Coverage Targets

- **Statements**: 70% (currently 65.63%)
- **Branches**: 90% (currently 94.56% ✅)
- **Functions**: 70% (currently 62.5%)
- **Lines**: 70% (currently 65.63%)

### High Priority Areas (>90% coverage)

- **Core Components**: App, GraphCard, DatabaseList
- **State Management**: Store actions and selectors
- **Data Services**: Database operations and queries
- **Critical User Flows**: Upload, visualization creation

### Medium Priority Areas (>60% coverage)

- **KPI Components**: Charts and data displays
- **UI Components**: Buttons, forms, modals
- **Utility Functions**: Helpers and formatters

### Lower Priority Areas (>40% coverage)

- **Database Viewer**: Administrative components
- **Metadata Filters**: Complex filtering logic
- **Gateway Layer**: Tauri interface wrappers

## Troubleshooting

### Common Issues and Solutions

#### 1. Act Warnings

**Problem**: "An update to ComponentName inside a test was not wrapped in act(...)"

**Solution**: Wrap state updates in `act()` or use `waitFor()`:

```tsx
// Instead of this:
fireEvent.click(button);

// Use this:
await user.click(button);

// Or this for programmatic updates:
act(() => {
  store.updateState(newValue);
});
```

#### 2. Canvas/Chart Rendering Issues

**Problem**: Chart components fail to render in tests

**Solution**: Use the provided canvas mocks in `setup.ts` or mock the chart component:

```tsx
vi.mock("echarts-for-react", () => ({
  default: ({ option }: any) => (
    <div data-testid="chart-mock" data-option={JSON.stringify(option)} />
  ),
}));
```

#### 3. Tauri API Mocking

**Problem**: Tauri `invoke` calls fail in tests

**Solution**: Mock the Tauri API properly:

```tsx
import { vi } from "vitest";

vi.mock("@tauri-apps/api", () => ({
  invoke: vi.fn(),
}));

// In test:
vi.mocked(invoke).mockResolvedValue(expectedData);
```

#### 4. Store State Issues

**Problem**: Store state doesn't update as expected

**Solution**: Use the store utilities from `test/utils.tsx`:

```tsx
import { createMockStoreState, renderWithProviders } from "../../test/utils";

const mockStore = createMockStoreState({
  // Initial state
});

renderWithProviders(<Component />, {
  initialStoreState: mockStore,
});
```

#### 5. Async Test Timing

**Problem**: Tests fail intermittently due to timing issues

**Solution**: Use `waitFor()` and proper async patterns:

```tsx
// Instead of setTimeout:
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
});

// For user interactions:
await user.click(button);
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled();
});
```

### Debugging Tips

1. **Use `screen.debug()`** to see the current DOM state
2. **Add `logRoles()`** to understand available roles
3. **Use `getByRole()` queries** for better accessibility testing
4. **Check browser DevTools** when using `--ui` flag
5. **Enable verbose logging** with `--reporter=verbose`

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Coverage with UI
npm run test:coverage:ui

# Specific test file
npm test -- DatabaseList.test.tsx

# Specific test pattern
npm test -- --grep="renders correctly"
```

### Performance Optimization

1. **Mock expensive operations**: Chart rendering, API calls
2. **Use `vi.hoisted()`** for consistent mocks
3. **Reset mocks properly** in `beforeEach`
4. **Avoid testing implementation details**
5. **Focus on user behavior** rather than internal state

This guide serves as the foundation for maintaining high-quality tests in the Energy Model Visualizer. When adding new features, always include corresponding tests following these patterns and principles.

# Testing Quick Reference

A quick reference guide for common testing patterns in the Energy Model Visualizer project.

## Test Imports

```tsx
// Essential imports for most tests
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithProviders, createMockStoreState } from "../../test/utils";
```

## Component Testing Patterns

### Basic Component Test

```tsx
describe("ComponentName", () => {
  it("renders correctly", () => {
    renderWithProviders(<ComponentName />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```tsx
it("handles button click", async () => {
  const user = userEvent.setup();
  const mockFn = vi.fn();

  renderWithProviders(<Button onClick={mockFn} />);
  await user.click(screen.getByRole("button"));

  expect(mockFn).toHaveBeenCalledOnce();
});
```

### Testing Form Inputs

```tsx
it("updates input value", async () => {
  const user = userEvent.setup();
  renderWithProviders(<TextInput />);

  const input = screen.getByRole("textbox");
  await user.type(input, "test value");

  expect(input).toHaveValue("test value");
});
```

### Testing Select Dropdowns

```tsx
it("changes selection", async () => {
  const user = userEvent.setup();
  renderWithProviders(<Select options={["Option 1", "Option 2"]} />);

  await user.selectOptions(screen.getByRole("combobox"), "Option 2");
  expect(screen.getByText("Option 2")).toBeSelected();
});
```

## Async Testing

### Loading States

```tsx
it("shows loading state", async () => {
  renderWithProviders(<DataComponent />);

  expect(screen.getByText("Loading...")).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

### Error States

```tsx
it("handles errors", async () => {
  vi.mocked(dataService).mockRejectedValue(new Error("API Error"));

  renderWithProviders(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText("Error: API Error")).toBeInTheDocument();
  });
});
```

## Mocking Patterns

### Mock Tauri API

```tsx
import { vi } from "vitest";

vi.mock("@tauri-apps/api", () => ({
  invoke: vi.fn(),
}));

// In test:
vi.mocked(invoke).mockResolvedValue(mockData);
```

### Mock Store

```tsx
const mockStore = createMockStoreState({
  databases: [{ id: "1", name: "test.db", path: "/test.db" }],
  graphs: [],
});

renderWithProviders(<Component />, {
  initialStoreState: mockStore,
});
```

### Mock Services

```tsx
import * as dataService from "../services/dataService";

vi.spyOn(dataService, "fetchData").mockResolvedValue(mockData);
```

## Store Testing

### Testing Store Actions

```tsx
import { renderHook, act } from "@testing-library/react";
import useVisualizationStore from "../store";

it("adds database", () => {
  const { result } = renderHook(() => useVisualizationStore());

  act(() => {
    result.current.addDatabase("/path/to/db");
  });

  expect(result.current.databases).toHaveLength(1);
});
```

## Chart Component Testing

### Mock ECharts

```tsx
vi.mock("echarts-for-react", () => ({
  default: ({ option }: any) => (
    <div data-testid="chart" data-option={JSON.stringify(option)} />
  ),
}));
```

### Test Chart Data

```tsx
it("renders chart with correct data", () => {
  const chartData = [{ name: "Series 1", data: [1, 2, 3] }];

  renderWithProviders(<Chart data={chartData} />);

  const chart = screen.getByTestId("chart");
  const option = JSON.parse(chart.getAttribute("data-option"));
  expect(option.series[0].data).toEqual([1, 2, 3]);
});
```

## Common Test Utilities

### Wait for Element

```tsx
await waitFor(() => {
  expect(screen.getByText("Expected text")).toBeInTheDocument();
});
```

### Check Element Existence

```tsx
expect(screen.getByText("Text")).toBeInTheDocument();
expect(screen.queryByText("Text")).not.toBeInTheDocument();
```

### Check Element Attributes

```tsx
expect(screen.getByRole("button")).toHaveAttribute("disabled");
expect(screen.getByRole("button")).toHaveClass("btn-primary");
```

### Check Element Values

```tsx
expect(screen.getByDisplayValue("input value")).toBeInTheDocument();
expect(screen.getByRole("textbox")).toHaveValue("expected value");
```

## Debugging Tests

### Debug Current DOM

```tsx
screen.debug(); // Shows entire DOM
screen.debug(screen.getByRole("button")); // Shows specific element
```

### Log Available Roles

```tsx
import { logRoles } from "@testing-library/react";

const { container } = renderWithProviders(<Component />);
logRoles(container);
```

### Check What's Rendered

```tsx
// Use getBy* for elements that should exist
screen.getByText("Must exist");

// Use queryBy* for elements that might not exist
screen.queryByText("Might not exist");

// Use findBy* for async elements
await screen.findByText("Will appear later");
```

## Performance Testing

### Measure Render Time

```tsx
it("renders quickly", () => {
  const start = performance.now();
  renderWithProviders(<Component />);
  const end = performance.now();

  expect(end - start).toBeLessThan(50); // 50ms
});
```

### Memory Leak Testing

```tsx
it("cleans up properly", () => {
  const { unmount } = renderWithProviders(<Component />);
  unmount();

  // Check that cleanup happened
  expect(cleanupSpy).toHaveBeenCalled();
});
```

## Accessibility Testing

### Keyboard Navigation

```tsx
it("supports keyboard navigation", async () => {
  const user = userEvent.setup();
  renderWithProviders(<Menu />);

  await user.tab();
  expect(screen.getByRole("menuitem")).toHaveFocus();
});
```

### ARIA Labels

```tsx
it("has proper labels", () => {
  renderWithProviders(<Button aria-label="Close dialog" />);
  expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
});
```

## Test Data Factories

### Create Mock Database

```tsx
import { createMockDatabase } from "../../test/utils";

const mockDb = createMockDatabase({
  name: "Custom DB",
  path: "/custom/path",
});
```

### Create Mock Graph

```tsx
import { createMockGraphConfig } from "../../test/utils";

const mockGraph = createMockGraphConfig({
  type: "capacity",
  title: "Test Graph",
});
```

## Error Boundaries

### Test Error Handling

```tsx
it("catches errors", () => {
  const ThrowError = () => {
    throw new Error("Test error");
  };

  renderWithProviders(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>,
  );

  expect(screen.getByText("Something went wrong")).toBeInTheDocument();
});
```

## Common Assertions

```tsx
// Existence
expect(element).toBeInTheDocument();
expect(element).not.toBeInTheDocument();

// Visibility
expect(element).toBeVisible();
expect(element).not.toBeVisible();

// Text content
expect(element).toHaveTextContent("text");
expect(element).toContainHTML("<span>text</span>");

// Form elements
expect(input).toHaveValue("value");
expect(checkbox).toBeChecked();
expect(select).toHaveValue("option");

// Attributes
expect(element).toHaveAttribute("disabled");
expect(element).toHaveClass("active");
expect(element).toHaveStyle("color: red");

// Focus
expect(element).toHaveFocus();

// Functions
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith("arg");
expect(mockFn).toHaveBeenCalledTimes(2);
```

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- ComponentName.test.tsx

# Pattern matching
npm test -- --grep="renders correctly"

# Verbose output
npm test -- --reporter=verbose

# UI mode
npm test -- --ui
```
