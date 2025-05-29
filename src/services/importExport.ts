import { Table } from "apache-arrow";
import { apacheIPC } from "../gateway/db";

export async function getImport(
  dbPath: string,
  name: string,
): Promise<Table<any>> {
  return apacheIPC("get_import", { dbPath: dbPath, catName: name });
}

export async function getExport(
  dbPath: string,
  name: string,
): Promise<Table<any>> {
  return apacheIPC("get_export", { dbPath: dbPath, catName: name });
}

(window as any).getImport = getImport;
(window as any).getExport = getExport;
