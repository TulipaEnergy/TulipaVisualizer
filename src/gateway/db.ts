import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

export async function runQuery(s: String): Promise<Table<any>> {
  try {
    let buffer = await invoke<ArrayBuffer>("run_serialize_query", { q: s });
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
