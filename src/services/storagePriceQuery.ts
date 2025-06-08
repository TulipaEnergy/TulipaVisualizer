import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";

export async function getStoragePriceDurationSeries(
  dbPath: string,
  resolution: Resolution,
  year: number,
): Promise<StoragePriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }
  if (resolution === Resolution.Years) {
    return genericApacheIPC<StoragePriceDurationSeriesRow>(
      "get_storage_price_yearly",
      {
        dbPath: dbPath,
        year: year,
      },
    );
  }

  return genericApacheIPC<StoragePriceDurationSeriesRow>(
    "get_storage_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      resolution: resolutionToTable[resolution],
    },
  );
}

export async function getStorageYears(dbPath: string): Promise<YearJson[]> {
  return genericApacheIPC<YearJson>("get_storage_years", {
    dbPath: dbPath,
  });
}

export type YearJson = {
  year: number;
};

export type StoragePriceDurationSeriesRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
