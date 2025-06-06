import { genericApacheIPC } from "../gateway/db";
import { Resolution } from "../types/resolution";

const resolutionToTable: Record<Resolution, number> = {
  [Resolution.Hours]: 1,
  [Resolution.Days]: 24,
  [Resolution.Weeks]: 168,
  [Resolution.Months]: 720,
  [Resolution.Years]: 8760,
};

export async function getProductionPriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
): Promise<ProductionPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }
  if (resolution === Resolution.Years) {
    return genericApacheIPC<ProductionPriceDurationSeriesRow>(
      "get_production_price_yearly",
      {
        dbPath: dbPath,
        year: year,
      },
    );
  }

  return genericApacheIPC<ProductionPriceDurationSeriesRow>(
    "get_production_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
    },
  );
}

export async function getProductionYears(dbPath: string): Promise<YearJson[]> {
  return genericApacheIPC<YearJson>("get_production_years", {
    dbPath: dbPath,
  });
}

export type YearJson = {
  year: number;
};

export type ProductionPriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
