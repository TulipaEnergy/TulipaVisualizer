import { genericApacheIPC } from "../gateway/db";
import { Resolution, resolutionToTable } from "../types/resolution";
import { hasMetadata } from "./metadata";

export type SupplyRow = {
  asset: string;
  milestone_year: number;
  global_start: number;
  global_end: number;
  y_axis: number;
};

export async function getSupply(
  dbPath: string,
  resolution: Resolution,
  year: number,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<SupplyRow[]> {
  if (!(resolution in resolutionToTable)) {
    throw new Error(
      "Invalid resolution specified. Use 'hours', 'days', 'weeks', 'months' or 'years'.",
    );
  }

  const enableMetadata: boolean = await hasMetadata(dbPath);

  return genericApacheIPC<SupplyRow>("get_supply", {
    dbPath,
    year,
    resolution: resolutionToTable[resolution],
    filters,
    grouper,
    enableMetadata,
  });
}
