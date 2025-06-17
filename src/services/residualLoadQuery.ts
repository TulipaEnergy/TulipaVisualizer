import { genericApacheIPC } from "../gateway/db";
import { Resolution } from "../types/resolution";

/**
 * Time resolution mapping for temporal aggregation strategies.
 * Maps user-friendly resolution names to hour-based aggregation factors.
 */
const resolutionToTable: Record<Resolution, number> = {
  [Resolution.Hours]: 1,
  [Resolution.Days]: 24,
  [Resolution.Weeks]: 168,
  [Resolution.Months]: 720,
  [Resolution.Years]: 8760,
};

export type YearJson = { year: number };

export type SupplyRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};

export async function getRenewables(
  dbPath: string,
  resolution: Resolution,
  year: number,
): Promise<SupplyRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  // Special handling for yearly aggregation using dedicated query
  if (resolution === Resolution.Years) {
    return genericApacheIPC<SupplyRow>("get_yearly_renewables", {
      dbPath,
      year,
    });
  }

  return genericApacheIPC<SupplyRow>("get_renewables", {
    dbPath,
    year,
    resolution: resolutionToTable[resolution],
  });
}

export async function getNonRenewables(
  dbPath: string,
  resolution: Resolution,
  year: number,
): Promise<SupplyRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  // Special handling for yearly aggregation using dedicated query
  if (resolution === Resolution.Years) {
    return genericApacheIPC<SupplyRow>("get_yearly_nonrenewables", {
      dbPath,
      year,
    });
  }

  return genericApacheIPC<SupplyRow>("get_nonrenewables", {
    dbPath,
    year,
    resolution: resolutionToTable[resolution],
  });
}

/**
 * Retrieves available years with supply data for temporal analysis filtering.
 *
 * Data Coverage:
 * - Returns years where both renewable and non-renewable generation data exist
 * - Enables multi-year residual load trend analysis
 * - Supports long-term energy transition scenario comparison
 */
export async function getSupplyYears(dbPath: string): Promise<YearJson[]> {
  return genericApacheIPC<YearJson>("get_supply_years", { dbPath });
}
