import { executeCustomQuery, extractTableData } from "./databaseOperations";

const TRANSPORTATION_PRICE_QUERY = (carrier: string): string => {
  return `
    SELECT
    tr.year AS milestone_year,
    tr.from_asset || ' -> ' || tr.to_asset AS route,
    SUM(
        -tr.dual_max_transport_flow_limit_simple_method * (tr.time_block_end - tr.time_block_start + 1) * d.resolution * m.weight
    ) AS flows_transportation_price
    FROM
        cons_transport_flow_limit_simple_method AS tr
    JOIN
        rep_periods_mapping AS m ON m.year = tr.year AND m.rep_period = tr.rep_period
    JOIN
        rep_periods_data AS d ON d.year = m.year AND d.rep_period = m.rep_period
    JOIN
        flow AS f ON f.from_asset = tr.from_asset AND f.to_asset = tr.to_asset
    WHERE
        f.is_transport = TRUE AND f.carrier = '${carrier}'
    GROUP BY
        tr.year,
        route;`;
};

export async function getTransportationPrice(
  carrier: string,
): Promise<TransportationPriceRow[]> {
  const raw_table = await executeCustomQuery(
    TRANSPORTATION_PRICE_QUERY(carrier),
  );
  const { columns, getRow, numRows } = extractTableData(raw_table);
  const data: TransportationPriceRow[] = [];

  for (let i = 0; i < numRows; i++) {
    const row = getRow(i);
    if (row) {
      const rowObject: TransportationPriceRow = {
        milestone_year: row[columns.indexOf("milestone_year")],
        route: row[columns.indexOf("route")],
        flows_transportation_price:
          row[columns.indexOf("flows_transportation_price")],
      };
      data.push(rowObject);
    }
  }
  return data;
}

export interface TransportationPriceRow {
  milestone_year: number;
  route: string;
  flows_transportation_price: number;
}
