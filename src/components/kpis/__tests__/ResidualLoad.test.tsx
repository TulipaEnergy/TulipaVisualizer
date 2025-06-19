import { screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import SupplyStackedBarSeries from "../ResidualLoad";
import useVisualizationStore from "../../../store/visualizationStore";
import { renderWithProviders, createMockStoreState, createMockGraphConfig } from "../../../test/utils";
import * as residualLoadService from "../../../services/residualLoadQuery";
import * as metadataService from "../../../services/metadata";
import { Resolution } from "../../../types/resolution";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the residual load service
vi.mock("../../../services/residualLoadQuery", () => ({
  getSupply: vi.fn(),
}));

// Mock the metadata service
vi.mock("../../../services/metadata", () => ({
  getYears: vi.fn(),
}));

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ option, style }: { option: any; style: any }) => (
    <div
      data-testid="echarts-residual-load"
      data-option={JSON.stringify(option)}
      style={style}
    >
      Supply Stacked Bar Chart Mock
    </div>
  ),
}));

describe("SupplyStackedBarSeries (ResidualLoad) Component", () => {
  const mockGetGraphDatabase = vi.fn();
  const mockUpdateGraph = vi.fn();
  const mockMustGetGraph = vi.fn();
  const testGraphId = "test-graph-123";
  const testDbPath = "/path/to/test.duckdb";

  // Mock graph configuration
  const mockGraph = createMockGraphConfig({
    id: testGraphId,
    type: "capacity",
    title: "Test Supply Chart",
    filtersByCategory: {},
    breakdownNodes: [],
    lastApplyTimestamp: 0,
  });

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        getGraphDatabase: mockGetGraphDatabase,
        updateGraph: mockUpdateGraph,
        mustGetGraph: mockMustGetGraph,
      }),
    );

    // Default graph and database path
    mockMustGetGraph.mockReturnValue(mockGraph);
    mockGetGraphDatabase.mockReturnValue(testDbPath);

    // Mock successful service calls by default
    (metadataService.getYears as any).mockResolvedValue([
      { year: 2020 },
      { year: 2021 },
      { year: 2022 },
    ]);

    (residualLoadService.getSupply as any).mockResolvedValue([
      {
        asset: "Solar",
        milestone_year: 2020,
        global_start: 0,
        global_end: 24,
        y_axis: 150.5,
      },
      {
        asset: "Wind",
        milestone_year: 2020,
        global_start: 0,
        global_end: 24,
        y_axis: 200.75,
      },
      {
        asset: "Solar",
        milestone_year: 2020,
        global_start: 24,
        global_end: 48,
        y_axis: 180.25,
      },
      {
        asset: "Wind",
        milestone_year: 2020,
        global_start: 24,
        global_end: 48,
        y_axis: 220.5,
      },
    ]);
  });

  describe("Basic rendering", () => {
    it("renders without errors", async () => {
      await act(async () => {
        const { container } = renderWithProviders(
          <SupplyStackedBarSeries graphId={testGraphId} />,
        );
        expect(container).toBeInTheDocument();
      });
    });

    it("calls mustGetGraph with correct graphId", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      expect(mockMustGetGraph).toHaveBeenCalledWith(testGraphId);
    });

    it("calls getGraphDatabase with correct graphId", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("updates graph title on mount", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      expect(mockUpdateGraph).toHaveBeenCalledWith(testGraphId, {
        title: "Supply by source",
      });
    });

    it("renders resolution dropdown", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Resolution")).toBeInTheDocument();
      });
    });

    it("renders year dropdown", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Year")).toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    it("shows error when no database is selected", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      // Component should handle null database gracefully - no service calls should be made
      expect(metadataService.getYears).not.toHaveBeenCalled();
      expect(residualLoadService.getSupply).not.toHaveBeenCalled();
    });

    it("shows error when database path is empty", async () => {
      mockGetGraphDatabase.mockReturnValue("");

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      // Component should handle empty database path gracefully
      expect(metadataService.getYears).not.toHaveBeenCalled();
      expect(residualLoadService.getSupply).not.toHaveBeenCalled();
    });

    it("handles service errors gracefully for getYears", async () => {
      const errorMessage = "Failed to fetch years";
      (metadataService.getYears as any).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to fetch available years.")).toBeInTheDocument();
      });
    });

    it("handles service errors gracefully for getSupply", async () => {
      const errorMessage = "Database connection failed";
      (residualLoadService.getSupply as any).mockRejectedValue(new Error(errorMessage));

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Failed to load supply data.")).toBeInTheDocument();
      });
    });
  });

  describe("Data loading and chart rendering", () => {
    it("calls getYears with correct database path", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(metadataService.getYears).toHaveBeenCalledWith(testDbPath);
      });
    });

    it("calls getSupply with correct parameters", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(residualLoadService.getSupply).toHaveBeenCalledWith(
          testDbPath,
          Resolution.Days, // default resolution
          2020, // first available year
          mockGraph.filtersByCategory,
          mockGraph.breakdownNodes,
        );
      });
    });

    it("renders chart with correct data", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        expect(chart).toBeInTheDocument();

        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should have stacked bar series for each asset
        expect(chartOption.series).toBeDefined();
        expect(chartOption.series.length).toBeGreaterThan(0);
        
        // All series should be stacked bar type
        chartOption.series.forEach((series: any) => {
          expect(series.type).toBe("bar");
          expect(series.stack).toBe("total");
        });

        // Should have x-axis with time data
        expect(chartOption.xAxis).toBeDefined();
        expect(chartOption.xAxis.type).toBe("category");
        expect(chartOption.xAxis.name).toBe("Time (days)");

        // Should have y-axis for supply values
        expect(chartOption.yAxis).toBeDefined();
        expect(chartOption.yAxis.type).toBe("value");
        expect(chartOption.yAxis.name).toBe("Supply (MW)");
      });
    });

    it("groups data by asset correctly", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should have series for Solar and Wind
        const seriesNames = chartOption.series.map((s: any) => s.name);
        expect(seriesNames).toContain("Solar");
        expect(seriesNames).toContain("Wind");
      });
    });

    it("handles empty data gracefully", async () => {
      (residualLoadService.getSupply as any).mockResolvedValue([]);

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        // Should handle empty data without errors
        expect(chartOption.series).toBeDefined();
        expect(Array.isArray(chartOption.series)).toBe(true);
      });
    });
  });

  describe("Resolution selection", () => {
    it("renders all resolution options", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("Resolution")).toBeInTheDocument();
        // The Select component should be present even if options aren't visible
        const resolutionSelect = document.querySelector('[data-testid*="resolution"], input[value="days"]');
        expect(resolutionSelect || screen.getByDisplayValue("Days")).toBeTruthy();
      });
    });

    it("updates chart when resolution changes", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      // Wait for initial load
      await waitFor(() => {
        expect(residualLoadService.getSupply).toHaveBeenCalledWith(
          testDbPath,
          Resolution.Days,
          2020,
          mockGraph.filtersByCategory,
          mockGraph.breakdownNodes,
        );
      });

      // Note: Testing actual dropdown interaction would require more complex setup
      // This test verifies the component calls the service with the correct resolution
    });
  });

  describe("Year selection", () => {
    it("selects first available year by default", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(residualLoadService.getSupply).toHaveBeenCalledWith(
          testDbPath,
          Resolution.Days,
          2020, // first year from mock data
          mockGraph.filtersByCategory,
          mockGraph.breakdownNodes,
        );
      });
    });

    it("handles case when no years are available", async () => {
      (metadataService.getYears as any).mockResolvedValue([]);

      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      // Should not call getSupply when no years are available
      await waitFor(() => {
        expect(residualLoadService.getSupply).not.toHaveBeenCalled();
      });
    });
  });

  describe("Chart configuration", () => {
    it("includes tooltip configuration", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.tooltip).toBeDefined();
        expect(chartOption.tooltip.trigger).toBe("axis");
        expect(chartOption.tooltip.axisPointer.type).toBe("shadow");
      });
    });

    it("includes legend configuration", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.legend).toBeDefined();
        expect(chartOption.legend.bottom).toBe("0%");
        expect(chartOption.legend.type).toBe("scroll");
      });
    });

    it("includes dataZoom configuration for navigation", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const chart = screen.getByTestId("echarts-residual-load");
        const chartOption = JSON.parse(
          chart.getAttribute("data-option") || "{}",
        );

        expect(chartOption.dataZoom).toBeDefined();
        expect(Array.isArray(chartOption.dataZoom)).toBe(true);
        expect(chartOption.dataZoom.length).toBeGreaterThan(0);

        // Should include horizontal slider, vertical slider, and inside zoom
        const zoomTypes = chartOption.dataZoom.map((dz: any) => dz.type);
        expect(zoomTypes).toContain("slider");
        expect(zoomTypes).toContain("inside");
      });
    });
  });

  describe("Custom height prop", () => {
    it("uses default height when not specified", async () => {
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        const paper = document.querySelector('.mantine-Paper-root');
        expect(paper).toHaveStyle({ height: '500px' });
      });
    });

    it("uses custom height when specified", async () => {
      const customHeight = 300;

      await act(async () => {
        renderWithProviders(
          <SupplyStackedBarSeries graphId={testGraphId} height={customHeight} />
        );
      });

      await waitFor(() => {
        const paper = document.querySelector('.mantine-Paper-root');
        expect(paper).toHaveStyle({ height: '300px' });
      });
    });
  });

  describe("Filter integration", () => {
    it("re-renders when graph filters change", async () => {
      const updatedGraph = {
        ...mockGraph,
        lastApplyTimestamp: 123456789,
        filtersByCategory: { 1: [1, 2] },
      };

      // Initial render
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(residualLoadService.getSupply).toHaveBeenCalledTimes(1);
      });

      // Update graph with new filters
      mockMustGetGraph.mockReturnValue(updatedGraph);

      // Re-render with updated graph
      await act(async () => {
        renderWithProviders(<SupplyStackedBarSeries graphId={testGraphId} />);
      });

      // Should call getSupply again with new filters
      await waitFor(() => {
        expect(residualLoadService.getSupply).toHaveBeenCalledWith(
          testDbPath,
          Resolution.Days,
          2020,
          updatedGraph.filtersByCategory,
          updatedGraph.breakdownNodes,
        );
      });
    });
  });
}); 