import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

export async function getTransportationPrice(
  dbPath: string,
  carrier: string,
): Promise<TransportationPriceRow[]> {
  try {
    let res: Table<any> = await apacheIPC("get_transportation_price", {
      dbPath: dbPath,
      carrier: carrier,
    });
    return res.toArray() as Array<TransportationPriceRow>; // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying transporation price:", err);
    throw err;
  }
}

export interface TransportationPriceRow {
  milestone_year: number;
  route: string;
  flows_transportation_price: number;
}
