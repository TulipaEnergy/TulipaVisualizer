import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProductionPriceDurationSeries,
  getProductionYears,
  type ProductionPriceDurationSeriesRow,
  type YearJson,
} from "../productionPriceQuery";
import { Resolution } from "../../types/resolution";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
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

    it("should fetch production price data for yearly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 50.5,
        },
        {
          asset: "solar_plant_1",
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
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          resolution: "years_table",
          year: mockYear,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for hourly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 52.1,
        },
        {
          asset: "wind_farm_1",
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
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for daily resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "solar_plant_1",
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
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "days_table",
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for weekly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
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
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "weeks_table",
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch production price data for monthly resolution", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
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
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "months_table",
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
      );

      expect(result).toEqual([]);
    });

    it("should handle production price data with zero values", async () => {
      const mockDataWithZeros: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 0,
        },
        {
          asset: "solar_plant_1",
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
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle production price data with negative values", async () => {
      const mockDataWithNegatives: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
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
        ),
      ).rejects.toThrow("Database connection failed");

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
        },
      );
    });

    it("should handle year not found errors", async () => {
      const mockError = new Error("Year not found in database");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getProductionPriceDurationSeries(mockDbPath, Resolution.Years, 1999),
      ).rejects.toThrow("Year not found in database");
    });

    it("should handle assets with special characters", async () => {
      const mockData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm-1@location_2",
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
      );

      expect(result).toEqual(mockData);
    });
  });

  describe("getProductionYears", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should fetch available production years successfully", async () => {
      const mockYearData: YearJson[] = [
        { year: 2020 },
        { year: 2021 },
        { year: 2022 },
        { year: 2023 },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockYearData);

      const result = await getProductionYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_production_years", {
        dbPath: mockDbPath,
      });
      expect(result).toEqual(mockYearData);
    });

    it("should handle empty years list", async () => {
      const mockEmptyYearData: YearJson[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyYearData);

      const result = await getProductionYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_production_years", {
        dbPath: mockDbPath,
      });
      expect(result).toEqual([]);
    });

    it("should handle single year", async () => {
      const mockSingleYearData: YearJson[] = [{ year: 2023 }];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSingleYearData);

      const result = await getProductionYears(mockDbPath);

      expect(result).toEqual(mockSingleYearData);
    });

    it("should handle unsorted years", async () => {
      const mockUnsortedYearData: YearJson[] = [
        { year: 2022 },
        { year: 2020 },
        { year: 2023 },
        { year: 2021 },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockUnsortedYearData);

      const result = await getProductionYears(mockDbPath);

      // Function returns data as received from database
      expect(result).toEqual(mockUnsortedYearData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getProductionYears(mockDbPath)).rejects.toThrow(
        "Database query failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_production_years", {
        dbPath: mockDbPath,
      });
    });

    it("should handle database not found errors", async () => {
      const mockError = new Error("Database file not found");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getProductionYears("/nonexistent/path.duckdb"),
      ).rejects.toThrow("Database file not found");
    });

    it("should handle malformed year data", async () => {
      // Test with unexpected data structure
      const mockMalformedData = [
        { year: 2020 },
        { invalid_field: "not_a_year" },
        { year: null },
      ] as any as YearJson[];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockMalformedData);

      const result = await getProductionYears(mockDbPath);

      // Function returns data as received, type safety is handled by TypeScript
      expect(result).toEqual(mockMalformedData);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years and price data", async () => {
      const mockDbPath = "/path/to/test.duckdb";

      // Mock available years
      const mockYearData: YearJson[] = [{ year: 2022 }, { year: 2023 }];

      // Mock production price data
      const mockPriceData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 50.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockYearData)
        .mockResolvedValueOnce(mockPriceData);

      // Execute workflow
      const availableYears = await getProductionYears(mockDbPath);
      const latestYear = Math.max(...availableYears.map((y) => y.year));
      const priceData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        latestYear,
      );

      expect(availableYears).toEqual(mockYearData);
      expect(latestYear).toBe(2023);
      expect(priceData).toEqual(mockPriceData);
    });

    it("should handle workflow when no data is available", async () => {
      const mockDbPath = "/path/to/empty.duckdb";

      // Mock empty years and price data
      const mockEmptyYears: YearJson[] = [];
      const mockEmptyPriceData: ProductionPriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockEmptyYears)
        .mockResolvedValueOnce(mockEmptyPriceData);

      const availableYears = await getProductionYears(mockDbPath);
      const priceData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        2023,
      );

      expect(availableYears).toEqual([]);
      expect(priceData).toEqual([]);
    });

    it("should handle different resolutions for same year", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;

      const mockHourlyData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 52.1,
        },
      ];

      const mockYearlyData: ProductionPriceDurationSeriesRow[] = [
        {
          asset: "wind_farm_1",
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
      );
      const yearlyData = await getProductionPriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        testYear,
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
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        2,
        "get_production_price_resolution",
        {
          dbPath: mockDbPath,
          resolution: "years_table",
          year: testYear,
        },
      );
    });
  });
});
