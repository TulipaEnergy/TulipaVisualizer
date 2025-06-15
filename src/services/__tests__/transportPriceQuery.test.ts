import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getTransportationPriceDurationSeries,
  getTransportationYears,
  getTransportationCarriers,
  type TransportationPriceDurationSeriesRow,
  type YearJson,
  type CarrierJson,
} from "../transportPriceQuery";
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

describe("Transport Price Query Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getTransportationPriceDurationSeries", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockYear = 2023;
    const mockCarrier = "electricity";
    const mockColumnType = "min";

    it("should fetch transportation price data for yearly resolution", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 25.5,
        },
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 30.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Years,
        mockColumnType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: mockCarrier,
          resolution: "years_table",
          columnType: mockColumnType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch transportation price data for hourly resolution", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 27.1,
        },
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 1,
          global_end: 2,
          y_axis: 24.9,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Hours,
        mockColumnType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: mockCarrier,
          resolution: "hours_table",
          columnType: mockColumnType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch transportation price data for daily resolution", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "gas",
          milestone_year: 2023,
          global_start: 0,
          global_end: 24,
          y_axis: 28.3,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        "gas",
        Resolution.Days,
        mockColumnType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: "gas",
          resolution: "days_table",
          columnType: mockColumnType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch transportation price data for weekly resolution", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "electricity",
          milestone_year: 2023,
          global_start: 0,
          global_end: 168,
          y_axis: 26.8,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Weeks,
        mockColumnType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: mockCarrier,
          resolution: "weeks_table",
          columnType: mockColumnType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should fetch transportation price data for monthly resolution", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_e_to_region_f",
          milestone_year: 2023,
          global_start: 0,
          global_end: 744,
          y_axis: 22.2,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        "hydrogen",
        Resolution.Months,
        mockColumnType,
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: "hydrogen",
          resolution: "months_table",
          columnType: mockColumnType,
        },
      );
      expect(result).toEqual(mockData);
    });

    it("should throw error for invalid resolution", async () => {
      const invalidResolution = "invalid_resolution" as Resolution;

      await expect(
        getTransportationPriceDurationSeries(
          mockDbPath,
          mockYear,
          mockCarrier,
          invalidResolution,
          mockColumnType,
        ),
      ).rejects.toThrow(
        "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
      );

      expect(genericApacheIPC).not.toHaveBeenCalled();
    });

    it("should handle empty transportation price data", async () => {
      const mockEmptyData: TransportationPriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Hours,
        mockColumnType,
      );

      expect(result).toEqual([]);
    });

    it("should handle transportation price data with zero values", async () => {
      const mockDataWithZeros: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithZeros);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Hours,
        mockColumnType,
      );

      expect(result).toEqual(mockDataWithZeros);
    });

    it("should handle transportation price data with negative values", async () => {
      const mockDataWithNegatives: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: -5.5, // Negative transportation price (subsidies, reverse flow)
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockDataWithNegatives);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Hours,
        mockColumnType,
      );

      expect(result).toEqual(mockDataWithNegatives);
    });

    it("should handle different carriers", async () => {
      const carriers = ["electricity", "gas", "hydrogen", "oil"];
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 25.0,
        },
      ];

      for (const carrier of carriers) {
        vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

        const result = await getTransportationPriceDurationSeries(
          mockDbPath,
          mockYear,
          carrier,
          Resolution.Years,
          mockColumnType,
        );

        expect(genericApacheIPC).toHaveBeenCalledWith(
          "get_transportation_price_resolution",
          {
            dbPath: mockDbPath,
            year: mockYear,
            carrier: carrier,
            resolution: "years_table",
            columnType: mockColumnType,
          },
        );
        expect(result).toEqual(mockData);
      }
    });

    it("should handle carriers with special characters", async () => {
      const specialCarrier = "LNG-carrier_type_1";
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "port_a_to_port_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 35.0,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        specialCarrier,
        Resolution.Years,
        mockColumnType,
      );

      expect(result).toEqual(mockData);
    });

    it("should handle carriers with special characters", async () => {
      const mockData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region-a@north_to_region-b@south",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 25.5,
        },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockData);

      const result = await getTransportationPriceDurationSeries(
        mockDbPath,
        mockYear,
        mockCarrier,
        Resolution.Hours,
        mockColumnType,
      );

      expect(result).toEqual(mockData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getTransportationPriceDurationSeries(
          mockDbPath,
          mockYear,
          mockCarrier,
          Resolution.Hours,
          mockColumnType,
        ),
      ).rejects.toThrow("Database connection failed");

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: mockYear,
          carrier: mockCarrier,
          resolution: "hours_table",
          columnType: mockColumnType,
        },
      );
    });

    it("should handle year not found errors", async () => {
      const mockError = new Error("Year not found in database");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getTransportationPriceDurationSeries(
          mockDbPath,
          1999,
          mockCarrier,
          Resolution.Years,
          mockColumnType,
        ),
      ).rejects.toThrow("Year not found in database");
    });

    it("should handle carrier not found errors", async () => {
      const mockError = new Error("Carrier not found in database");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getTransportationPriceDurationSeries(
          mockDbPath,
          mockYear,
          "nonexistent_carrier",
          Resolution.Years,
          mockColumnType,
        ),
      ).rejects.toThrow("Carrier not found in database");
    });
  });

  describe("getTransportationYears", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should fetch available transportation years successfully", async () => {
      const mockYearData: YearJson[] = [
        { year: 2020 },
        { year: 2021 },
        { year: 2022 },
        { year: 2023 },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockYearData);

      const result = await getTransportationYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_years",
        {
          dbPath: mockDbPath,
        },
      );
      expect(result).toEqual(mockYearData);
    });

    it("should handle empty years list", async () => {
      const mockEmptyYearData: YearJson[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyYearData);

      const result = await getTransportationYears(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_years",
        {
          dbPath: mockDbPath,
        },
      );
      expect(result).toEqual([]);
    });

    it("should handle single year", async () => {
      const mockSingleYearData: YearJson[] = [{ year: 2023 }];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSingleYearData);

      const result = await getTransportationYears(mockDbPath);

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

      const result = await getTransportationYears(mockDbPath);

      // Function returns data as received from database
      expect(result).toEqual(mockUnsortedYearData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getTransportationYears(mockDbPath)).rejects.toThrow(
        "Database query failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_years",
        {
          dbPath: mockDbPath,
        },
      );
    });

    it("should handle database not found errors", async () => {
      const mockError = new Error("Database file not found");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getTransportationYears("/nonexistent/path.duckdb"),
      ).rejects.toThrow("Database file not found");
    });
  });

  describe("getTransportationCarriers", () => {
    const mockDbPath = "/path/to/test.duckdb";

    it("should fetch available transportation carriers successfully", async () => {
      const mockCarrierData: CarrierJson[] = [
        { carrier: "electricity" },
        { carrier: "gas" },
        { carrier: "hydrogen" },
        { carrier: "oil" },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockCarrierData);

      const result = await getTransportationCarriers(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_carriers",
        {
          dbPath: mockDbPath,
        },
      );
      expect(result).toEqual(mockCarrierData);
    });

    it("should handle empty carriers list", async () => {
      const mockEmptyCarrierData: CarrierJson[] = [];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockEmptyCarrierData);

      const result = await getTransportationCarriers(mockDbPath);

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_carriers",
        {
          dbPath: mockDbPath,
        },
      );
      expect(result).toEqual([]);
    });

    it("should handle single carrier", async () => {
      const mockSingleCarrierData: CarrierJson[] = [{ carrier: "electricity" }];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSingleCarrierData);

      const result = await getTransportationCarriers(mockDbPath);

      expect(result).toEqual(mockSingleCarrierData);
    });

    it("should handle carriers with special characters", async () => {
      const mockSpecialCarrierData: CarrierJson[] = [
        { carrier: "electricity" },
        { carrier: "natural-gas_type_1" },
        { carrier: "LNG@pipeline" },
        { carrier: "hydrogen_compressed" },
      ];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockSpecialCarrierData);

      const result = await getTransportationCarriers(mockDbPath);

      expect(result).toEqual(mockSpecialCarrierData);
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database query failed");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(getTransportationCarriers(mockDbPath)).rejects.toThrow(
        "Database query failed",
      );

      expect(genericApacheIPC).toHaveBeenCalledWith(
        "get_transportation_carriers",
        {
          dbPath: mockDbPath,
        },
      );
    });

    it("should handle database not found errors", async () => {
      const mockError = new Error("Database file not found");
      vi.mocked(genericApacheIPC).mockRejectedValueOnce(mockError);

      await expect(
        getTransportationCarriers("/nonexistent/path.duckdb"),
      ).rejects.toThrow("Database file not found");
    });

    it("should handle malformed carrier data", async () => {
      // Test with unexpected data structure
      const mockMalformedData = [
        { carrier: "electricity" },
        { invalid_field: "not_a_carrier" },
        { carrier: null },
      ] as any as CarrierJson[];

      vi.mocked(genericApacheIPC).mockResolvedValueOnce(mockMalformedData);

      const result = await getTransportationCarriers(mockDbPath);

      // Function returns data as received, type safety is handled by TypeScript
      expect(result).toEqual(mockMalformedData);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow with years, carriers, and price data", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const mockColumnType = "min";

      // Mock available years
      const mockYearData: YearJson[] = [{ year: 2022 }, { year: 2023 }];

      // Mock available carriers
      const mockCarrierData: CarrierJson[] = [
        { carrier: "electricity" },
        { carrier: "gas" },
      ];

      // Mock transportation price data
      const mockPriceData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 25.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockYearData)
        .mockResolvedValueOnce(mockCarrierData)
        .mockResolvedValueOnce(mockPriceData);

      // Execute workflow
      const availableYears = await getTransportationYears(mockDbPath);
      const availableCarriers = await getTransportationCarriers(mockDbPath);
      const latestYear = Math.max(...availableYears.map((y) => y.year));
      const firstCarrier = availableCarriers[0].carrier;
      const priceData = await getTransportationPriceDurationSeries(
        mockDbPath,
        latestYear,
        firstCarrier,
        Resolution.Years,
        mockColumnType,
      );

      expect(availableYears).toEqual(mockYearData);
      expect(availableCarriers).toEqual(mockCarrierData);
      expect(latestYear).toBe(2023);
      expect(firstCarrier).toBe("electricity");
      expect(priceData).toEqual(mockPriceData);
    });

    it("should handle workflow when no data is available", async () => {
      const mockDbPath = "/path/to/empty.duckdb";

      // Mock empty data
      const mockEmptyYears: YearJson[] = [];
      const mockEmptyCarriers: CarrierJson[] = [];
      const mockEmptyPriceData: TransportationPriceDurationSeriesRow[] = [];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockEmptyYears)
        .mockResolvedValueOnce(mockEmptyCarriers)
        .mockResolvedValueOnce(mockEmptyPriceData);

      const availableYears = await getTransportationYears(mockDbPath);
      const availableCarriers = await getTransportationCarriers(mockDbPath);
      const priceData = await getTransportationPriceDurationSeries(
        mockDbPath,
        2023,
        "electricity",
        Resolution.Hours,
        "max",
      );

      expect(availableYears).toEqual([]);
      expect(availableCarriers).toEqual([]);
      expect(priceData).toEqual([]);
    });

    it("should handle different resolutions for same year and carrier", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testCarrier = "electricity";
      const testColumnType = "min";

      const mockHourlyData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 1,
          y_axis: 27.1,
        },
      ];

      const mockYearlyData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 25.5,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockHourlyData)
        .mockResolvedValueOnce(mockYearlyData);

      // Test different resolutions
      const hourlyData = await getTransportationPriceDurationSeries(
        mockDbPath,
        testYear,
        testCarrier,
        Resolution.Hours,
        testColumnType,
      );
      const yearlyData = await getTransportationPriceDurationSeries(
        mockDbPath,
        testYear,
        testCarrier,
        Resolution.Years,
        testColumnType,
      );

      expect(hourlyData).toEqual(mockHourlyData);
      expect(yearlyData).toEqual(mockYearlyData);

      // Verify correct endpoints were called
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        1,
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: testYear,
          carrier: testCarrier,
          resolution: "hours_table",
          columnType: testColumnType,
        },
      );
      expect(genericApacheIPC).toHaveBeenNthCalledWith(
        2,
        "get_transportation_price_resolution",
        {
          dbPath: mockDbPath,
          year: testYear,
          carrier: testCarrier,
          resolution: "years_table",
          columnType: testColumnType,
        },
      );
    });

    it("should handle comparison between different carriers", async () => {
      const mockDbPath = "/path/to/test.duckdb";
      const testYear = 2023;
      const testColumnType = "max";

      const mockElectricityData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 25.0,
        },
      ];

      const mockGasData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 30.0,
        },
      ];

      const mockHydrogenData: TransportationPriceDurationSeriesRow[] = [
        {
          carrier: "region_a_to_region_b",
          milestone_year: 2023,
          global_start: 0,
          global_end: 8760,
          y_axis: 40.0,
        },
      ];

      vi.mocked(genericApacheIPC)
        .mockResolvedValueOnce(mockElectricityData)
        .mockResolvedValueOnce(mockGasData)
        .mockResolvedValueOnce(mockHydrogenData);

      // Test different carriers
      const electricityData = await getTransportationPriceDurationSeries(
        mockDbPath,
        testYear,
        "electricity",
        Resolution.Years,
        testColumnType,
      );
      const gasData = await getTransportationPriceDurationSeries(
        mockDbPath,
        testYear,
        "gas",
        Resolution.Years,
        testColumnType,
      );
      const hydrogenData = await getTransportationPriceDurationSeries(
        mockDbPath,
        testYear,
        "hydrogen",
        Resolution.Years,
        testColumnType,
      );

      expect(electricityData).toEqual(mockElectricityData);
      expect(gasData).toEqual(mockGasData);
      expect(hydrogenData).toEqual(mockHydrogenData);

      // Verify the price differences
      expect(electricityData[0].y_axis).toBe(25.0);
      expect(gasData[0].y_axis).toBe(30.0);
      expect(hydrogenData[0].y_axis).toBe(40.0);
    });
  });
});
