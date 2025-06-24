import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export async function getStoragePriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
  storageType: string,
  carrier: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<StoragePriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  const enableMetadata: boolean = await hasMetadata(dbPath);
  return genericApacheIPC<StoragePriceDurationSeriesRow>(
    "get_storage_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
      storageType: storageType,
      carrier: carrier,
      filters: filters,
      grouper: grouper,
      enableMetadata: enableMetadata,
    },
  );
}

export type StoragePriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
