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

/// Internal function to validate file paths (for easier testing)
fn validate_file_path(file_path: &str) -> Result<(), String> {
    if !ALLOWED_DOC_PATHS.contains(&file_path) {
        return Err(format!("Access denied to file: {}", file_path));
    }
    Ok(())
}

/// Internal function to read file content with simplified path resolution
fn read_file_content_with_app(_app: Option<&AppHandle>, file_path: &str) -> Result<String, String> {
    // Security check: only allow whitelisted paths
    validate_file_path(file_path)?;

    // Use current working directory as the base for all file paths
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    // If we're in src-tauri directory, go up one level to project root
    let project_root = if current_dir.file_name().and_then(|name| name.to_str()) == Some("src-tauri") {
        current_dir.parent().unwrap_or(&current_dir).to_path_buf()
    } else {
        current_dir
    };
    
    let full_path = project_root.join(file_path);
    
    println!("DEBUG: Current dir: {:?}", std::env::current_dir().unwrap());
    println!("DEBUG: Project root: {:?}", project_root);
    println!("DEBUG: Trying to read file at: {:?}", full_path);
    
    // Ensure the path exists and is a file
    if !full_path.exists() {
        return Err(format!("Documentation file not found: {} (resolved to: {:?})", file_path, full_path));
    }
    
    if !full_path.is_file() {
        return Err(format!("Path is not a file: {} (resolved to: {:?})", file_path, full_path));
    }

    // Read the file content
    let content = std::fs::read_to_string(&full_path)
        .map_err(|e| format!("Failed to read file {}: {}", file_path, e))?;

    Ok(content)
}

/// Internal function to read file content (for easier testing)
fn read_file_content(file_path: &str) -> Result<String, String> {
    read_file_content_with_app(None, file_path)
}

/// Internal function to get available files with simplified path resolution
fn get_available_files_with_app(_app: Option<&AppHandle>) -> Result<Vec<String>, String> {
    let mut available_files = Vec::new();
    
    // Use current working directory as the base for all file paths
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    // If we're in src-tauri directory, go up one level to project root
    let project_root = if current_dir.file_name().and_then(|name| name.to_str()) == Some("src-tauri") {
        current_dir.parent().unwrap_or(&current_dir).to_path_buf()
    } else {
        current_dir
    };
    
    for &file_path in ALLOWED_DOC_PATHS {
        let full_path = project_root.join(file_path);

        if full_path.exists() && full_path.is_file() {
            available_files.push(file_path.to_string());
        }
    }
    
    Ok(available_files)
}

