import { describe, it, expect, beforeEach, vi } from "vitest";
import { Table } from "apache-arrow";
import { getCapacity, fetchAvailableYears } from "../capacityQuery";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  apacheIPC: vi.fn(),
  genericApacheIPC: vi.fn(),
}));

// Import mocked functions
import { apacheIPC, genericApacheIPC } from "../../gateway/db";

describe("Capacity Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getCapacity", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockAssetName = "wind_farm_1";

    it("should fetch capacity data successfully", async () => {
      const mockCapacityData = [
        {
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          year: 2021,
          investment: 50,
          decommission: 10,
          initial_capacity: 150,
          final_capacity: 190,
        },
        {
          year: 2022,
          investment: 0,
          decommission: 20,
          initial_capacity: 190,
          final_capacity: 170,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      const result = await getCapacity(mockDbPath, mockAssetName);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
      expect(result).toEqual(mockCapacityData);
    });

    it("should handle empty capacity data", async () => {
      const mockEmptyData: any[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getCapacity(mockDbPath, mockAssetName);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
      expect(result).toEqual([]);
    });

    it("should handle single year range", async () => {
      const mockSingleYearData = [
        {
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSingleYearData);

      const result = await getCapacity(mockDbPath, mockAssetName);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
      expect(result).toEqual(mockSingleYearData);
    });

    it("should handle assets with special characters in name", async () => {
      const specialAssetName = "wind_farm-2@location_1";
      const mockData = [
        {
          year: 2020,
          investment: 50,
          decommission: 0,
          initial_capacity: 25,
          final_capacity: 75,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getCapacity(mockDbPath, specialAssetName);

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        assetName: specialAssetName,
      });
      expect(result).toEqual(mockData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getCapacity(mockDbPath, mockAssetName)).rejects.toThrow(
        "Database connection failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_capacity", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
    });

    it("should handle asset not found errors", async () => {
      const mockError = new Error("Asset not found");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getCapacity(mockDbPath, "nonexistent_asset"),
      ).rejects.toThrow("Asset not found");
    });

    it("should handle capacity data with zero and negative values", async () => {
      const mockDataWithZeros = [
        {
          year: 2020,
          investment: 0,
          decommission: 0,
          initial_capacity: 0,
          final_capacity: 0,
        },
        {
          year: 2021,
          investment: -10, // Negative investment (correction)
          decommission: 50,
          initial_capacity: 100,
          final_capacity: 40,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getCapacity(mockDbPath, mockAssetName);

      expect(result).toEqual(mockDataWithZeros);
    });
  });

  describe("fetchAvailableYears", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockAssetName = "solar_plant_1";

    it("should fetch available years successfully", async () => {
      const mockYearData = [
        { year: 2020 },
        { year: 2021 },
        { year: 2022 },
        { year: 2023 },
      ];

      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockYearData),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await fetchAvailableYears(mockDbPath, mockAssetName);

      expect(apacheIPC).toHaveBeenCalledWith("get_available_years", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
      expect(result).toEqual([2020, 2021, 2022, 2023]);
    });

    it("should handle empty years list", async () => {
      const mockEmptyYearData: any[] = [];

      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockEmptyYearData),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await fetchAvailableYears(mockDbPath, mockAssetName);

      expect(apacheIPC).toHaveBeenCalledWith("get_available_years", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
      expect(result).toEqual([]);
    });

    it("should handle single year", async () => {
      const mockSingleYearData = [{ year: 2020 }];

      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockSingleYearData),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await fetchAvailableYears(mockDbPath, mockAssetName);

      expect(result).toEqual([2020]);
    });

    it("should handle unsorted years and return them in correct order", async () => {
      const mockUnsortedYearData = [
        { year: 2022 },
        { year: 2020 },
        { year: 2023 },
        { year: 2021 },
      ];

      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockUnsortedYearData),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await fetchAvailableYears(mockDbPath, mockAssetName);

      // The function extracts years as they come from the database
      // It doesn't sort them, so we expect the original order
      expect(result).toEqual([2022, 2020, 2023, 2021]);
    });

    it("should handle IPC errors and re-throw them", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        fetchAvailableYears(mockDbPath, mockAssetName),
      ).rejects.toThrow("Database query failed");

      expect(apacheIPC).toHaveBeenCalledWith("get_available_years", {
        dbPath: mockDbPath,
        assetName: mockAssetName,
      });
    });

    it("should handle asset not found scenarios", async () => {
      const mockError = new Error("Asset not found");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        fetchAvailableYears(mockDbPath, "nonexistent_asset"),
      ).rejects.toThrow("Asset not found");
    });

    it("should handle table conversion errors", async () => {
      const mockTable = {
        toArray: vi.fn().mockImplementation(() => {
          throw new Error("Table conversion failed");
        }),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      await expect(
        fetchAvailableYears(mockDbPath, mockAssetName),
      ).rejects.toThrow("Table conversion failed");
    });

    it("should handle malformed year data gracefully", async () => {
      // Test with data that has unexpected structure
      const mockMalformedData = [
        { year: 2020 },
        { year: null }, // Invalid year
        { year: 2021 },
        { invalid_field: "not_a_year" }, // Missing year field
      ];

      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockMalformedData),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await fetchAvailableYears(mockDbPath, mockAssetName);

      // The function will extract years as they are, including null/undefined
      expect(result).toEqual([2020, null, 2021, undefined]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with available years and capacity data", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockAssetName = "test_asset";

      // Mock available years
      const mockYearData = [{ year: 2020 }, { year: 2021 }];
      const mockTable = {
        toArray: vi.fn().mockReturnValue(mockYearData),
      } as any as Table<any>;

      // Mock capacity data
      const mockCapacityData = [
        {
          year: 2020,
          investment: 100,
          decommission: 0,
          initial_capacity: 50,
          final_capacity: 150,
        },
        {
          year: 2021,
          investment: 50,
          decommission: 10,
          initial_capacity: 150,
          final_capacity: 190,
        },
      ];

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCapacityData);

      // Execute workflow
      const availableYears = await fetchAvailableYears(
        mockDbPath,
        mockAssetName,
      );
      const capacityData = await getCapacity(mockDbPath, mockAssetName);

      expect(availableYears).toEqual([2020, 2021]);
      expect(capacityData).toEqual(mockCapacityData);
    });

    it("should handle workflow when asset has no data", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockAssetName = "empty_asset";

      // Mock empty years
      const mockEmptyTable = {
        toArray: vi.fn().mockReturnValue([]),
      } as any as Table<any>;

      // Mock empty capacity data
      const mockEmptyCapacityData: any[] = [];

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockEmptyTable);
      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyCapacityData);

      const availableYears = await fetchAvailableYears(
        mockDbPath,
        mockAssetName,
      );
      const capacityData = await getCapacity(mockDbPath, mockAssetName);

      expect(availableYears).toEqual([]);
      expect(capacityData).toEqual([]);
    });
  });
});
