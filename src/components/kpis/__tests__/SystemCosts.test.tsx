import { screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import SystemCosts from "../SystemCosts";
import useVisualizationStore from "../../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  createMockGraphConfig,
} from "../../../test/utils";
import * as systemCostsService from "../../../services/systemCosts";
import * as metadataService from "../../../services/metadata";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the system costs service
vi.mock("../../../services/systemCosts", () => ({
  getAssetCostsByYear: vi.fn(),
  getFlowCostsByYear: vi.fn(),
  getUniqueCarriers: vi.fn(),
  getUniqueYears: vi.fn(),
}));

// Mock the system costs service
vi.mock("../../../services/metadata", () => ({
  getYears: vi.fn(),
  hasMetadata: vi.fn(),
}));

// Mock the metadata service
vi.mock("../../../services/metadata");

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style: any }) => (
    <div data-testid="echarts-systemcosts" style={style}>
      SystemCosts Chart Mock
    </div>
  ),
}));

// Mock echarts
vi.mock("echarts", () => ({
  default: {},
}));

describe("SystemCosts Component", () => {
  const testGraphId = "test-graph-123";
  const testDbPath = "/path/to/test.duckdb";
  const testGraphConfig = createMockGraphConfig({
    graphDBFilePath: testDbPath,
    id: testGraphId,
  });

  const mockUpdateGraph = vi.fn();
  const mockMustGetGraph = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        updateGraph: mockUpdateGraph,
        mustGetGraph: mockMustGetGraph,
      }),
    );

    mockMustGetGraph.mockReturnValue(testGraphConfig);

    // Mock successful service calls by default with proper return types
    (systemCostsService.getAssetCostsByYear as any).mockResolvedValue([
      { year: 2020, asset_fixed_costs: 1000, unit_on_costs: 500 },
      { year: 2021, asset_fixed_costs: 1100, unit_on_costs: 550 },
    ]);
    (systemCostsService.getFlowCostsByYear as any).mockResolvedValue([
      {
        year: 2020,
        flow_fixed_costs_by_carrier: { electricity: 200 },
        flow_variable_costs_by_carrier: { electricity: 100 },
      },
    ]);
    (systemCostsService.getUniqueCarriers as any).mockReturnValue([
      "electricity",
    ]);

    (metadataService.hasMetadata as any).mockResolvedValue(false);
    (metadataService.getYears as any).mockResolvedValue([2020, 2021, 2022]);
  });

  describe("Basic rendering", () => {
    it("renders without errors", async () => {
      await act(async () => {
        const { container } = renderWithProviders(
          <SystemCosts graphId={testGraphId} />,
        );
        expect(container).toBeInTheDocument();
      });
    });

    it("calls getGraphDatabase with correct graphId", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("shows loading state initially", async () => {
      // Make the promise hang to capture loading state
      let resolvePromise: (value: any) => void;
      const hangingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (systemCostsService.getAssetCostsByYear as any).mockReturnValue(
        hangingPromise,
      );

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Should show loader in Container - check for the actual rendered elements
      expect(
        document.querySelector(".mantine-Loader-root"),
      ).toBeInTheDocument();
      expect(
        document.querySelector(".mantine-Container-root"),
      ).toBeInTheDocument();

      // Resolve the promise to cleanup
      resolvePromise!([]);
    });
  });

  describe("Loading state", () => {
    it("displays loader while loading data", async () => {
      // Make the promise hang to capture loading state
      let resolvePromise: (value: any) => void;
      const hangingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (systemCostsService.getAssetCostsByYear as any).mockReturnValue(
        hangingPromise,
      );

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Should show loader
      expect(
        document.querySelector(".mantine-Loader-root"),
      ).toBeInTheDocument();

      // Resolve the promise to cleanup
      resolvePromise!([]);
    });

    it("shows loading container with correct styling", async () => {
      // Make the promise hang to capture loading state
      let resolvePromise: (value: any) => void;
      const hangingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (systemCostsService.getAssetCostsByYear as any).mockReturnValue(
        hangingPromise,
      );

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Check for loading container structure
      const container = document.querySelector(".mantine-Container-root");
      expect(container).toBeInTheDocument();

      // Resolve the promise to cleanup
      resolvePromise!([]);
    });
  });

  describe("Database integration", () => {
    it("responds to database path changes", async () => {
      const { rerender } = renderWithProviders(
        <SystemCosts graphId={testGraphId} />,
      );

      // Wait for initial render to complete
      await waitFor(() => {
        expect(screen.getByTestId("echarts-systemcosts")).toBeInTheDocument();
      });

      // Change database path
      const newDbPath = "/path/to/new.duckdb";
      mockMustGetGraph.mockReturnValue(
        createMockGraphConfig({ graphDBFilePath: newDbPath }),
      );

      await act(async () => {
        rerender(<SystemCosts graphId={testGraphId} />);
      });

      // Should call getGraphDatabase multiple times (initial + rerender + effect triggers)
      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
      expect(mockMustGetGraph).toHaveBeenCalledTimes(7);
    });
  });

  describe("Component structure", () => {
    it("renders main container element", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Wait for component to finish loading and render Stack
      await waitFor(() => {
        expect(screen.getByTestId("echarts-systemcosts")).toBeInTheDocument();
      });

      // Should render Stack with Paper (not Container when data loads successfully)
      const paperElement = document.querySelector(".mantine-Paper-root");
      expect(paperElement).toBeInTheDocument();
    });
  });

  describe("Props handling", () => {
    it("works with different graphId values", async () => {
      const customGraphId = "custom-graph-456";

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={customGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith(customGraphId);
    });

    it("handles special characters in graphId", async () => {
      const specialGraphId = "graph-with-special@#$%";

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={specialGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith(specialGraphId);
    });

    it("handles empty graphId", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId="" />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith("");
    });
  });

  describe("Component lifecycle", () => {
    it("cleans up properly on unmount", async () => {
      const { unmount } = renderWithProviders(
        <SystemCosts graphId={testGraphId} />,
      );

      await act(async () => {
        expect(() => unmount()).not.toThrow();
      });
    });

    it("handles rapid prop changes without errors", async () => {
      const { rerender } = renderWithProviders(
        <SystemCosts graphId={testGraphId} />,
      );

      await act(async () => {
        // Rapidly change graphId
        rerender(<SystemCosts graphId="new-graph-id" />);
        rerender(<SystemCosts graphId="another-graph-id" />);
      });

      // Should not throw errors
      expect(mockMustGetGraph).toHaveBeenCalledWith("another-graph-id");
    });
  });

  describe("Edge cases", () => {
    it("handles store method returning unexpected values", async () => {
      mockMustGetGraph.mockReturnValue(123 as any); // Non-string value

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Should still call the method without crashing
      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Accessibility", () => {
    it("maintains semantic structure", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Wait for component to finish loading and render the chart
      await waitFor(() => {
        expect(screen.getByTestId("echarts-systemcosts")).toBeInTheDocument();
      });

      // Should have proper Paper structure (not Container when data loads successfully)
      const paperElement = document.querySelector(".mantine-Paper-root");
      expect(paperElement).toBeInTheDocument();
    });
  });

  describe("Store integration", () => {
    it("integrates properly with visualization store", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Should use the store method correctly
      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("handles store updates correctly", async () => {
      const { rerender } = renderWithProviders(
        <SystemCosts graphId={testGraphId} />,
      );

      // Wait for initial render to complete
      await waitFor(() => {
        expect(screen.getByTestId("echarts-systemcosts")).toBeInTheDocument();
      });

      await act(async () => {
        // Update should call store again
        rerender(<SystemCosts graphId={testGraphId} />);
      });

      // Should account for initial render and rerender (multiple calls due to useEffect)
      expect(mockMustGetGraph).toHaveBeenCalledTimes(4);
    });
  });

  describe("Service integration", () => {
    it("calls system costs services with correct database path", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(systemCostsService.getAssetCostsByYear).toHaveBeenCalledWith(
          testGraphConfig,
        );
        expect(systemCostsService.getFlowCostsByYear).toHaveBeenCalledWith(
          testDbPath,
        );
      });
    });

    it("handles service errors gracefully", async () => {
      const errorMessage = "Database connection failed";
      (systemCostsService.getAssetCostsByYear as any).mockRejectedValue(
        new Error(errorMessage),
      );

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load system cost data/),
        ).toBeInTheDocument();
      });
    });
  });
});