/// Internal function to get available files (for easier testing)
fn get_available_files() -> Result<Vec<String>, String> {
    get_available_files_with_app(None)
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
    app: AppHandle,
    file_path: String,
) -> Result<String, String> {
    read_file_content_with_app(Some(&app), &file_path)
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
pub async fn get_available_documentation_files(app: AppHandle) -> Result<Vec<String>, String> {
    get_available_files_with_app(Some(&app))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;
    
    /// Helper function to create a temporary directory with test documentation files
    fn setup_test_docs() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        // Create docs directory
        let docs_dir = temp_dir.path().join("docs");
        fs::create_dir_all(&docs_dir).expect("Failed to create docs directory");
        
        // Create test documentation files
        fs::write(docs_dir.join("user-guide.md"), "# User Guide\n\nThis is the user guide.")
            .expect("Failed to write user-guide.md");
        
        fs::write(docs_dir.join("api-reference.md"), "# API Reference\n\nAPI documentation here.")
            .expect("Failed to write api-reference.md");
        
        fs::write(docs_dir.join("Testing.md"), "# Testing Guide\n\nTesting information.")
            .expect("Failed to write Testing.md");
        
        // Create README.md in root
        fs::write(temp_dir.path().join("README.md"), "# Project README\n\nProject overview.")
            .expect("Failed to write README.md");
        
        temp_dir
    }

    /// Helper function to change current directory temporarily
    fn with_temp_dir<F>(temp_dir: &TempDir, f: F) 
    where 
        F: FnOnce(),
    {
        let original_dir = std::env::current_dir().expect("Failed to get current directory");
        std::env::set_current_dir(temp_dir.path()).expect("Failed to set current directory");
        
        f();
        
        std::env::set_current_dir(original_dir).expect("Failed to restore current directory");
    }
    
    #[test]
    fn test_allowed_paths_are_valid() {
        for &path in ALLOWED_DOC_PATHS {
            assert!(!path.contains(".."), "Path should not contain directory traversal: {}", path);
            assert!(path.ends_with(".md"), "Path should be a markdown file: {}", path);
        }
    }

    #[test]
    fn test_validate_file_path_success() {
        let result = validate_file_path("docs/user-guide.md");
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_file_path_access_denied() {
        let result = validate_file_path("docs/not-allowed.md");
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Access denied"));
        assert!(error.contains("docs/not-allowed.md"));
    }

    #[test]
    fn test_validate_file_path_directory_traversal() {
        let result = validate_file_path("../../../etc/passwd");
        assert!(result.is_err());
        let error = result.unwrap_err();
        assert!(error.contains("Access denied"));
    }

    #[test]
    fn test_read_file_content_success() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            let result = read_file_content("docs/user-guide.md");
            
            assert!(result.is_ok());
            let content = result.unwrap();
            assert!(content.contains("User Guide"));
            assert!(content.contains("This is the user guide."));
        });
    }

    #[test]
    fn test_read_file_content_not_found() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            let result = read_file_content("docs/developer-guide-backend.md");
            
            assert!(result.is_err());
            let error = result.unwrap_err();
            assert!(error.contains("Documentation file not found"));
            assert!(error.contains("docs/developer-guide-backend.md"));
        });
    }

    #[test]
    fn test_read_file_content_directory_instead_of_file() {
        let temp_dir = setup_test_docs();
        
        // Create a directory with the same name as an allowed file
        let docs_dir = temp_dir.path().join("docs");
        let fake_file_dir = docs_dir.join("developer-guide-frontend.md");
        fs::create_dir_all(&fake_file_dir).expect("Failed to create fake file directory");
        
        with_temp_dir(&temp_dir, || {
            let result = read_file_content("docs/developer-guide-frontend.md");
            
            assert!(result.is_err());
            let error = result.unwrap_err();
            assert!(error.contains("Path is not a file"));
        });
    }

    #[test]
    fn test_get_available_files_success() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            let result = get_available_files();
            
            assert!(result.is_ok());
            let files = result.unwrap();
            
            // Should include the files we created
            assert!(files.contains(&"docs/user-guide.md".to_string()));
            assert!(files.contains(&"docs/api-reference.md".to_string()));
            assert!(files.contains(&"docs/Testing.md".to_string()));
            assert!(files.contains(&"README.md".to_string()));
            
            // Should not include files we didn't create
            assert!(!files.contains(&"docs/developer-guide-backend.md".to_string()));
            assert!(!files.contains(&"docs/developer-guide-frontend.md".to_string()));
        });
    }

    #[test]
    fn test_get_available_files_empty_directory() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        
        with_temp_dir(&temp_dir, || {
            let result = get_available_files();
            
            assert!(result.is_ok());
            let files = result.unwrap();
            assert!(files.is_empty());
        });
    }

    #[test]
    fn test_read_multiple_files() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            // Test reading multiple files
            let files_to_test = vec![
                "docs/user-guide.md",
                "docs/api-reference.md", 
                "docs/Testing.md",
                "README.md"
            ];
            
            for file_path in files_to_test {
                let result = read_file_content(file_path);
                assert!(result.is_ok(), "Failed to read file: {}", file_path);
                
                let content = result.unwrap();
                assert!(!content.is_empty(), "File content should not be empty: {}", file_path);
                assert!(content.starts_with("#"), "Markdown files should start with header: {}", file_path);
            }
        });
    }

    #[test]
    fn test_file_content_accuracy() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            // Test that file content is read accurately
            let result = read_file_content("docs/user-guide.md");
            assert!(result.is_ok());
            
            let content = result.unwrap();
            assert_eq!(content, "# User Guide\n\nThis is the user guide.");
        });
    }

    #[test]
    fn test_error_handling_for_io_errors() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            // Now try to read a file that doesn't exist but is in the whitelist
            let result = read_file_content("docs/analysis-and-data-processing.md");
            
            assert!(result.is_err());
            let error = result.unwrap_err();
            assert!(error.contains("Documentation file not found"));
        });
    }

    #[test]
    fn test_documentation_error_types() {
        // Test the custom error types
        let file_not_found = DocumentationError::FileNotFound("test.md".to_string());
        assert_eq!(file_not_found.to_string(), "File not found: test.md");
        
        let access_denied = DocumentationError::AccessDenied("blocked.md".to_string());
        assert_eq!(access_denied.to_string(), "Access denied: blocked.md");
        
        // Test that IO errors can be converted
        let io_error = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "Access denied");
        let doc_error: DocumentationError = io_error.into();
        assert!(matches!(doc_error, DocumentationError::IoError(_)));
    }

    #[test]
    fn test_security_constraints() {
        // Ensure all allowed paths follow security best practices
        for &path in ALLOWED_DOC_PATHS {
            // No directory traversal
            assert!(!path.contains(".."));
            assert!(!path.contains("./"));
            assert!(!path.starts_with("/"));
            
            // Only markdown files
            assert!(path.ends_with(".md"));
            
            // Reasonable path length
            assert!(path.len() < 100);
            
            // No special characters that could be dangerous
            assert!(!path.contains('\0'));
            assert!(!path.contains('\r'));
            assert!(!path.contains('\n'));
        }
    }

    #[tokio::test]
    async fn test_async_commands() {
        let temp_dir = setup_test_docs();
        
        with_temp_dir(&temp_dir, || {
            // Test get_available_documentation_files
            let files_result = get_available_files();
            assert!(files_result.is_ok());
            let files = files_result.unwrap();
            assert!(files.contains(&"docs/user-guide.md".to_string()));
            assert!(files.contains(&"docs/api-reference.md".to_string()));
            assert!(files.contains(&"README.md".to_string()));
            
            // Test the underlying function that the command uses
            let content_result = read_file_content("docs/user-guide.md");
            assert!(content_result.is_ok());
            let content = content_result.unwrap();
            assert!(content.contains("User Guide"));
            assert!(content.contains("This is the user guide."));
        });
    }
} 