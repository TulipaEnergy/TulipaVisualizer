import { genericApacheIPC } from "../gateway/db";

export async function getTransportationPrice(
  dbPath: string,
  carrier: string,
): Promise<TransportationPriceRow[]> {
  return genericApacheIPC<TransportationPriceRow>("get_transportation_price", {
    dbPath: dbPath,
    carrier: carrier,
  });
}

export interface TransportationPriceRow {
  milestone_year: number;
  route: string;
  flows_transportation_price: number;
}
