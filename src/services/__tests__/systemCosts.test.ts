import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAssetCostsByYear,
  getFlowCostsByYear,
  getUniqueCarriers,
  getUniqueYears,
  type AssetSystemCostPerYear,
  type FlowSystemCostPerYear,
} from "../systemCosts";

// Mock the gateway module
vi.mock("../../gateway/db", () => ({
  genericApacheIPC: vi.fn(),
}));

// Import mocked functions
import { genericApacheIPC } from "../../gateway/db";

describe("System Costs Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getAssetCostsByYear", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should aggregate asset costs by year successfully", async () => {
      const mockFixedAssetCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", assets_fixed_cost: 1000 },
        {
          milestone_year: 2020,
          asset: "solar_plant_1",
          assets_fixed_cost: 800,
        },
        { milestone_year: 2021, asset: "wind_farm_1", assets_fixed_cost: 1200 },
      ];

      const mockUnitOnCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", unit_on_cost: 100 },
        { milestone_year: 2020, asset: "solar_plant_1", unit_on_cost: 80 },
        { milestone_year: 2021, asset: "wind_farm_1", unit_on_cost: 120 },
        { milestone_year: 2022, asset: "battery_1", unit_on_cost: 200 },
      ];

      const expectedResult: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: 1800, unit_on_costs: 180 },
        { year: 2021, asset_fixed_costs: 1200, unit_on_costs: 120 },
        { year: 2022, asset_fixed_costs: 0, unit_on_costs: 200 },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockResolvedValueOnce(mockUnitOnCosts);

      const result = await getAssetCostsByYear(mockDbPath);

      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        1,
        "get_fixed_asset_cost",
        {
          dbPath: mockDbPath,
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(2, "get_unit_on_cost", {
        dbPath: mockDbPath,
      });
      expect(result).toEqual(expectedResult);
    });

    it("should handle empty asset cost data", async () => {
      const mockEmptyFixedAssetCosts: any[] = [];
      const mockEmptyUnitOnCosts: any[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockEmptyFixedAssetCosts)
        .mockResolvedValueOnce(mockEmptyUnitOnCosts);

      const result = await getAssetCostsByYear(mockDbPath);

      expect(result).toEqual([]);
    });

    it("should handle zero cost values", async () => {
      const mockFixedAssetCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", assets_fixed_cost: 0 },
      ];

      const mockUnitOnCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", unit_on_cost: 0 },
      ];

      const expectedResult: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: 0, unit_on_costs: 0 },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockResolvedValueOnce(mockUnitOnCosts);

      const result = await getAssetCostsByYear(mockDbPath);

      expect(result).toEqual(expectedResult);
    });

    it("should handle negative cost values", async () => {
      const mockFixedAssetCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", assets_fixed_cost: -500 },
      ];

      const mockUnitOnCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", unit_on_cost: -100 },
      ];

      const expectedResult: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: -500, unit_on_costs: -100 },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockResolvedValueOnce(mockUnitOnCosts);

      const result = await getAssetCostsByYear(mockDbPath);

      expect(result).toEqual(expectedResult);
    });

    it("should sort years in ascending order", async () => {
      const mockFixedAssetCosts = [
        { milestone_year: 2022, asset: "wind_farm_1", assets_fixed_cost: 1000 },
        {
          milestone_year: 2020,
          asset: "solar_plant_1",
          assets_fixed_cost: 800,
        },
        { milestone_year: 2021, asset: "battery_1", assets_fixed_cost: 600 },
      ];

      const mockUnitOnCosts = [
        { milestone_year: 2022, asset: "wind_farm_1", unit_on_cost: 100 },
        { milestone_year: 2020, asset: "solar_plant_1", unit_on_cost: 80 },
        { milestone_year: 2021, asset: "battery_1", unit_on_cost: 60 },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockResolvedValueOnce(mockUnitOnCosts);

      const result = await getAssetCostsByYear(mockDbPath);

      // Check that years are sorted
      const years = result.map((item) => item.year);
      expect(years).toEqual([2020, 2021, 2022]);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getAssetCostsByYear(mockDbPath)).rejects.toThrow(
        "Database connection failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_fixed_asset_cost", {
        dbPath: mockDbPath,
      });
    });

    it("should handle error in second IPC call", async () => {
      const mockFixedAssetCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", assets_fixed_cost: 1000 },
      ];
      const mockError = new Error("Unit cost query failed");

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockRejectedValueOnce(mockError);

      await expect(getAssetCostsByYear(mockDbPath)).rejects.toThrow(
        "Unit cost query failed",
      );
    });
  });

  describe("getFlowCostsByYear", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should aggregate flow costs by year and carrier successfully", async () => {
      const mockFixedFlowCosts = [
        { milestone_year: 2020, carrier: "electricity", flow_fixed_cost: 1000 },
        { milestone_year: 2020, carrier: "electricity", flow_fixed_cost: 500 },
        { milestone_year: 2020, carrier: "gas", flow_fixed_cost: 800 },
        { milestone_year: 2021, carrier: "electricity", flow_fixed_cost: 1200 },
      ];

      const mockVariableFlowCosts = [
        {
          milestone_year: 2020,
          carrier: "electricity",
          flow_variable_cost: 100,
        },
        { milestone_year: 2020, carrier: "gas", flow_variable_cost: 80 },
        {
          milestone_year: 2021,
          carrier: "electricity",
          flow_variable_cost: 120,
        },
        { milestone_year: 2021, carrier: "hydrogen", flow_variable_cost: 200 },
      ];

      const expectedResult: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1500, gas: 800 },
          flow_variable_costs_by_carrier: { electricity: 100, gas: 80 },
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { electricity: 1200 },
          flow_variable_costs_by_carrier: { electricity: 120, hydrogen: 200 },
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedFlowCosts)
        .mockResolvedValueOnce(mockVariableFlowCosts);

      const result = await getFlowCostsByYear(mockDbPath);

      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        1,
        "get_fixed_flow_cost",
        {
          dbPath: mockDbPath,
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        2,
        "get_variable_flow_cost",
        {
          dbPath: mockDbPath,
        },
      );
      expect(result).toEqual(expectedResult);
    });

    it("should filter out zero and negative fixed costs", async () => {
      const mockFixedFlowCosts = [
        { milestone_year: 2020, carrier: "electricity", flow_fixed_cost: 1000 },
        { milestone_year: 2020, carrier: "gas", flow_fixed_cost: 0 }, // Should be filtered out
        { milestone_year: 2020, carrier: "hydrogen", flow_fixed_cost: -100 }, // Should be filtered out
      ];

      const mockVariableFlowCosts = [
        {
          milestone_year: 2020,
          carrier: "electricity",
          flow_variable_cost: 100,
        },
        { milestone_year: 2020, carrier: "gas", flow_variable_cost: 0 }, // Should be filtered out
        { milestone_year: 2020, carrier: "hydrogen", flow_variable_cost: -50 }, // Should be filtered out
      ];

      const expectedResult: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedFlowCosts)
        .mockResolvedValueOnce(mockVariableFlowCosts);

      const result = await getFlowCostsByYear(mockDbPath);

      expect(result).toEqual(expectedResult);
    });

    it("should handle empty flow cost data", async () => {
      const mockEmptyFixedFlowCosts: any[] = [];
      const mockEmptyVariableFlowCosts: any[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockEmptyFixedFlowCosts)
        .mockResolvedValueOnce(mockEmptyVariableFlowCosts);

      const result = await getFlowCostsByYear(mockDbPath);

      expect(result).toEqual([]);
    });

    it("should handle years that exist in only one cost type", async () => {
      const mockFixedFlowCosts = [
        { milestone_year: 2020, carrier: "electricity", flow_fixed_cost: 1000 },
      ];

      const mockVariableFlowCosts = [
        { milestone_year: 2021, carrier: "gas", flow_variable_cost: 100 },
      ];

      const expectedResult: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: {},
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: {},
          flow_variable_costs_by_carrier: { gas: 100 },
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedFlowCosts)
        .mockResolvedValueOnce(mockVariableFlowCosts);

      const result = await getFlowCostsByYear(mockDbPath);

      expect(result).toEqual(expectedResult);
    });

    it("should sort years in ascending order", async () => {
      const mockFixedFlowCosts = [
        { milestone_year: 2022, carrier: "electricity", flow_fixed_cost: 1000 },
        { milestone_year: 2020, carrier: "gas", flow_fixed_cost: 800 },
        { milestone_year: 2021, carrier: "hydrogen", flow_fixed_cost: 600 },
      ];

      const mockVariableFlowCosts: any[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockFixedFlowCosts)
        .mockResolvedValueOnce(mockVariableFlowCosts);

      const result = await getFlowCostsByYear(mockDbPath);

      const years = result.map((item) => item.year);
      expect(years).toEqual([2020, 2021, 2022]);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getFlowCostsByYear(mockDbPath)).rejects.toThrow(
        "Database connection failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith("get_fixed_flow_cost", {
        dbPath: mockDbPath,
      });
    });
  });

  describe("getUniqueCarriers", () => {
    it("should extract unique carriers from flow data", () => {
      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000, gas: 800 },
          flow_variable_costs_by_carrier: { electricity: 100, hydrogen: 200 },
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { electricity: 1200, hydrogen: 300 },
          flow_variable_costs_by_carrier: { gas: 150 },
        },
      ];

      const result = getUniqueCarriers(mockFlowData);

      expect(result).toEqual(["electricity", "gas", "hydrogen"]);
    });

    it("should handle empty flow data", () => {
      const mockEmptyFlowData: FlowSystemCostPerYear[] = [];

      const result = getUniqueCarriers(mockEmptyFlowData);

      expect(result).toEqual([]);
    });

    it("should handle flow data with empty cost objects", () => {
      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: {},
          flow_variable_costs_by_carrier: {},
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: {},
        },
      ];

      const result = getUniqueCarriers(mockFlowData);

      expect(result).toEqual(["electricity"]);
    });

    it("should sort carriers alphabetically", () => {
      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: {
            zinc: 1000,
            electricity: 800,
            hydrogen: 600,
          },
          flow_variable_costs_by_carrier: { gas: 100, aluminum: 200 },
        },
      ];

      const result = getUniqueCarriers(mockFlowData);

      expect(result).toEqual([
        "aluminum",
        "electricity",
        "gas",
        "hydrogen",
        "zinc",
      ]);
    });

    it("should handle duplicate carriers across years", () => {
      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { electricity: 1200 },
          flow_variable_costs_by_carrier: { electricity: 120 },
        },
      ];

      const result = getUniqueCarriers(mockFlowData);

      expect(result).toEqual(["electricity"]);
    });
  });

  describe("getUniqueYears", () => {
    it("should extract unique years from asset and flow data", () => {
      const mockAssetData: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: 1000, unit_on_costs: 100 },
        { year: 2021, asset_fixed_costs: 1200, unit_on_costs: 120 },
        { year: 2023, asset_fixed_costs: 1400, unit_on_costs: 140 },
      ];

      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
        {
          year: 2022,
          flow_fixed_costs_by_carrier: { gas: 800 },
          flow_variable_costs_by_carrier: { gas: 80 },
        },
      ];

      const result = getUniqueYears(mockAssetData, mockFlowData);

      expect(result).toEqual([2020, 2021, 2022, 2023]);
    });

    it("should handle empty asset and flow data", () => {
      const mockEmptyAssetData: AssetSystemCostPerYear[] = [];
      const mockEmptyFlowData: FlowSystemCostPerYear[] = [];

      const result = getUniqueYears(mockEmptyAssetData, mockEmptyFlowData);

      expect(result).toEqual([]);
    });

    it("should handle data with only asset costs", () => {
      const mockAssetData: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: 1000, unit_on_costs: 100 },
        { year: 2021, asset_fixed_costs: 1200, unit_on_costs: 120 },
      ];

      const mockEmptyFlowData: FlowSystemCostPerYear[] = [];

      const result = getUniqueYears(mockAssetData, mockEmptyFlowData);

      expect(result).toEqual([2020, 2021]);
    });

    it("should handle data with only flow costs", () => {
      const mockEmptyAssetData: AssetSystemCostPerYear[] = [];

      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2022,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
        {
          year: 2023,
          flow_fixed_costs_by_carrier: { gas: 800 },
          flow_variable_costs_by_carrier: { gas: 80 },
        },
      ];

      const result = getUniqueYears(mockEmptyAssetData, mockFlowData);

      expect(result).toEqual([2022, 2023]);
    });

    it("should sort years in ascending order", () => {
      const mockAssetData: AssetSystemCostPerYear[] = [
        { year: 2023, asset_fixed_costs: 1000, unit_on_costs: 100 },
        { year: 2020, asset_fixed_costs: 1200, unit_on_costs: 120 },
      ];

      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
        {
          year: 2019,
          flow_fixed_costs_by_carrier: { gas: 800 },
          flow_variable_costs_by_carrier: { gas: 80 },
        },
      ];

      const result = getUniqueYears(mockAssetData, mockFlowData);

      expect(result).toEqual([2019, 2020, 2021, 2023]);
    });

    it("should handle duplicate years between asset and flow data", () => {
      const mockAssetData: AssetSystemCostPerYear[] = [
        { year: 2020, asset_fixed_costs: 1000, unit_on_costs: 100 },
        { year: 2021, asset_fixed_costs: 1200, unit_on_costs: 120 },
      ];

      const mockFlowData: FlowSystemCostPerYear[] = [
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 1000 },
          flow_variable_costs_by_carrier: { electricity: 100 },
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { gas: 800 },
          flow_variable_costs_by_carrier: { gas: 80 },
        },
      ];

      const result = getUniqueYears(mockAssetData, mockFlowData);

      expect(result).toEqual([2020, 2021]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete system cost workflow", async () => {
      const mockDbPath = "/path/to/test.duckdb";

      // Mock asset cost data
      const mockFixedAssetCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", assets_fixed_cost: 1000 },
        {
          milestone_year: 2021,
          asset: "solar_plant_1",
          assets_fixed_cost: 800,
        },
      ];

      const mockUnitOnCosts = [
        { milestone_year: 2020, asset: "wind_farm_1", unit_on_cost: 100 },
        { milestone_year: 2021, asset: "solar_plant_1", unit_on_cost: 80 },
      ];

      // Mock flow cost data
      const mockFixedFlowCosts = [
        { milestone_year: 2020, carrier: "electricity", flow_fixed_cost: 500 },
        { milestone_year: 2021, carrier: "gas", flow_fixed_cost: 300 },
      ];

      const mockVariableFlowCosts = [
        {
          milestone_year: 2020,
          carrier: "electricity",
          flow_variable_cost: 50,
        },
        { milestone_year: 2021, carrier: "gas", flow_variable_cost: 30 },
      ];

      vi.mocked(genericApacheIPC)
        // First call to getAssetCostsByYear
        .mockResolvedValueOnce(mockFixedAssetCosts)
        .mockResolvedValueOnce(mockUnitOnCosts)
        // Second call to getFlowCostsByYear
        .mockResolvedValueOnce(mockFixedFlowCosts)
        .mockResolvedValueOnce(mockVariableFlowCosts);

      // Execute workflow
      const assetCosts = await getAssetCostsByYear(mockDbPath);
      const flowCosts = await getFlowCostsByYear(mockDbPath);
      const uniqueCarriers = getUniqueCarriers(flowCosts);
      const uniqueYears = getUniqueYears(assetCosts, flowCosts);

      expect(assetCosts).toEqual([
        { year: 2020, asset_fixed_costs: 1000, unit_on_costs: 100 },
        { year: 2021, asset_fixed_costs: 800, unit_on_costs: 80 },
      ]);

      expect(flowCosts).toEqual([
        {
          year: 2020,
          flow_fixed_costs_by_carrier: { electricity: 500 },
          flow_variable_costs_by_carrier: { electricity: 50 },
        },
        {
          year: 2021,
          flow_fixed_costs_by_carrier: { gas: 300 },
          flow_variable_costs_by_carrier: { gas: 30 },
        },
      ]);

      expect(uniqueCarriers).toEqual(["electricity", "gas"]);
      expect(uniqueYears).toEqual([2020, 2021]);
    });

    it("should handle workflow with no cost data", async () => {
      const mockDbPath = "/path/to/empty.duckdb";

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const assetCosts = await getAssetCostsByYear(mockDbPath);
      const flowCosts = await getFlowCostsByYear(mockDbPath);
      const uniqueCarriers = getUniqueCarriers(flowCosts);
      const uniqueYears = getUniqueYears(assetCosts, flowCosts);

      expect(assetCosts).toEqual([]);
      expect(flowCosts).toEqual([]);
      expect(uniqueCarriers).toEqual([]);
      expect(uniqueYears).toEqual([]);
    });
  });
});
