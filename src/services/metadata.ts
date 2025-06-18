import { Table } from "apache-arrow";
import { apacheIPC, genericApacheIPC } from "../gateway/db";
import { MetaTreeRootsByCategoryName } from "../types/metadata";
import { TreeNode } from "primereact/treenode";

export async function getAssets(dbPath: string): Promise<string[]> {
  try {
    const res: Table<any> = await apacheIPC("get_assets", { dbPath: dbPath });
    return (res.toArray() as Array<AssetJson>).map((item) => item.asset); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying assets:", err);
    throw err;
  }
}

type AssetJson = {
  asset: string;
};

export async function getTables(dbPath: string): Promise<string[]> {
  try {
    const res: Table<any> = await apacheIPC("get_tables", { dbPath: dbPath });
    return (res.toArray() as Array<{ name: string }>).map((item) => item.name); // Convert Apache Arrow Table into JS array
  } catch (err) {
    console.error("Error querying tables:", err);
    throw err;
  }
}

// TODO use actual data
export async function getAllMetadata(): Promise<MetaTreeRootsByCategoryName> {
  const mockData: MetaTreeRootsByCategoryName = {
    location: {
      key: 1,
      label: "location",
      children: [
        {
          key: 2,
          label: "Netherlands",
          children: [
            { key: 4, label: "South Holland", children: [] },
            { key: 5, label: "North Holland", children: [] },
          ],
        },
        {
          key: 3,
          label: "Belgium",
          children: [{ key: 6, label: "Antwerp", children: [] }],
        },
      ],
    },
    technology: {
      key: 7,
      label: "technology",
      children: [
        {
          key: 8,
          label: "renewables",
          children: [
            { key: 10, label: "solar", children: [] },
            {
              key: 11,
              label: "wind",
              children: [
                { key: 14, label: "off-shore", children: [] },
                { key: 15, label: "on-shore", children: [] },
              ],
            },
          ],
        },
        {
          key: 9,
          label: "fossil",
          children: [
            {
              key: 12,
              label: "ccgt",
              children: [],
            },
            { key: 13, label: "nuclear", children: [] },
          ],
        },
      ],
    },
  };
  return Promise.resolve(mockData);
}

export function mustGetKey(n: TreeNode): number {
  return n.key! as number;
}

export async function hasMetadata(dbPath: string): Promise<boolean> {
  console.log(dbPath);
  let res: boolean = false;
  if (dbPath.endsWith("Enhanced.duckdb")) {
    res = true;
  }
  return Promise.resolve(res);
}

export async function getAssetsCarriers(
  dbPath: string,
): Promise<{ carrier: string }[]> {
  return genericApacheIPC<{ carrier: string }>("get_assets_carriers", {
    dbPath: dbPath,
  });
}

export async function getYears(dbPath: string): Promise<{ year: number }[]> {
  return genericApacheIPC<{ year: number }>("get_years", {
    dbPath: dbPath,
  });
}
