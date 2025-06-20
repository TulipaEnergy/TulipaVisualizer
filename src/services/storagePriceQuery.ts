import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";

export async function getStoragePriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
  storageType: string,
  carrier: string,
): Promise<StoragePriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  return genericApacheIPC<StoragePriceDurationSeriesRow>(
    "get_storage_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
      storageType: storageType,
      carrier: carrier,
    },
  );
}

export type StoragePriceDurationSeriesRow = {
  carrier: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
