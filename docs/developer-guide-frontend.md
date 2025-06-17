# Frontend Developer Guide - Energy Model Visualizer

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Data Visualization](#data-visualization)
7. [Service Layer](#service-layer)
8. [Testing Patterns](#testing-patterns)
9. [Performance Optimization](#performance-optimization)
10. [Build and Deployment](#build-and-deployment)

## Architecture Overview

### Technology Stack

The Energy Model Visualizer frontend is built using modern React patterns and TypeScript for type safety:

- **React 18**: Functional components with hooks
- **TypeScript**: Strict typing with ES2020 target
- **Vite**: Fast build tool and development server
- **Mantine**: Comprehensive UI component library
- **Apache ECharts**: High-performance data visualization
- **Zustand**: Lightweight state management
- **Tauri**: Desktop application framework (IPC layer)

### Design Principles

- **Type Safety**: Comprehensive TypeScript usage throughout
- **Component Composition**: Reusable, composable components
- **Separation of Concerns**: Clear boundaries between UI, state, and services
- **Performance First**: Optimized rendering and data handling
- **Testability**: Components designed for easy testing

### Application Flow

```
User Interaction → Component → State Store → Service Layer → IPC Gateway → Backend
     ↑                                                                         ↓
UI Update ← Component ← State Update ← Data Processing ← IPC Response ← Database Query
```

## Development Setup

### Prerequisites

- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 9+ (comes with Node.js)
- **TypeScript**: Installed via project dependencies
- **VS Code**: Recommended with extensions

### Environment Configuration

1. **Clone and Install Dependencies**

   ```bash
   git clone <repository-url>
   cd energy-model-visualizer
   npm install
   ```

2. **Development Server**

   ```bash
   npm run dev          # Frontend only (Vite dev server)
   npm run tauri dev    # Full app with Tauri backend
   ```

3. **Build Commands**
   ```bash
   npm run build        # Frontend build
   npm run tauri build  # Full application build
   ```

### VS Code Extensions

Recommended extensions for optimal development experience:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-json",
    "tauri-apps.tauri-vscode"
  ]
}
```

### TypeScript Configuration

The project uses strict TypeScript configuration:

```typescript
// tsconfig.json highlights
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "jsx": "react-jsx"
  }
}
```

## Project Structure

### Directory Organization

```
src/
├── components/                 # React components
│   ├── __tests__/             # Component unit tests
│   ├── database-viewer/       # Database exploration components
│   ├── kpis/                  # KPI visualization components
│   │   └── __tests__/         # KPI component tests
│   ├── metadata/              # Filtering and breakdown components
│   ├── DatabaseList.tsx       # Multi-database management
│   ├── DatabaseSelector.tsx   # Database selection widget
│   ├── GraphCard.tsx          # Main visualization container
│   └── UploadButton.tsx       # File upload interface
├── hooks/                     # Custom React hooks
│   └── __tests__/             # Hook unit tests
├── services/                  # Frontend service layer
│   ├── __tests__/             # Service layer tests
│   ├── capacityQuery.ts       # Capacity data services
│   ├── databaseOperations.ts  # Database management services
│   ├── energyFlowQuery.ts     # Geographic flow services
│   └── [other-services].ts   # Domain-specific services
├── store/                     # State management
│   └── visualizationStore.ts  # Main Zustand store
├── gateway/                   # IPC communication layer
│   ├── db.ts                  # Database IPC calls
│   └── io.ts                  # File system IPC calls
├── types/                     # TypeScript type definitions
├── styles/                    # Global CSS and styling
├── test/                      # Test utilities and setup
└── App.tsx                    # Root component
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `GraphCard.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useVisualizationStore.ts`)
- **Services**: camelCase (e.g., `capacityQuery.ts`)
- **Types**: PascalCase interfaces/types (e.g., `ChartType`)
- **Tests**: Component name + `.test.tsx` (e.g., `GraphCard.test.tsx`)

## Component Architecture

### Component Patterns

#### Functional Components with TypeScript

All components use functional patterns with proper TypeScript interfaces:

