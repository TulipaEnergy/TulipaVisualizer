import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

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

type TableJson = {
  name: string;
};
