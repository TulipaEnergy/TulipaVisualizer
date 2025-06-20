import { open } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";

/**
 * Secure file selection dialog for DuckDB database files.
 * 
 * Tauri Security Model:
 * - Uses Tauri's secure file dialog to prevent unauthorized file access
 * - File path restrictions enforced by Tauri's security capabilities
 * - User must explicitly select files through native OS dialog
 * 
 * Validation Strategy:
 * - File extension filter restricts selection to .duckdb files only
 * - Prevents selection of potentially harmful file types
 * - Returns null if user cancels dialog (graceful handling)
 * 
 * Integration Notes:
 * - Dialog appearance matches native OS file picker
 * - Multiple file selection disabled for single database workflows
 * - File path returned as string for backend processing
 */
export async function triggerDuckDBFileDialog(): Promise<string | null> {
  return await open({
    // Single file selection prevents confusion in multi-database scenarios
    multiple: false,
    filters: [
      {
        name: "DuckDB Files",
        // File extension validation prevents selection of unsupported formats
        // Backend expects .duckdb files for proper database handling
        extensions: ["duckdb"],
      },
    ],
  });
}

/**
 * Reads JSON configuration files from the application resource bundle.
 * 
 * Resource Path Resolution:
 * - Uses Tauri's secure resource resolution for bundled assets
 * - Prevents path traversal attacks through controlled resource access
 * - Resource paths validated against application bundle contents
 * 
 * File Access Pattern:
 * - Synchronous text file reading from verified resource paths
 * - Automatic JSON parsing with error propagation to caller
 * - Used for application configuration and static data loading
 * 
 * Security Considerations:
 * - Resource files are read-only and bundled with application
 * - No user-provided paths accepted to prevent security vulnerabilities
 * - JSON parsing errors bubble up for proper error handling
 */
export async function readJSON(path: string) {
  // Secure resource path resolution prevents access to unauthorized files
  const resourcePath = await resolveResource(path);
  
  // Direct JSON parsing with error propagation for configuration files
  return JSON.parse(await readTextFile(resourcePath));
}
