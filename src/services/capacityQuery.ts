import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

export async function run_capacity_query(
  s: String,
  y: number,
): Promise<Table<any>> {
  let buffer = await invoke<ArrayBuffer>("get_capacity_at_year", {
    asset: s,
    year: y,
  });
  let byteArr = new Uint8Array(buffer);
  let table: Table<any> = tableFromIPC(byteArr);
  return table;
}

export function capacityTest(assetName: String, year: number) {
  (async () => {
    try {
      const table = await run_capacity_query(assetName, year);

      const assetColumn = table.getChild("asset");
      const capacityColumn = table.getChild("installed_capacity");

      if (!assetColumn || !capacityColumn) {
        console.error("Required columns not found");
        return;
      }

      const asset = assetColumn.get(0);
      const capacity = capacityColumn.get(0);

      console.log(`Asset: ${asset}, Capacity in ${year}: ${capacity}`);
    } catch (err) {
      console.error("Error querying capacity:", err);
    }
  })();
}

export async function run_capacity_over_period_query(
  assetName: String,
  startYear: number,
  endYear: number,
): Promise<Table<any>> {
  let buffer = await invoke<ArrayBuffer>("get_capacity_over_period", {
    asset: assetName,
    startYear: startYear,
    endYear: endYear,
  });
  let byteArr = new Uint8Array(buffer);
  let table: Table<any> = tableFromIPC(byteArr);
  return table;
}

export function capacityOverPeriodTest(
  assetName: String,
  startYear: number,
  endYear: number,
) {
  (async () => {
    try {
      const table = await run_capacity_over_period_query(
        assetName,
        startYear,
        endYear,
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

if (typeof window !== "undefined") {
  (window as any).capacityTest = capacityTest;
  (window as any).capacityOverPeriodTest = capacityOverPeriodTest;
}
