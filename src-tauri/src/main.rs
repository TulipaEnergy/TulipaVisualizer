// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/**
 * Binary entry point for the Energy Model Visualizer desktop application.
 * 
 * Application Initialization:
 * - Delegates to library crate for modular architecture
 * - Enables unit testing of application logic in lib.rs
 * - Follows Rust binary/library separation best practices
 * 
 */
fn main() {
    tauri_app_lib::run()
}
