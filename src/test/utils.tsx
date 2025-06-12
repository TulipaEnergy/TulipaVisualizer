import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { vi } from "vitest";
import useVisualizationStore, {
  VisualizationState,
  ChartType,
  GraphConfig,
} from "../store/visualizationStore";

// Types for test utilities
export interface TestRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialStoreState?: Partial<VisualizationState>;
}

// Mock store state factory
export const createMockStoreState = (
  overrides: Partial<VisualizationState> = {},
): VisualizationState => ({
  // Database registry
  databases: [],
  isLoading: false,
  error: null,

  // Visualization settings
  graphs: [],

  // Actions
  setIsLoading: vi.fn(),
  setError: vi.fn(),
  addGraph: vi.fn(),
  mustGetGraph: vi.fn(),
  removeGraph: vi.fn(),
  updateGraph: vi.fn(),
  addDatabase: vi.fn(),
  removeDatabase: vi.fn(),
  setGraphDatabase: vi.fn(),
  getGraphDatabase: vi.fn(),
  hasAnyDatabase: vi.fn(() => false),
  mustGetFiltering: vi.fn(() => ({})),
  updateFiltersForCategory: vi.fn(),

  ...overrides,
});

// Custom render function with Mantine provider and store mocking
export const renderWithProviders = (
  ui: ReactElement,
  options: TestRenderOptions = {},
) => {
  const { initialStoreState, ...renderOptions } = options;

  // Mock the store if initial state is provided
  if (initialStoreState) {
    vi.mocked(useVisualizationStore).mockReturnValue(
      createMockStoreState(initialStoreState),
    );
  }

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MantineProvider>{children}</MantineProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Tauri IPC mock utilities
export const mockTauriInvoke = (response: any, shouldReject = false) => {
  const { invoke } = vi.hoisted(() => ({
    invoke: vi.fn(),
  }));

  if (shouldReject) {
    invoke.mockRejectedValueOnce(new Error(response));
  } else {
    invoke.mockResolvedValueOnce(response);
  }

  return invoke;
};

// Common mock data factories
export const createMockDatabase = (overrides = {}) => ({
  id: "test-db-1",
  name: "Test Database",
  path: "/path/to/test.duckdb",
  size: 1024000,
  tables: ["table1", "table2"],
  lastModified: new Date("2023-01-01"),
  ...overrides,
});

export const createMockGraphConfig = (
  overrides: Partial<GraphConfig> = {},
): GraphConfig => ({
  id: "test-graph-1",
  type: "capacity" as ChartType,
  title: "Test Graph",
  error: null,
  isLoading: false,
  options: null,
  graphDBFilePath: null,
  filtersByCategory: {},
  breakdownNodes: [],
  lastApplyTimestamp: 0,
  ...overrides,
});

// Date range utility for testing (not related to store)
export const createMockDateRange = (
  startDate: string | Date = "2023-01-01",
  endDate: string | Date = "2023-12-31",
) => ({
  startDate: typeof startDate === "string" ? new Date(startDate) : startDate,
  endDate: typeof endDate === "string" ? new Date(endDate) : endDate,
});

export const createMockChartData = (overrides = {}) => ({
  name: "Test Data",
  data: [
    { x: "2023-01", y: 100 },
    { x: "2023-02", y: 150 },
    { x: "2023-03", y: 120 },
  ],
  type: "line" as const,
  ...overrides,
});

// Chart component mock helpers
export const mockEChartsComponent = () => {
  vi.mock("echarts-for-react", () => ({
    default: ({ option, ...props }: any) => (
      <div
        data-testid="echarts-mock"
        data-option={JSON.stringify(option)}
        {...props}
      >
        Mocked ECharts Component
      </div>
    ),
  }));
};

// File upload mock helpers
export const mockFileDialog = (
  result: string | null = "/path/to/file.duckdb",
  shouldReject = false,
) => {
  const { open } = vi.hoisted(() => ({
    open: vi.fn(),
  }));

  if (shouldReject) {
    open.mockRejectedValueOnce(new Error("File dialog error"));
  } else {
    open.mockResolvedValueOnce(result);
  }

  return open;
};

// Time utilities for testing
export const createDateRange = (start: string, end: string): [Date, Date] => [
  new Date(start),
  new Date(end),
];

// Async test helpers
export const waitForAsync = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Error boundary test helper
export const triggerErrorBoundary = (component: ReactElement) => {
  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error("Test error for error boundary");
    }
    return component;
  };

  return ThrowError;
};

// Store action helpers for testing
export const createStoreActions = () => ({
  setIsLoading: vi.fn(),
  setError: vi.fn(),
  addGraph: vi.fn(),
  mustGetGraph: vi.fn(),
  removeGraph: vi.fn(),
  updateGraph: vi.fn(),
  addDatabase: vi.fn(),
  removeDatabase: vi.fn(),
  setGraphDatabase: vi.fn(),
  getGraphDatabase: vi.fn(),
  hasAnyDatabase: vi.fn(),
  mustGetFiltering: vi.fn(() => ({})),
  updateFiltersForCategory: vi.fn(),
});

// Common test data
export const TEST_CONSTANTS = {
  MOCK_DATABASE_PATH: "/path/to/test.duckdb",
  MOCK_DATABASE_NAME: "Test Database",
  DEFAULT_DATE_RANGE: createMockDateRange(),
  CHART_TYPES: [
    "capacity",
    "database",
    "system-costs",
    "production-prices",
    "production-prices-period",
    "production-prices-duration-series",
    "storage-prices",
    "geo-imports-exports",
    "default",
  ] as ChartType[],
  SAMPLE_ASSETS: ["Asset1", "Asset2", "Asset3"],
} as const;
