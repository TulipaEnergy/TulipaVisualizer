import { executeCustomQuery, extractTableData } from "./databaseOperations";

const STORAGE_PRICE_QUERY = `SELECT st.asset,
st.year AS milestone_year,
SUM(-st.dual_balance_storage_rep_period * (st.time_block_end - st.time_block_start + 1) * d.resolution * m.weight
) AS assets_storage_price
FROM cons_balance_storage_rep_period AS st
JOIN
	rep_periods_mapping AS m ON m.year = st.year AND m.rep_period = st.rep_period
JOIN
	rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
GROUP BY
	st.year,
	st.asset;`;

export async function getStoragePice(): Promise<StoragePriceRow[]> {
  const raw_table = await executeCustomQuery(STORAGE_PRICE_QUERY);
  const { columns, getRow, numRows } = extractTableData(raw_table);
  const data: StoragePriceRow[] = [];

  for (let i = 0; i < numRows; i++) {
    const row = getRow(i);
    if (row) {
      const rowObject: StoragePriceRow = {
        milestone_year: row[columns.indexOf("milestone_year")],
        asset: row[columns.indexOf("asset")],
        assets_storage_price: row[columns.indexOf("assets_storage_price")],
      };
      data.push(rowObject);
    }
  }
  return data;
}

export interface StoragePriceRow {
  milestone_year: number;
  asset: string;
  assets_storage_price: number;
}
