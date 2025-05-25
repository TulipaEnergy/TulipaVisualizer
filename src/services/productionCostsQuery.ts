import { executeCustomQuery, extractTableData } from "./databaseOperations";

const PRODUCTION_COSTS_QUERY = `SELECT am.asset, am.milestone_year AS milestone_year,
SUM(
	am.units_on_cost * v.solution * (v.time_block_end - v.time_block_start + 1) * d.resolution
) AS assets_production_cost
FROM
	asset_milestone AS am
JOIN
	var_units_on AS v ON v.asset = am.asset AND v.year = am.milestone_year
JOIN
	rep_periods_data AS d ON d.year = v.year AND d.rep_period = v.rep_period

GROUP BY
	am.milestone_year,
	am.asset;`;

export async function getProductionCost(): Promise<ProductionCostRow[]> {
  const raw_table = await executeCustomQuery(PRODUCTION_COSTS_QUERY);
  const { columns, getRow, numRows } = extractTableData(raw_table);
  const data: ProductionCostRow[] = [];

  for (let i = 0; i < numRows; i++) {
    const row = getRow(i);
    if (row) {
      const rowObject: ProductionCostRow = {
        milestone_year: row[columns.indexOf("milestone_year")],
        asset: row[columns.indexOf("asset")],
        assets_production_cost: row[columns.indexOf("assets_production_cost")],
      };
      data.push(rowObject);
    }
  }
  return data;
}

export interface ProductionCostRow {
  milestone_year: number;
  asset: string;
  assets_production_cost: number;
}
