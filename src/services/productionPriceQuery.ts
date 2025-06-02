import { genericApacheIPC } from "../gateway/db";

export async function getProductionPrice(
  dbPath: string,
): Promise<ProductionPriceRow[]> {
  return genericApacheIPC<ProductionPriceRow>("get_production_price", {
    dbPath: dbPath,
  });
}

export async function getProductionPricePeriod(
  dbPath: string,
): Promise<ProductionPricePeriodRow[]> {
  return genericApacheIPC<ProductionPricePeriodRow>(
    "get_production_price_period",
    {
      dbPath: dbPath,
    },
  );
}

export type ProductionPriceRow = {
  asset: string;
  milestone_year: number;
  assets_production_price: number;
};

export type ProductionPricePeriodRow = {
  asset: string;
  milestone_year: number;
  period: number;
  length: number;
  y_axis: number;
};
