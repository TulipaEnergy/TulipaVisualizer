import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoragePriceDurationSeries,
  type StoragePriceDurationSeriesRow,
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
    const mockCarrier = "gas";

    it("should fetch storage price data for yearly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 120.5,
        },
        {
          carrier: "gas",
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
        mockCarrier,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "years_table",
          storageType: mockStorageType,
          carrier: mockCarrier,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for hourly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 125.1,
        },
        {
          carrier: "gas",
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
        mockCarrier,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          storageType: mockStorageType,
          carrier: mockCarrier,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for daily resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "hydro",
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
        "all",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "days_table",
          storageType: mockStorageType,
          carrier: "all",
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for weekly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
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
        "all",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "weeks_table",
          storageType: mockStorageType,
          carrier: "all",
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch storage price data for monthly resolution", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "electricity",
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
        mockCarrier,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "months_table",
          storageType: mockStorageType,
          carrier: mockCarrier,
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
          mockCarrier,
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
        mockCarrier,
      );

      expect(result).toEqual([]);
    });

    it("should handle storage price data with zero values", async () => {
      const mockDataWithZeros: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
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
        mockCarrier,
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle storage price data with negative values", async () => {
      const mockDataWithNegatives: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
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
        mockCarrier,
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
          mockCarrier,
        ),
      ).rejects.toThrow("Database connection failed");

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_storage_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          resolution: "hours_table",
          storageType: mockStorageType,
          carrier: mockCarrier,
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
          mockCarrier,
        ),
      ).rejects.toThrow("Year not found in database");
    });

    it("should handle carriers with special characters", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "wind",
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
        "wind",
      );

      expect(result).toEqual(mockData);
    });

    it("should handle multiple storage carriers", async () => {
      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "wind",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 120.5,
        },
        {
          carrier: "hydrogen",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 85.2,
        },
        {
          carrier: "hydrogen",
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
        "all",
      );

      expect(result).toEqual(mockData);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years and storage price data", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockStorageType = "battery";
      const mockCarrier = "electricity";

      // Mock storage price data
      const mockPriceData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: mockCarrier,
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 120.5,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockPriceData);

      // Execute workflow
      const latestYear = 2023;
      const priceData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        latestYear,
        mockStorageType,
        mockCarrier,
      );

      expect(latestYear).toBe(2023);
      expect(priceData).toEqual(mockPriceData);
    });

    it("should handle workflow when no data is available", async () => {
      const mockDbPath = "/path/to/empty.duckdb";
      const mockStorageType = "battery";
      const mockCarrier = "gas";

      // Mock empty price data
      const mockEmptyPriceData: StoragePriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyPriceData);

      const priceData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Hours,
        2023,
        mockStorageType,
        mockCarrier,
      );

      expect(priceData).toEqual([]);
    });

    it("should handle different resolutions for same year", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testStorageType = "battery";
      const testCarrier = "gas";

      const mockHourlyData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 125.1,
        },
      ];

      const mockYearlyData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "gas",
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
        testCarrier,
      );
      const yearlyData = await getStoragePriceDurationSeries(
        mockDbPath,
        Resolution.Years,
        testYear,
        testStorageType,
        testCarrier,
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
          carrier: testCarrier,
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
          carrier: testCarrier,
        },
      );
    });

    it("should handle comparison between different storage technologies", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testStorageType = "battery";
      const testCarrier = "all";

      const mockData: StoragePriceDurationSeriesRow[] = [
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 150.0,
        },
        {
          carrier: "hydro",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 80.0,
        },
        {
          carrier: "wind",
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
        testCarrier,
      );

      expect(priceData).toEqual(mockData);

      // Verify we get data for multiple storage technologies
      const technologies = priceData.map((item) => item.carrier);
      expect(technologies).toContain("electricity");
      expect(technologies).toContain("hydro");
      expect(technologies).toContain("wind");
    });
  });
});
