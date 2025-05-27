import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

export async function runQuery(s: String): Promise<Table<any>> {
  return apacheIPC("run_serialize_query", { q: s });
}

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
    let table: Table<any> = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Re-throw for proper error handling by the caller
  }
}

export function runTest() {
  (async () => {
    let t = await runQuery("SHOW TABLES");

    console.log(t);
    for (const row of t) {
      console.log(row.toArray()); // view each row
    }
  })();
}

if (typeof window !== "undefined") {
  (window as any).runTest = runTest;
}

if (typeof window !== "undefined") {
  (window as any).runTest = runTest;
}
