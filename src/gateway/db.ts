import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

export async function getImport(name: string): Promise<Table<any>> {
  return apacheIPC("get_import", { catName: name });
}

export async function getExport(name: string): Promise<Table<any>> {
  return apacheIPC("get_export", { catName: name });
}

(window as any).getImport = getImport;
(window as any).getExport = getExport;

// helper to abstract from invoke and IPC
async function apacheIPC(cmd: string, args?: InvokeArgs): Promise<Table<any>> {
  try {
    let buffer = await invoke<ArrayBuffer>(cmd, args);
    let byteArr = new Uint8Array(buffer);
    let table = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}

// New function that can query a specific database by path
export async function runQueryOnDatabase(
  databasePath: string,
  query: string,
): Promise<Table<any>> {
  try {
    let buffer = await invoke<ArrayBuffer>("run_serialize_query_on_db", {
      dbPath: databasePath,
      q: query,
    });
    let byteArr = new Uint8Array(buffer);
    let table = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error(`Error executing query on database ${databasePath}:`, error);
    throw error;
  }
}
