import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Essential plugins for React testing environment
  plugins: [react(), tsconfigPaths()], // tsconfigPaths enables path mapping from tsconfig.json
  test: {
    // Jest-compatible global APIs (describe, it, expect) available without imports
    globals: true,
    // Browser-like environment for React component testing
    environment: "jsdom",
    // Test setup file for global mocks and configuration
    setupFiles: ["./src/test/setup.ts"],
    // Comprehensive test file pattern including all common extensions
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // Disable CSS processing for faster test execution
    css: false,
    coverage: {
      // V8 provider offers better performance than c8 for large codebases
      provider: "v8",
      // Multiple output formats for CI/CD integration and local development
      reporter: ["text", "json", "html", "cobertura", "text-summary"],
      exclude: [
        // Infrastructure and build artifacts
        "node_modules/**",
        "dist/**",
        "src-tauri/**", // Rust backend tested separately
        "**/*.d.ts", // TypeScript declarations don't need coverage
        "**/index.ts", // Simple re-export files
        "src/test/**", // Test utilities themselves
        "coverage/**", // Coverage reports
        "**/*.config.{js,ts}", // Configuration files
        "**/*.setup.{js,ts}", // Setup files
        "**/types/**", // Type definition files
        "**/*.type.{js,ts}", // Type-only files
        "src/main.tsx", // Entry point file - minimal logic
        "src/vite-env.d.ts", // Vite type definitions
      ],
      // Focus coverage on actual application source code
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      // Include all source files even if not imported by tests
      all: true,
      // Coverage thresholds - empirically derived from initial test implementation
      // Starting conservative and increasing as test coverage improves
      thresholds: {
        global: {
          statements: 70, // 70% statement coverage prevents regression
          branches: 80, // 80% branch coverage ensures decision logic testing
          functions: 50, // 50% function coverage allows for utility function flexibility
          lines: 70, // 70% line coverage matches statement coverage
        },
      },
      // Watermarks for coverage display colors in HTML reports
      // Based on industry standards for frontend application testing
      watermarks: {
        statements: [20, 60], // Red below 20%, yellow 20-60%, green above 60%
        branches: [15, 50], // Branches typically harder to cover completely
        functions: [20, 60], // Function coverage follows statement pattern
        lines: [20, 60], // Line coverage matches statement thresholds
      },
    },
    deps: {
      // Inline Zustand to prevent ESM import issues in test environment
      inline: ["zustand"],
    },
  },
});
