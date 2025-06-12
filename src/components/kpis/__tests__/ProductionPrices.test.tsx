import { act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import ProductionPrices from "../ProductionPrices";
import useVisualizationStore from "../../../store/visualizationStore";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import {
  getProductionPriceDurationSeries,
  getProductionYears,
} from "../../../services/productionPriceQuery";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the production prices service
vi.mock("../../../services/productionPriceQuery", () => ({
  getProductionPriceDurationSeries: vi.fn(),
  getProductionYears: vi.fn(),
}));

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ style }: { style: any }) => (
    <div data-testid="echarts-productionprices" style={style}>
      ProductionPrices Chart Mock
    </div>
  ),
}));

const mockGetProductionPriceDurationSeries =
  getProductionPriceDurationSeries as ReturnType<typeof vi.fn>;
const mockGetProductionYears = getProductionYears as ReturnType<typeof vi.fn>;

describe("ProductionPrices Component", () => {
  const mockGetGraphDatabase = vi.fn();
  const testGraphId = "test-graph-123";
  const testDbPath = "/path/to/test.duckdb";

  // Mock data that matches ProductionPriceDurationSeriesRow structure
  const mockProductionPriceData = [
    {
      asset: "Asset1",
      milestone_year: 2020,
      period: 1,
      start: 0,
      end: 10,
      y_axis: 100.5,
    },
    {
      asset: "Asset2",
      milestone_year: 2021,
      period: 2,
      start: 10,
      end: 20,
      y_axis: 150.75,
    },
  ];

  const mockYearsData = [{ year: 2020 }, { year: 2021 }, { year: 2022 }];

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        getGraphDatabase: mockGetGraphDatabase,
      }),
    );

    // Default database path
    mockGetGraphDatabase.mockReturnValue(testDbPath);

    // Setup default service mock return
    mockGetProductionPriceDurationSeries.mockResolvedValue(
      mockProductionPriceData,
    );
    mockGetProductionYears.mockResolvedValue(mockYearsData);
  });

  describe("Basic rendering", () => {
    it("renders without errors", async () => {
      await act(async () => {
        const { container } = renderWithProviders(
          <ProductionPrices graphId={testGraphId} />,
        );
        expect(container).toBeInTheDocument();
      });
    });

    it("calls getGraphDatabase with correct graphId", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("shows component structure", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      // Component should render the stack container (main return structure)
      expect(document.querySelector(".mantine-Stack-root")).toBeInTheDocument();
    });
  });

  describe("Component structure", () => {
    it("renders main container element", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      const container = document.querySelector(".mantine-Stack-root");
      expect(container).toBeInTheDocument();
    });

    it("maintains container structure regardless of state", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      // Should have error state container structure when no database
      expect(
        document.querySelector(".mantine-Container-root"),
      ).toBeInTheDocument();
    });
  });

  describe("Props handling", () => {
    it("works with different graphId values", async () => {
      const customGraphId = "custom-graph-456";

      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={customGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(customGraphId);
    });

    it("handles special characters in graphId", async () => {
      const specialGraphId = "graph-with-special@#$%";

      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={specialGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(specialGraphId);
    });
  });

  describe("Component lifecycle", () => {
    it("cleans up properly on unmount", async () => {
      const { unmount } = renderWithProviders(
        <ProductionPrices graphId={testGraphId} />,
      );

      await act(async () => {
        expect(() => unmount()).not.toThrow();
      });
    });

    it("handles prop changes without errors", async () => {
      const { rerender } = renderWithProviders(
        <ProductionPrices graphId={testGraphId} />,
      );

      await act(async () => {
        // Change graphId - each triggers useEffect which calls getGraphDatabase
        rerender(<ProductionPrices graphId="new-graph-id" />);
      });

      // Should call getGraphDatabase for renders
      expect(mockGetGraphDatabase).toHaveBeenCalledWith("new-graph-id");
    });
  });

  describe("Store integration", () => {
    it("integrates properly with visualization store", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("responds to store changes", async () => {
      const { rerender } = renderWithProviders(
        <ProductionPrices graphId={testGraphId} />,
      );

      // Change database path
      const newDbPath = "/path/to/new.duckdb";
      mockGetGraphDatabase.mockReturnValue(newDbPath);

      await act(async () => {
        rerender(<ProductionPrices graphId={testGraphId} />);
      });

      // Should call getGraphDatabase again
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Accessibility and structure", () => {
    it("maintains semantic structure", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId={testGraphId} />);
      });

      const container = document.querySelector(".mantine-Stack-root");
      expect(container).toBeInTheDocument();
    });

    it("renders consistently across different props", async () => {
      await act(async () => {
        renderWithProviders(<ProductionPrices graphId="test-1" />);
      });

      expect(document.querySelector(".mantine-Stack-root")).toBeInTheDocument();

      await act(async () => {
        renderWithProviders(<ProductionPrices graphId="test-2" />);
      });

      expect(document.querySelector(".mantine-Stack-root")).toBeInTheDocument();
    });
  });
});
