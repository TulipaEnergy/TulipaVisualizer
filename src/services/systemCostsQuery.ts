import {
  executeCustomQueryOnDatabase,
  extractTableData,
} from "./databaseOperations";

const FIXED_ASSET_COSTS_QUERY = `SELECT
    yd.year AS milestone_year,
    a.asset,
    SUM(
        a.discount_rate * a.capacity * ac.fixed_cost * ab.initial_units
        +
        CASE
            WHEN a.type = 'storage' THEN
                a.discount_rate * a.capacity_storage_energy * ac.fixed_cost_storage_energy * ab.initial_storage_units
            ELSE
                0
        END
    ) AS assets_fixed_cost
FROM
    year_data AS yd
JOIN
    asset_both AS ab ON ab.milestone_year = yd.year
JOIN
    asset AS a ON ab.asset = a.asset
JOIN
    asset_commission AS ac ON a.asset = ac.asset
WHERE
    yd.is_milestone = TRUE
AND yd.year BETWEEN ab.commission_year AND (ab.commission_year + a.technical_lifetime)
GROUP BY
    yd.year,
    a.asset;
`;

export async function getSystemCost(
  databasePath: string,
): Promise<FixedAssetCostRow[]> {
  const raw_table = await executeCustomQueryOnDatabase(
    databasePath,
    FIXED_ASSET_COSTS_QUERY,
  );

  const { columns, getRow, numRows } = extractTableData(raw_table);
  const data: FixedAssetCostRow[] = [];

  for (let i = 0; i < numRows; i++) {
    const row = getRow(i);
    if (row) {
      const rowObject: FixedAssetCostRow = {
        milestone_year: row[columns.indexOf("milestone_year")],
        asset: row[columns.indexOf("asset")],
        assets_fixed_cost: row[columns.indexOf("assets_fixed_cost")],
      };
      data.push(rowObject);
    }
  }
  return data;
}

export interface FixedAssetCostRow {
  milestone_year: number;
  asset: string;
  assets_fixed_cost: number;
}