```typescript
import { useState, useEffect } from "react";
import { Paper, Loader, Text } from "@mantine/core";

interface MyComponentProps {
  graphId: string;
  onDataChange?: (data: DataType) => void;
  isLoading?: boolean;
}

const MyComponent: React.FC<MyComponentProps> = ({
  graphId,
  onDataChange,
  isLoading = false
}) => {
  const [data, setData] = useState<DataType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Component logic here

  return (
    <Paper p="md" withBorder>
      {isLoading ? <Loader /> : <Text>{/* Content */}</Text>}
    </Paper>
  );
};

export default MyComponent;
```

#### Container vs. Presentation Components

**Container Components** (e.g., `GraphCard.tsx`):

- Manage state and data fetching
- Handle business logic
- Connect to stores and services

```typescript
const GraphCard: React.FC<GraphCardProps> = ({ graphId }) => {
  const { updateGraph, mustGetGraph } = useVisualizationStore();
  const graph = mustGetGraph(graphId);

  // Data fetching and state management
  useEffect(() => {
    // Fetch data logic
  }, [graphId]);

  return (
    <Stack>
      <ChartTypeSelector />
      <DataVisualization data={chartData} />
    </Stack>
  );
};
```

**Presentation Components** (e.g., visualization components):

- Receive data via props
- Focus on rendering and user interaction
- Minimal or no state

```typescript
interface ChartProps {
  data: ChartData[];
  isLoading: boolean;
  onFilterChange: (filters: FilterType) => void;
}

const Chart: React.FC<ChartProps> = ({ data, isLoading, onFilterChange }) => {
  if (isLoading) return <Loader />;

  return (
    <ReactECharts
      option={createChartOption(data)}
      onEvents={{ 'click': handleChartClick }}
    />
  );
};
```

### Error Boundaries

Error boundaries catch component errors and provide fallback UI:

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback,
}) => {
  // Error boundary implementation
};
```

### Mantine Integration

The application uses Mantine for consistent UI components:

```typescript
import { Stack, Paper, Group, Select, Button, Loader } from "@mantine/core";

// Theme configuration in main.tsx
const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Outfit, sans-serif",
  fontFamilyMonospace: "Monaco, Courier, monospace",
});
```

## State Management

### Zustand Store Architecture

The application uses Zustand for lightweight, performant state management:

```typescript
import { create } from "zustand";

export interface VisualizationState {
  // Database registry
  databases: string[];
  isLoading: boolean;
  error: string | null;

  // Visualization settings
  graphs: GraphConfig[];

  // Actions
  setIsLoading: (isLoading: boolean) => void;
  addGraph: (type: ChartType) => void;
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;
  removeGraph: (id: string) => void;

  // Database management
  addDatabase: (filePath: string) => void;
  removeDatabase: (filePath: string) => void;
}

const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Initial state
  databases: [],
  isLoading: false,
  error: null,
  graphs: [],

  // Action implementations
  setIsLoading: (isLoading) => set({ isLoading }),

  addGraph: (type) => {
    set((state) => ({
      graphs: [
        ...state.graphs,
        {
          id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type,
          title: `New ${type} Chart`,
          // ... other properties
        },
      ],
    }));
  },

  updateGraph: (id, updates) =>
    set((state) => ({
      graphs: state.graphs.map((graph) =>
        graph.id === id ? { ...graph, ...updates } : graph,
      ),
    })),
}));
```

### State Usage Patterns

#### In Components

```typescript
const MyComponent: React.FC = () => {
  // Select only needed state slices
  const { databases, addDatabase, isLoading } = useVisualizationStore();

  // Use state in component logic
  const handleUpload = async (filePath: string) => {
    addDatabase(filePath);
  };

  return (
    <div>
      {databases.map(db => <DatabaseCard key={db} path={db} />)}
    </div>
  );
};
```

#### Computed Values

```typescript
const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // ... state and actions ...

  // Computed getters
  hasAnyDatabase: () => get().databases.length > 0,

  mustGetGraph: (id: string) => {
    const graph = get().graphs.find((g) => g.id === id);
    if (!graph) {
      throw new Error(`Graph with id ${id} not found`);
    }
    return graph;
  },
}));
```

### State Update Patterns

#### Immutable Updates

```typescript
// Adding to arrays
addItem: (item) => set((state) => ({
  items: [...state.items, item]
})),

