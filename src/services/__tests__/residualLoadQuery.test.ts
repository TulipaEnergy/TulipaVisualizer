import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSupply, SupplyRow } from "../residualLoadQuery";
import { Resolution } from "../../types/resolution";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
}));

// Mock the metadata service
vi.mock("../metadata", () => ({
  hasMetadata: vi.fn(),
}));

// Import mocked functions
import { genericApacheIPC } from "../../gateway/db";
import { hasMetadata } from "../metadata";

describe("Residual Load Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getSupply", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockYear = 2020;
    const mockFilters = { 1: [1, 2], 2: [3, 4] };
    const mockGrouper = [1, 2];

    const mockSupplyData: SupplyRow[] = [
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
    ];

    it("should fetch supply data successfully with metadata enabled", async () => {
      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSupplyData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 24, // Resolution.Days maps to 24
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockSupplyData);
    });

    it("should fetch supply data successfully with metadata disabled", async () => {
      vi.mocked(hasMetadata).mockResolvedValueOnce(false);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSupplyData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 1, // Resolution.Hours maps to 1
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: false,
      });
      expect(result).toEqual(mockSupplyData);
    });

    it("should handle different resolution types correctly", async () => {
      vi.mocked(hasMetadata).mockResolvedValue(true);
      vi.mocked(genericApacheIPC).mockResolvedValue(mockSupplyData);

      // Test Hours resolution
      await getSupply(mockDbPath, Resolution.Hours, mockYear, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 1,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });

      // Test Weeks resolution
      await getSupply(mockDbPath, Resolution.Weeks, mockYear, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 168, // Resolution.Weeks maps to 168
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });

      // Test Months resolution
      await getSupply(mockDbPath, Resolution.Months, mockYear, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 720, // Resolution.Months maps to 720
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });

      // Test Years resolution
      await getSupply(mockDbPath, Resolution.Years, mockYear, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 8760, // Resolution.Years maps to 8760
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
    });

    it("should throw error for invalid resolution", async () => {
      const invalidResolution = "invalid" as Resolution;

      await expect(
        getSupply(mockDbPath, invalidResolution, mockYear, mockFilters, mockGrouper),
      ).rejects.toThrow(
        "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
      );

      // Should not call any IPC functions when resolution is invalid
      expect(hasMetadata).not.toHaveBeenCalled();
      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle empty supply data", async () => {
      const mockEmptyData: SupplyRow[] = [];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(result).toEqual([]);
    });

    it("should handle empty filters and grouper", async () => {
      const emptyFilters = {};
      const emptyGrouper: number[] = [];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSupplyData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        emptyFilters,
        emptyGrouper,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 24,
        filters: emptyFilters,
        grouper: emptyGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockSupplyData);
    });

    it("should handle complex filter structures", async () => {
      const complexFilters = {
        1: [1, 2, 3, 4, 5],
        2: [10, 20],
        3: [100],
        4: [],
      };
      const complexGrouper = [1, 2, 3, 4, 5, 6];

      vi.mocked(hasMetadata).mockResolvedValueOnce(false);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSupplyData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        complexFilters,
        complexGrouper,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 24,
        filters: complexFilters,
        grouper: complexGrouper,
        enableMetadata: false,
      });
      expect(result).toEqual(mockSupplyData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getSupply(mockDbPath, Resolution.Days, mockYear, mockFilters, mockGrouper),
      ).rejects.toThrow("Database connection failed");

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: mockYear,
        resolution: 24,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
    });

    it("should handle hasMetadata errors gracefully", async () => {
      const mockError = new Error("Failed to check metadata");
      vi.mocked(hasMetadata).mockRejectedValueOnce(mockError);

      await expect(
        getSupply(mockDbPath, Resolution.Days, mockYear, mockFilters, mockGrouper),
      ).rejects.toThrow("Failed to check metadata");

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle edge case years", async () => {
      vi.mocked(hasMetadata).mockResolvedValue(true);
      vi.mocked(genericApacheIPC).mockResolvedValue(mockSupplyData);

      // Test very early year
      await getSupply(mockDbPath, Resolution.Days, 1900, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: 1900,
        resolution: 24,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });

      // Test future year
      await getSupply(mockDbPath, Resolution.Days, 2050, mockFilters, mockGrouper);
      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_supply", {
        dbPath: mockDbPath,
        year: 2050,
        resolution: 24,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
    });

    it("should handle supply data with zero and negative values", async () => {
      const mockDataWithZeros: SupplyRow[] = [
        {
          asset: "Solar",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 0,
        },
        {
          asset: "Wind",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: -50.5, // Negative supply (possible in some energy models)
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle supply data with various asset types", async () => {
      const mockVariedAssets: SupplyRow[] = [
        {
          asset: "Solar_PV_Utility",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 150.5,
        },
        {
          asset: "Wind_Offshore",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 200.75,
        },
        {
          asset: "Nuclear_Gen3",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 500.0,
        },
        {
          asset: "Gas_CCGT",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 300.25,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(false);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockVariedAssets);

      const result = await getSupply(
        mockDbPath,
        Resolution.Hours,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(result).toEqual(mockVariedAssets);
    });

    it("should handle special characters in database path", async () => {
      const specialDbPath = "/path/to/test-database_v2.1@location.duckdb";
      
      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSupplyData);

      const result = await getSupply(
        specialDbPath,
        Resolution.Days,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(hasMetadata).toHaveBeenCalledWith(specialDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_supply", {
        dbPath: specialDbPath,
        year: mockYear,
        resolution: 24,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockSupplyData);
    });

    it("should handle large time ranges correctly", async () => {
      const mockLargeTimeRange: SupplyRow[] = [
        {
          asset: "Solar",
          milestone_year: 2020,
          global_start: 0,
          global_end: 8760, // Full year in hours
          y_axis: 150.5,
        },
        {
          asset: "Wind",
          milestone_year: 2020,
          global_start: 8760,
          global_end: 17520, // Second year
          y_axis: 200.75,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockLargeTimeRange);

      const result = await getSupply(
        mockDbPath,
        Resolution.Years,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(result).toEqual(mockLargeTimeRange);
    });

    it("should preserve data type integrity", async () => {
      const mockTypedData: SupplyRow[] = [
        {
          asset: "Solar",
          milestone_year: 2020,
          global_start: 0,
          global_end: 24,
          y_axis: 150.123456789, // High precision number
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockTypedData);

      const result = await getSupply(
        mockDbPath,
        Resolution.Days,
        mockYear,
        mockFilters,
        mockGrouper,
      );

      expect(result).toEqual(mockTypedData);
      expect(typeof result[0].y_axis).toBe("number");
      expect(typeof result[0].global_start).toBe("number");
      expect(typeof result[0].global_end).toBe("number");
      expect(typeof result[0].milestone_year).toBe("number");
      expect(typeof result[0].asset).toBe("string");
    });
  });
}); 