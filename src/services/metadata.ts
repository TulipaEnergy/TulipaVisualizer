import { Table } from "apache-arrow";
import { apacheIPC, genericApacheIPC } from "../gateway/db";
import { MetaTreeRootsByCategoryName } from "../types/metadata";
import { TreeNode } from "primereact/treenode";

type CategoryRow = {
  id: number;
  name: string;
  parent_id: number;
  level: number;
};

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

export async function getAllMetadata(
  dbPath: string,
): Promise<MetaTreeRootsByCategoryName> {
  try {
    const categories = await genericApacheIPC<CategoryRow>("get_categories", {
      dbPath,
    });

    const res: MetaTreeRootsByCategoryName = {};
    const nodeMap: Map<number, TreeNode> = new Map();

    categories.forEach((i) => {
      const newNode: TreeNode = {
        key: i.id,
        label: i.name,
        children: [],
      };
      nodeMap.set(i.id, newNode);
    });

    categories.forEach((i) => {
      const currentNode = nodeMap.get(i.id)!;

      if (i.level === -1) {
        // This is a root category
        res[i.name] = currentNode;
      } else {
        // This is a child category
        const parentNode = nodeMap.get(i.parent_id);
        if (parentNode) {
          // Parent found, add current node to its children
          parentNode.children!.push(currentNode); // ! because we initialized children in the first pass
        } else {
          // Handle error: parent not found. This means an invalid parent_id or a circular reference.
          console.warn(
            `Parent with ID ${i.parent_id} not found for category "${i.name}". Treating as a root.`,
          );
          res[i.name] = currentNode; // Add it as a new root if its parent is missing
        }
      }
    });

    return res;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return {};
  }
}

export function mustGetKey(n: TreeNode): number {
  return n.key! as number;
}

export async function hasMetadata(dbPath: string): Promise<boolean> {
  const ress = await genericApacheIPC<{
    has_category: boolean;
    has_asset_category: boolean;
  }>("has_metadata", {
    dbPath,
  });
  return ress[0]?.has_category && ress[0]?.has_asset_category;
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