// Updating nested objects
updateGraphOptions: (graphId, options) => set((state) => ({
  graphs: state.graphs.map(graph =>
    graph.id === graphId
      ? { ...graph, options: { ...graph.options, ...options } }
      : graph
  )
})),

// Filtering arrays
removeItem: (id) => set((state) => ({
  items: state.items.filter(item => item.id !== id)
})),
```

## Data Visualization

### Apache ECharts Integration

#### Basic Chart Setup

```typescript
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

const ChartComponent: React.FC<ChartProps> = ({ data }) => {
  const [chartOptions, setChartOptions] = useState<EChartsOption | null>(null);

  useEffect(() => {
    const option: EChartsOption = {
      title: { text: "Chart Title" },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: data.map(d => d.category)
      },
      yAxis: { type: "value" },
      series: [{
        type: "bar",
        data: data.map(d => d.value)
      }]
    };
    setChartOptions(option);
  }, [data]);

  return (
    <Paper p="md" style={{ height: "400px" }}>
      {chartOptions && (
        <ReactECharts
          option={chartOptions}
          style={{ height: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      )}
    </Paper>
  );
};
```

#### Advanced Chart Features

**Interactive Tooltips:**

```typescript
const tooltipOption = {
  tooltip: {
    trigger: "axis",
    formatter: function (params: any[]) {
      let tooltipContent = `<strong>${params[0].name}</strong><br/>`;
      params.forEach((item) => {
        tooltipContent +=
          `<span style="color:${item.color}">●</span> ` +
          `${item.seriesName}: ${item.value}<br/>`;
      });
      return tooltipContent;
    },
  },
};
```

**Zoom and Pan:**

```typescript
const dataZoomOption = {
  dataZoom: [
    {
      type: "inside",
      xAxisIndex: [0],
      start: 0,
      end: 100,
    },
    {
      type: "slider",
      xAxisIndex: [0],
      start: 0,
      end: 100,
    },
  ],
};
```

**Geographic Maps:**

```typescript
// Register map data
import * as echarts from "echarts";

useEffect(() => {
  const loadMap = async () => {
    const geoJSON = await fetch("assets/geo/eu_provinces.geo.json");
    const mapData = await geoJSON.json();
    echarts.registerMap("eu-provinces", mapData);
  };
  loadMap();
}, []);

// Map chart option
const mapOption: EChartsOption = {
  geo: {
    map: "eu-provinces",
    roam: true,
    emphasis: {
      label: { show: true },
      itemStyle: { areaColor: "#389e0d" },
    },
  },
  series: [
    {
      type: "map",
      map: "eu-provinces",
      data: mapData,
    },
  ],
};
```

### Chart Component Patterns

#### Reusable Chart Base

```typescript
interface BaseChartProps {
  title?: string;
  height?: number;
  isLoading?: boolean;
  error?: string | null;
  children: ReactNode;
}

const BaseChart: React.FC<BaseChartProps> = ({
  title,
  height = 400,
  isLoading,
  error,
  children
}) => {
  if (isLoading) {
    return (
      <Paper p="md" style={{ height }}>
        <Flex justify="center" align="center" h="100%">
          <Loader />
        </Flex>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper p="md" style={{ height }}>
        <Text color="red">{error}</Text>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder style={{ height }}>
      {title && <Text size="lg" fw={500} mb="md">{title}</Text>}
      {children}
    </Paper>
  );
};
```

#### Chart Data Processing

```typescript
const processChartData = (rawData: RawDataType[]): EChartsOption => {
  // Data transformation logic
  const categories = rawData.map((d) => d.category);
  const values = rawData.map((d) => d.value);

  return {
    xAxis: { type: "category", data: categories },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: {
          color: (params: any) => {
            // Dynamic coloring based on data
            return params.value > 100 ? "#ff4d4f" : "#52c41a";
          },
        },
      },
    ],
  };
};
```

## Service Layer

### Service Architecture

The service layer provides a clean interface between components and the backend:

```typescript
// services/capacityQuery.ts
import { genericApacheIPC } from "../gateway/db";

