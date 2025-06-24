import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AggregateFlowRow,
  DetailedFlowRow,
  getAvailableYearsFlows,
  getEnergyFlowData,
  YearRow,
} from "../energyFlowQuery";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
}));

// Import mocked functions
import { genericApacheIPC } from "../../gateway/db";
import {
  EnergyFlowBreakdown,
  EnergyFlowOptions,
} from "../../types/GeoEnergyFlow";

describe("Energy Flow Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockDbPath = "/path/to/test.duckdb";
  const mockYear = 2030;
  const mockLevel = 1;
  const mockOptions: EnergyFlowOptions = { level: mockLevel, year: mockYear };

  // Netherlands imports from Belgium
  const mockNetherlandsTotalImport = 29147722.728451736;
  const mockNetherlandsTotalExport = 396895765.5605842;

  const mockBelgiumTotalImport = 396895765.5605842;
  const mockBelgiumTotalExport = 29147722.728451736;

  const aggregateFlowMock: AggregateFlowRow[] = [
    {
      id: 2,
      group: "Netherlands",
      totalImport: mockNetherlandsTotalImport,
      totalExport: mockNetherlandsTotalExport,
    },
    {
      id: 3,
      group: "Belgium",
      totalImport: mockBelgiumTotalImport,
      totalExport: mockBelgiumTotalExport,
    },
  ];

  const detailedFlowMock: DetailedFlowRow[] = [
    {
      fromId: 2,
      fromName: "Netherlands",
      toId: 3,
      toName: "Belgium",
      totFlow: 396895765.5605842,
    },
    {
      fromId: 3,
      fromName: "Belgium",
      toId: 2,
      toName: "Netherlands",
      totFlow: 29147722.728451736,
    },
    {
      fromId: 2,
      fromName: "Netherlands",
      toId: 2,
      toName: "Netherlands",
      totFlow: 0,
    },
    {
      fromId: 3,
      fromName: "Belgium",
      toId: 3,
      toName: "Belgium",
      totFlow: 0,
    },
  ];

  const mockYearRowSorted = [{ year: 2030 }, { year: 2050 }];
  const years = mockYearRowSorted.map((yr) => yr.year);

  describe("getEnergyFlowData", () => {
    beforeEach(() => {
      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(aggregateFlowMock)
        .mockResolvedValueOnce(detailedFlowMock);
    });

    it("should fetch and process energy flow data for countries", async () => {
      const result = await getEnergyFlowData(mockDbPath, mockOptions);

      expect(result).toHaveLength(2);

      const netherlandsData = result.find((r) => r.group === "Netherlands");
      expect(netherlandsData).toBeDefined();
      expect(netherlandsData!.totalImport).toBe(mockNetherlandsTotalImport); // 100.5 + 50.2
      expect(netherlandsData!.totalExport).toBe(mockNetherlandsTotalExport);
      expect(netherlandsData!.importBreakdown).toHaveLength(1);
      expect(netherlandsData!.importBreakdown[0]).toEqual<EnergyFlowBreakdown>({
        partnerId: 3,
        partnerName: "Belgium",
        amount: mockNetherlandsTotalImport,
      });
      expect(netherlandsData!.exportBreakdown).toHaveLength(1);
      expect(netherlandsData!.exportBreakdown[0]).toEqual<EnergyFlowBreakdown>({
        partnerId: 3,
        partnerName: "Belgium",
        amount: mockNetherlandsTotalExport,
      });

      const belgiumData = result.find((r) => r.group === "Belgium");
      expect(belgiumData).toBeDefined();
      expect(belgiumData!.totalImport).toBe(mockBelgiumTotalImport);
      expect(belgiumData!.totalExport).toBe(mockBelgiumTotalExport);
    });
    /*
    it("should sort breakdowns by amount in descending order", async () => {
      const result = await getEnergyFlowData(
        mockDbPath,
        mockOptions,
      );

      const netherlandsData = result.find(
        (r) => r.group === "Netherlands",
      );
      expect(netherlandsData!.importBreakdown[0].partnerName).toBe("Germany"); // Higher amount
      expect(netherlandsData!.importBreakdown[0].amount).toBe(70);
      expect(netherlandsData!.importBreakdown[1].partnerName).toBe("Belgium"); // Lower amount
      expect(netherlandsData!.importBreakdown[1].amount).toBe(mockBelgiumTotalExport);
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
        mockOptions,
      );

      const netherlandsData = result.find(
        (r) => r.group === "Netherlands",
      );
      expect(netherlandsData!.totalImport).toBe(0);
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
        mockOptions,
      );

      const netherlandsData = result.find(
        (r) => r.group === "Netherlands",
      );
      expect(netherlandsData!.totalImport).toBe(-50);
    });

    it("should handle regions with no data", async () => {
      vi.mocked(apacheIPC)
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]))
        .mockResolvedValueOnce(createMockTable([]));

      const result = await getEnergyFlowData(
        mockDbPath,
        mockOptions,
      );

      expect(result).toHaveLength(2); // Still creates entries for all regions
      result.forEach((region) => {
        expect(region.totalImport).toBe(0);
        expect(region.totalExport).toBe(0);
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
        mockOptions,
      );

      expect(result).toHaveLength(1); // Only successful region
      expect(result[0].group).toBe("Netherlands");
    });

    it("should handle complete IPC failure gracefully", async () => {
      vi.mocked(apacheIPC).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await getEnergyFlowData(
        mockDbPath,
        mockOptions,
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
        mockOptions,
      );

      const netherlandsData = result.find(
        (r) => r.group === "Netherlands",
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
        mockOptions,
      );

      const netherlandsData = result.find(
        (r) => r.group === "Netherlands",
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
        mockOptions,
      );

      result.forEach((region) => {
        expect(region.coordinates).toEqual({ latitude: 0, longitude: 0 });
      });
    });
    */
  });

  describe("getAvailableYears", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should get unique years", async () => {
      vi.mocked(genericApacheIPC).mockImplementation(() =>
        Promise.resolve<YearRow[]>(mockYearRowSorted),
      );

      const result = await getAvailableYearsFlows(mockDbPath);

      expect(result).toEqual(years);
    });

    it("should sort years in ascending order", async () => {
      const mockYearsUnsorted = [{ year: 2050 }, { year: 2030 }];

      vi.mocked(genericApacheIPC).mockImplementation(() =>
        Promise.resolve<YearRow[]>(mockYearsUnsorted),
      );

      const result = await getAvailableYearsFlows(mockDbPath);

      expect(result).toEqual(years);
    });

    it("should handle empty data gracefully", async () => {
      // Mock all regions returning empty data
      vi.mocked(genericApacheIPC).mockResolvedValue([]);

      const result = await getAvailableYearsFlows(mockDbPath);

      expect(result).toEqual([]);
    });

    it("should handle complete database error", async () => {
      vi.mocked(genericApacheIPC).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await getAvailableYearsFlows(mockDbPath);

      expect(result).toEqual([]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years and energy flow data", async () => {
      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockYearRowSorted) // getAvailableYearsFlow
        .mockResolvedValueOnce(aggregateFlowMock) // getEnergyFlowData - aggregate
        .mockResolvedValueOnce(detailedFlowMock); // getEnergyFlowData - detailed

      // Execute workflow
      const availableYears = await getAvailableYearsFlows(mockDbPath);
      const latestYear = Math.max(...availableYears);
      const energyFlowData = await getEnergyFlowData(mockDbPath, {
        level: 1,
        year: latestYear,
      });

      expect(availableYears).toEqual(years);
      expect(latestYear).toBe(Math.max(...years));
      expect(energyFlowData).toHaveLength(2);

      const netherlandsData = energyFlowData.find(
        (r) => r.group === "Netherlands",
      );
      expect(netherlandsData!.totalImport).toBe(mockNetherlandsTotalImport);
      expect(netherlandsData!.totalExport).toBe(mockNetherlandsTotalExport);

      const belgiumData = energyFlowData.find((r) => r.group === "Belgium");
      expect(belgiumData!.totalImport).toBe(mockBelgiumTotalImport);
      expect(belgiumData!.totalExport).toBe(mockBelgiumTotalExport);
    });
  });
});
