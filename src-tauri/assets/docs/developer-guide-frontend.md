# Frontend Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Component Patterns](#component-patterns)
5. [State Management](#state-management)
6. [Service Layer](#service-layer)
7. [Testing Strategy](#testing-strategy)
8. [Performance Guidelines](#performance-guidelines)

## Architecture Overview

### Technology Stack

- **React**: Functional components with hooks pattern
- **TypeScript**: Strict typing with comprehensive coverage
- **Vite**: Build tool and development server
- **Mantine UI**: Component library with theming
- **Apache ECharts**: Data visualization
- **Zustand**: Lightweight state management
- **Tauri**: Desktop app framework with IPC

### Design Principles

- **Type Safety**: Comprehensive TypeScript usage
- **Component Composition**: Reusable, single-purpose components
- **Performance First**: Optimized rendering with proper memoization
- **Testability**: Components designed for easy testing
- **Separation of Concerns**: Clear UI/state/service boundaries

### Data Flow Architecture

The application follows a unidirectional data flow pattern where user input triggers component events, which dispatch store actions. These actions invoke service methods that communicate with the backend through the IPC gateway. Database queries are executed in the Rust backend, with responses flowing back through the service layer to update the store, which triggers component re-renders and UI updates.

## Development Setup

### Prerequisites

The development environment requires Node.js LTS version 18 or higher, npm version 9 or later, and Rust 1.70+ for full-stack development. VS Code is the recommended IDE for optimal development experience.

### Quick Start

Development workflow includes standard npm commands for dependency installation, development server startup, production builds, and test execution. The project supports both frontend-only development and full application development with Tauri integration.

### Recommended VS Code Extensions

Essential extensions include TypeScript language support, Prettier for code formatting, Tauri-specific tooling, and Vitest explorer for test management. These extensions provide comprehensive development support with IntelliSense, debugging, and testing capabilities.

## Project Structure

The frontend code is organized in the `src/` directory with clear separation of concerns:

- **components/**: React components organized by functionality
  - \***\*tests**/\*\*: Component test files
  - **database-viewer/**: Database exploration interface components
  - **kpis/**: Chart and visualization components
  - **metadata/**: Data filtering and selection components
  - **DatabaseList.tsx**: File management interface
  - **DatabaseSelector.tsx**: Database selection component
  - **GraphCard.tsx**: Main chart container component
  - **Toolbar.tsx**: Application header and navigation

- **gateway/**: IPC communication layer
  - **db.ts**: Database operation abstractions
  - **io.ts**: File system access utilities

- **hooks/**: Custom React hooks for reusable logic
- **services/**: Business logic and data processing layer
- **store/**: Zustand state management implementation
- **types/**: TypeScript type definitions and interfaces
- **test/**: Testing utilities and helper functions

### File Naming Conventions

The project follows consistent naming conventions: PascalCase for React components, camelCase with "use" prefix for custom hooks, camelCase for service modules, and component name plus test suffix for test files.

## Component Patterns

### Component Interface Pattern

Components are designed with explicit TypeScript interfaces that document required and optional properties, including clear descriptions and type definitions. Props include required data parameters, optional configuration with sensible defaults, and event handler functions for user interactions.

### Container vs Presentation Components

The architecture distinguishes between container components that manage state and data fetching, handle business logic, and connect to stores and services, versus presentation components that focus on pure UI rendering, maintain minimal internal state, and receive all data through props.

### Error Handling Pattern

Components implement comprehensive error handling with local error state management, structured try-catch blocks around async operations, user-friendly error display, and detailed error logging for debugging. Error boundaries provide fallback UI for unexpected failures while maintaining application stability.

## State Management

### Zustand Store Pattern

The application uses a single Zustand store with typed interfaces that define the complete application state structure. The store manages database connections, graph configurations, loading states, and error conditions through well-defined action methods that ensure immutable state updates.

### Store Usage in Components

Components access store state through selectors that prevent unnecessary re-renders by selecting only required state slices. Actions are called directly from event handlers with proper error handling and loading state management. The pattern ensures efficient updates and optimal performance.

### State Updates

State management follows immutability principles with Zustand handling internal immutability, batched updates for related state changes, and centralized error handling through the store. This approach provides predictable state transitions and simplified debugging.

## Service Layer

### Service Organization

Services are organized by domain functionality and encapsulate business logic for specific features. Each service module provides typed functions that handle data transformation, API communication, and error handling while maintaining clear separation from UI concerns.

### IPC Communication Pattern

The IPC layer provides a standardized interface for backend communication using Apache Arrow serialization for efficient data transfer. The pattern includes generic functions for different data types, consistent error handling across all IPC calls, and automatic data deserialization.

### Service Integration in Components

Components integrate with services through async operations in useEffect hooks, proper dependency management for re-fetching when parameters change, loading and error state management, and cleanup of pending requests when components unmount.

## Testing Strategy

### Essential Commands

```bash
npm run test:coverage      # Run front end tests with coverage report
npm run test:coverage:ui     # Interactive coverage viewer
npm run test:coverage:watch  # Coverage with watch mode
npm run test:coverage:clean  # Clean coverage artifacts
```

### Testing Stack

- **Vitest**: Fast, Vite-native test runner
- **React Testing Library**: User-centric component testing
- **Jest DOM**: Additional DOM assertion matchers
- **User Event**: Realistic user interaction simulation

### Configuration

See `vitest.config.ts`

### File Naming

- **Components**: `ComponentName.test.tsx`
- **Hooks**: `useHookName.test.ts`
- **Services**: `serviceName.test.ts`
- **Integration**: `feature.integration.test.tsx`

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

### KPI Component Testing

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

## Performance Guidelines

### Component Optimization

Performance optimization includes React.memo for expensive pure components to prevent unnecessary re-renders, useMemo for expensive calculations that depend on specific inputs, useCallback for event handlers to maintain referential stability, and proper dependency arrays to control when effects and memoized values update.

### Data Fetching Optimization

Data fetching includes request deduplication to prevent duplicate API calls, abort controllers to cancel pending requests when components unmount, proper loading states to improve user experience, and error boundaries to handle network failures gracefully.

### Memory Management

Memory management practices include cleanup of subscriptions and event listeners in useEffect cleanup functions, aborting pending requests when components unmount, using appropriate dependencies in useEffect and useMemo to prevent memory leaks, and avoiding object creation in render methods to reduce garbage collection pressure.

### Bundle Optimization

Bundle optimization strategies include dynamic imports for large libraries that aren't immediately needed, code splitting by route when the application grows, tree shaking configuration in Vite to eliminate dead code, and proper externals configuration for Tauri to reduce bundle size.

## Common Patterns

### Data Loading with Error Handling

A custom hook pattern provides standardized data loading with integrated error handling, loading states, and cleanup logic. The pattern manages async operations with proper error boundaries, loading indicators, and memory cleanup when components unmount.

### Form State Management

Form state management includes a reusable hook that handles form values, validation errors, field updates, and validation logic. The pattern provides type-safe form handling with built-in error management and validation capabilities that can be customized for specific form requirements.
