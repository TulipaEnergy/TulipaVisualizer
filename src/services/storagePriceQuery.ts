import { genericApacheIPC } from "../gateway/db";

export async function getStoragePrice(
  dbPath: string,
): Promise<StoragePriceRow[]> {
  return genericApacheIPC<StoragePriceRow>("get_storage_price", {
    dbPath: dbPath,
  });
}

export interface StoragePriceRow {
  asset: string;
  milestone_year: number;
  assets_storage_price: number;
}
