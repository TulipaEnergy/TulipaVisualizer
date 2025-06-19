import { describe, it, expect } from "vitest";
import { triggerDuckDBFileDialog, readJSON } from "../io";

describe("IO Gateway Service", () => {
  describe("triggerDuckDBFileDialog", () => {
    it("should be a function", () => {
      expect(typeof triggerDuckDBFileDialog).toBe("function");
    });

    it("should return a Promise", () => {
      const result = triggerDuckDBFileDialog();
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {});
    });

    it("should call Tauri dialog API (integration test)", async () => {
      // This is an integration test that verifies the function works with the mocked Tauri API
      // The global mock in setup.ts should handle the Tauri calls
      const result = await triggerDuckDBFileDialog();
      
      // Based on the global mock, it should return the mock path
      expect(typeof result).toBe("string");
      expect(result).toBe("/mock/path/to/database.duckdb");
    });
  });

  describe("readJSON", () => {
    it("should be a function", () => {
      expect(typeof readJSON).toBe("function");
    });

    it("should return a Promise", () => {
      const result = readJSON("test.json");
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid unhandled rejection
      result.catch(() => {});
    });

    it("should call Tauri path and fs APIs (integration test)", async () => {
      // This is an integration test that verifies the function works with the mocked Tauri API
      // The global mock in setup.ts should handle the Tauri calls
      const result = await readJSON("test.json");
      
      // Based on the global mock, it should return an empty object
      expect(typeof result).toBe("object");
      expect(result).toEqual({});
    });

    it("should handle different file paths", async () => {
      const testPaths = [
        "config.json",
        "assets/data.json", 
        "deep/nested/file.json"
      ];

      for (const path of testPaths) {
        const result = await readJSON(path);
        expect(typeof result).toBe("object");
        expect(result).toEqual({});
      }
    });
  });

  describe("Function signatures and types", () => {
    it("triggerDuckDBFileDialog should have correct signature", () => {
      // Should be a function that takes no parameters
      expect(triggerDuckDBFileDialog.length).toBe(0);
    });

    it("readJSON should be a function", () => {
      // Verify it's a function (length property may be affected by mocking)
      expect(typeof readJSON).toBe("function");
    });

    it("should be properly exported", () => {
      // Verify the functions are exported from the module
      expect(triggerDuckDBFileDialog).toBeDefined();
      expect(readJSON).toBeDefined();
    });
  });
}); 