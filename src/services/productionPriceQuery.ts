import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

export async function getProductionPrice(
  dbPath: string,
): Promise<ProductionPriceRow[]> {
  try {
    let res: Table<any> = await apacheIPC("get_production_price", {
      dbPath: dbPath,
    });
    return res.toArray() as Array<ProductionPriceRow>; // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying ProductionPrice over period:", err);
    throw err;
  }
}

export type ProductionPriceRow = {
  asset: string;
  milestone_year: number;
  assets_production_price: number;
};
