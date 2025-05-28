import { triggerDuckDBFileDialog } from "../gateway/io";
import { runQueryOnDatabase } from "../gateway/db";
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

// Fetch database tables from a specific database
export async function fetchDatabaseTablesFromPath(
  databasePath: string,
): Promise<{
  tables: string[];
}> {
  try {
    // Query to get all tables from the specific database
    const tablesResult = await executeCustomQueryOnDatabase(
      databasePath,
      "SHOW TABLES",
    );
    const tableNames: string[] = [];
    const schema = tablesResult.schema;
    const tableNameColumn = schema.fields[0].name;

    // Extract table names
    for (let i = 0; i < tablesResult.numRows; i++) {
      const row = tablesResult.get(i);
      if (row && row[tableNameColumn]) {
        tableNames.push(row[tableNameColumn]);
      }
    }

    return {
      tables: tableNames,
    };
  } catch (error) {
    console.error("Error fetching database tables:", error);
    throw error;
  }
}

// Execute custom SQL query on a specific database by path
export async function executeCustomQueryOnDatabase(
  databasePath: string,
  query: string,
): Promise<Table<any>> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }
  if (!databasePath) {
    throw new Error("Database path cannot be empty");
  }
  return await runQueryOnDatabase(databasePath, query);
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
