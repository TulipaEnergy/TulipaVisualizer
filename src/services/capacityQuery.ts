import { Table } from "apache-arrow";
import { apacheIPC, genericApacheIPC } from "../gateway/db";

export async function getCapacity(
  dbPath: string,
  assetName: string,
  startYear: number,
  endYear: number,
): Promise<CapacityJson[]> {
  return genericApacheIPC<CapacityJson>("get_capacity", {
    dbPath: dbPath,
    assetName: assetName,
    startYear: startYear,
    endYear: endYear,
  });
}

type CapacityJson = {
  year: number;
  investment: number;
  decommission: number;
  initial_capacity: number;
  final_capacity: number;
};

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

export async function fetchAvailableYears(
  dbPath: string,
  assetName: string,
): Promise<number[]> {
  try {
    let res: Table<any> = await apacheIPC("get_available_years", {
      dbPath: dbPath,
      assetName: assetName,
    });
    return (res.toArray() as Array<YearJson>).map((item) => item.year); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying year:", err);
    throw err;
  }
}

type YearJson = {
  year: number;
};
