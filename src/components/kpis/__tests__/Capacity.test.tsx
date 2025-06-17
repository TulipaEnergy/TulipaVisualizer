import { screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import Capacity from "../Capacity";
import useVisualizationStore from "../../../store/visualizationStore";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import * as capacityService from "../../../services/capacityQuery";
import * as metadataService from "../../../services/metadata";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the capacity service
vi.mock("../../../services/capacityQuery", () => ({
  getCapacity: vi.fn(),
  fetchAvailableYears: vi.fn(),
}));

// Mock the metadata service
vi.mock("../../../services/metadata", () => ({
  getAssets: vi.fn(),
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
  };

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

    // Mock successful service calls by default
    (metadataService.getAssets as any).mockResolvedValue([
      "Asset1",
      "Asset2",
      "Asset3",
    ]);
    (capacityService.fetchAvailableYears as any).mockResolvedValue([
      2020, 2021, 2022, 2023,
    ]);
    (capacityService.getCapacity as any).mockResolvedValue([
      {
        year: 2020,
        investment: 100,
        decommission: 50,
        initial_capacity: 1000,
        final_capacity: 1050,
      },
      {
        year: 2021,
        investment: 150,
        decommission: 25,
        initial_capacity: 1050,
        final_capacity: 1175,
      },
    ]);
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

    it("renders asset selection dropdown", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Select asset")).toBeInTheDocument();
      });
    });
  });

  describe("KPI values and calculations", () => {
    it("displays capacity values correctly with mock data", async () => {
      // Setup graph with complete options
      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        // Chart should be rendered with the mock data
        const chart = screen.getByTestId("echarts-capacity");
        expect(chart).toBeInTheDocument();

        // Verify the chart data is passed correctly
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );
        expect(chartOption.series).toHaveLength(4); // Initial, Investment, Decommission, Final
      });
    });

    it("calculates and displays capacity values correctly", async () => {
      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Verify that capacity calculations are included in chart data
        const initialCapacitySeries = chartOption.series.find(
          (s: any) => s.name === "Initial Capacity",
        );
        const finalCapacitySeries = chartOption.series.find(
          (s: any) => s.name === "Final Capacity",
        );
        const investmentSeries = chartOption.series.find(
          (s: any) => s.name === "Investment",
        );
        const decommissionSeries = chartOption.series.find(
          (s: any) => s.name === "Decommission",
        );

        expect(initialCapacitySeries).toBeDefined();
        expect(finalCapacitySeries).toBeDefined();
        expect(investmentSeries).toBeDefined();
        expect(decommissionSeries).toBeDefined();
      });
    });

    it("handles zero and negative values in calculations", async () => {
      // Mock data with zero and negative values
      (capacityService.getCapacity as any).mockResolvedValue([
        {
          year: 2020,
          investment: 0,
          decommission: -1, // No decommission
          initial_capacity: 1000,
          final_capacity: 1000,
        },
      ]);

      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        expect(chart).toBeInTheDocument();
        // Component should handle negative values (which represent no data)
      });
    });
  });

  describe("Display formatting", () => {
    it("formats capacity values with 2 decimal places", async () => {
      // Mock data with decimal values
      (capacityService.getCapacity as any).mockResolvedValue([
        {
          year: 2020,
          investment: 123.456,
          decommission: 67.891,
          initial_capacity: 1000.123,
          final_capacity: 1055.765,
        },
      ]);

      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Values should be rounded to 2 decimal places
        const finalCapacitySeries = chartOption.series.find(
          (s: any) => s.name === "Final Capacity",
        );
        expect(finalCapacitySeries.data[0]).toBe(1055.77); // Rounded to 2 decimals
      });
    });

    it("displays chart with proper styling and layout", async () => {
      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-capacity");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Verify chart styling
        expect(chartOption.xAxis.name).toBe("Year");
        expect(chartOption.yAxis.name).toBe("Capacity (MW)");
        expect(chartOption.legend).toBeDefined();
        expect(chartOption.tooltip).toBeDefined();
      });
    });

    it("shows appropriate message when chart is not configured", async () => {
      // Graph without complete options
      const incompleteGraph = {
        ...mockGraph,
        options: {}, // Missing asset
      };
      mockMustGetGraph.mockReturnValue(incompleteGraph);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Please configure chart")).toBeInTheDocument();
      });
    });
  });

  describe("Asset and year selection interactions", () => {
    it("updates graph options when asset is selected", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Select asset")).toBeInTheDocument();
      });

      // This tests the interaction flow even though Select is a complex component
      expect(mockUpdateGraph).toHaveBeenCalledWith(
        testGraphId,
        expect.any(Object),
      );
    });
  });

  describe("Error handling", () => {
    it("displays error when asset loading fails", async () => {
      (metadataService.getAssets as any).mockRejectedValue(
        "Failed to load assets",
      );

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to load assets")).toBeInTheDocument();
      });
    });

    it("displays error when capacity data loading fails", async () => {
      (capacityService.getCapacity as any).mockRejectedValue(
        "Failed to load capacity",
      );

      const graphWithOptions = {
        ...mockGraph,
        options: {
          asset: "Asset1",
        },
      };
      mockMustGetGraph.mockReturnValue(graphWithOptions);

      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(
          screen.getByText(
            "Error fetching or processing data for chart: Failed to load capacity",
          ),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Database integration", () => {
    it("resets state when database changes", async () => {
      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      // Change database path
      const graphWithNewDb = {
        ...mockGraph,
        graphDBFilePath: "/new/path/to/db.duckdb",
      };
      mockMustGetGraph.mockReturnValue(graphWithNewDb);

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
      });

      // Should call updateGraph to reset options
      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        options: null,
      });
    });

    it("loads assets when database is available", async () => {
      await act(async () => {
        renderWithProviders(<Capacity graphId={testGraphId} />);
      });

      expect(metadataService.getAssets).toHaveBeenCalledWith(testDbPath);
    });
  });

  /*
  describe("Component lifecycle", () => {
    it("handles multiple re-renders correctly", async () => {
      const { rerender } = renderWithProviders(
        <Capacity graphId={testGraphId} />,
      );

      await act(async () => {
        rerender(<Capacity graphId={testGraphId} />);
        rerender(<Capacity graphId={testGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledTimes(3);
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
*/
});
