import { genericApacheIPC } from "../gateway/db";

export async function getProductionPrice(
  dbPath: string,
): Promise<ProductionPriceRow[]> {
  return genericApacheIPC<ProductionPriceRow>("get_production_price", {
    dbPath: dbPath,
  });
}

export type ProductionPriceRow = {
  asset: string;
  milestone_year: number;
  assets_production_price: number;
};
