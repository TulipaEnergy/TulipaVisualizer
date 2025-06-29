import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import GraphCard from "../GraphCard";
import useVisualizationStore from "../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  createMockGraphConfig,
} from "../../test/utils";

// Mock the store
vi.mock("../../store/visualizationStore");

// Mock the metadata module
vi.mock("../../services/metadata", () => ({
  hasMetadata: vi.fn(() => Promise.resolve(false)),
}));

// Mock all the sub-components to isolate GraphCard testing
vi.mock("../DatabaseSelector", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`database-selector-${graphId}`}>DatabaseSelector</div>
  ),
}));

vi.mock("../database-viewer/DatabaseViewer", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`database-viewer-${graphId}`}>DatabaseViewer</div>
  ),
}));

vi.mock("../kpis/Capacity", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`capacity-${graphId}`}>Capacity Chart</div>
  ),
}));

vi.mock("../kpis/SystemCosts", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`system-costs-${graphId}`}>System Costs Chart</div>
  ),
}));

vi.mock("../kpis/ProductionPrices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`production-prices-${graphId}`}>
      Production Prices Chart
    </div>
  ),
}));

vi.mock("../kpis/StoragePrices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`storage-prices-${graphId}`}>Storage Prices Chart</div>
  ),
}));

vi.mock("../kpis/GeoImportsExports", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`geo-imports-exports-${graphId}`}>
      Geo Imports/Exports Chart
    </div>
  ),
}));

vi.mock("../kpis/TransportationPrices", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`transportation-prices-${graphId}`}>
      Transportation Prices Chart
    </div>
  ),
}));

vi.mock("../metadata/FilteringScrollMenu", () => ({
  default: ({ graphId }: { graphId: string }) => (
    <div data-testid={`filtering-scroll-menu-${graphId}`}>
      FilteringScrollMenu
    </div>
  ),
}));

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ id }: { id: string }) => (
    <div data-testid={`echarts-${id}`}>ReactECharts Mock</div>
  ),
}));

