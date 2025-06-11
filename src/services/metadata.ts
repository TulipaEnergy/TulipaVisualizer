import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";
import { MetadataTrees } from "../types/metadata";

export async function getAssets(dbPath: string): Promise<string[]> {
  try {
    let res: Table<any> = await apacheIPC("get_assets", { dbPath: dbPath });
    return (res.toArray() as Array<AssetJson>).map((item) => item.asset); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying assets:", err);
    throw err;
  }
}

type AssetJson = {
  asset: string;
};

export async function getTables(dbPath: String): Promise<string[]> {
  try {
    let res: Table<any> = await apacheIPC("get_tables", { dbPath: dbPath });
    return (res.toArray() as Array<TableJson>).map((item) => item.name); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying tables:", err);
    throw err;
  }
}

// TODO use actual data
export async function getAllMetadata(): Promise<MetadataTrees> {
  const mockData: MetadataTrees = {
    location: {
      key: "1",
      label: "location",
      children: [
        {
          key: "2",
          label: "Netherlands",
          children: [
            { key: "4", label: "South Holland", children: [] },
            { key: "5", label: "North Holland", children: [] },
          ],
        },
        {
          key: "3",
          label: "Belgium",
          children: [{ key: "6", label: "Antwerp", children: [] }],
        },
      ],
    },
    technology: {
      key: "7",
      label: "technology",
      children: [
        {
          key: "8",
          label: "renewables",
          children: [
            { key: "10", label: "solar", children: [] },
            { key: "11", label: "wind", children: [] },
          ],
        },
        {
          key: "9",
          label: "fossil",
          children: [
            {
              key: "12",
              label: "ccgt",
              children: [
                { key: "17", label: "ccgt-a", children: [] },
                { key: "18", label: "ccgt-b", children: [] },
              ],
            },
            { key: "13", label: "coal", children: [] },
            { key: "14", label: "gas", children: [] },
            { key: "15", label: "oil", children: [] },
            { key: "16", label: "nuclear", children: [] },
          ],
        },
      ],
    },
    //   technology2: {
    //     key: "7",
    //     label: "technology",
    //     children: [
    //       {
    //         key: "8",
    //         label: "renewables",
    //         children: [
    //           { key: "10", label: "solar", children: [] },
    //           { key: "11", label: "wind", children: [] },
    //         ],
    //       },
    //       {
    //         key: "9",
    //         label: "fossil",
    //         children: [
    //           {
    //             key: "12",
    //             label: "ccgt",
    //             children: [
    //               { key: "17", label: "ccgt-a", children: [] },
    //               { key: "18", label: "ccgt-b", children: [] },
    //             ],
    //           },
    //           { key: "13", label: "coal", children: [] },
    //           { key: "14", label: "gas", children: [] },
    //           { key: "15", label: "oil", children: [] },
    //           { key: "16", label: "nuclear", children: [] },
    //         ],
    //       },
    //     ],
    //   },
    //   technology3: {
    //     key: "7",
    //     label: "technology",
    //     children: [
    //       {
    //         key: "8",
    //         label: "renewables",
    //         children: [
    //           { key: "10", label: "solar", children: [] },
    //           { key: "11", label: "wind", children: [] },
    //         ],
    //       },
    //       {
    //         key: "9",
    //         label: "fossil",
    //         children: [
    //           {
    //             key: "12",
    //             label: "ccgt",
    //             children: [
    //               { key: "17", label: "ccgt-a", children: [] },
    //               { key: "18", label: "ccgt-b", children: [] },
    //             ],
    //           },
    //           { key: "13", label: "coal", children: [] },
    //           { key: "14", label: "gas", children: [] },
    //           { key: "15", label: "oil", children: [] },
    //           { key: "16", label: "nuclear", children: [] },
    //         ],
    //       },
    //     ],
    //   },
    //   technology4: {
    //     key: "7",
    //     label: "technology",
    //     children: [
    //       {
    //         key: "8",
    //         label: "renewables",
    //         children: [
    //           { key: "10", label: "solar", children: [] },
    //           { key: "11", label: "wind", children: [] },
    //         ],
    //       },
    //       {
    //         key: "9",
    //         label: "fossil",
    //         children: [
    //           {
    //             key: "12",
    //             label: "ccgt",
    //             children: [
    //               { key: "17", label: "ccgt-a", children: [] },
    //               { key: "18", label: "ccgt-b", children: [] },
    //             ],
    //           },
    //           { key: "13", label: "coal", children: [] },
    //           { key: "14", label: "gas", children: [] },
    //           { key: "15", label: "oil", children: [] },
    //           { key: "16", label: "nuclear", children: [] },
    //         ],
    //       },
    //     ],
    //   },
  };
  return Promise.resolve(mockData);
}

type TableJson = {
  name: string;
};
