import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";

export async function getTransportationPriceDurationSeries(
  dbPath: string,
  year: number,
  carrier: string,
  resolution: Resolution,
): Promise<TransportationPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }
  if (resolution === Resolution.Years) {
    return genericApacheIPC<TransportationPriceDurationSeriesRow>(
      "get_transportation_price_yearly",
      {
        dbPath: dbPath,
        year: year,
        carrier: carrier,
      },
    );
  }

  return genericApacheIPC<TransportationPriceDurationSeriesRow>(
    "get_transportation_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      carrier: carrier,
      resolution: resolutionToTable[resolution],
    },
  );
}

export async function getTransportationYears(
  dbPath: string,
): Promise<YearJson[]> {
  return genericApacheIPC<YearJson>("get_transportation_years", {
    dbPath: dbPath,
  });
}

export async function getTransportationCarriers(
  dbPath: string,
): Promise<CarrierJson[]> {
  return genericApacheIPC<CarrierJson>("get_transportation_carriers", {
    dbPath: dbPath,
  });
}

export type CarrierJson = {
  carrier: string;
};

export type YearJson = {
  year: number;
};

export type TransportationPriceDurationSeriesRow = {
  route: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
