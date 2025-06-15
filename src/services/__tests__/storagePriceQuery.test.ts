import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoragePriceDurationSeries,
  getStorageYears,
  type StoragePriceDurationSeriesRow,
  type YearJson,
} from "../storagePriceQuery";
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

describe("Storage Price Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getStoragePriceDurationSeries", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockYear = 2023;
    const mockStorageType = "battery";

    it("should fetch storage price data for yearly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 120.5,
        },
        {
          asset: "pumped_hydro_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 85.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        mockYear,
        mockStorageType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "years_table",
          storageType: mockStorageType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for hourly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 125.1,
        },
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 1,
          global_end: 2,
          y_axis: 118.9,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          storageType: mockStorageType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for daily resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "pumped_hydro_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 24,
          y_axis: 87.3,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockStorageType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "days_table",
          storageType: mockStorageType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for weekly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 168,
          y_axis: 119.8,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Weeks,
        mockYear,
        mockStorageType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "weeks_table",
          storageType: mockStorageType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for monthly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "compressed_air_storage_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 744,
          y_axis: 95.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Months,
        mockYear,
        mockStorageType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "months_table",
          storageType: mockStorageType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should throw error for invalid resolution", async () => {
      const invalidResolution = "invalid_resolution" as Resolution;

      await expect(
        getStoragePriceDurationSeries(
          mockDbPath,
          invalidResolution,
          mockYear,
          mockStorageType,
        ),
      ).rejects.toThrow(
        "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
      );

      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle empty storage price data", async () => {
      const mockEmptyData: StoragePriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(result).toEqual([]);
    });

    it("should handle storage price data with zero values", async () => {
      const mockDataWithZeros: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle storage price data with negative values", async () => {
      const mockDataWithNegatives: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: -15.5, // Negative storage price (possible in some scenarios)
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithNegatives);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(result).toEqual(mockDataWithNegatives);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getStoragePriceDurationSeries(
          mockDbPath,
          Resolution.Hours,
          mockYear,
          mockStorageType,
        ),
      ).rejects.toThrow("Database connection failed");

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          storageType: mockStorageType,
        },
      );
    });

    it("should handle year not found errors", async () => {
      const mockError = new Error("Year not found in database");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getStoragePriceDurationSeries(
          mockDbPath,
          Resolution.Years,
          1999,
          mockStorageType,
        ),
      ).rejects.toThrow("Year not found in database");
    });

    it("should handle assets with special characters", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery-1@location_2",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 120.5,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(result).toEqual(mockData);
    });

    it("should handle multiple storage assets", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 120.5,
        },
        {
          asset: "pumped_hydro_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 85.2,
        },
        {
          asset: "compressed_air_storage_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 95.0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockStorageType,
      );

      expect(result).toEqual(mockData);
    });
  });

  describe("getStorageYears", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should fetch available storage years successfully", async () => {
      const mockYearData: YearJson[] = [
        { year: 2020 },
        { year: 2021 },
        { year: 2022 },
        { year: 2023 },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockYearData);

      const result = await getStorageYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_storage_years", {
        dbPath: mockDbPath,
      });
      expect(result).toEqual(mockYearData);
    });

    it("should handle empty years list", async () => {
      const mockEmptyYearData: YearJson[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyYearData);

      const result = await getStorageYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_storage_years", {
        dbPath: mockDbPath,
      });
      expect(result).toEqual([]);
    });

    it("should handle single year", async () => {
      const mockSingleYearData: YearJson[] = [{ year: 2023 }];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSingleYearData);

      const result = await getStorageYears(mockDbPath);

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

      const result = await getStorageYears(mockDbPath);

      // Function returns data as received from database
      expect(result).toEqual(mockUnsortedYearData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getStorageYears(mockDbPath)).rejects.toThrow(
        "Database query failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_storage_years", {
        dbPath: mockDbPath,
      });
    });

    it("should handle database not found errors", async () => {
      const mockError = new Error("Database file not found");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getStorageYears("/nonexistent/path.duckdb")).rejects.toThrow(
        "Database file not found",
      );
    });

    it("should handle malformed year data", async () => {
      // Test with unexpected data structure
      const mockMalformedData = [
        { year: 2020 },
        { invalid_field: "not_a_year" },
        { year: null },
      ] as any as YearJson[];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockMalformedData);

      const result = await getStorageYears(mockDbPath);

      // Function returns data as received, type safety is handled by TypeScript
      expect(result).toEqual(mockMalformedData);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years and storage price data", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockStorageType = "battery";

      // Mock available years
      const mockYearData: YearJson[] = [{ year: 2022 }, { year: 2023 }];

      // Mock storage price data
      const mockPriceData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 120.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockYearData)
        .mockResolvedValueOnce(mockPriceData);

      // Execute workflow
      const availableYears = await getStorageYears(mockDbPath);
      const latestYear = Math.max(...availableYears.map((y) => y.year));
      const priceData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        latestYear,
        mockStorageType,
      );

      expect(availableYears).toEqual(mockYearData);
      expect(latestYear).toBe(2023);
      expect(priceData).toEqual(mockPriceData);
    });

    it("should handle workflow when no data is available", async () => {
      const mockDbPath = "/path/to/empty.duckdb";
      const mockStorageType = "battery";

      // Mock empty years and price data
      const mockEmptyYears: YearJson[] = [];
      const mockEmptyPriceData: StoragePriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockEmptyYears)
        .mockResolvedValueOnce(mockEmptyPriceData);

      const availableYears = await getStorageYears(mockDbPath);
      const priceData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        2023,
        mockStorageType,
      );

      expect(availableYears).toEqual([]);
      expect(priceData).toEqual([]);
    });

    it("should handle different resolutions for same year", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testStorageType = "battery";

      const mockHourlyData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 125.1,
        },
      ];

      const mockYearlyData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "battery_1",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 120.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockHourlyData)
        .mockResolvedValueOnce(mockYearlyData);

      // Test different resolutions
      const hourlyData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        testYear,
        testStorageType,
      );
      const yearlyData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        testYear,
        testStorageType,
      );

      expect(hourlyData).toEqual(mockHourlyData);
      expect(yearlyData).toEqual(mockYearlyData);

      // Verify correct endpoints were called
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        1,
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: testYear,
          resolution: "hours_table",
          storageType: testStorageType,
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        2,
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: testYear,
          resolution: "years_table",
          storageType: testStorageType,
        },
      );
    });

    it("should handle comparison between different storage technologies", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testStorageType = "battery";

      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          asset: "lithium_battery",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 150.0,
        },
        {
          asset: "pumped_hydro",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 80.0,
        },
        {
          asset: "compressed_air",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 95.0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const priceData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        testYear,
        testStorageType,
      );

      expect(priceData).toEqual(mockData);

      // Verify we get data for multiple storage technologies
      const technologies = priceData.map((item) => item.asset);
      expect(technologies).toContain("lithium_battery");
      expect(technologies).toContain("pumped_hydro");
      expect(technologies).toContain("compressed_air");
    });
  });
});
