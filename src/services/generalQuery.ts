import { invoke } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

export async function run_query(s: String): Promise<Table<any>> {
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

// Utility function to get column names and provide lazy access to table data
export function extractTableData(table: Table<any>): {
  columns: string[];
  getRow: (index: number) => any[] | null;
  numRows: number;
} {
  // Extract column names
  const columns = table.schema.fields.map((field) => field.name);

  // Return an object with column names and a function to lazily access rows
  return {
    columns,
    getRow: (index: number) => {
      const row = table.get(index);
      return row ? columns.map((col) => row[col]) : null;
    },
    numRows: table.numRows,
  };
}

export function runTest() {
  (async () => {
    let t = await run_query("SHOW TABLES");

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
