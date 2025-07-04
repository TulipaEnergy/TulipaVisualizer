import { apacheIPC } from "../gateway/db";
import { triggerDuckDBFileDialog } from "../gateway/io";
import { Table } from "apache-arrow";

// File upload operations
export async function uploadDatabaseFile(): Promise<string | null> {
  try {
    const selected = await triggerDuckDBFileDialog();
    return selected;
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}

// Execute custom SQL query on a specific database by path
export async function runCustomQuery(
  dbPath: string,
  query: string,
): Promise<Table<any>> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }
  if (!dbPath) {
    throw new Error("Database path cannot be empty");
  }
  return await apacheIPC("run_serialize_query_on_db", {
    dbPath: dbPath,
    q: query,
  });
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
