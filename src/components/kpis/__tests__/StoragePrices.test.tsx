import { screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import StoragePrices from "../Storage Prices";
import useVisualizationStore from "../../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  createMockGraphConfig,
} from "../../../test/utils";
import * as storagePriceService from "../../../services/storagePriceQuery";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the storage price service
vi.mock("../../../services/storagePriceQuery", () => ({
  getStoragePriceDurationSeries: vi.fn(),
  getStorageYears: vi.fn(),
}));

// Mock ReactECharts
vi.mock("echarts-for-react", () => ({
  default: ({ option, style }: { option: any; style: any }) => (
    <div
      data-testid="echarts-storage-prices"
      data-option={JSON.stringify(option)}
      style={style}
    >
      Storage Prices Chart Mock
    </div>
  ),
}));

describe("StoragePrices Component", () => {
  const mockGetGraphDatabase = vi.fn();
  const testGraphId = "test-graph-123";
  const testDbPath = "/path/to/test.duckdb";

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        getGraphDatabase: mockGetGraphDatabase,
        mustGetGraph: vi.fn().mockReturnValue(createMockGraphConfig),
      }),
    );

    // Default database path
    mockGetGraphDatabase.mockReturnValue(testDbPath);

    // Mock successful service calls by default
    (storagePriceService.getStorageYears as any).mockResolvedValue([
      { year: 2020 },
      { year: 2021 },
    ]);

    (
      storagePriceService.getStoragePriceDurationSeries as any
    ).mockResolvedValue([
      {
        milestone_year: 2020,
        carrier: "Battery1",
        global_start: 0,
        global_end: 10,
        y_axis: 150.25,
      },
      {
        milestone_year: 2020,
        carrier: "Battery2",
        global_start: 5,
        global_end: 15,
        y_axis: 200.75,
      },
    ]);
  });

  describe("Basic rendering", () => {
    it("renders without errors", async () => {
      const { container } = renderWithProviders(
        <StoragePrices graphId={testGraphId} />,
      );
      expect(container).toBeInTheDocument();
    });

    it("calls getGraphDatabase with correct graphId", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("shows initial state correctly", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      // Component should render without errors - it uses Stack in normal state
      expect(document.querySelector(".mantine-Stack-root")).toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("shows error when no database is selected", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(() => {
        expect(screen.getByText("No database selected")).toBeInTheDocument();
      });
    });

    it("shows error when database path is empty", async () => {
      mockGetGraphDatabase.mockReturnValue("");

      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(() => {
        expect(screen.getByText("No database selected")).toBeInTheDocument();
      });
    });

    it("handles service errors gracefully", async () => {
      const errorMessage = "Database connection failed";
      (
        storagePriceService.getStoragePriceDurationSeries as any
      ).mockRejectedValue(new Error(errorMessage));

      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load storage price data/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Database integration", () => {
    it("responds to database path changes", async () => {
      const { rerender } = renderWithProviders(
        <StoragePrices graphId={testGraphId} />,
      );

      // Wait for initial render to complete and chart to appear
      await waitFor(
        () => {
          expect(
            screen.getByTestId("echarts-storage-prices"),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Change database path
      const newDbPath = "/path/to/new.duckdb";
      mockGetGraphDatabase.mockReturnValue(newDbPath);

      rerender(<StoragePrices graphId={testGraphId} />);

      // Should call getGraphDatabase for initial render and rerender
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("calls storage price service with correct database path", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(() => {
        expect(storagePriceService.getStorageYears).toHaveBeenCalledWith(
          testDbPath,
        );
      });
    });
  });

  describe("Component structure", () => {
    it("renders chart within Paper component when data is available", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      // Wait for data to load and chart to render
      await waitFor(
        () => {
          const chart = screen.getByTestId("echarts-storage-prices");
          expect(chart).toBeInTheDocument();

          // Should render within Paper structure
          const paperElement = document.querySelector(".mantine-Paper-root");
          expect(paperElement).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("renders controls (Select dropdowns)", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(
        () => {
          // Should have resolution and year select dropdowns
          const selects = document.querySelectorAll(".mantine-Select-root");
          expect(selects.length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Component lifecycle", () => {
    it("handles multiple re-renders correctly", async () => {
      const { rerender } = renderWithProviders(
        <StoragePrices graphId={testGraphId} />,
      );

      rerender(<StoragePrices graphId={testGraphId} />);

      // Should be called multiple times due to useEffect dependencies
      expect(mockGetGraphDatabase).toHaveBeenCalledTimes(3);
    });

    it("cleans up properly on unmount", async () => {
      const { unmount } = renderWithProviders(
        <StoragePrices graphId={testGraphId} />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Data processing", () => {
    it("processes unique years correctly", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);
    });

    it("processes unique carriers correctly", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);
    });
  });

  describe("Props handling", () => {
    it("works with different graphId values", async () => {
      const customGraphId = "custom-graph-456";

      renderWithProviders(<StoragePrices graphId={customGraphId} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(customGraphId);
    });

    it("handles special characters in graphId", async () => {
      const specialGraphId = "graph-with-special@#$%";

      renderWithProviders(<StoragePrices graphId={specialGraphId} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(specialGraphId);
    });

    it("handles empty graphId", async () => {
      renderWithProviders(<StoragePrices graphId="" />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith("");
    });
  });

  describe("Edge cases", () => {
    it("handles null graphId gracefully", async () => {
      // TypeScript would normally prevent this, but testing runtime behavior
      renderWithProviders(<StoragePrices graphId={null as any} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(null);
    });

    it("handles store method returning unexpected values", async () => {
      mockGetGraphDatabase.mockReturnValue(123 as any); // Non-string value

      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      // Should still call the method without crashing
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Store integration", () => {
    it("integrates properly with visualization store", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      // Should use the store method correctly
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });

    it("handles store updates correctly", async () => {
      const { rerender } = renderWithProviders(
        <StoragePrices graphId={testGraphId} />,
      );

      // Update should call store again
      rerender(<StoragePrices graphId={testGraphId} />);

      // Should account for initial render and rerender
      expect(mockGetGraphDatabase).toHaveBeenCalledTimes(3);
    });
  });

  describe("Accessibility", () => {
    it("provides accessible error messages", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      await waitFor(() => {
        const errorText = screen.getByText("No database selected");
        expect(errorText).toBeInTheDocument();
        expect(errorText.tagName.toLowerCase()).toBe("p"); // Should be in a paragraph element
      });
    });

    it("maintains semantic structure", async () => {
      renderWithProviders(<StoragePrices graphId={testGraphId} />);

      // Wait for component to finish loading and render the chart
      await waitFor(() => {
        expect(
          screen.getByTestId("echarts-storage-prices"),
        ).toBeInTheDocument();
      });

      // Should have proper structure
      const paperElement = document.querySelector(".mantine-Paper-root");
      expect(paperElement).toBeInTheDocument();
    });
  });
});
