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

type CapacityJson = {
  asset: string;
  year: number;
  investment: number;
  decommission: number;
  initial_capacity: number;
  final_capacity: number;
};
