import { describe, it, expect, beforeEach, vi } from "vitest";
import { Table } from "apache-arrow";
import {
  uploadDatabaseFile,
  runCustomQuery,
  extractTableData,
} from "../databaseOperations";

// Mock the gateway modules
vi.mock("../../gateway/db", () => ({
  apacheIPC: vi.fn(),
}));

vi.mock("../../gateway/io", () => ({
  triggerDuckDBFileDialog: vi.fn(),
}));

// Import mocked functions
import { apacheIPC } from "../../gateway/db";
import { triggerDuckDBFileDialog } from "../../gateway/io";

describe("Database Operations Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("uploadDatabaseFile", () => {
    it("should successfully upload a database file", async () => {
      const mockFilePath = "/path/to/database.duckdb";
      vi.mocked(triggerDuckDBFileDialog).mockResolvedValueOnce(mockFilePath);

      const result = await uploadDatabaseFile();

      expect(triggerDuckDBFileDialog).toHaveBeenCalledOnce();
      expect(result).toBe(mockFilePath);
    });

    it("should return null when no file is selected", async () => {
      vi.mocked(triggerDuckDBFileDialog).mockResolvedValueOnce(null);

      const result = await uploadDatabaseFile();

      expect(triggerDuckDBFileDialog).toHaveBeenCalledOnce();
      expect(result).toBeNull();
    });

    it("should throw error when file dialog fails", async () => {
      const mockError = new Error("File dialog error");
      vi.mocked(triggerDuckDBFileDialog).mockRejectedValueOnce(mockError);

      await expect(uploadDatabaseFile()).rejects.toThrow("File dialog error");
      expect(triggerDuckDBFileDialog).toHaveBeenCalledOnce();
    });

    it("should handle and re-throw unexpected errors", async () => {
      const mockError = new Error("Unexpected error");
      vi.mocked(triggerDuckDBFileDialog).mockRejectedValueOnce(mockError);

      await expect(uploadDatabaseFile()).rejects.toThrow("Unexpected error");
    });
  });

  describe("runCustomQuery", () => {
    const mockDbPath = "/path/to/test.duckdb";
    const mockQuery = "SELECT * FROM test_table";
    const mockTable = {} as Table<any>; // Mock Apache Arrow Table

    it("should execute a valid query successfully", async () => {
      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await runCustomQuery(mockDbPath, mockQuery);

      expect(apacheIPC).toHaveBeenCalledWith("run_serialize_query_on_db", {
        dbPath: mockDbPath,
        q: mockQuery,
      });
      expect(result).toBe(mockTable);
    });

    it("should handle complex queries with whitespace", async () => {
      const complexQuery = `
        SELECT 
          column1, 
          column2 
        FROM table 
        WHERE condition = 'value'
      `;
      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      const result = await runCustomQuery(mockDbPath, complexQuery);

      expect(apacheIPC).toHaveBeenCalledWith("run_serialize_query_on_db", {
        dbPath: mockDbPath,
        q: complexQuery,
      });
      expect(result).toBe(mockTable);
    });

    it("should throw error for empty query", async () => {
      await expect(runCustomQuery(mockDbPath, "")).rejects.toThrow(
        "Query cannot be empty",
      );
      expect(apacheIPC).not.toHaveBeenCalled();
    });

    it("should throw error for whitespace-only query", async () => {
      await expect(runCustomQuery(mockDbPath, "   \n\t   ")).rejects.toThrow(
        "Query cannot be empty",
      );
      expect(apacheIPC).not.toHaveBeenCalled();
    });

    it("should throw error for empty database path", async () => {
      await expect(runCustomQuery("", mockQuery)).rejects.toThrow(
        "Database path cannot be empty",
      );
      expect(apacheIPC).not.toHaveBeenCalled();
    });

    it("should throw error for null database path", async () => {
      await expect(runCustomQuery(null as any, mockQuery)).rejects.toThrow(
        "Database path cannot be empty",
      );
      expect(apacheIPC).not.toHaveBeenCalled();
    });

    it("should throw error for undefined database path", async () => {
      await expect(runCustomQuery(undefined as any, mockQuery)).rejects.toThrow(
        "Database path cannot be empty",
      );
      expect(apacheIPC).not.toHaveBeenCalled();
    });

    it("should handle IPC errors gracefully", async () => {
      const mockError = new Error("Database connection failed");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      await expect(runCustomQuery(mockDbPath, mockQuery)).rejects.toThrow(
        "Database connection failed",
      );
      expect(apacheIPC).toHaveBeenCalledWith("run_serialize_query_on_db", {
        dbPath: mockDbPath,
        q: mockQuery,
      });
    });

    it("should handle SQL syntax errors", async () => {
      const invalidQuery = "INVALID SQL SYNTAX";
      const mockError = new Error("SQL syntax error");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      await expect(runCustomQuery(mockDbPath, invalidQuery)).rejects.toThrow(
        "SQL syntax error",
      );
    });

    it("should handle database not found errors", async () => {
      const nonExistentPath = "/nonexistent/path.duckdb";
      const mockError = new Error("Database file not found");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      await expect(runCustomQuery(nonExistentPath, mockQuery)).rejects.toThrow(
        "Database file not found",
      );
    });
  });

  describe("extractTableData", () => {
    it("should extract column names and provide row access", () => {
      // Create a simplified mock Table that focuses on the interface we actually use
      const mockFields = [{ name: "id" }, { name: "name" }, { name: "value" }];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 3,
        get: vi.fn((index: number) => {
          const rows = [
            { id: 1, name: "Alice", value: 100 },
            { id: 2, name: "Bob", value: 200 },
            { id: 3, name: "Charlie", value: 300 },
          ];
          return rows[index] || null;
        }),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      expect(result.columns).toEqual(["id", "name", "value"]);
      expect(result.numRows).toBe(3);
      expect(typeof result.getRow).toBe("function");
    });

    it("should return correct row data through getRow function", () => {
      const mockFields = [{ name: "col1" }, { name: "col2" }];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 2,
        get: vi.fn((index: number) => {
          const rows = [
            { col1: "value1", col2: "value2" },
            { col1: "value3", col2: "value4" },
          ];
          return rows[index] || null;
        }),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      // Test first row
      const row0 = result.getRow(0);
      expect(row0).toEqual(["value1", "value2"]);

      // Test second row
      const row1 = result.getRow(1);
      expect(row1).toEqual(["value3", "value4"]);

      expect(mockTable.get).toHaveBeenCalledWith(0);
      expect(mockTable.get).toHaveBeenCalledWith(1);
    });

    it("should return null for non-existent row indices", () => {
      const mockFields = [{ name: "col1" }];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 1,
        get: vi.fn().mockReturnValue(null),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      const row = result.getRow(999); // Non-existent index
      expect(row).toBeNull();
      expect(mockTable.get).toHaveBeenCalledWith(999);
    });

    it("should handle tables with no columns", () => {
      const mockSchema = { fields: [] };
      const mockTable = {
        schema: mockSchema,
        numRows: 0,
        get: vi.fn(),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      expect(result.columns).toEqual([]);
      expect(result.numRows).toBe(0);
    });

    it("should handle tables with no rows", () => {
      const mockFields = [{ name: "col1" }, { name: "col2" }];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 0,
        get: vi.fn(),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      expect(result.columns).toEqual(["col1", "col2"]);
      expect(result.numRows).toBe(0);
    });

    it("should handle various data types in columns", () => {
      const mockFields = [
        { name: "string_col" },
        { name: "number_col" },
        { name: "boolean_col" },
        { name: "null_col" },
      ];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 1,
        get: vi.fn().mockReturnValue({
          string_col: "test",
          number_col: 42,
          boolean_col: true,
          null_col: null,
        }),
      } as any as Table<any>;

      const result = extractTableData(mockTable);
      const row = result.getRow(0);

      expect(row).toEqual(["test", 42, true, null]);
    });

    it("should preserve column order from schema", () => {
      const mockFields = [
        { name: "z_column" },
        { name: "a_column" },
        { name: "m_column" },
      ];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 1,
        get: vi.fn().mockReturnValue({
          z_column: "z_value",
          a_column: "a_value",
          m_column: "m_value",
        }),
      } as any as Table<any>;

      const result = extractTableData(mockTable);

      // Columns should be in schema order, not alphabetical
      expect(result.columns).toEqual(["z_column", "a_column", "m_column"]);

      const row = result.getRow(0);
      expect(row).toEqual(["z_value", "a_value", "m_value"]);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete workflow from file selection to data extraction", async () => {
      const mockFilePath = "/path/to/test.duckdb";
      const mockQuery = "SELECT id, name FROM users";

      // Mock successful file upload
      vi.mocked(triggerDuckDBFileDialog).mockResolvedValueOnce(mockFilePath);

      // Mock successful query execution
      const mockFields = [{ name: "id" }, { name: "name" }];
      const mockSchema = { fields: mockFields };
      const mockTable = {
        schema: mockSchema,
        numRows: 2,
        get: vi.fn((index: number) => {
          const rows = [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ];
          return rows[index] || null;
        }),
      } as any as Table<any>;

      vi.mocked(apacheIPC).mockResolvedValueOnce(mockTable);

      // Execute workflow
      const filePath = await uploadDatabaseFile();
      expect(filePath).toBe(mockFilePath);

      const table = await runCustomQuery(filePath!, mockQuery);
      const data = extractTableData(table);

      expect(data.columns).toEqual(["id", "name"]);
      expect(data.numRows).toBe(2);
      expect(data.getRow(0)).toEqual([1, "Alice"]);
      expect(data.getRow(1)).toEqual([2, "Bob"]);
    });

    it("should handle errors in workflow gracefully", async () => {
      // Mock successful file upload
      const mockFilePath = "/path/to/test.duckdb";
      vi.mocked(triggerDuckDBFileDialog).mockResolvedValueOnce(mockFilePath);

      // Mock query failure
      const mockError = new Error("Query execution failed");
      vi.mocked(apacheIPC).mockRejectedValueOnce(mockError);

      const filePath = await uploadDatabaseFile();
      expect(filePath).toBe(mockFilePath);

      await expect(
        runCustomQuery(filePath!, "SELECT * FROM non_existent_table"),
      ).rejects.toThrow("Query execution failed");
    });
  });
});
