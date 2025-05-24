import { setDbFilePath, triggerDuckDBFileDialog } from "../gateway/io";
import { runQuery } from "../gateway/db";
import { Table } from "apache-arrow";

// File upload operations
export async function uploadDatabaseFile(): Promise<string | null> {
  try {
    const selected = await triggerDuckDBFileDialog();

    if (typeof selected === "string") {
      setDbFilePath(selected);
      return selected;
    }
    return null;
  } catch (error: any) {
    throw new Error(`Error selecting file: ${error.message || error}`);
  }
}

// Database viewer operations
export async function fetchDatabaseTables(): Promise<{
  tables: string[];
  columns: Record<string, string[]>;
}> {
  try {
    // Query to get all tables from the database
    const tablesResult = await executeCustomQuery("SHOW TABLES");
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

    // Fetch columns for each table
    const columnsMap: Record<string, string[]> = {};
    for (const tableName of tableNames) {
      try {
        const columnsResult = await executeCustomQuery(
          `PRAGMA table_info('${tableName}')`,
        );
        const columnNames: string[] = [];

        for (let i = 0; i < columnsResult.numRows; i++) {
          const row = columnsResult.get(i);
          if (row && row.name) {
            columnNames.push(row.name);
          }
        }

        columnsMap[tableName] = columnNames;
      } catch (error) {
        console.error(`Error fetching columns for table ${tableName}:`, error);
      }
    }

    return { tables: tableNames, columns: columnsMap };
  } catch (error) {
    console.error("Error fetching database tables:", error);
    throw error;
  }
}

// Graph data operations
export async function fetchGraphData(
  tableName: string,
  systemVariable: string,
  resolution: string,
  startDate: string | null,
  endDate: string | null,
): Promise<Table<any>> {
  console.log(
    "Fetching graph data for:",
    systemVariable,
    resolution,
    startDate,
    endDate,
  );
  const query = `
    SELECT *
    FROM ${tableName}
    LIMIT 100;
  `;

  return await executeCustomQuery(query);
}

// Execute custom SQL query
export async function executeCustomQuery(query: string): Promise<Table<any>> {
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }
  return await runQuery(query);
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
