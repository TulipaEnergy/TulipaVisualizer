import { invoke, InvokeArgs } from "@tauri-apps/api/core";
import { tableFromIPC, Table } from "apache-arrow";

/**
 * Invokes Tauri backend commands that return Apache Arrow data format.
 *
 * Tauri IPC Integration:
 * - Uses Tauri's invoke function for secure frontend-backend communication
 * - Handles binary data transfer using ArrayBuffer for performance
 * - Converts binary data to Apache Arrow columnar format for efficient processing
 *
 * Data Serialization Process:
 * 1. Rust backend serializes query results to Apache Arrow format
 * 2. Data transferred as binary ArrayBuffer across IPC boundary
 * 3. Frontend deserializes binary data back to Apache Arrow Table
 * 4. Table provides columnar data access with type safety
 *
 * Error Handling Strategy:
 * - Preserves backend error context while adding frontend debugging info
 * - Logs detailed error information for development troubleshooting
 * - Re-throws errors to allow component-level error handling
 */
export async function apacheIPC(
  cmd: string,
  args?: InvokeArgs,
): Promise<Table<any>> {
  try {
    // Secure IPC call to Rust backend with binary response handling
    const buffer = await invoke<ArrayBuffer>(cmd, args);
    const byteArr = new Uint8Array(buffer);

    // Apache Arrow deserialization from binary IPC format
    // Converts columnar binary data to queryable table structure
    const table = tableFromIPC(byteArr);
    return table;
  } catch (error) {
    console.error(
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)}:\n`,
      error,
    );
    throw error;
  }
}

/**
 * Generic wrapper for Apache Arrow IPC calls with automatic JavaScript object conversion.
 *
 * Type-Safe Data Conversion:
 * - Converts Apache Arrow Table to typed JavaScript array
 * - Maintains type safety through TypeScript generics
 * - Handles columnar-to-row format transformation automatically
 *
 * Use Cases:
 * - Simple data queries that need JavaScript object arrays
 * - Type-safe database query results for React components
 * - Automatic conversion for standard CRUD operations
 *
 * Performance Considerations:
 * - Arrow format is efficient for large datasets
 * - Conversion to JavaScript objects has memory overhead
 * - Prefer raw Apache Arrow tables for large data visualization
 */
export async function genericApacheIPC<T>(
  cmd: string,
  args?: InvokeArgs,
): Promise<T[]> {
  try {
    const table = await apacheIPC(cmd, args);
    // Manual conversion from columnar Arrow format to JavaScript objects
    // Required because Arrow's toArray() doesn't automatically infer types
    return table.toArray() as Array<T>;
  } catch (error) {
    console.error(
      `Error calling endpoint ${cmd}, with args: ${JSON.stringify(args)} and casting result:\n`,
      error,
    );
    throw error;
  }
}
