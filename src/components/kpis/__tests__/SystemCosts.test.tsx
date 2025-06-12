import { screen, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import SystemCosts from "../SystemCosts";
import useVisualizationStore from "../../../store/visualizationStore";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import * as systemCostsService from "../../../services/systemCosts";

// Mock the store
vi.mock("../../../store/visualizationStore");

// Mock the system costs service
vi.mock("../../../services/systemCosts", () => ({
  getAssetCostsByYear: vi.fn(),
  getFlowCostsByYear: vi.fn(),
  getUniqueCarriers: vi.fn(),
  getUniqueYears: vi.fn(),
}));

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
      }),
    );

    // Default database path
    mockGetGraphDatabase.mockReturnValue(testDbPath);

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
    (systemCostsService.getUniqueYears as any).mockReturnValue([
      2020, 2021, 2022,
    ]);
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

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
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

  describe("Error handling", () => {
    it("shows error when no database is selected", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("No database selected")).toBeInTheDocument();
      });
    });

    it("shows error when database path is empty", async () => {
      mockGetGraphDatabase.mockReturnValue("");

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("No database selected")).toBeInTheDocument();
      });
    });

    it("displays error container with correct styling when error occurs", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        const errorContainer = screen
          .getByText("No database selected")
          .closest(".mantine-Container-root");
        expect(errorContainer).toHaveStyle({ color: "red" });
      });
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
      mockGetGraphDatabase.mockReturnValue(newDbPath);

      await act(async () => {
        rerender(<SystemCosts graphId={testGraphId} />);
      });

      // Should call getGraphDatabase multiple times (initial + rerender + effect triggers)
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
      expect(mockGetGraphDatabase).toHaveBeenCalledTimes(5);
    });

    it("handles undefined database path gracefully", async () => {
      mockGetGraphDatabase.mockReturnValue(undefined);

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(screen.getByText("No database selected")).toBeInTheDocument();
      });
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

    it("maintains consistent layout structure", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        // Should have container and text elements
        expect(screen.getByText("No database selected")).toBeInTheDocument();
        expect(
          document.querySelector(".mantine-Container-root"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Props handling", () => {
    it("works with different graphId values", async () => {
      const customGraphId = "custom-graph-456";

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={customGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(customGraphId);
    });

    it("handles special characters in graphId", async () => {
      const specialGraphId = "graph-with-special@#$%";

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={specialGraphId} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(specialGraphId);
    });

    it("handles empty graphId", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId="" />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith("");
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
      expect(mockGetGraphDatabase).toHaveBeenCalledWith("another-graph-id");
    });
  });

  describe("Edge cases", () => {
    it("handles null graphId gracefully", async () => {
      // TypeScript would normally prevent this, but testing runtime behavior
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={null as any} />);
      });

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(null);
    });

    it("handles store method returning unexpected values", async () => {
      mockGetGraphDatabase.mockReturnValue(123 as any); // Non-string value

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      // Should still call the method without crashing
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Accessibility", () => {
    it("provides accessible error messages", async () => {
      mockGetGraphDatabase.mockReturnValue(null);

      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        const errorText = screen.getByText("No database selected");
        expect(errorText).toBeInTheDocument();
        expect(errorText.tagName.toLowerCase()).toBe("p"); // Should be in a paragraph element
      });
    });

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
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
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
      expect(mockGetGraphDatabase).toHaveBeenCalledTimes(3);
    });
  });

  describe("Service integration", () => {
    it("calls system costs services with correct database path", async () => {
      await act(async () => {
        renderWithProviders(<SystemCosts graphId={testGraphId} />);
      });

      await waitFor(() => {
        expect(systemCostsService.getAssetCostsByYear).toHaveBeenCalledWith(
          testDbPath,
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
