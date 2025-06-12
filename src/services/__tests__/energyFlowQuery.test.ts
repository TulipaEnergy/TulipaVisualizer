import { describe, it, expect, beforeEach, vi } from "vitest";
import { Table } from "apache-arrow";
import {
  getEnergyFlowData,
  getAvailableYears,
  getGeoJSONName,
  getRegionsByLevel,
  getAllRegions,
  type ImportExportRow,
} from "../energyFlowQuery";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  apacheIPC: vi.fn(),
}));

// Import mocked functions
import { apacheIPC } from "../../gateway/db";

describe("Energy Flow Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getGeoJSONName", () => {
    it("should return mapped names for known regions", () => {
      expect(getGeoJSONName("South-Holland")).toBe("South Holland");
      expect(getGeoJSONName("North-Holland")).toBe("North Holland");
      expect(getGeoJSONName("Zuid-Holland")).toBe("South Holland");
      expect(getGeoJSONName("Noord-Holland")).toBe("North Holland");
      expect(getGeoJSONName("Antwerp")).toBe("Antwerp");
      expect(getGeoJSONName("Netherlands")).toBe("Netherlands");
      expect(getGeoJSONName("Belgium")).toBe("Belgium");
    });

    it("should return original name for unknown regions", () => {
      expect(getGeoJSONName("Unknown Region")).toBe("Unknown Region");
      expect(getGeoJSONName("Test-Region-123")).toBe("Test-Region-123");
      expect(getGeoJSONName("")).toBe("");
    });

    it("should handle special characters and spaces", () => {
      expect(getGeoJSONName("Region-with@special_chars")).toBe(
        "Region-with@special_chars",
      );
      expect(getGeoJSONName("Region With Spaces")).toBe("Region With Spaces");
    });
  });

  describe("getRegionsByLevel", () => {
    it("should return level 0 regions (provinces)", () => {
      const level0Regions = getRegionsByLevel(0);

      expect(level0Regions).toHaveLength(3);
      expect(level0Regions.map((r) => r.name)).toEqual([
        "South-Holland",
        "North-Holland",
        "Antwerp",
      ]);
      expect(level0Regions.every((r) => r.level === 0)).toBe(true);
    });

    it("should return level 1 regions (countries)", () => {
      const level1Regions = getRegionsByLevel(1);

      expect(level1Regions).toHaveLength(2);
      expect(level1Regions.map((r) => r.name)).toEqual([
        "Netherlands",
        "Belgium",
      ]);
      expect(level1Regions.every((r) => r.level === 1)).toBe(true);
    });

    it("should return empty array for non-existent levels", () => {
      expect(getRegionsByLevel(2)).toEqual([]);
      expect(getRegionsByLevel(-1)).toEqual([]);
      expect(getRegionsByLevel(99)).toEqual([]);
    });
  });

  describe("getAllRegions", () => {
    it("should return all regions", () => {
      const allRegions = getAllRegions();

      expect(allRegions).toHaveLength(5);
      expect(allRegions.map((r) => r.name)).toEqual([
        "South-Holland",
        "North-Holland",
        "Antwerp",
        "Netherlands",
        "Belgium",
      ]);
    });

    it("should return regions with correct structure", () => {
      const allRegions = getAllRegions();

      allRegions.forEach((region) => {
        expect(region).toHaveProperty("id");
        expect(region).toHaveProperty("name");
        expect(region).toHaveProperty("parent_id");
        expect(region).toHaveProperty("level");
        expect(typeof region.id).toBe("number");
        expect(typeof region.name).toBe("string");
        expect(typeof region.level).toBe("number");
      });
    });

    it("should return a copy of regions array", () => {
      const regions1 = getAllRegions();
      const regions2 = getAllRegions();

      expect(regions1).toEqual(regions2);
      expect(regions1).not.toBe(regions2); // Different array instances
    });
  });

  describe("getEnergyFlowData", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockYear = 2023;
    const mockCategoryLevel = 1;

    const createMockTable = (data: ImportExportRow[]) =>
      ({
        toArray: vi.fn().mockReturnValue(data),
      }) as any as Table<any>;

    it("should fetch and process energy flow data for countries", async () => {
      // Netherlands imports from Belgium
      const mockNetherlandsImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 100.5,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 50.2,
        },
      ];

      // Netherlands exports to Belgium
      const mockNetherlandsExportData = [
        {
          root_cat_in_id: 4,
          cat_in_name: "Belgium",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2023,
          tot_flow: 75.8,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockNetherlandsImportData)) // Netherlands imports
        .mockResolvedValueOnce(createMockTable(mockNetherlandsExportData)) // Netherlands exports
        .mockResolvedValueOnce(createMockTable([])) // Belgium imports
        .mockResolvedValueOnce(createMockTable([])); // Belgium exports

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      expect(result).toHaveLength(2);

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData).toBeDefined();
      expect(netherlandsData!.totalImports).toBe(150.7); // 100.5 + 50.2
      expect(netherlandsData!.totalExports).toBe(75.8);
      expect(netherlandsData!.importBreakdown).toHaveLength(1);
      expect(netherlandsData!.importBreakdown[0]).toEqual({
        partnerId: 4,
        partnerName: "Belgium",
        amount: 150.7,
        percentage: 100,
      });
      expect(netherlandsData!.exportBreakdown).toHaveLength(1);
      expect(netherlandsData!.exportBreakdown[0]).toEqual({
        partnerId: 4,
        partnerName: "Belgium",
        amount: 75.8,
        percentage: 100,
      });

      const belgiumData = result.find((r) => r.countryName === "Belgium");
      expect(belgiumData).toBeDefined();
      expect(belgiumData!.totalImports).toBe(0);
      expect(belgiumData!.totalExports).toBe(0);
    });

    it("should handle provinces level data", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 0,
          cat_in_name: "South-Holland",
          root_cat_out_id: 1,
          cat_out_name: "North-Holland",
          year: 2023,
          tot_flow: 25.5,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(mockDbPath, 0, mockYear);

      expect(result).toHaveLength(3); // Level 0 has 3 regions

      const southHollandData = result.find(
        (r) => r.countryName === "South-Holland",
      );
      expect(southHollandData).toBeDefined();
      expect(southHollandData!.totalImports).toBe(25.5);
    });

    it("should filter data by year", async () => {
      const mockDataMultipleYears = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2022,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 150,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockDataMultipleYears))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        2023,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.totalImports).toBe(150); // Only 2023 data
    });

    it("should calculate percentages correctly", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 60,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 5,
          cat_out_name: "Germany",
          year: 2023,
          tot_flow: 40,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.importBreakdown).toHaveLength(2);
      expect(netherlandsData!.importBreakdown[0].percentage).toBe(60); // 60/100 * 100
      expect(netherlandsData!.importBreakdown[1].percentage).toBe(40); // 40/100 * 100
    });

    it("should sort breakdowns by amount in descending order", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 30,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 5,
          cat_out_name: "Germany",
          year: 2023,
          tot_flow: 70,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.importBreakdown[0].partnerName).toBe("Germany"); // Higher amount
      expect(netherlandsData!.importBreakdown[0].amount).toBe(70);
      expect(netherlandsData!.importBreakdown[1].partnerName).toBe("Belgium"); // Lower amount
      expect(netherlandsData!.importBreakdown[1].amount).toBe(30);
    });

    it("should handle zero flow values", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 0,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.totalImports).toBe(0);
      expect(netherlandsData!.importBreakdown).toHaveLength(0); // Zero flows are filtered out
    });

    it("should handle negative flow values", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: -50,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.totalImports).toBe(-50);
    });

    it("should handle regions with no data", async () => {
      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      expect(result).toHaveLength(2); // Still creates entries for all regions
      result.forEach((region) => {
        expect(region.totalImports).toBe(0);
        expect(region.totalExports).toBe(0);
        expect(region.importBreakdown).toEqual([]);
        expect(region.exportBreakdown).toEqual([]);
      });
    });

    it("should handle IPC errors for individual regions gracefully", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 100,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockRejectedValueOnce(new Error("Region data error"))
        .mockRejectedValueOnce(new Error("Region data error"));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      expect(result).toHaveLength(1); // Only successful region
      expect(result[0].countryName).toBe("Netherlands");
    });

    it("should handle complete IPC failure gracefully", async () => {
      vi.mocked(apacheIPC).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      expect(result).toEqual([]); // Returns empty array on complete failure
    });

    it("should aggregate flows from same partner correctly", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 50,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 30,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.importBreakdown).toHaveLength(1);
      expect(netherlandsData!.importBreakdown[0].amount).toBe(80); // 50 + 30
    });

    it("should handle missing partner names gracefully", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: null,
          year: 2023,
          tot_flow: 50,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 5,
          cat_out_name: "",
          year: 2023,
          tot_flow: 30,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockImportData as any))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.importBreakdown).toHaveLength(0); // Invalid records are filtered out
    });

    it("should provide correct coordinates structure", async () => {
      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockCategoryLevel,
        mockYear,
      );

      result.forEach((region) => {
        expect(region.coordinates).toEqual({ latitude: 0, longitude: 0 });
      });
    });
  });

  describe("getAvailableYears", () => {
    const mockDbPath = "/path/to/test.duckdb";

    const createMockTable = (data: ImportExportRow[]) =>
      ({
        toArray: vi.fn().mockReturnValue(data),
      }) as any as Table<any>;

    it("should extract unique years from import and export data", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2020,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2021,
          tot_flow: 110,
        },
      ];

      const mockExportData = [
        {
          root_cat_in_id: 4,
          cat_in_name: "Belgium",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2021,
          tot_flow: 50,
        },
        {
          root_cat_in_id: 4,
          cat_in_name: "Belgium",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2022,
          tot_flow: 60,
        },
      ];

      // Mock responses for all regions (2 import + 2 export calls per region * 5 regions = 20 calls)
      const mockCalls: any[] = [];
      for (let i = 0; i < 5; i++) {
        mockCalls.push(createMockTable(i === 0 ? mockImportData : [])); // Import data
        mockCalls.push(createMockTable(i === 0 ? mockExportData : [])); // Export data
      }

      vi.mocked(apacheIPC).mockImplementation(() =>
        Promise.resolve(mockCalls.shift() || createMockTable([])),
      );

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([2020, 2021, 2022]);
    });

    it("should handle duplicate years across regions", async () => {
      const mockData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2020,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2020,
          tot_flow: 50,
        },
      ];

      // Mock the first region to return data, others empty
      const mockCalls: any[] = [];
      for (let i = 0; i < 5; i++) {
        mockCalls.push(createMockTable(i === 0 ? mockData : [])); // Import data
        mockCalls.push(createMockTable([])); // Export data
      }

      vi.mocked(apacheIPC).mockImplementation(() =>
        Promise.resolve(mockCalls.shift() || createMockTable([])),
      );

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([2020]); // Duplicates removed
    });

    it("should sort years in ascending order", async () => {
      const mockData = [
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2022,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2020,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2024,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2021,
          tot_flow: 100,
        },
      ];

      const mockCalls: any[] = [];
      for (let i = 0; i < 5; i++) {
        mockCalls.push(createMockTable(i === 0 ? mockData : [])); // Import data
        mockCalls.push(createMockTable([])); // Export data
      }

      vi.mocked(apacheIPC).mockImplementation(() =>
        Promise.resolve(mockCalls.shift() || createMockTable([])),
      );

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([2020, 2021, 2022, 2024]);
    });

    it("should handle empty data gracefully", async () => {
      // Mock all regions returning empty data
      vi.mocked(apacheIPC).mockResolvedValue(createMockTable([]));

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([]);
    });

    it("should handle invalid year values", async () => {
      const mockDataInvalidYears = [
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2020,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: null,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: undefined,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: "invalid" as any,
          tot_flow: 100,
        },
      ];

      const mockCalls: any[] = [];
      for (let i = 0; i < 5; i++) {
        mockCalls.push(
          createMockTable(i === 0 ? (mockDataInvalidYears as any) : []),
        ); // Import data
        mockCalls.push(createMockTable([])); // Export data
      }

      vi.mocked(apacheIPC).mockImplementation(() =>
        Promise.resolve(mockCalls.shift() || createMockTable([])),
      );

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([2020]); // Only valid year included
    });

    it("should handle individual region errors gracefully", async () => {
      const mockData = [
        {
          root_cat_in_id: 1,
          cat_in_name: "A",
          root_cat_out_id: 2,
          cat_out_name: "B",
          year: 2020,
          tot_flow: 100,
        },
      ];

      let callCount = 0;
      vi.mocked(apacheIPC).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(createMockTable(mockData)); // First call succeeds
        } else if (callCount === 2) {
          return Promise.resolve(createMockTable([])); // Second call succeeds
        } else if (callCount === 3) {
          return Promise.reject(new Error("Region error")); // Third call fails
        } else {
          return Promise.resolve(createMockTable([])); // Remaining calls succeed
        }
      });

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([2020]); // Should still get data from successful regions
    });

    it("should handle complete database error", async () => {
      vi.mocked(apacheIPC).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([]);
    });

    it("should handle non-array data from database", async () => {
      const mockTable = {
        toArray: vi.fn().mockReturnValue("not an array"),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValue(mockTable);

      const result = await getAvailableYears(mockDbPath);

      expect(result).toEqual([]);
    });
  });

  describe("Integration scenarios", () => {
    const mockDbPath = "/path/to/test.duckdb";

    const createMockTable = (data: ImportExportRow[]) =>
      ({
        toArray: vi.fn().mockReturnValue(data),
      }) as any as Table<any>;

    it("should handle complete workflow with years and energy flow data", async () => {
      const mockImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2020,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2021,
          tot_flow: 120,
        },
      ];

      const mockExportData = [
        {
          root_cat_in_id: 4,
          cat_in_name: "Belgium",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2021,
          tot_flow: 80,
        },
      ];

      // Mock calls for getAvailableYears (10 calls - 5 regions * 2 calls each)
      const yearCalls: any[] = [];
      for (let i = 0; i < 5; i++) {
        yearCalls.push(createMockTable(i === 0 ? mockImportData : []));
        yearCalls.push(createMockTable(i === 0 ? mockExportData : []));
      }

      // Mock calls for getEnergyFlowData (4 calls - 2 regions * 2 calls each)
      const flowCalls = [
        createMockTable(mockImportData.filter((d) => d.year === 2021)),
        createMockTable(mockExportData),
        createMockTable([]),
        createMockTable([]),
      ];

      const allCalls = [...yearCalls, ...flowCalls];

      vi.mocked(apacheIPC).mockImplementation(() =>
        Promise.resolve(allCalls.shift() || createMockTable([])),
      );

      // Execute workflow
      const availableYears = await getAvailableYears(mockDbPath);
      const latestYear = Math.max(...availableYears);
      const energyFlowData = await getEnergyFlowData(mockDbPath, 1, latestYear);

      expect(availableYears).toEqual([2020, 2021]);
      expect(latestYear).toBe(2021);
      expect(energyFlowData).toHaveLength(2);

      const netherlandsData = energyFlowData.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.totalImports).toBe(120);
      expect(netherlandsData!.totalExports).toBe(80);

      const belgiumData = energyFlowData.find(
        (r) => r.countryName === "Belgium",
      );
      expect(belgiumData!.totalImports).toBe(0);
      expect(belgiumData!.totalExports).toBe(0);
    });

    it("should handle regional vs country level comparison", async () => {
      const provincialLevel = 0;
      const countryLevel = 1;

      expect(getRegionsByLevel(provincialLevel)).toHaveLength(3);
      expect(getRegionsByLevel(countryLevel)).toHaveLength(2);

      // Verify region names for different levels
      const provinces = getRegionsByLevel(provincialLevel);
      expect(provinces.map((r) => r.name)).toEqual([
        "South-Holland",
        "North-Holland",
        "Antwerp",
      ]);

      const countries = getRegionsByLevel(countryLevel);
      expect(countries.map((r) => r.name)).toEqual(["Netherlands", "Belgium"]);
    });

    it("should handle complex energy flow scenarios", async () => {
      const mockComplexImportData = [
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 150,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 5,
          cat_out_name: "Germany",
          year: 2023,
          tot_flow: 200,
        },
        {
          root_cat_in_id: 3,
          cat_in_name: "Netherlands",
          root_cat_out_id: 4,
          cat_out_name: "Belgium",
          year: 2023,
          tot_flow: 50, // Additional flow from same partner
        },
      ];

      const mockComplexExportData = [
        {
          root_cat_in_id: 4,
          cat_in_name: "Belgium",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2023,
          tot_flow: 100,
        },
        {
          root_cat_in_id: 5,
          cat_in_name: "Germany",
          root_cat_out_id: 3,
          cat_out_name: "Netherlands",
          year: 2023,
          tot_flow: 75,
        },
      ];

      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable(mockComplexImportData))
        .mockResolvedValueOnce(createMockTable(mockComplexExportData))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(mockDbPath, 1, 2023);

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      expect(netherlandsData!.totalImports).toBe(400); // 150 + 200 + 50
      expect(netherlandsData!.totalExports).toBe(175); // 100 + 75

      // Check partner aggregation
      expect(netherlandsData!.importBreakdown).toHaveLength(2);
      const belgiumImport = netherlandsData!.importBreakdown.find(
        (p) => p.partnerName === "Belgium",
      );
      expect(belgiumImport!.amount).toBe(200); // 150 + 50 aggregated

      // Check sorting - both Belgium (200) and Germany (200) have same amount,
      // but Belgium appears first due to map iteration order
      expect(netherlandsData!.importBreakdown[0].partnerName).toBe("Belgium");
      expect(netherlandsData!.importBreakdown[1].partnerName).toBe("Germany");
    });

    it("should handle workflow with missing data scenarios", async () => {
      // Test scenario where some regions have no data
      vi.mocked(apacheIPC).mockImplementation((_command, params) => {
        if (
          params &&
          typeof params === "object" &&
          "catName" in params &&
          params.catName === "Netherlands"
        ) {
          return Promise.resolve(
            createMockTable([
              {
                root_cat_in_id: 3,
                cat_in_name: "Netherlands",
                root_cat_out_id: 4,
                cat_out_name: "Belgium",
                year: 2023,
                tot_flow: 100,
              },
            ]),
          );
        }
        return Promise.resolve(createMockTable([]));
      });

      const result = await getEnergyFlowData(mockDbPath, 1, 2023);

      expect(result).toHaveLength(2); // Both regions present

      const netherlandsData = result.find(
        (r) => r.countryName === "Netherlands",
      );
      const belgiumData = result.find((r) => r.countryName === "Belgium");

      expect(netherlandsData!.totalImports).toBe(100);
      expect(belgiumData!.totalImports).toBe(0);
      expect(belgiumData!.totalExports).toBe(0);
    });
  });
});
