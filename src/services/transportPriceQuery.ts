import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";

export async function getTransportationPriceDurationSeries(
  dbPath: string,
  year: number,
  carrier: string,
  resolution: Resolution,
  columnType: string,
): Promise<TransportationPriceDurationSeriesRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  return genericApacheIPC<TransportationPriceDurationSeriesRow>(
    "get_transportation_price_resolution",
    {
      dbPath: dbPath,
      year: year,
      carrier: carrier,
      resolution: resolutionToTable[resolution],
      columnType: columnType,
    },
  );
}

/**
 * Retrieves available energy carriers with transportation infrastructure in the model.
 *
 * Carrier Portfolio:
 * - Lists all energy vectors with modeled transmission/transport infrastructure
 * - Enables carrier-specific transportation cost analysis
 * - Supports multi-carrier energy system economic evaluation
 */
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

export type TransportationPriceDurationSeriesRow = {
  carrier: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};
