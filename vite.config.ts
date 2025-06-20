import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  // Essential plugins for React + TypeScript development with path mapping
  plugins: [react(), tsconfigPaths()],

  // Vite options tailored for Tauri development and desktop app requirements
  // Prevents clearing terminal on file changes for better debugging visibility
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is not available
  // This ensures consistent IPC communication between frontend and Rust backend
  server: {
    port: 1420, // Fixed port required by Tauri for stable IPC communication
    strictPort: true, // Fail if port unavailable instead of finding alternative
    host: true, // Accept connections from any host for network development
    hmr: {
      protocol: "ws", // WebSocket protocol for hot module replacement
      host: "localhost", // HMR server host for development
      port: 1421, // Separate port for HMR to avoid conflicts with app
    },
    watch: {
      // Prevent watching Rust backend files to avoid unnecessary rebuilds
      // Frontend changes don't affect Rust compilation
      ignored: ["**/src-tauri/**"],
    },
  },

  // Environment variable prefixes for secure variable exposure to frontend
  // TAURI_ variables enable conditional behavior in desktop vs web contexts
  envPrefix: ["VITE_", "TAURI_"],

  build: {
    // Target modern browsers and Tauri's embedded WebView capabilities
    // Enables ES2021 features and optimizations for desktop performance
    target: ["es2021", "chrome100", "safari13"],
    // Conditional minification: skip for debug builds to preserve debugging info
    // Production builds use esbuild for fastest minification
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // Generate sourcemaps only for debug builds to aid development
    // Production builds omit sourcemaps for smaller bundle size
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
