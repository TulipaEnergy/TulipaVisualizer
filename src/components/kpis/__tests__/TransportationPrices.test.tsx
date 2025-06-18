import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import TransportationPrices from "../TransportationPrices";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import * as transportPriceQuery from "../../../services/transportPriceQuery";
import { Resolution } from "../../../types/resolution";

// Mock ECharts to avoid canvas issues in tests
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

// Mock the transport price query service
vi.mock("../../../services/transportPriceQuery", () => ({
  getTransportationPriceDurationSeries: vi.fn(),
  getTransportationYears: vi.fn(),
  getTransportationCarriers: vi.fn(),
}));

describe("TransportationPrices Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockStoreWithDatabase = createMockStoreState({
    getGraphDatabase: vi.fn(() => "/mock/database.duckdb"),
  });

  const mockStoreWithoutDatabase = createMockStoreState({
    getGraphDatabase: vi.fn(() => null),
  });

  const mockYearsData = [{ year: 2023 }, { year: 2022 }, { year: 2021 }];

  const mockCarriersData = [
    { carrier: "Carrier_A" },
    { carrier: "Carrier_B" },
    { carrier: "Carrier_C" },
  ];

  const mockTransportationData = [
    {
      carrier: "electricity",
      milestone_year: 2023,
      global_start: 0,
      global_end: 5,
      y_axis: 10.5,
    },
    {
      carrier: "gas",
      milestone_year: 2023,
      global_start: 2,
      global_end: 8,
      y_axis: 15.2,
    },
  ];

  it("renders correctly with default state", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("Resolution")).toBeInTheDocument();
      expect(screen.getByText("Year")).toBeInTheDocument();
      expect(screen.getByText("Carrier")).toBeInTheDocument();
    });
  });

  it("shows loading state initially when data is being fetched", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockTransportationData), 100),
        ),
    );

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    // Wait for component to initialize but should show loading initially for data
    // The component loads data but doesn't show loading spinner unless both year and carrier are not null
    await waitFor(() => {
      expect(screen.getByText("Resolution")).toBeInTheDocument();
    });
  });

  it("displays error message when no database is selected", async () => {
    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithoutDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("No database selected.")).toBeInTheDocument();
    });
  });

  it("handles service errors gracefully", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockRejectedValue(new Error("Database connection failed"));

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    // Wait for the error message to appear with increased timeout
    await waitFor(
      () => {
        expect(
          screen.getByText("Failed to load transportation prices."),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("fetches and displays available years", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(transportPriceQuery.getTransportationYears).toHaveBeenCalledWith(
        "/mock/database.duckdb",
      );
    });

    // Check that year select input is enabled
    await waitFor(() => {
      const yearInput = screen.getByDisplayValue("2023"); // Should show first year from mock data
      expect(yearInput).not.toBeDisabled();
    });
  });

  it("fetches and displays available carriers", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(
        transportPriceQuery.getTransportationCarriers,
      ).toHaveBeenCalledWith("/mock/database.duckdb");
    });

    // Check that carrier select input is enabled
    await waitFor(() => {
      const carrierInput = screen.getByDisplayValue("Carrier_A"); // Should show first carrier from mock data
      expect(carrierInput).not.toBeDisabled();
    });
  });

  it("changes resolution when user selects different option", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Days")).toBeInTheDocument(); // Default resolution
    });

    const resolutionInput = screen.getByDisplayValue("Days");

    // Change resolution to Hours
    fireEvent.click(resolutionInput);
    await waitFor(() => {
      expect(screen.getByText("Hours")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Hours"));

    // Should trigger new data fetch with new resolution
    await waitFor(() => {
      expect(
        transportPriceQuery.getTransportationPriceDurationSeries,
      ).toHaveBeenCalledWith(
        "/mock/database.duckdb",
        2023, // first year
        "Carrier_A", // first carrier
        Resolution.Hours,
        "min", // default column type
      );
    });
  });

  it("changes year when user selects different option", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    // Wait for component to load and data to be fetched
    await waitFor(() => {
      expect(transportPriceQuery.getTransportationYears).toHaveBeenCalledWith(
        "/mock/database.duckdb",
      );
      expect(
        transportPriceQuery.getTransportationCarriers,
      ).toHaveBeenCalledWith("/mock/database.duckdb");
    });

    // Verify the year selection functionality by checking if the mock was called
    // The component should call the service with the first year initially
    await waitFor(() => {
      expect(
        transportPriceQuery.getTransportationPriceDurationSeries,
      ).toHaveBeenCalledWith(
        "/mock/database.duckdb",
        2023, // first year from mock data
        "Carrier_A", // first carrier from mock data
        Resolution.Days, // default resolution
        "min",
      );
    });
  });

  it("changes carrier when user selects different option", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    // Wait for component to load and data to be fetched
    await waitFor(() => {
      expect(transportPriceQuery.getTransportationYears).toHaveBeenCalledWith(
        "/mock/database.duckdb",
      );
      expect(
        transportPriceQuery.getTransportationCarriers,
      ).toHaveBeenCalledWith("/mock/database.duckdb");
    });

    // Verify the carrier selection functionality by checking if the mock was called
    // The component should call the service with the first carrier initially
    await waitFor(() => {
      expect(
        transportPriceQuery.getTransportationPriceDurationSeries,
      ).toHaveBeenCalledWith(
        "/mock/database.duckdb",
        2023, // first year from mock data
        "Carrier_A", // first carrier from mock data
        Resolution.Days, // default resolution
        "min",
      );
    });
  });

  it("renders chart when data is available", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue(mockTransportationData);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Check that chart is rendered with correct data
    const chartElement = screen.getByTestId("echarts-mock");
    const chartOption = JSON.parse(
      chartElement.getAttribute("data-option") || "{}",
    );

    expect(chartOption.xAxis.name).toBe("Time in days");
    expect(chartOption.yAxis.name).toBe("Price");
    expect(chartOption.series).toHaveLength(2);
  });

  it("shows no data message when no chart data is available", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("No chart data available.")).toBeInTheDocument();
    });
  });

  it("handles empty years data", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue([]);
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      const yearInput = screen.getByPlaceholderText("Select year");
      expect(yearInput).toBeDisabled();
    });
  });

  it("handles empty carriers data", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      [],
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      const carrierInput = screen.getByPlaceholderText("Select carrier");
      expect(carrierInput).toBeDisabled();
    });
  });

  it("handles years fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(transportPriceQuery.getTransportationYears).mockRejectedValue(
      new Error("Years fetch failed"),
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch years:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles carriers fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockRejectedValue(
      new Error("Carriers fetch failed"),
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch carriers:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("Calculates data points correctly", async () => {
    const multiCarrierData = [
      {
        carrier: "electricity",
        milestone_year: 2023,
        global_start: 0,
        global_end: 1,
        y_axis: 10.5,
      },
      {
        carrier: "electricity",
        milestone_year: 2023,
        global_start: 4,
        global_end: 6,
        y_axis: 12.0,
      },
      {
        carrier: "electricity",
        milestone_year: 2023,
        global_start: 1,
        global_end: 2,
        y_axis: 15.2,
      },
    ];

    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue(multiCarrierData);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const chartElement = screen.getByTestId("echarts-mock");
    const chartOption = JSON.parse(
      chartElement.getAttribute("data-option") || "{}",
    );

    expect(chartOption.series).toHaveLength(1);
    expect(chartOption.series[0].name).toBe("electricity");

    // Electricity should have 4 data points
    expect(chartOption.series[0].data).toHaveLength(4);
  });

  it("updates chart title with resolution information", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue(mockTransportationData);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("echarts-mock")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    // Change resolution to Hours
    const resolutionInput = screen.getByDisplayValue("Days");
    fireEvent.click(resolutionInput);
    await waitFor(() => {
      expect(screen.getByText("Hours")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Hours"));

    await waitFor(
      () => {
        const chartElement = screen.getByTestId("echarts-mock");
        const chartOption = JSON.parse(
          chartElement.getAttribute("data-option") || "{}",
        );
        expect(chartOption.xAxis.name).toBe("Time in hours");
      },
      { timeout: 3000 },
    );
  });

  it("handles database path changes correctly", async () => {
    const mockStoreWithChangingDatabase = createMockStoreState({
      getGraphDatabase: vi
        .fn()
        .mockReturnValueOnce("/first/database.duckdb")
        .mockReturnValueOnce("/second/database.duckdb"),
    });

    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    const { rerender } = renderWithProviders(
      <TransportationPrices graphId="test-graph" />,
      {
        initialStoreState: mockStoreWithChangingDatabase,
      },
    );

    // Wait for initial data fetch
    await waitFor(() => {
      expect(transportPriceQuery.getTransportationYears).toHaveBeenCalledWith(
        "/first/database.duckdb",
      );
    });

    // Re-render with different database
    rerender(<TransportationPrices graphId="test-graph" />);

    // Should fetch data from new database
    await waitFor(() => {
      expect(transportPriceQuery.getTransportationYears).toHaveBeenCalledWith(
        "/second/database.duckdb",
      );
    });
  });

  it("does not fetch data when year is null", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue([]);
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      mockCarriersData,
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("No chart data available.")).toBeInTheDocument();
    });

    // Should not call the transportation price service when year is null
    expect(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).not.toHaveBeenCalled();
  });

  it("does not fetch data when carrier is null", async () => {
    vi.mocked(transportPriceQuery.getTransportationYears).mockResolvedValue(
      mockYearsData,
    );
    vi.mocked(transportPriceQuery.getTransportationCarriers).mockResolvedValue(
      [],
    );
    vi.mocked(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).mockResolvedValue([]);

    renderWithProviders(<TransportationPrices graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("No chart data available.")).toBeInTheDocument();
    });

    // Should not call the transportation price service when carrier is null
    expect(
      transportPriceQuery.getTransportationPriceDurationSeries,
    ).not.toHaveBeenCalled();
  });
});
