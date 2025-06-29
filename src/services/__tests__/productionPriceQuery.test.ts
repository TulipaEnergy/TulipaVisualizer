import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProductionPriceDurationSeries,
  type ProductionPriceDurationSeriesRow,
} from "../productionPriceQuery";
import { Resolution } from "../../types/resolution";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
}));

// Mock the metadata module
vi.mock("../metadata", () => ({
  hasMetadata: vi.fn(() => Promise.resolve(false)),
}));

// Mock the resolution module
vi.mock("../../types/resolution", () => ({
  Resolution: {
    Hours: "hours",
    Days: "days",
    Weeks: "weeks",
    Months: "months",
    Years: "years",
  },
  resolutionToTable: {
    hours: "hours_table",
    days: "days_table",
    weeks: "weeks_table",
    months: "months_table",
    years: "years_table",
  },
}));

// Import mocked functions
import { genericApacheIPC } from "../../gateway/db";

describe("Production Price Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getProductionPriceDurationSeries", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockYear = 2023;
    const mockCarrier = "electricity";

    it("should fetch production price data for yearly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 50.5,
        },
        {
          asset: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 45.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          resolution: "years_table",
          year: mockYear,
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for hourly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 52.1,
        },
        {
          asset: "gas",
          milestone_year: 2023,
          global_start: 1,
          global_end: 2,
          y_axis: 48.9,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for daily resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 24,
          y_axis: 47.3,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "days_table",
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for weekly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "hydrogen",
          milestone_year: 2023,
          global_start: 0,
          global_end: 168,
          y_axis: 49.8,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Weeks,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "weeks_table",
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for monthly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "hydrogen",
          milestone_year: 2023,
          global_start: 0,
          global_end: 744,
          y_axis: 51.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Months,
        mockYear,
        "all",
        {},
        [],
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "months_table",
          carrier: "all",
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should throw error for invalid resolution", async () => {
      const invalidResolution = "invalid_resolution" as Resolution;

      await expect(
        getProductionPriceDurationSeries(
          mockDbPath,
          invalidResolution,
          mockYear,
          mockCarrier,
          {},
          [],
        ),
      ).rejects.toThrow(
        "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
      );

      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle empty production price data", async () => {
      const mockEmptyData: ProductionPriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(result).toEqual([]);
    });

    it("should handle production price data with zero values", async () => {
      const mockDataWithZeros: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 0,
        },
        {
          asset: "gas",
          milestone_year: 2023,
          global_start: 1,
          global_end: 2,
          y_axis: 0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle production price data with negative values", async () => {
      const mockDataWithNegatives: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: -10.5, // Negative price (rare but possible)
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithNegatives);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockCarrier,
        {},
        [],
      );

      expect(result).toEqual(mockDataWithNegatives);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getProductionPriceDurationSeries(
          mockDbPath,
          Resolution.Hours,
          mockYear,
          mockCarrier,
          {},
          [],
        ),
      ).rejects.toThrow("Database connection failed");

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
    });

    it("should handle year not found errors", async () => {
      const mockError = new Error("Year not found in database");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getProductionPriceDurationSeries(
          mockDbPath,
          Resolution.Years,
          1999,
          mockCarrier,
          {},
          [],
        ),
      ).rejects.toThrow("Year not found in database");
    });

    it("should handle assets with special characters", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind@2",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 50.5,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        "wind@2",
        {},
        [],
      );

      expect(result).toEqual(mockData);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years and price data", async () => {
      const mockDbPath = "/path/to/test.duckdb";

      // Mock production price data
      const mockPriceData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 50.5,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockPriceData);

      // Execute workflow
      const latestYear = 2023;
      const priceData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        latestYear,
        "wind",
        {},
        [],
      );

      expect(latestYear).toBe(2023);
      expect(priceData).toEqual(mockPriceData);
    });

    it("should handle workflow when no data is available", async () => {
      const mockDbPath = "/path/to/empty.duckdb";

      // Mock empty years and price data
      const mockEmptyPriceData: ProductionPriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyPriceData);

      const priceData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        2023,
        "wind",
        {},
        [],
      );

      expect(priceData).toEqual([]);
    });

    it("should handle different resolutions for same year", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const mockCarrier = "wind";

      const mockHourlyData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 52.1,
        },
      ];

      const mockYearlyData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 50.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockHourlyData)
        .mockResolvedValueOnce(mockYearlyData);

      // Test different resolutions
      const hourlyData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        testYear,
        mockCarrier,
        {},
        [],
      );
      const yearlyData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        testYear,
        mockCarrier,
        {},
        [],
      );

      expect(hourlyData).toEqual(mockHourlyData);
      expect(yearlyData).toEqual(mockYearlyData);

      // Verify correct endpoints were called
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        1,
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: testYear,
          resolution: "hours_table",
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        2,
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          resolution: "years_table",
          year: testYear,
          carrier: mockCarrier,
          filters: {},
          grouper: [],
          enableMetadata: false,
        },
      );
    });
  });
});
