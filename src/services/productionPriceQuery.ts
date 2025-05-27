import { executeCustomQuery, extractTableData } from "./databaseOperations";

const PRODUCTION_PRICE_QUERY = `SELECT
bc.asset,
bc.year AS milestone_year,
SUM(bc.dual_balance_consumer * (bc.time_block_end - time_block_start + 1) * d.resolution * m.weight
) AS assets_production_price
	

FROM cons_balance_consumer as bc
JOIN
	rep_periods_mapping AS m ON m.year = bc.year AND m.rep_period = bc.rep_period
JOIN
	rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
GROUP BY
	bc.year,
	bc.asset;`;

export async function getProductionPrice(): Promise<ProductionPriceRow[]> {
  const raw_table = await executeCustomQuery(PRODUCTION_PRICE_QUERY);
  const { columns, getRow, numRows } = extractTableData(raw_table);
  const data: ProductionPriceRow[] = [];

  for (let i = 0; i < numRows; i++) {
    const row = getRow(i);
    if (row) {
      const rowObject: ProductionPriceRow = {
        milestone_year: row[columns.indexOf("milestone_year")],
        asset: row[columns.indexOf("asset")],
        assets_production_price:
          row[columns.indexOf("assets_production_price")],
      };
      data.push(rowObject);
    }
  }
  return data;
}

export interface ProductionPriceRow {
  milestone_year: number;
  asset: string;
  assets_production_price: number;
}