export interface CapacityData {
  year: number;
  asset: string;
  initial_capacity: number;
  final_capacity: number;
  investment: number;
  decommission: number;
}

export async function getCapacity(
  dbPath: string,
  asset: string,
  startYear: number,
  endYear: number,
): Promise<CapacityData[]> {
  try {
    const result = await genericApacheIPC<CapacityData>("get_capacity", {
      dbPath,
      asset,
      startYear,
      endYear,
    });
    return result;
  } catch (error) {
    console.error("Failed to fetch capacity data:", error);
    throw new Error(`Capacity query failed: ${error}`);
  }
}
```

### IPC Communication Patterns

#### Generic IPC Handler

```typescript
// gateway/db.ts
import { invoke } from "@tauri-apps/api/core";
import { Table } from "apache-arrow";

export async function genericApacheIPC<T>(
  command: string,
  args: Record<string, any>,
): Promise<T[]> {
  try {
    const table: Table = await invoke(command, args);
    return extractTableData(table);
  } catch (error) {
    console.error(`IPC command ${command} failed:`, error);
    throw error;
  }
}

function extractTableData<T>(table: Table): T[] {
  const data: T[] = [];
  const columns = table.schema.fields.map((field) => field.name);

  for (let i = 0; i < table.numRows; i++) {
    const row = table.get(i);
    if (row) {
      const rowData: any = {};
      columns.forEach((col) => {
        rowData[col] = row[col];
      });
      data.push(rowData as T);
    }
  }

  return data;
}
```

#### Error Handling

```typescript
export class ServiceError extends Error {
  constructor(
    message: string,
    public service: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const handleServiceError = (error: unknown, service: string): never => {
  if (error instanceof Error) {
    throw new ServiceError(
      `${service} operation failed: ${error.message}`,
      service,
      error,
    );
  }
  throw new ServiceError(`${service} operation failed`, service);
};
```

### Service Hooks Pattern

Custom hooks for service integration:

```typescript
// hooks/useCapacityData.ts
import { useState, useEffect } from "react";
import { getCapacity, CapacityData } from "../services/capacityQuery";

export const useCapacityData = (
  dbPath: string | null,
  asset: string | null,
  startYear: number,
  endYear: number,
) => {
  const [data, setData] = useState<CapacityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dbPath || !asset) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getCapacity(dbPath, asset, startYear, endYear);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dbPath, asset, startYear, endYear]);

  return { data, isLoading, error };
};
```

## Testing Patterns

### Component Testing

#### Basic Component Tests

```typescript
import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders } from "../test/utils";
import MyComponent from "./MyComponent";

describe("MyComponent", () => {
  it("renders correctly", () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });

  it("handles user interactions", async () => {
    const mockCallback = vi.fn();
    renderWithProviders(<MyComponent onAction={mockCallback} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockCallback).toHaveBeenCalledOnce();
  });
});
```

#### Testing with Store

```typescript
import { createMockStoreState } from "../test/utils";

it("displays data from store", () => {
  const mockStore = createMockStoreState({
    databases: ["/path/to/db.duckdb"],
    graphs: []
  });

  renderWithProviders(<DatabaseList />, {
    initialStoreState: mockStore
  });

  expect(screen.getByText("/path/to/db.duckdb")).toBeInTheDocument();
});
```

#### Testing Charts

```typescript
// Mock ECharts for testing
vi.mock("echarts-for-react", () => ({
  default: ({ option }: { option: any }) => (
    <div
      data-testid="chart-mock"
      data-option={JSON.stringify(option)}
    >
      Mocked Chart
    </div>
  )
}));

it("renders chart with correct data", () => {
  const chartData = [{ name: "A", value: 100 }];

  renderWithProviders(<Chart data={chartData} />);

  const chart = screen.getByTestId("chart-mock");
  const option = JSON.parse(chart.getAttribute("data-option")!);
  expect(option.series[0].data).toEqual([100]);
});
```

### Service Testing

```typescript
import { vi } from "vitest";
import { getCapacity } from "../capacityQuery";

