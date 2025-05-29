import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

export async function getSystemCost(
  dbPath: string,
): Promise<FixedAssetCostRow[]> {
  try {
    let res: Table<any> = await apacheIPC("get_system_cost", {
      dbPath: dbPath,
    });
    return res.toArray() as Array<FixedAssetCostRow>; // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying system costs over period:", err);
    throw err;
  }
}

export interface FixedAssetCostRow {
  milestone_year: number;
  asset: string;
  assets_fixed_cost: number;
}
