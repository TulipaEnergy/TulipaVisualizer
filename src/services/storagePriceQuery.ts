import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

export async function getStoragePrice(
  dbPath: string,
): Promise<StoragePriceRow[]> {
  try {
    let res: Table<any> = await apacheIPC("get_storage_price", {
      dbPath: dbPath,
    });
    return res.toArray() as Array<StoragePriceRow>; // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying storage price over period:", err);
    throw err;
  }
}

export interface StoragePriceRow {
  asset: string;
  milestone_year: number;
  assets_storage_price: number;
}
