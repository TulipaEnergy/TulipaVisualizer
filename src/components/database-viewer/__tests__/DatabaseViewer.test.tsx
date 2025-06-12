import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Table } from "apache-arrow";
import DatabaseViewer from "../DatabaseViewer";
import { renderWithProviders, createMockStoreState } from "../../../test/utils";
import * as databaseOperations from "../../../services/databaseOperations";
import * as metadata from "../../../services/metadata";

// Mock services
vi.mock("../../../services/databaseOperations", () => ({
  runCustomQuery: vi.fn(),
}));

vi.mock("../../../services/metadata", () => ({
  getTables: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("DatabaseViewer Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  const mockStoreWithDatabase = createMockStoreState({
    isLoading: false,
    getGraphDatabase: vi.fn(() => "/mock/database.duckdb"),
  });

  const mockTables = ["table1", "table2", "table3"];

  // Create a proper mock Table that matches the Apache Arrow Table interface
  const createMockTable = (rowData: any[]) => {
    const mockFields = [
      {
        name: "id",
        type: {},
        nullable: true,
        metadata: new Map(),
        typeId: 0,
        offset: 0,
        length: 0,
      },
      {
        name: "name",
        type: {},
        nullable: true,
        metadata: new Map(),
        typeId: 0,
        offset: 0,
        length: 0,
      },
      {
        name: "value",
        type: {},
        nullable: true,
        metadata: new Map(),
        typeId: 0,
        offset: 0,
        length: 0,
      },
    ];

    return {
      schema: { fields: mockFields },
      numRows: rowData.length,
      get: vi.fn((index: number) => rowData[index] || null),
    } as any as Table<any>;
  };

  const mockQueryResult = createMockTable([
    { id: 1, name: "test1", value: 100 },
    { id: 2, name: "test2", value: 200 },
  ]);

  it("renders correctly with all components", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("SQL Query")).toBeInTheDocument();
    });

    // Check that all main components are rendered
    expect(screen.getByRole("textbox")).toBeInTheDocument(); // Query editor
    expect(
      screen.getByRole("button", { name: /run query/i }),
    ).toBeInTheDocument();
  });

  it("fetches and displays table list on mount", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(metadata.getTables).toHaveBeenCalledWith("/mock/database.duckdb");
    });

    // Check that tables are displayed
    await waitFor(() => {
      expect(screen.getByText("table1")).toBeInTheDocument();
      expect(screen.getByText("table2")).toBeInTheDocument();
      expect(screen.getByText("table3")).toBeInTheDocument();
    });
  });

  it("handles table fetch error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(metadata.getTables).mockRejectedValue(
      new Error("Database connection failed"),
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching database tables:",
        expect.any(Error),
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to fetch database tables"),
      ).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("executes SQL query when Execute button is clicked", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockResolvedValue(
      mockQueryResult,
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Type a query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM table1;" },
    });

    // Execute query
    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(databaseOperations.runCustomQuery).toHaveBeenCalledWith(
        "/mock/database.duckdb",
        "SELECT * FROM table1;",
      );
    });
  });

  it("displays query results correctly", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockResolvedValue(
      mockQueryResult,
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Type and execute query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM table1;" },
    });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getByText("id")).toBeInTheDocument(); // Column header
      expect(screen.getByText("name")).toBeInTheDocument(); // Column header
      expect(screen.getByText("value")).toBeInTheDocument(); // Column header
    });

    await waitFor(() => {
      expect(screen.getByText("test1")).toBeInTheDocument(); // Data
      expect(screen.getByText("test2")).toBeInTheDocument(); // Data
      expect(screen.getByText("100")).toBeInTheDocument(); // Data
      expect(screen.getByText("200")).toBeInTheDocument(); // Data
    });
  });

  it("shows loading state during query execution", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockQueryResult), 100),
        ),
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Type and execute query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM table1;" },
    });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Should show loading state
    expect(screen.getByText("Loading results...")).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading results...")).not.toBeInTheDocument();
    });
  });

  it("handles query execution errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockRejectedValue(
      new Error("Invalid SQL syntax"),
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Type and execute invalid query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, { target: { value: "INVALID SQL QUERY;" } });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Should show error message
    await waitFor(() => {
      expect(
        screen.getByText(/Query error: Invalid SQL syntax/),
      ).toBeInTheDocument();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Query error details:",
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it("handles table selection", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("table1")).toBeInTheDocument();
    });

    // Click on a table
    fireEvent.click(screen.getByText("table1"));

    // Should update the query editor with SELECT statement
    await waitFor(() => {
      const queryEditor = screen.getByRole("textbox");
      expect(queryEditor).toHaveValue("SELECT * FROM table1;");
    });
  });

  it("shows table schema when schema button is clicked", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockResolvedValue(
      mockQueryResult,
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByText("table1")).toBeInTheDocument();
    });

    // Click on schema button for table1 - find by title attribute
    const schemaButtons = screen.getAllByTitle("Show schema");
    fireEvent.click(schemaButtons[0]);

    // Should update query with PRAGMA table_info
    await waitFor(() => {
      const queryEditor = screen.getByRole("textbox");
      expect(queryEditor).toHaveValue("PRAGMA table_info('table1');");
    });

    // Should execute the schema query
    await waitFor(() => {
      expect(databaseOperations.runCustomQuery).toHaveBeenCalledWith(
        "/mock/database.duckdb",
        "PRAGMA table_info('table1');",
      );
    });
  });

  it("persists query history to localStorage", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);
    vi.mocked(databaseOperations.runCustomQuery).mockResolvedValue(
      mockQueryResult,
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Execute a query to add to history
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM table1;" },
    });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Should save to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "queryHistory",
        expect.stringContaining("SELECT * FROM table1;"),
      );
    });
  });

  it("loads query history from localStorage on mount", () => {
    const savedHistory = [
      "SELECT * FROM users;",
      "SELECT COUNT(*) FROM orders;",
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedHistory));
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    expect(localStorageMock.getItem).toHaveBeenCalledWith("queryHistory");
  });

  it("handles invalid localStorage data gracefully", () => {
    localStorageMock.getItem.mockReturnValue("invalid json");
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    // Should not throw error and render normally
    expect(() => {
      renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
        initialStoreState: mockStoreWithDatabase,
      });
    }).not.toThrow();
  });

  it("shows loading state when store is loading", async () => {
    const mockStoreLoading = createMockStoreState({
      isLoading: true,
      getGraphDatabase: vi.fn(() => "/mock/database.duckdb"),
    });

    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreLoading,
    });

    await waitFor(() => {
      // Check for the execute button being disabled
      const executeButton = screen.getByRole("button", {
        name: /executing|run query/i,
      });
      expect(executeButton).toBeDisabled();
    });
  });

  it("updates database tables when database path changes", async () => {
    const mockStoreWithChangingDb = createMockStoreState({
      isLoading: false,
      getGraphDatabase: vi
        .fn()
        .mockReturnValueOnce("/first/database.duckdb")
        .mockReturnValueOnce("/second/database.duckdb"),
    });

    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    const { rerender } = renderWithProviders(
      <DatabaseViewer graphId="test-graph" />,
      {
        initialStoreState: mockStoreWithChangingDb,
      },
    );

    await waitFor(() => {
      expect(metadata.getTables).toHaveBeenCalledWith("/first/database.duckdb");
    });

    // Re-render with different database
    rerender(<DatabaseViewer graphId="test-graph" />);

    await waitFor(() => {
      expect(metadata.getTables).toHaveBeenCalledWith(
        "/second/database.duckdb",
      );
    });
  });

  it("clears previous results when new query is executed", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    // First query returns data
    vi.mocked(databaseOperations.runCustomQuery)
      .mockResolvedValueOnce(mockQueryResult)
      .mockRejectedValueOnce(new Error("Second query failed"));

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Execute first query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM table1;" },
    });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Should show results from first query
    await waitFor(() => {
      expect(screen.getByText("test1")).toBeInTheDocument();
    });

    // Execute second query that fails
    fireEvent.change(queryEditor, { target: { value: "INVALID QUERY;" } });
    fireEvent.click(executeButton);

    // Should clear previous results and show error
    await waitFor(() => {
      expect(screen.queryByText("test1")).not.toBeInTheDocument();
      expect(screen.getByText(/Query error/)).toBeInTheDocument();
    });
  });

  it("handles database with no tables", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue([]);

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "No tables found. Please select a valid DuckDB file from the toolbar.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("handles query result with no rows", async () => {
    vi.mocked(metadata.getTables).mockResolvedValue(mockTables);

    // Create a table with proper Field objects but no rows
    const emptyTableMock = {
      schema: {
        fields: [
          {
            name: "id",
            type: {},
            nullable: true,
            metadata: new Map(),
            typeId: 0,
            offset: 0,
            length: 0,
          },
          {
            name: "name",
            type: {},
            nullable: true,
            metadata: new Map(),
            typeId: 0,
            offset: 0,
            length: 0,
          },
        ],
      },
      numRows: 0,
      get: vi.fn(),
    } as any as Table<any>;

    vi.mocked(databaseOperations.runCustomQuery).mockResolvedValue(
      emptyTableMock,
    );

    renderWithProviders(<DatabaseViewer graphId="test-graph" />, {
      initialStoreState: mockStoreWithDatabase,
    });

    await waitFor(() => {
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    // Execute query
    const queryEditor = screen.getByRole("textbox");
    fireEvent.change(queryEditor, {
      target: { value: "SELECT * FROM empty_table;" },
    });

    const executeButton = screen.getByRole("button", { name: /run query/i });
    fireEvent.click(executeButton);

    // Should show column headers but no data rows
    await waitFor(() => {
      expect(screen.getByText("id")).toBeInTheDocument();
      expect(screen.getByText("name")).toBeInTheDocument();
      expect(screen.getByText("No data returned")).toBeInTheDocument();
    });
  });
});
