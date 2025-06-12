import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "cobertura", "text-summary"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "src-tauri/**",
        "**/*.d.ts",
        "**/index.ts",
        "src/test/**",
        "coverage/**",
        "**/*.config.{js,ts}",
        "**/*.setup.{js,ts}",
        "**/types/**",
        "**/*.type.{js,ts}",
        "src/main.tsx", // Entry point file
        "src/vite-env.d.ts", // Vite type definitions
      ],
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      all: true,
      // Coverage thresholds - starting low and will increase as we add tests
      thresholds: {
        global: {
          statements: 70,
          branches: 80,
          functions: 50,
          lines: 70,
        },
      },
      // Watermarks for coverage display colors
      watermarks: {
        statements: [20, 60], // Yellow below 20%, green above 60%
        branches: [15, 50],
        functions: [20, 60],
        lines: [20, 60],
      },
    },
    deps: {
      inline: ["zustand"],
    },
  },
});
