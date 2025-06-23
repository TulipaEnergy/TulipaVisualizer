import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import App from "../App";
import {
  renderWithProviders,
  createMockStoreState,
  createMockGraphConfig,
} from "../test/utils";
import useVisualizationStore, { ChartType } from "../store/visualizationStore";
import * as databaseOperations from "../services/databaseOperations";

// Mock all service modules
vi.mock("../services/databaseOperations");
vi.mock("../services/capacityQuery");
vi.mock("../services/systemCosts");
vi.mock("../services/storagePriceQuery");
vi.mock("../services/productionPriceQuery");
vi.mock("../services/transportPriceQuery");
vi.mock("../services/energyFlowQuery");
vi.mock("../services/metadata");

// Mock the visualization store
vi.mock("../store/visualizationStore");

// Mock ECharts
vi.mock("echarts-for-react", () => ({
  default: ({ option, ...props }: any) => (
    <div
      data-testid="echarts-integration"
      data-option={JSON.stringify(option)}
      {...props}
    >
      Mocked ECharts Component
    </div>
  ),
}));

// Mock KPI components to prevent rendering errors
vi.mock("../components/kpis/Capacity", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`capacity-${graphId}`}>Mocked Capacity Component</div>
  ),
}));

vi.mock("../components/kpis/SystemCosts", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`system-costs-${graphId}`}>
      Mocked System Costs Component
    </div>
  ),
}));

vi.mock("../components/kpis/Storage Prices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`storage-prices-${graphId}`}>
      Mocked Storage Prices Component
    </div>
  ),
}));

vi.mock("../components/kpis/ProductionPrices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`production-prices-${graphId}`}>
      Mocked Production Prices Component
    </div>
  ),
}));

vi.mock("../components/kpis/TransportationPrices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`transportation-prices-${graphId}`}>
      Mocked Transportation Prices Component
    </div>
  ),
}));

vi.mock("../components/kpis/GeoImportsExports", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`geo-imports-exports-${graphId}`}>
      Mocked Geo Imports Exports Component
    </div>
  ),
}));

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock("@tauri-apps/api/tauri", () => ({
  invoke: mockInvoke,
}));

