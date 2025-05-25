import { executeCustomQuery } from "./databaseOperations";

const capacityQuery = (
  asset: string,
  startYear: number,
  endYear: number,
): string => {
  return `
    WITH years AS (
        SELECT generate_series AS year FROM generate_series(${startYear}, ${endYear})
    ),
    cum_inv AS (
        SELECT milestone_year, solution
        FROM var_assets_investment
        WHERE asset = '${asset}'
    ),
    cum_dec AS (
        SELECT milestone_year, solution
        FROM var_assets_decommission
        WHERE asset = '${asset}'
    ),
    asset_init AS (
        SELECT initial_units, commission_year FROM asset_both WHERE asset = '${asset}'
    ),
    asset_cap AS (
        SELECT capacity FROM asset WHERE asset = '${asset}'
    )
    SELECT
        y.year,
        (ai.initial_units
        + COALESCE((SELECT SUM(solution) FROM cum_inv iv WHERE iv.milestone_year <= y.year), 0)
        - COALESCE((SELECT SUM(solution) FROM cum_dec dc WHERE dc.milestone_year <= y.year), 0))
        * ac.capacity AS installed_capacity
    FROM years y, asset_init ai, asset_cap ac
    WHERE ai.commission_year <= y.year
    ORDER BY y.year;
  `;
};

export async function fetchCapacityData(
  assetName: string,
  startYear: number,
  endYear: number,
): Promise<{ year: number; installed_capacity: number }[]> {
  try {
    const table = await executeCustomQuery(
      capacityQuery(assetName, startYear, endYear),
    );

    // Convert Apache Arrow Table into JS array
    const rows = table.toArray() as Array<{
      year: number;
      installed_capacity: number;
    }>;

    return rows.map((r) => ({
      year: r.year,
      installed_capacity: r.installed_capacity,
    }));
  } catch (err) {
    console.error("Error querying capacity over period:", err);
    throw err;
  }
}

export function capacityOverPeriodTest(
  assetName: string,
  startYear: number,
  endYear: number,
) {
  (async () => {
    try {
      const table = await executeCustomQuery(
        capacityQuery(assetName, startYear, endYear),
      );

      const yearColumn = table.getChild("year");
      const capacityColumn = table.getChild("installed_capacity");

      if (!yearColumn || !capacityColumn) {
        console.error("Required columns not found in period result");
        return;
      }

      console.log(
        `Installed capacity for asset '${assetName}' from ${startYear} to ${endYear}:`,
      );
      for (let i = 0; i < yearColumn.length; i++) {
        const year = yearColumn.get(i);
        const capacity = capacityColumn.get(i);
        console.log(`Year: ${year}, Capacity: ${capacity}`);
      }
    } catch (err) {
      console.error("Error querying capacity over period:", err);
    }
  })();
}

const assetsQuery = `SELECT asset FROM asset;`;

export async function fetchAssets(): Promise<string[]> {
  try {
    const table = await executeCustomQuery(assetsQuery);
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

const minYearQuery = (asset?: string): string => {
  return `
    WITH
    min_inv AS (
        SELECT MIN(milestone_year) AS year
        FROM var_assets_investment
        WHERE asset = '${asset}'
    ),
    min_dec AS (
        SELECT MIN(milestone_year) AS year
        FROM var_assets_decommission
        WHERE asset = '${asset}'
    ),
    comm AS (
        SELECT commission_year AS year
        FROM asset_both
        WHERE asset = '${asset}'
    )
    SELECT
    LEAST(
        comm.year,
        COALESCE(min_inv.year, comm.year),
        COALESCE(min_dec.year, comm.year)
    ) AS earliest_year
    FROM comm, min_inv, min_dec;
  `;
};

export async function fetchMinYear(asset?: string): Promise<number> {
  try {
    const table = await executeCustomQuery(minYearQuery(asset));
    const col = table.getChild("earliest_year");
    if (!col || col.length == 0) {
      throw new Error("No 'earliest_year' column in response");
    }
    const year = col.get(0);
    if (typeof year !== "number") {
      throw new Error(`Unexpected type for earliest_year: ${typeof year}`);
    }
    return year;
  } catch (err: any) {
    console.error("Failed to fetch min year:", err);
    return 10000;
  }
}

const maxYearQuery = (asset?: string): string => {
  return `
    WITH
    max_inv AS (
        SELECT MAX(milestone_year) AS year
        FROM var_assets_investment
        WHERE asset = '${asset}'
    ),
    max_dec AS (
        SELECT MAX(milestone_year) AS year
        FROM var_assets_decommission
        WHERE asset = '${asset}'
    ),
    comm AS (
        SELECT commission_year AS year
        FROM asset_both
        WHERE asset = '${asset}'
    )
    SELECT
    GREATEST(
        comm.year,
        COALESCE(max_inv.year, comm.year),
        COALESCE(max_dec.year, comm.year)
    ) AS latest_year
    FROM comm, max_inv, max_dec;
  `;
};

export async function fetchMaxYear(asset?: string): Promise<number> {
  try {
    const table = await executeCustomQuery(maxYearQuery(asset));
    const col = table.getChild("latest_year");
    if (!col || col.length == 0) {
      throw new Error("No 'latest_year' column in response");
    }
    const year = col.get(0);
    if (typeof year !== "number") {
      throw new Error(`Unexpected type for latest_year: ${typeof year}`);
    }
    return year;
  } catch (err: any) {
    console.error("Failed to fetch max year:", err);
    return 0;
  }
}

if (typeof window !== "undefined") {
  (window as any).capacityOverPeriodTest = capacityOverPeriodTest;
}
