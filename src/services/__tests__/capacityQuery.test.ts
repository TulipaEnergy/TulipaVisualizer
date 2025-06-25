import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCapacity } from "../capacityQuery";

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

describe("Capacity Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getCapacity", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockFilters: Record<number, number[]> = {
      1: [10, 20],
      2: [30, 40],
    };
    const mockGrouper: number[] = [1, 2];

    it("should fetch capacity data successfully with metadata enabled", async () => {
      const mockCapacityData = [
        {
          asset: "wind_farm_1",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          asset: "wind_farm_1",
          year: 2021,
          investment: 50,
          decommission: 10,
          initial_capacity: 150,
          final_capacity: 190,
        },
        {
          asset: "solar_plant_1",
          year: 2020,
          investment: 200,
          decommission: 0,
          initial_capacity: 100,
          final_capacity: 300,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should fetch capacity data successfully with metadata disabled", async () => {
      const mockCapacityData = [
        {
          asset: "wind_farm_1",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(false);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: false,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle empty filters and grouper", async () => {
      const emptyFilters: Record<number, number[]> = {};
      const emptyGrouper: number[] = [];
      const mockCapacityData = [
        {
          asset: "all_assets",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, emptyFilters, emptyGrouper);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: emptyFilters,
        grouper: emptyGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle single filter category", async () => {
      const singleFilter: Record<number, number[]> = { 1: [10] };
      const mockCapacityData = [
        {
          asset: "filtered_asset",
          year: 2020,
          investment: 50,
          decommission: 0,
          initial_capacity: 25,
          final_capacity: 75,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, singleFilter, []);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: singleFilter,
        grouper: [],
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle single grouper", async () => {
      const singleGrouper: number[] = [1];
      const mockCapacityData = [
        {
          asset: "Technology A",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          asset: "Technology B",
          year: 2020,
          investment: 200,
          decommission: 50,
          initial_capacity: 100,
          final_capacity: 250,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, {}, singleGrouper);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: {},
        grouper: singleGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle empty capacity data", async () => {
      const mockEmptyData: any[] = [];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(result).toEqual([]);
    });

    it("should handle complex filters with multiple categories and values", async () => {
      const complexFilters: Record<number, number[]> = {
        1: [10, 20, 30],
        2: [40, 50],
        3: [60],
      };
      const complexGrouper: number[] = [1, 2, 3];
      const mockCapacityData = [
        {
          asset: "Complex Group A",
          year: 2020,
          investment: 300,
          decommission: 50,
          initial_capacity: 200,
          final_capacity: 450,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(
        mockDbPath,
        complexFilters,
        complexGrouper,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: complexFilters,
        grouper: complexGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle capacity data with zero and negative values", async () => {
      const mockDataWithZeros = [
        {
          asset: "zero_asset",
          year: 2020,
          investment: 0,
          decommission: 0,
          initial_capacity: 0,
          final_capacity: 0,
        },
        {
          asset: "negative_asset",
          year: 2021,
          investment: -10, // Negative investment (correction)
          decommission: 50,
          initial_capacity: 100,
          final_capacity: 40,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle multiple years of data", async () => {
      const mockMultiYearData = [
        {
          asset: "multi_year_asset",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          asset: "multi_year_asset",
          year: 2021,
          investment: 50,
          decommission: 10,
          initial_capacity: 150,
          final_capacity: 190,
        },
        {
          asset: "multi_year_asset",
          year: 2022,
          investment: 0,
          decommission: 20,
          initial_capacity: 190,
          final_capacity: 170,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockMultiYearData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(result).toEqual(mockMultiYearData);
    });

    it("should handle hasMetadata errors gracefully", async () => {
      const mockError = new Error("Metadata check failed");
      vi.mocked(hasMetadata).mockRejectedValueOnce(mockError);

      await expect(
        getCapacity(mockDbPath, mockFilters, mockGrouper),
      ).rejects.toThrow("Metadata check failed");

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getCapacity(mockDbPath, mockFilters, mockGrouper),
      ).rejects.toThrow("Database connection failed");

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
    });

    it("should handle database not found errors", async () => {
      const mockError = new Error("Database file not found");
      vi.mocked(hasMetadata).mockRejectedValueOnce(mockError);

      await expect(
        getCapacity("/nonexistent/path.duckdb", mockFilters, mockGrouper),
      ).rejects.toThrow("Database file not found");
    });

    it("should pass different metadata states correctly", async () => {
      // Test metadata enabled
      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce([]);

      await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });

      // Reset mocks
      vi.resetAllMocks();

      // Test metadata disabled
      vi.mocked(hasMetadata).mockResolvedValueOnce(false);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce([]);

      await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(genericApacheIPC).toHaveBeenLastCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: false,
      });
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with filters and grouping", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockFilters: Record<number, number[]> = { 1: [10, 20] };
      const mockGrouper: number[] = [1];

      const mockCapacityData = [
        {
          asset: "Technology A",
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          asset: "Technology B",
          year: 2020,
          investment: 200,
          decommission: 25,
          initial_capacity: 100,
          final_capacity: 275,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(hasMetadata).toHaveBeenCalledWith(mockDbPath);
      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        filters: mockFilters,
        grouper: mockGrouper,
        enableMetadata: true,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle workflow when no data matches filters", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockFilters: Record<number, number[]> = { 999: [9999] }; // Non-existent filter
      const mockGrouper: number[] = [];

      const mockEmptyCapacityData: any[] = [];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyCapacityData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(result).toEqual([]);
    });

    it("should handle workflow with grouping but no filters", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockFilters: Record<number, number[]> = {};
      const mockGrouper: number[] = [1, 2];

      const mockGroupedData = [
        {
          asset: "Group A",
          year: 2020,
          investment: 300,
          decommission: 50,
          initial_capacity: 200,
          final_capacity: 450,
        },
        {
          asset: "Group B",
          year: 2020,
          investment: 150,
          decommission: 25,
          initial_capacity: 100,
          final_capacity: 225,
        },
      ];

      vi.mocked(hasMetadata).mockResolvedValueOnce(true);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockGroupedData);

      const result = await getCapacity(mockDbPath, mockFilters, mockGrouper);

      expect(result).toEqual(mockGroupedData);
    });
  });
});
