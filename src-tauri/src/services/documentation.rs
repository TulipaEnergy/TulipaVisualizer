/**
 * Documentation file reading service for the Energy Model Visualizer.
 * 
 * This module provides functionality to read markdown documentation files
 * from the repository and serve them to the frontend for display in the
 * documentation modal.
 * 
 * ## Features
 * 
 * - **Security**: Only allows reading from whitelisted documentation paths
 * - **Error Handling**: Proper error handling for missing or inaccessible files
 * - **File Validation**: Ensures only markdown files are served
 * 
 * ## Usage
 * 
 * The service exposes Tauri commands that can be called from the frontend
 * to retrieve documentation content.
 */

use std::path::Path;
use tauri::AppHandle;

/// List of allowed documentation file paths for security
const ALLOWED_DOC_PATHS: &[&str] = &[
    "docs/user-guide.md",
    "docs/api-reference.md", 
    "docs/developer-guide-frontend.md",
    "docs/developer-guide-backend.md",
    "docs/Testing.md",
    "docs/analysis-and-data-processing.md",
    "README.md",
];

/// Error type for documentation reading operations
#[derive(Debug, thiserror::Error)]
pub enum DocumentationError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Access denied: {0}")]
    AccessDenied(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Reads a documentation file from the repository
/// 
/// This command reads a markdown documentation file from the application's
/// resource directory and returns its content as a string.
/// 
/// ## Security
/// 
/// - Only allows reading from a predefined whitelist of documentation files
/// - Prevents directory traversal attacks
/// - Returns proper error messages for unauthorized access attempts
/// 
/// ## Parameters
/// 
/// - `app`: Tauri application handle for resource access
/// - `file_path`: Relative path to the documentation file (must be in whitelist)
/// 
/// ## Returns
/// 
/// - `Ok(String)`: The content of the documentation file
/// - `Err(String)`: Error message describing what went wrong
/// 
/// ## Examples
/// 
/// ```rust,no_run
/// // Called from frontend JavaScript:
/// // const content = await invoke('read_documentation_file', { filePath: 'docs/user-guide.md' });
/// ```
#[tauri::command]
pub async fn read_documentation_file(
    _app: AppHandle,
    file_path: String,
) -> Result<String, String> {
    // Security check: only allow whitelisted paths
    if !ALLOWED_DOC_PATHS.contains(&file_path.as_str()) {
        return Err(format!("Access denied to file: {}", file_path));
    }

    // Resolve the file path relative to the application's resource directory
    let app_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let full_path = app_dir.join(&file_path);
    
    // Ensure the path exists and is a file
    if !full_path.exists() {
        return Err(format!("Documentation file not found: {}", file_path));
    }
    
    if !full_path.is_file() {
        return Err(format!("Path is not a file: {}", file_path));
    }

    // Read the file content
    let content = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))?;

    Ok(content)
}

/// Gets the list of available documentation files
/// 
/// Returns a list of all available documentation files that can be read
/// by the frontend.
/// 
/// ## Returns
/// 
/// A vector of file paths that are available for reading.
#[tauri::command]
pub async fn get_available_documentation_files() -> Result<Vec<String>, String> {
    let app_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    let mut available_files = Vec::new();
    
    for &file_path in ALLOWED_DOC_PATHS {
        let full_path = app_dir.join(file_path);
        if full_path.exists() && full_path.is_file() {
            available_files.push(file_path.to_string());
        }
    }
    
    Ok(available_files)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_allowed_paths_are_valid() {
        for &path in ALLOWED_DOC_PATHS {
            assert!(!path.contains(".."), "Path should not contain directory traversal: {}", path);
            assert!(path.ends_with(".md"), "Path should be a markdown file: {}", path);
        }
    }
} 