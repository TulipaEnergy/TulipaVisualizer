import { executeCustomQueryOnDatabase } from "./databaseOperations";

const capacityQuery = (
  asset: string,
  startYear: number,
  endYear: number,
): string => {
  return `
    WITH years AS (
    SELECT DISTINCT year
    FROM (
      SELECT commission_year AS year
      FROM asset_both
      WHERE asset = '${asset}'
      UNION
      SELECT milestone_year AS year
      FROM var_assets_investment
      WHERE asset = '${asset}'
      UNION
      SELECT milestone_year AS year
      FROM var_assets_decommission
      WHERE asset = '${asset}'
    ) t
    WHERE year BETWEEN ${startYear} AND ${endYear}
  )
  SELECT y.year, COALESCE(i.solution, -1) AS investment, COALESCE(d.solution, -1) AS decommission,
    (
      (SELECT COALESCE(SUM(initial_units), 0)
      FROM asset_both
      WHERE asset = '${asset}'
        AND commission_year <= y.year)
      + (SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_investment
        WHERE asset = '${asset}'
          AND milestone_year <= y.year)
      - (SELECT COALESCE(SUM(solution), 0)
        FROM var_assets_decommission
        WHERE asset = '${asset}'
          AND milestone_year <= y.year)
    ) * (SELECT capacity
        FROM asset
        WHERE asset = '${asset}'
        ) AS installed_capacity
  FROM years y
  LEFT JOIN var_assets_investment AS i
    ON i.asset = '${asset}' AND i.milestone_year = y.year
  LEFT JOIN var_assets_decommission AS d
    ON d.asset = '${asset}' AND d.milestone_year = y.year
  ORDER BY y.year;
  `;
};

export async function fetchCapacityData(
  assetName: string,
  startYear: number,
  endYear: number,
  db: string,
): Promise<
  {
    year: number;
    investment: number;
    decommission: number;
    installed_capacity: number;
  }[]
> {
  try {
    const table = await executeCustomQueryOnDatabase(
      db,
      capacityQuery(assetName, startYear, endYear),
    );

    // Convert Apache Arrow Table into JS array
    const rows = table.toArray() as Array<{
      year: number;
      investment: number;
      decommission: number;
      installed_capacity: number;
    }>;

    return rows.map((r) => ({
      year: r.year,
      investment: r.investment,
      decommission: r.decommission,
      installed_capacity: r.installed_capacity,
    }));
  } catch (err) {
    console.error("Error querying capacity over period:", err);
    throw err;
  }
}

// TO BE MOVED IN TESTING FILE AFTER BACKEND REFACTOR
// export function capacityOverPeriodTest(
//   assetName: string,
//   startYear: number,
//   endYear: number,
// ) {
//   (async () => {
//     try {
//       const table = await executeCustomQuery(
//         capacityQuery(assetName, startYear, endYear),
//       );

//       const yearColumn = table.getChild("year");
//       const capacityColumn = table.getChild("installed_capacity");

//       if (!yearColumn || !capacityColumn) {
//         console.error("Required columns not found in period result");
//         return;
//       }

//       console.log(
//         `Installed capacity for asset '${assetName}' from ${startYear} to ${endYear}:`,
//       );
//       for (let i = 0; i < yearColumn.length; i++) {
//         const year = yearColumn.get(i);
//         const capacity = capacityColumn.get(i);
//         console.log(`Year: ${year}, Capacity: ${capacity}`);
//       }
//     } catch (err) {
//       console.error("Error querying capacity over period:", err);
//     }
//   })();
// }

const assetsQuery = `SELECT asset FROM asset;`;

export async function fetchAssets(databasePath: string): Promise<string[]> {
  try {
    const table = await executeCustomQueryOnDatabase(databasePath, assetsQuery);
    const assetColumn = table.getChild("asset");
    if (!assetColumn) {
      throw new Error("No 'asset' column in response");
    }
    return assetColumn.toArray() as string[];
  } catch (err: any) {
    console.error("Failed to fetch assets:", err);
    return [];
  }
}

const availableYearsQuery = (asset?: string): string => {
  return `
    SELECT DISTINCT year FROM (
      SELECT commission_year AS year, asset FROM asset_both
      UNION
      SELECT milestone_year AS year, asset FROM var_assets_investment
      UNION
      SELECT milestone_year AS year, asset FROM var_assets_decommission
    ) t
    ${asset ? `WHERE asset = '${asset}'` : ""}
    ORDER BY year;
  `;
};

export async function fetchAvailableYears(
  db: string,
  asset: string,
): Promise<number[]> {
  try {
    const query = availableYearsQuery(asset);
    const table = await executeCustomQueryOnDatabase(db, query);
    const yearColumn = table.getChild("year");
    if (!yearColumn) {
      throw new Error("No 'year' column in available years response");
    }
    return yearColumn.toArray() as number[];
  } catch (err: any) {
    console.error("Failed to fetch available years:", err);
    return [];
  }
}
