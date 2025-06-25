import { screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import Capacity from "../Capacity";
import useVisualizationStore from "../../../store/visualizationStore";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import * as capacityService from "../../../services/capacityQuery";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the capacity service
vi.mock("../../../services/capacityQuery", () => ({
  getCapacity: vi.fn(),
}));

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ option, style }: { option: any; style: any }) => (
    <div
      data-testid="echarts-capacity"
      data-option={JSON.stringify(option)}
      style={style}
    >
      Capacity Chart Mock
    </div>
  ),
}));

describe("Capacity Component", () => {
  const mockMustGetGraph = vi.fn();
  const mockUpdateGraph = vi.fn();
  const testGraphId = "test-graph-123";
  const testDbPath = "/path/to/test.duckdb";

  // Mock graph configuration
  const mockGraph = {
    id: testGraphId,
    type: "capacity" as const,
    title: "Test Capacity Chart",
    error: null,
    isLoading: false,
    options: null,
    graphDBFilePath: testDbPath,
    filtersByCategory: {} as Record<number, number[]>,
    breakdownNodes: [] as number[],
    lastApplyTimestamp: Date.now(),
  };

  // Sample capacity data for multiple assets
  const mockCapacityData = [
    {
      asset: "Asset1",
      year: 2020,
      investment: 100,
      decommission: 50,
      initial_capacity: 1000,
      final_capacity: 1050,
    },
    {
      asset: "Asset1",
      year: 2021,
      investment: 150,
      decommission: 25,
      initial_capacity: 1050,
      final_capacity: 1175,
    },
    {
      asset: "Asset2",
      year: 2020,
      investment: 200,
      decommission: 75,
      initial_capacity: 2000,
      final_capacity: 2125,
    },
    {
      asset: "Asset2",
      year: 2021,
      investment: 300,
      decommission: 100,
      initial_capacity: 2125,
      final_capacity: 2325,
    },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        mustGetGraph: mockMustGetGraph,
        updateGraph: mockUpdateGraph,
      }),
    );

    // Default graph return
    mockMustGetGraph.mockReturnValue(mockGraph);

    // Mock successful service call by default
    (capacityService.getCapacity as any).mockResolvedValue(mockCapacityData);
  });

  describe("Basic rendering", () => {
    it("renders without errors", async () => {
      await act(async () => {
        const { container } = renderWithProviders(
          <Capacity graphId={testGraphId} />,
        );
        expect(container).toBeInTheDocument();
      });
    });

    it("calls mustGetGraph with correct graphId", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("updates graph title on mount", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        title: "Capacity by Year - All Assets",
      });
    });

    it("shows loading state initially", async () => {
      // Create a controllable promise
      let resolveCapacity: (value: any) => void;
      const capacityPromise = new Promise((resolve) => {
        resolveCapacity = resolve;
      });

      (capacityService.getCapacity as any).mockReturnValue(capacityPromise);

      renderWithProviders(<Capacity graphId={testGraphId} />);

      // Should show loading initially
      expect(screen.getByText("Loading chart...")).toBeInTheDocument();

      // Now resolve the promise
      await act(async () => {
        resolveCapacity!(mockCapacityData);
      });

      // Should show chart after data loads
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
        expect(screen.queryByText("Loading chart...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Chart rendering and data processing", () => {
    it("renders chart with correct data structure", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        expect(chart).toBeInTheDocument();

        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should have series for each capacity type and each asset
        expect(chartOption.series).toBeDefined();
        expect(chartOption.series.length).toBeGreaterThan(0);

        // Should have proper axis configuration
        expect(chartOption.xAxis.type).toBe("category");
        expect(chartOption.xAxis.name).toBe("Year");
        expect(chartOption.yAxis.type).toBe("value");
        expect(chartOption.yAxis.name).toBe("Capacity (MW)");
      });
    });

    it("processes multiple assets correctly", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should have legend with asset names
        expect(chartOption.legend.data).toContain("Asset1");
        expect(chartOption.legend.data).toContain("Asset2");
        expect(chartOption.legend.data).toContain("Initial Capacity");
        expect(chartOption.legend.data).toContain("Investments");
        expect(chartOption.legend.data).toContain("Decommissions");
      });
    });

    it("handles empty data gracefully", async () => {
      (capacityService.getCapacity as any).mockResolvedValue([]);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should show empty state
        expect(chartOption.title?.text).toBe("No capacity data available");
      });
    });

    it("filters out years with no valid data", async () => {
      // Mock data with some zero values
      const dataWithZeros = [
        {
          asset: "Asset1",
          year: 2020,
          investment: 0,
          decommission: 0,
          initial_capacity: 0,
          final_capacity: 0,
        },
        {
          asset: "Asset1",
          year: 2021,
          investment: 100,
          decommission: 50,
          initial_capacity: 1000,
          final_capacity: 1050,
        },
      ];

      (capacityService.getCapacity as any).mockResolvedValue(dataWithZeros);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should only include 2021 (the year with valid data)
        expect(chartOption.xAxis.data).toEqual(["2021"]);
      });
    });
  });

  describe("Value calculations and formatting", () => {
    it("rounds values to 2 decimal places", async () => {
      const dataWithDecimals = [
        {
          asset: "Asset1",
          year: 2020,
          investment: 123.456789,
          decommission: 67.891234,
          initial_capacity: 1000.123456,
          final_capacity: 1055.987654,
        },
      ];

      (capacityService.getCapacity as any).mockResolvedValue(dataWithDecimals);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Find the final capacity series for Asset1
        const finalCapacitySeries = chartOption.series.find(
          (s: any) => s.name === "Asset1",
        );
        expect(finalCapacitySeries?.data[0]).toBe(1055.99); // Rounded to 2 decimals
      });
    });

    it("handles negative values correctly", async () => {
      const dataWithNegatives = [
        {
          asset: "Asset1",
          year: 2020,
          investment: -1, // Represents no data
          decommission: 100, // Positive decommission
          initial_capacity: 1000,
          final_capacity: 900,
        },
      ];

      (capacityService.getCapacity as any).mockResolvedValue(dataWithNegatives);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should handle negative investment (-1 means no data)
        const investmentSeries = chartOption.series.find(
          (s: any) => s.name === "Investments",
        );
        expect(investmentSeries?.data[0]).toBe(null); // No investment data

        // Decommission should be negative in the chart
        const decommissionSeries = chartOption.series.find(
          (s: any) => s.name === "Decommissions",
        );
        expect(decommissionSeries?.data[0]).toBe(-100); // Negative for chart display
      });
    });
  });

  describe("Chart configuration", () => {
    it("configures tooltip correctly", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.tooltip).toBeDefined();
        expect(chartOption.tooltip.trigger).toBe("item"); // Changed from "axis" to "item"
        // Remove the axisPointer assertion since it's not used with item trigger
        // expect(chartOption.tooltip.axisPointer.type).toBe("shadow");
      });
    });

    it("configures data zoom correctly", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.dataZoom).toBeDefined();
        expect(chartOption.dataZoom).toHaveLength(2); // Horizontal and vertical
      });
    });

    it("configures bar styling correctly", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.barCategoryGap).toBe("10%");
        expect(chartOption.barGap).toBe("1%");
      });
    });
  });

  describe("Filters and breakdown integration", () => {
    it("passes correct parameters to capacity service", async () => {
      const graphWithFilters = {
        ...mockGraph,
        filtersByCategory: { 1: [10, 20] },
        breakdownNodes: [5, 6],
      };
      mockMustGetGraph.mockReturnValue(graphWithFilters);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        // Check that the service was called with the correct parameters
        expect(capacityService.getCapacity).toHaveBeenCalledWith(
          testDbPath,
          { 1: [10, 20] },
          [5, 6],
        );
      });
    });

    it("updates chart when filters change", async () => {
      // Initial render with no filters
      const initialGraph = {
        ...mockGraph,
        filtersByCategory: {},
        breakdownNodes: [],
        lastApplyTimestamp: 1000,
      };
      mockMustGetGraph.mockReturnValue(initialGraph);

      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Wait for initial chart to render
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Clear the mock calls to get a clean slate
      vi.clearAllMocks();

      // Update with filters applied
      const updatedGraph = {
        ...mockGraph,
        filtersByCategory: { 1: [10, 20] },
        breakdownNodes: [5, 6],
        lastApplyTimestamp: 2000, // Different timestamp to trigger update
      };
      mockMustGetGraph.mockReturnValue(updatedGraph);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      // Verify the service was called with new parameters after the update
      await waitFor(() => {
        expect(capacityService.getCapacity).toHaveBeenCalledWith(
          testDbPath,
          { 1: [10, 20] },
          [5, 6],
        );
      });
    });

    it("maintains chart state when non-triggering props change", async () => {
      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Get initial call count
      const initialCallCount = (capacityService.getCapacity as any).mock.calls
        .length;

      // Update graph with same dbPath and timestamp (no meaningful change)
      const unchangedGraph = {
        ...mockGraph,
        title: "Different Title", // This shouldn't trigger data refetch
      };
      mockMustGetGraph.mockReturnValue(unchangedGraph);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      // Should still show chart without additional service calls
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Call count should remain the same
      expect((capacityService.getCapacity as any).mock.calls.length).toBe(
        initialCallCount,
      );
    });

    it("handles rapid filter changes gracefully", async () => {
      let resolveCapacity: (value: any) => void;
      const capacityPromise = new Promise((resolve) => {
        resolveCapacity = resolve;
      });

      (capacityService.getCapacity as any).mockReturnValue(capacityPromise);

      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Should show loading initially
      expect(screen.getByText("Loading chart...")).toBeInTheDocument();

      // Rapidly change filters while still loading
      const updatedGraph1 = {
        ...mockGraph,
        filtersByCategory: { 1: [10] },
        lastApplyTimestamp: Date.now() + 1000,
      };
      mockMustGetGraph.mockReturnValue(updatedGraph1);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      const updatedGraph2 = {
        ...mockGraph,
        filtersByCategory: { 1: [10, 20] },
        lastApplyTimestamp: Date.now() + 2000,
      };
      mockMustGetGraph.mockReturnValue(updatedGraph2);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      // Now resolve the promise
      await act(async () => {
        resolveCapacity!(mockCapacityData);
      });

      // Should eventually show chart
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
        expect(screen.queryByText("Loading chart...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    it("displays error when capacity data loading fails", async () => {
      const errorMessage = "Failed to load capacity data";
      (capacityService.getCapacity as any).mockRejectedValue(errorMessage);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            `Error fetching or processing data for chart: ${errorMessage}`,
          ),
        ).toBeInTheDocument();
      });
    });

    it("clears error state when data loads successfully after error", async () => {
      // First render with error
      (capacityService.getCapacity as any).mockRejectedValue("Error");

      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            "Error fetching or processing data for chart: Error",
          ),
        ).toBeInTheDocument();
      });

      // Then render with successful data
      (capacityService.getCapacity as any).mockResolvedValue(mockCapacityData);
      const updatedGraph = {
        ...mockGraph,
        lastApplyTimestamp: Date.now() + 1000,
      };
      mockMustGetGraph.mockReturnValue(updatedGraph);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
        expect(
          screen.queryByText(
            "Error fetching or processing data for chart: Error",
          ),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Database integration", () => {
    it("resets state when database path changes", async () => {
      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Clear mock calls to isolate the database change effect
      vi.clearAllMocks();

      // Change database path
      const graphWithNewDb = {
        ...mockGraph,
        graphDBFilePath: "/new/path/to/db.duckdb",
        lastApplyTimestamp: Date.now() + 1000, // Ensure useEffect triggers
      };
      mockMustGetGraph.mockReturnValue(graphWithNewDb);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      // Should call getCapacity with new database path
      await waitFor(() => {
        expect(capacityService.getCapacity).toHaveBeenCalledWith(
          "/new/path/to/db.duckdb",
          expect.any(Object),
          expect.any(Array),
        );
      });
    });

    it("generates chart immediately when database is available", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(capacityService.getCapacity).toHaveBeenCalledWith(
          testDbPath,
          mockGraph.filtersByCategory,
          mockGraph.breakdownNodes,
        );
      });
    });
  });

  describe("Component lifecycle", () => {
    it("handles multiple meaningful re-renders correctly", async () => {
      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Force a meaningful re-render by changing the graph data
      const updatedGraph1 = {
        ...mockGraph,
        lastApplyTimestamp: Date.now() + 1000,
      };
      mockMustGetGraph.mockReturnValue(updatedGraph1);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });

      // Another meaningful change
      const updatedGraph2 = {
        ...mockGraph,
        filtersByCategory: { 2: [30, 40] },
        lastApplyTimestamp: Date.now() + 2000,
      };
      mockMustGetGraph.mockReturnValue(updatedGraph2);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId("echarts-capacity")).toBeInTheDocument();
      });
    });

    it("cleans up properly on unmount", async () => {
      const { unmount } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      await act(async () => {
        unmount();
      });

      // Component should unmount without errors
      expect(true).toBe(true);
    });
  });
});
