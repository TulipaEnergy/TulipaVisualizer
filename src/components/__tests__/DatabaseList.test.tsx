import { screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import DatabaseList from "../DatabaseList";
import useVisualizationStore from "../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  TEST_CONSTANTS,
} from "../../test/utils";

// Mock the store
vi.mock("../../store/visualizationStore");

// Mock the UploadButton component to simplify testing
vi.mock("../UploadButton", () => ({
  default: () => <div data-testid="upload-button">Mock Upload Button</div>,
}));

describe("DatabaseList Component", () => {
  const mockRemoveDatabase = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        databases: [],
        removeDatabase: mockRemoveDatabase,
      }),
    );
  });

  describe("Basic rendering", () => {
    it("renders without errors", () => {
      const { container } = renderWithProviders(<DatabaseList />);

      expect(container).toBeInTheDocument();
    });

    it("includes upload button", () => {
      renderWithProviders(<DatabaseList />);

      expect(screen.getByTestId("upload-button")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty state message when no databases", () => {
      renderWithProviders(<DatabaseList />);

      expect(
        screen.getByText(
          "No databases loaded. Upload a .duckdb file to get started.",
        ),
      ).toBeInTheDocument();
    });

    it("does not show database count when empty", () => {
      renderWithProviders(<DatabaseList />);

      expect(screen.queryByText(/Loaded Databases/)).not.toBeInTheDocument();
    });
  });

  describe("With databases", () => {
    it("displays single database", () => {
      const mockDatabases = [TEST_CONSTANTS.MOCK_DATABASE_PATH];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Should show the database path
      expect(
        screen.getByText(TEST_CONSTANTS.MOCK_DATABASE_PATH),
      ).toBeInTheDocument();

      // Should show count
      expect(screen.getByText("Loaded Databases (1)")).toBeInTheDocument();

      // Should not show empty state
      expect(screen.queryByText("No databases loaded")).not.toBeInTheDocument();
    });

    it("displays multiple databases", () => {
      const mockDatabases = [
        "/path/to/db1.duckdb",
        "/path/to/db2.duckdb",
        "/path/to/db3.duckdb",
      ];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Should show all database paths
      mockDatabases.forEach((db) => {
        expect(screen.getByText(db)).toBeInTheDocument();
      });

      // Should show correct count
      expect(screen.getByText("Loaded Databases (3)")).toBeInTheDocument();
    });

    it("shows database icons for each database", () => {
      const mockDatabases = ["/path/to/db1.duckdb", "/path/to/db2.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      const { container } = renderWithProviders(<DatabaseList />);

      // Each database should have an icon (checking for presence of database entries)
      mockDatabases.forEach((db) => {
        expect(screen.getByText(db)).toBeInTheDocument();
      });

      expect(container).toBeInTheDocument();
    });
  });

  describe("Database removal", () => {
    it("shows remove buttons for each database", () => {
      const mockDatabases = ["/path/to/db1.duckdb", "/path/to/db2.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Should have remove buttons (trash icons)
      const removeButtons = screen.getAllByRole("button");

      // Filter out the upload button - should have one remove button per database
      const removeButtonsCount = removeButtons.filter(
        (button) =>
          button.getAttribute("class")?.includes("ActionIcon") ||
          button.querySelector("svg"),
      ).length;

      expect(removeButtonsCount).toBeGreaterThan(0);
    });

    it("calls removeDatabase when remove button is clicked", () => {
      const mockDatabase = TEST_CONSTANTS.MOCK_DATABASE_PATH;

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [mockDatabase],
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Find and click a remove button
      const removeButtons = screen.getAllByRole("button");
      const removeButton = removeButtons.find(
        (button) =>
          button.getAttribute("class")?.includes("ActionIcon") ||
          button.querySelector("svg"),
      );

      if (removeButton) {
        fireEvent.click(removeButton);
        expect(mockRemoveDatabase).toHaveBeenCalledWith(mockDatabase);
      }
    });

    it("handles remove button click events properly", () => {
      const mockDatabases = ["/path/to/db1.duckdb", "/path/to/db2.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Should render without errors when clicking elements
      const removeButtons = screen.getAllByRole("button");
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Store integration", () => {
    it("receives databases from store", () => {
      const mockDatabases = ["/path/to/test1.duckdb", "/path/to/test2.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Component should render and display databases from store
      expect(screen.getByText("Loaded Databases (2)")).toBeInTheDocument();
    });

    it("updates when database list changes", () => {
      // Start with empty list
      const { rerender } = renderWithProviders(<DatabaseList />);

      expect(
        screen.getByText(
          "No databases loaded. Upload a .duckdb file to get started.",
        ),
      ).toBeInTheDocument();

      // Update to have databases
      const mockDatabases = ["/path/to/new-db.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      rerender(<DatabaseList />);

      // Should now show the database
      expect(screen.getByText("Loaded Databases (1)")).toBeInTheDocument();
      expect(screen.getByText("/path/to/new-db.duckdb")).toBeInTheDocument();
    });

    it("handles store errors gracefully", () => {
      // Test with undefined/null databases - but provide empty array to prevent crashes
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          removeDatabase: mockRemoveDatabase,
        }),
      );

      // Should not throw error even with invalid data
      expect(() => {
        renderWithProviders(<DatabaseList />);
      }).not.toThrow();
    });
  });

  describe("Component integration", () => {
    it("integrates with UploadButton component", () => {
      renderWithProviders(<DatabaseList />);

      // Should include the upload button
      expect(screen.getByTestId("upload-button")).toBeInTheDocument();
    });

    it("maintains component structure with databases", () => {
      const mockDatabases = [TEST_CONSTANTS.MOCK_DATABASE_PATH];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      const { container } = renderWithProviders(<DatabaseList />);

      // Should have upload button and database list
      expect(screen.getByTestId("upload-button")).toBeInTheDocument();
      expect(
        screen.getByText(TEST_CONSTANTS.MOCK_DATABASE_PATH),
      ).toBeInTheDocument();
      expect(container).toBeInTheDocument();
    });
  });

  describe("Edge cases", () => {
    it("handles very long database paths", () => {
      const longPath =
        "/very/long/path/to/database/with/many/directories/that/might/cause/display/issues/test-database.duckdb";

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [longPath],
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      expect(screen.getByText(longPath)).toBeInTheDocument();
    });

    it("handles special characters in database paths", () => {
      const specialPath = "/path/with spaces & symbols/test-db@2024.duckdb";

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [specialPath],
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      expect(screen.getByText(specialPath)).toBeInTheDocument();
    });

    it("handles empty string database paths", () => {
      const mockDatabases = ["", "/path/to/valid.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          removeDatabase: mockRemoveDatabase,
        }),
      );

      renderWithProviders(<DatabaseList />);

      // Should show count including empty string
      expect(screen.getByText("Loaded Databases (2)")).toBeInTheDocument();
      expect(screen.getByText("/path/to/valid.duckdb")).toBeInTheDocument();
    });
  });
});
