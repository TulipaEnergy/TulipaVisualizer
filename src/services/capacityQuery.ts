import { genericApacheIPC } from "../gateway/db";
import { hasMetadata } from "./metadata";

export async function getCapacity(
  dbPath: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<CapacityJson[]> {
  const enableMetadata: boolean = await hasMetadata(dbPath);
  return genericApacheIPC<CapacityJson>("get_capacity", {
    dbPath,
    filters,
    grouper,
    enableMetadata,
  });
}

/**
 * Structured capacity data returned from backend analysis.
 * Negative values (-1) indicate data not available in database schema.
 */
type CapacityJson = {
  asset: string;
  year: number;
  /** New capacity investments (MW), -1 if not available */
  investment: number;
  /** Capacity decommissions (MW), -1 if not available */
  decommission: number;
  /** Capacity at start of year (MW) */
  initial_capacity: number;
  /** Capacity at end of year (MW) */
  final_capacity: number;
};
