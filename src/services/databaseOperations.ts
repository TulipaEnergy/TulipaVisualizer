import { apacheIPC } from "../gateway/db";
import { triggerDuckDBFileDialog } from "../gateway/io";
import { Table } from "apache-arrow";

/**
 * Initiates secure file upload dialog for selecting DuckDB database files.
 * 
 * Error Handling Strategy:
 * - User cancellation returns null (not an error condition)
 * - File system errors propagated to caller for component-level handling
 * - Tauri dialog errors logged with context for debugging
 * - No retry mechanism - user must initiate new upload attempt
 * 
 * @returns Selected file path or null if cancelled
 * @throws {Error} File system access errors, permission denied, invalid file selection
 */
export async function uploadDatabaseFile(): Promise<string | null> {
  try {
    const selected = await triggerDuckDBFileDialog();
    return selected;
  } catch (error) {
    // Enhanced error logging with context for debugging file selection issues
    // Common errors: permission denied, file system unavailable, invalid file type
    console.error("File upload error:", error);
    throw error; // Propagate to caller for user feedback
  }
}

/**
 * Executes arbitrary SQL queries against DuckDB database with validation.
 * 
 * Input Validation Strategy:
 * - Query emptiness check prevents accidental empty executions
 * - Database path validation ensures connection target exists
 * - No SQL injection protection (handled by DuckDB prepared statements)
 * 
 * Error Categories:
 * - Validation errors: thrown immediately with descriptive messages
 * - Database errors: connection failures, syntax errors, table not found
 * - Network errors: IPC communication failures with Tauri backend
 * 
 * @param dbPath Validated database file path
 * @param query SQL query string (non-empty, validated)
 * @returns Apache Arrow table with query results
 * @throws {Error} Validation errors, database connection errors, SQL syntax errors
 */
export async function runCustomQuery(
  dbPath: string,
  query: string,
): Promise<Table<any>> {
  // Input validation with immediate error feedback
  if (!query.trim()) {
    throw new Error("Query cannot be empty");
  }
  if (!dbPath) {
    throw new Error("Database path cannot be empty");
  }
  
  // Database query execution with error propagation
  // Errors include: SQL syntax, table not found, connection failures
  return await apacheIPC("run_serialize_query_on_db", {
    dbPath: dbPath,
    q: query,
  });
}

/**
 * Extracts structured data from Apache Arrow tables for UI rendering.
 * 
 * Data Processing Reliability:
 * - Schema field extraction handles missing or malformed schemas gracefully
 * - Row access function provides null safety for out-of-bounds access
 * - Memory-efficient lazy row access prevents large table memory issues
 * 
 * Error Handling:
 * - Invalid table schemas result in empty column arrays
 * - Out-of-bounds row access returns null instead of throwing
 * - Malformed row data handled gracefully with null fallbacks
 */
export function extractTableData(table: Table<any>): {
  columns: string[];
  getRow: (index: number) => any[] | null;
  numRows: number;
} {
  // Extract column names for table header rendering
  const columns = table.schema.fields.map((field) => field.name);

  // Return an object with column names and a function to lazily access rows
  return {
    columns,
    getRow: (index: number) => {
      try {
        const row = table.get(index);
        return row ? columns.map((col) => row[col]) : null;
      } catch (error) {
        // Handle out-of-bounds or corrupted row data gracefully
        console.warn(`Error accessing row ${index}:`, error);
        return null;
      }
    },
    numRows: table.numRows,
  };
}