// Mock IPC layer
vi.mock("../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
}));

describe("capacityQuery", () => {
  it("fetches capacity data", async () => {
    const mockData = [{ year: 2020, asset: "wind", capacity: 100 }];
    vi.mocked(genericApacheIPC).mockResolvedValue(mockData);

    const result = await getCapacity("/db/path", "wind", 2020, 2025);

    expect(result).toEqual(mockData);
    expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
      dbPath: "/db/path",
      asset: "wind",
      startYear: 2020,
      endYear: 2025,
    });
  });
});
```

### Test Utilities

The project provides comprehensive test utilities:

```typescript
// test/utils.tsx
export const renderWithProviders = (
  ui: ReactElement,
  options: TestRenderOptions = {}
) => {
  const { initialStoreState, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider>{children}</MantineProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export const createMockStoreState = (
  overrides: Partial<VisualizationState> = {}
): VisualizationState => ({
  databases: [],
  isLoading: false,
  error: null,
  graphs: [],
  // ... mock methods
  ...overrides
});
```

## Performance Optimization

### Component Optimization

#### Memoization

```typescript
import { memo, useMemo, useCallback } from "react";

const ExpensiveComponent = memo<ComponentProps>(({ data, onUpdate }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => expensiveProcessing(item));
  }, [data]);

  // Memoize callbacks to prevent child re-renders
  const handleUpdate = useCallback((newData: DataType) => {
    onUpdate(newData);
  }, [onUpdate]);

  return <div>{/* Rendered content */}</div>;
});
```

#### Lazy Loading

```typescript
import { lazy, Suspense } from "react";

const ExpensiveChart = lazy(() => import("./ExpensiveChart"));

const ParentComponent = () => (
  <Suspense fallback={<Loader />}>
    <ExpensiveChart />
  </Suspense>
);
```

### Chart Performance

#### Efficient Data Updates

```typescript
const ChartComponent = ({ data }: { data: ChartData[] }) => {
  const chartRef = useRef<ReactECharts>(null);

  // Update chart data without full re-render
  useEffect(() => {
    const chart = chartRef.current?.getEchartsInstance();
    if (chart) {
      chart.setOption({
        series: [{ data: data.map(d => d.value) }]
      }, false); // false = not merge, faster for data updates
    }
  }, [data]);

  return (
    <ReactECharts
      ref={chartRef}
      option={baseChartOption}
      notMerge={false}
      lazyUpdate={true}
    />
  );
};
```

### Bundle Optimization

#### Code Splitting

```typescript
// Lazy load chart types
const chartComponents = {
  capacity: lazy(() => import("./kpis/Capacity")),
  "system-costs": lazy(() => import("./kpis/SystemCosts")),
  // ... other chart types
};

const renderChart = (type: ChartType) => {
  const ChartComponent = chartComponents[type];
  return (
    <Suspense fallback={<Loader />}>
      <ChartComponent />
    </Suspense>
  );
};
```

#### Tree Shaking

```typescript
// Import only needed utilities
import { debounce } from "lodash/debounce";
// Instead of: import _ from "lodash";

// Use named imports from ECharts
import { init, registerMap } from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
// Instead of: import * as echarts from "echarts";
```

## Build and Deployment

### Development Build

```bash
# Frontend development
npm run dev

# Full application development
npm run tauri dev
```

### Production Build

```bash
# Frontend build
npm run build

# Application bundle
npm run tauri build
```

### Build Configuration

#### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    target: "es2020",
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          charts: ["echarts", "echarts-for-react"],
          ui: ["@mantine/core", "@mantine/hooks"],
        },
      },
    },
  },
});
```

### Asset Optimization

#### Image Optimization

- Use WebP format for images when possible
- Implement lazy loading for large images
- Optimize SVG icons and graphics

#### Font Optimization

- Use font-display: swap for custom fonts
- Preload critical fonts
- Subset fonts to reduce bundle size