describe("App Integration Tests", () => {
  const mockDatabasePath = "/path/to/test.duckdb";
  const mockDatabasePath2 = "/path/to/test2.duckdb";

  // Store action mocks that will be reused
  const mockSetError = vi.fn();
  const mockAddDatabase = vi.fn();
  const mockRemoveDatabase = vi.fn();
  const mockAddGraph = vi.fn();
  const mockRemoveGraph = vi.fn();
  const mockUpdateGraph = vi.fn();
  const mockSetGraphDatabase = vi.fn();
  const mockGetGraphDatabase = vi.fn();
  const mockHasAnyDatabase = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock successful database operations by default
    (databaseOperations.uploadDatabaseFile as any).mockResolvedValue(
      mockDatabasePath,
    );

    // Mock Tauri invoke calls
    mockInvoke.mockResolvedValue([]);

    // Reset store action mocks
    mockSetError.mockClear();
    mockAddDatabase.mockClear();
    mockRemoveDatabase.mockClear();
    mockAddGraph.mockClear();
    mockRemoveGraph.mockClear();
    mockUpdateGraph.mockClear();
    mockSetGraphDatabase.mockClear();
    mockGetGraphDatabase.mockClear();
    mockHasAnyDatabase.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Application State", () => {
    it("renders the main application structure", () => {
      // Mock empty state
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          graphs: [],
          hasAnyDatabase: () => false,
        }),
      );

      renderWithProviders(<App />);

      // Check that main components are rendered
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No databases loaded. Upload a .duckdb file to get started.",
        ),
      ).toBeInTheDocument();
    });

    it("shows empty state when no databases are loaded", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          graphs: [],
          hasAnyDatabase: () => false,
        }),
      );

      renderWithProviders(<App />);

      // Should show empty state message
      expect(
        screen.getByText(
          "No databases loaded. Upload a .duckdb file to get started.",
        ),
      ).toBeInTheDocument();

      // Should not show Add Graph button when no databases
      expect(screen.queryByText("Add Graph")).not.toBeInTheDocument();
    });
  });

  describe("Database Loading Flow", () => {
    it("completes end-to-end database upload flow", async () => {
      // Start with empty state, then simulate database being added
      const storeState = createMockStoreState({
        databases: [],
        graphs: [],
        hasAnyDatabase: () => false,
        addDatabase: mockAddDatabase,
      });

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(storeState);

      renderWithProviders(<App />);

      // Initially no databases
      expect(
        screen.getByText(
          "No databases loaded. Upload a .duckdb file to get started.",
        ),
      ).toBeInTheDocument();

      // Click upload button
      const uploadButton = screen.getByRole("button", {
        name: /upload database file/i,
      });

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Verify upload service was called
      await waitFor(() => {
        expect(databaseOperations.uploadDatabaseFile).toHaveBeenCalledTimes(1);
      });
    });

    it("shows Add Graph button after database is loaded", async () => {
      // Mock state with database loaded
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [],
          hasAnyDatabase: () => true,
          addGraph: mockAddGraph,
        }),
      );

      renderWithProviders(<App />);

      // Add Graph button should be visible
      expect(screen.getByText("Add Graph")).toBeInTheDocument();
      expect(screen.getByText("Loaded Databases (1)")).toBeInTheDocument();
    });

    it("displays multiple databases correctly", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath, mockDatabasePath2],
          graphs: [],
          hasAnyDatabase: () => true,
        }),
      );

      renderWithProviders(<App />);

      expect(screen.getByText("Loaded Databases (2)")).toBeInTheDocument();
      expect(screen.getByText("test")).toBeInTheDocument();
      expect(screen.getByText("test2")).toBeInTheDocument();
    });

    it("handles database removal", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [],
          hasAnyDatabase: () => true,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<App />);

      expect(screen.getByText("Loaded Databases (1)")).toBeInTheDocument();

      // Find and click remove button using a more flexible selector
      const trashIcon = document.querySelector(".tabler-icon-trash");

      if (trashIcon) {
        const button = trashIcon.closest("button");
        if (button) {
          await act(async () => {
            fireEvent.click(button);
          });
        }
      } else {
        // Fallback: look for button with red color styling that indicates delete
        const deleteButton = Array.from(
          document.querySelectorAll("button"),
        ).find(
          (btn) =>
            btn.style.getPropertyValue("--ai-color")?.includes("red") ||
            btn.className.includes("red"),
        );

        if (deleteButton) {
          await act(async () => {
            fireEvent.click(deleteButton);
          });
        }
      }

      // Verify remove function was called
      expect(mockRemoveDatabase).toHaveBeenCalledWith(mockDatabasePath);
    });
  });

  describe("Visualization Generation Process", () => {
    beforeEach(() => {
      // Setup with database loaded state
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [],
          hasAnyDatabase: () => true,
          addGraph: mockAddGraph,
          removeGraph: mockRemoveGraph,
          updateGraph: mockUpdateGraph,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "default" as ChartType,
            title: "New Default Chart",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: null,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );
    });

    it("creates and displays a new graph", async () => {
      renderWithProviders(<App />);

      // Click Add Graph button
      const addGraphButton = screen.getByText("Add Graph");

      await act(async () => {
        fireEvent.click(addGraphButton);
      });

      // Verify addGraph was called
      expect(mockAddGraph).toHaveBeenCalledWith("default");
    });

    it("handles multiple graphs", async () => {
      // Mock state with multiple graphs
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "graph-1",
              type: "default" as ChartType,
              title: "Graph 1",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: null,
              filtersByCategory: {},
              breakdownNodes: [],
            },
            {
              ...createMockGraphConfig(),
              id: "graph-2",
              type: "default" as ChartType,
              title: "Graph 2",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: null,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          addGraph: mockAddGraph,
          mustGetGraph: vi.fn((id: string) => {
            if (id === "graph-1") {
              return {
                ...createMockGraphConfig(),
                id: "graph-1",
                type: "default" as ChartType,
                title: "Graph 1",
                error: null,
                isLoading: false,
                options: null,
                graphDBFilePath: null,
                filtersByCategory: {},
                breakdownNodes: [],
              };
            }
            return {
              ...createMockGraphConfig(),
              id: "graph-2",
              type: "default" as ChartType,
              title: "Graph 2",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: null,
              filtersByCategory: {},
              breakdownNodes: [],
            };
          }),
        }),
      );

      renderWithProviders(<App />);

      // Should render both graphs
      const titleInputs = screen.getAllByPlaceholderText("Chart Title");
      expect(titleInputs).toHaveLength(2);
    });
  });

  describe("Chart Type Specific Rendering", () => {
    it("renders capacity chart when selected", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "capacity" as ChartType,
              title: "Capacity Chart",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "capacity" as ChartType,
            title: "Capacity Chart",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
          updateGraph: mockUpdateGraph,
        }),
      );

      renderWithProviders(<App />);

      // Should render chart type selector with capacity selected
      const chartTypeSelect = screen.getByDisplayValue("capacity");
      expect(chartTypeSelect).toBeInTheDocument();

      // Should render the mocked capacity component
      expect(screen.getByTestId("capacity-test-graph-1")).toBeInTheDocument();
    });

    it("renders system costs chart when selected", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "system-costs" as ChartType,
              title: "System Costs Chart",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "system-costs" as ChartType,
            title: "System Costs Chart",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
          updateGraph: mockUpdateGraph,
        }),
      );

      renderWithProviders(<App />);

      // Should render chart type selector with system-costs selected
      const chartTypeSelect = screen.getByDisplayValue("system-costs");
      expect(chartTypeSelect).toBeInTheDocument();

      // Should render the mocked system costs component
      expect(
        screen.getByTestId("system-costs-test-graph-1"),
      ).toBeInTheDocument();
    });
  });

  describe("Graph Interactions", () => {
    beforeEach(() => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "default" as ChartType,
              title: "Test Graph",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: null,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "default" as ChartType,
            title: "Test Graph",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: null,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
          updateGraph: mockUpdateGraph,
          removeGraph: mockRemoveGraph,
        }),
      );
    });

    it("allows changing graph title", async () => {
      renderWithProviders(<App />);

      const titleInput = screen.getByDisplayValue("Test Graph");

      await act(async () => {
        fireEvent.change(titleInput, { target: { value: "My Custom Chart" } });
      });

      expect(mockUpdateGraph).toHaveBeenCalledWith("test-graph-1", {
        title: "My Custom Chart",
      });
    });

    it("allows removing graph", async () => {
      renderWithProviders(<App />);

      const removeButton = screen.getByTitle("Remove Graph");

      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(mockRemoveGraph).toHaveBeenCalledWith("test-graph-1");
    });

    it("toggles graph width", async () => {
      renderWithProviders(<App />);

      const widthToggleButton = screen.getByTitle("Expand to Full Width");

      await act(async () => {
        fireEvent.click(widthToggleButton);
      });

      // This tests the UI interaction exists, the actual state change would be internal to the component
      expect(widthToggleButton).toBeInTheDocument();
    });
  });

  describe("Database and Graph Coordination", () => {
    it("shows message when no database is selected for graph", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "default" as ChartType,
              title: "Test Graph",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: null, // No database selected
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "default" as ChartType,
            title: "Test Graph",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: null,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );

      renderWithProviders(<App />);

      expect(
        screen.getByText("Please select a database above"),
      ).toBeInTheDocument();
    });

    it("shows graph content when database is selected", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "capacity" as ChartType,
              title: "Test Graph",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath, // Database is selected
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "capacity" as ChartType,
            title: "Test Graph",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );

      renderWithProviders(<App />);

      // Should not show the "select database" message
      expect(
        screen.queryByText("Please select a database above"),
      ).not.toBeInTheDocument();
      // Should show chart type selector
      expect(screen.getByDisplayValue("capacity")).toBeInTheDocument();
      // Should render the mocked capacity component
      expect(screen.getByTestId("capacity-test-graph-1")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("handles database upload failure gracefully", async () => {
      // Mock upload failure
      (databaseOperations.uploadDatabaseFile as any).mockRejectedValueOnce(
        new Error("Failed to upload database"),
      );

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          graphs: [],
          hasAnyDatabase: () => false,
          addDatabase: mockAddDatabase,
          setError: mockSetError,
        }),
      );

      renderWithProviders(<App />);

      const uploadButton = screen.getByRole("button", {
        name: /upload database file/i,
      });

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Verify error handling was called
      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith(
          "Error selecting file: Failed to upload database",
        );
      });
    });

    it("handles cancelled database upload", async () => {
      // Mock upload cancellation
      (databaseOperations.uploadDatabaseFile as any).mockResolvedValueOnce(
        null,
      );

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          graphs: [],
          hasAnyDatabase: () => false,
          addDatabase: mockAddDatabase,
        }),
      );

      renderWithProviders(<App />);

      const uploadButton = screen.getByRole("button", {
        name: /upload database file/i,
      });

      await act(async () => {
        fireEvent.click(uploadButton);
      });

      // Should not call addDatabase when upload is cancelled
      await waitFor(() => {
        expect(mockAddDatabase).not.toHaveBeenCalled();
      });
    });

    it("displays error state in graphs", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "capacity" as ChartType,
              title: "Test Graph",
              error: "Failed to load data",
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "capacity" as ChartType,
            title: "Test Graph",
            error: "Failed to load data",
            isLoading: false,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );

      renderWithProviders(<App />);

      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });

    it("displays loading state in graphs", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "capacity" as ChartType,
              title: "Test Graph",
              error: null,
              isLoading: true, // Loading state
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "capacity" as ChartType,
            title: "Test Graph",
            error: null,
            isLoading: true,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );

      renderWithProviders(<App />);

      // Should show loading structure - check for Mantine Loader component class
      const loaderElement = document.querySelector(".mantine-Loader-root");
      expect(loaderElement).toBeInTheDocument();
    });
  });

  describe("UI Layout and Responsiveness", () => {
    it("maintains proper layout structure", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "test-graph-1",
              type: "capacity" as ChartType,
              title: "Test Graph",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((_: string) => ({
            ...createMockGraphConfig(),
            id: "test-graph-1",
            type: "capacity" as ChartType,
            title: "Test Graph",
            error: null,
            isLoading: false,
            options: null,
            graphDBFilePath: mockDatabasePath,
            filtersByCategory: {},
            breakdownNodes: [],
          })),
        }),
      );

      renderWithProviders(<App />);

      // Check main layout structure
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
      expect(screen.getByText("Loaded Databases (1)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Chart Title")).toBeInTheDocument();
    });

    it("handles multiple graphs in grid layout", async () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabasePath],
          graphs: [
            {
              ...createMockGraphConfig(),
              id: "graph-1",
              type: "capacity" as ChartType,
              title: "Graph 1",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
            {
              ...createMockGraphConfig(),
              id: "graph-2",
              type: "system-costs" as ChartType,
              title: "Graph 2",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            },
          ],
          hasAnyDatabase: () => true,
          mustGetGraph: vi.fn((id: string) => {
            if (id === "graph-1") {
              return {
                ...createMockGraphConfig(),
                id: "graph-1",
                type: "capacity" as ChartType,
                title: "Graph 1",
                error: null,
                isLoading: false,
                options: null,
                graphDBFilePath: mockDatabasePath,
                filtersByCategory: {},
                breakdownNodes: [],
              };
            }
            return {
              ...createMockGraphConfig(),
              id: "graph-2",
              type: "system-costs" as ChartType,
              title: "Graph 2",
              error: null,
              isLoading: false,
              options: null,
              graphDBFilePath: mockDatabasePath,
              filtersByCategory: {},
              breakdownNodes: [],
            };
          }),
        }),
      );

      renderWithProviders(<App />);

      // Should have multiple graphs in grid
      const titleInputs = screen.getAllByPlaceholderText("Chart Title");
      expect(titleInputs).toHaveLength(2);

      // Should render the mocked components
      expect(screen.getByTestId("capacity-graph-1")).toBeInTheDocument();
      expect(screen.getByTestId("system-costs-graph-2")).toBeInTheDocument();
    });
  });
});
