import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export async function getProductionPriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
  carrier: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<ProductionPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }
  const enableMetadata: boolean = await hasMetadata(dbPath);
  return genericApacheIPC<ProductionPriceDurationSeriesRow>(
    "get_production_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
      carrier: carrier,
      filters: filters,
      grouper: grouper,
      enableMetadata: enableMetadata,
    },
  );
}

export type ProductionPriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