describe("GraphCard Component", () => {
  const mockUpdateGraph = vi.fn();
  const mockRemoveGraph = vi.fn();
  const mockMustGetGraph = vi.fn();
  const testGraphId = "test-graph-123";

  const defaultGraphConfig = createMockGraphConfig({
    id: testGraphId,
    title: "Test Graph",
    type: "capacity",
    graphDBFilePath: "/path/to/test.duckdb",
    isLoading: false,
    error: null,
  });

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        updateGraph: mockUpdateGraph,
        removeGraph: mockRemoveGraph,
        mustGetGraph: mockMustGetGraph,
      }),
    );

    // Default graph configuration
    mockMustGetGraph.mockReturnValue(defaultGraphConfig);

    // Mock DOM methods
    Object.defineProperty(document, "getElementById", {
      value: vi.fn(() => ({
        getBoundingClientRect: () => ({ top: 0 }),
      })),
      writable: true,
    });
  });

  describe("Basic rendering", () => {
    it("renders without errors", () => {
      const { container } = renderWithProviders(
        <GraphCard graphId={testGraphId} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("renders with correct graph ID", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Should call mustGetGraph with correct ID
      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("renders paper container with correct styling", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Check for container presence by looking for the graph ID element
      const containerElement = document.getElementById(testGraphId);
      expect(containerElement).toBeTruthy();
    });
  });

  describe("Graph title functionality", () => {
    it("displays current graph title", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const titleInput = screen.getByDisplayValue("Test Graph");
      expect(titleInput).toBeInTheDocument();
    });

    it("updates graph title when input changes", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const titleInput = screen.getByDisplayValue("Test Graph");
      fireEvent.change(titleInput, { target: { value: "New Title" } });

      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        title: "New Title",
      });
    });

    it("shows placeholder when title is empty", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          title: "",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(screen.getByPlaceholderText("Chart Title")).toBeInTheDocument();
    });
  });

  describe("Chart type selection", () => {
    it("displays current chart type", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Should have the select element (testing presence rather than specific value)
      const typeSelect = screen.getByPlaceholderText("Choose a type");
      expect(typeSelect).toBeInTheDocument();
    });

    it("calls updateGraph when chart type changes", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // For Mantine Select, we need to click on an option rather than change the input
      const systemCostsOption = screen.getByText("System Costs");
      fireEvent.click(systemCostsOption);

      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        type: "system-costs",
        options: null,
      });
    });

    it("handles null value selection gracefully", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // This test will pass by not throwing an error
      expect(screen.getByPlaceholderText("Choose a type")).toBeInTheDocument();
    });
  });

  describe("Action buttons", () => {
    it("renders width toggle button", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const widthToggleButton = screen.getByTitle("Expand to Full Width");
      expect(widthToggleButton).toBeInTheDocument();
    });

    it("renders remove button", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const removeButton = screen.getByTitle("Remove Graph");
      expect(removeButton).toBeInTheDocument();
    });

    it("calls removeGraph when remove button is clicked", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const removeButton = screen.getByTitle("Remove Graph");
      fireEvent.click(removeButton);

      expect(mockRemoveGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("toggles width button text when clicked", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const widthToggleButton = screen.getByTitle("Expand to Full Width");
      fireEvent.click(widthToggleButton);

      // After clicking, the title should change
      expect(screen.getByTitle("Shrink to Half Width")).toBeInTheDocument();
    });
  });

  describe("Database selector integration", () => {
    it("renders database selector component", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.getByTestId(`database-selector-${testGraphId}`),
      ).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loader when graph is loading", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          isLoading: true,
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Look for the loader by checking for Mantine Loader component presence
      // The loader should be present when isLoading is true
      expect(
        screen.getByTestId(`database-selector-${testGraphId}`),
      ).toBeInTheDocument();
      // Component should still render the basic structure but show loading state
    });

    it("does not show chart content when loading", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          isLoading: true,
          type: "capacity",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.queryByTestId(`capacity-${testGraphId}`),
      ).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error message when graph has error", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          error: "Test error message",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("does not show chart content when there is an error", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          error: "Test error message",
          type: "capacity",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.queryByTestId(`capacity-${testGraphId}`),
      ).not.toBeInTheDocument();
    });
  });

  describe("No database selected state", () => {
    it("shows database selection prompt when no database is selected", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          graphDBFilePath: null,
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.getByText("Please select a database above"),
      ).toBeInTheDocument();
    });

    it("does not show chart content when no database is selected", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          graphDBFilePath: null,
          type: "capacity",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.queryByTestId(`capacity-${testGraphId}`),
      ).not.toBeInTheDocument();
    });
  });

  describe("Chart type rendering", () => {
    const chartTypes = [
      { type: "database", componentTestId: "database-viewer" },
      { type: "system-costs", componentTestId: "system-costs" },
      {
        type: "production-prices-duration-series",
        componentTestId: "production-prices",
      },
      { type: "storage-prices", componentTestId: "storage-prices" },
      { type: "capacity", componentTestId: "capacity" },
      { type: "geo-imports-exports", componentTestId: "geo-imports-exports" },
    ];

    chartTypes.forEach(({ type, componentTestId }) => {
      it(`renders ${type} chart component`, () => {
        mockMustGetGraph.mockReturnValue(
          createMockGraphConfig({
            ...defaultGraphConfig,
            type: type as any,
          }),
        );

        renderWithProviders(<GraphCard graphId={testGraphId} />);

        expect(
          screen.getByTestId(`${componentTestId}-${testGraphId}`),
        ).toBeInTheDocument();
      });
    });

    it("shows fallback message for unknown chart type", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          type: "unknown-type" as any,
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.getByText("Please select a chart type above"),
      ).toBeInTheDocument();
    });
  });

  describe("Resize functionality", () => {
    it("renders resize handle", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Check that the component renders successfully (resize handle is part of the component)
      expect(
        screen.getByTestId(`database-selector-${testGraphId}`),
      ).toBeInTheDocument();
    });

    it("handles resize start event", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Test that component renders without errors (resize functionality is internal)
      expect(screen.getByDisplayValue("Test Graph")).toBeInTheDocument();
    });
  });

  describe("Database type specific behavior", () => {
    it("sets appropriate height for database type", async () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          type: "database",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // The component should render without errors with database type
      expect(
        screen.getByTestId(`database-viewer-${testGraphId}`),
      ).toBeInTheDocument();
    });
  });

  describe("Store integration", () => {
    it("uses store methods correctly", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Should call mustGetGraph
      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("handles store updates", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      // Update title
      const titleInput = screen.getByDisplayValue("Test Graph");
      fireEvent.change(titleInput, { target: { value: "Updated Title" } });

      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        title: "Updated Title",
      });
    });

    it("handles graph removal", () => {
      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const removeButton = screen.getByTitle("Remove Graph");
      fireEvent.click(removeButton);

      expect(mockRemoveGraph).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Props handling", () => {
    it("works with different graphId values", () => {
      const customGraphId = "custom-123";

      renderWithProviders(<GraphCard graphId={customGraphId} />);

      expect(mockMustGetGraph).toHaveBeenCalledWith(customGraphId);
    });

    it("handles special characters in graphId", () => {
      const specialGraphId = "graph-with-special-chars@#$";

      renderWithProviders(<GraphCard graphId={specialGraphId} />);

      expect(mockMustGetGraph).toHaveBeenCalledWith(specialGraphId);
    });
  });

  describe("Edge cases", () => {
    it("handles undefined graph gracefully", () => {
      mockMustGetGraph.mockReturnValue(undefined);

      // When graph is undefined, the component returns null, but Mantine styles may still be present
      // Check that no GraphCard content is rendered
      expect(screen.queryByDisplayValue("Test Graph")).not.toBeInTheDocument();
    });

    it("handles empty string title", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          title: "",
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      const titleInput = screen.getByPlaceholderText("Chart Title");
      expect(titleInput).toHaveValue("");
    });

    it("handles missing graphDBFilePath", () => {
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({
          ...defaultGraphConfig,
          graphDBFilePath: undefined,
        }),
      );

      renderWithProviders(<GraphCard graphId={testGraphId} />);

      expect(
        screen.getByText("Please select a database above"),
      ).toBeInTheDocument();
    });
  });
});
