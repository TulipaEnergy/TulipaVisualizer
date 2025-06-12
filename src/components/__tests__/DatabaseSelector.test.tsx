import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import DatabaseSelector from "../DatabaseSelector";
import useVisualizationStore from "../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  TEST_CONSTANTS,
} from "../../test/utils";

// Mock the store
vi.mock("../../store/visualizationStore");

describe("DatabaseSelector Component", () => {
  const mockSetGraphDatabase = vi.fn();
  const mockGetGraphDatabase = vi.fn();
  const testGraphId = "test-graph-123";

  const defaultProps = {
    graphId: testGraphId,
    size: "md" as const,
    showBadge: false,
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        databases: [],
        setGraphDatabase: mockSetGraphDatabase,
        getGraphDatabase: mockGetGraphDatabase,
      }),
    );

    // Default return value for getGraphDatabase
    mockGetGraphDatabase.mockReturnValue(null);
  });

  describe("Basic rendering", () => {
    it("renders without errors", () => {
      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} />,
      );

      // Just check that component renders without throwing errors
      expect(container).toBeInTheDocument();
    });

    it("displays placeholder text", () => {
      renderWithProviders(<DatabaseSelector {...defaultProps} />);

      // Check for placeholder attribute in input element
      expect(
        screen.getByPlaceholderText("Select database"),
      ).toBeInTheDocument();
    });

    it("calls getGraphDatabase with correct graphId on render", () => {
      renderWithProviders(<DatabaseSelector {...defaultProps} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Database list integration", () => {
    it("receives databases from store", () => {
      const mockDatabases = ["/path/to/db1.duckdb", "/path/to/db2.duckdb"];

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: mockDatabases,
          setGraphDatabase: mockSetGraphDatabase,
          getGraphDatabase: mockGetGraphDatabase,
        }),
      );

      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} />,
      );

      // Component should render without errors with databases
      expect(container).toBeInTheDocument();
    });

    it("displays selected database when one is set", () => {
      const selectedDb = TEST_CONSTANTS.MOCK_DATABASE_PATH;
      mockGetGraphDatabase.mockReturnValue(selectedDb);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [selectedDb],
          setGraphDatabase: mockSetGraphDatabase,
          getGraphDatabase: mockGetGraphDatabase,
        }),
      );

      renderWithProviders(<DatabaseSelector {...defaultProps} />);

      // Component should render and call the store methods
      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });

  describe("Badge functionality", () => {
    it("renders when showBadge is false", () => {
      const selectedDb = TEST_CONSTANTS.MOCK_DATABASE_PATH;
      mockGetGraphDatabase.mockReturnValue(selectedDb);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [selectedDb],
          setGraphDatabase: mockSetGraphDatabase,
          getGraphDatabase: mockGetGraphDatabase,
        }),
      );

      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} showBadge={false} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("shows badge when showBadge is true and database is selected", () => {
      const selectedDb = "/path/to/test-database.duckdb";
      mockGetGraphDatabase.mockReturnValue(selectedDb);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [selectedDb],
          setGraphDatabase: mockSetGraphDatabase,
          getGraphDatabase: mockGetGraphDatabase,
        }),
      );

      renderWithProviders(
        <DatabaseSelector {...defaultProps} showBadge={true} />,
      );

      // Badge should be present with shortened name
      expect(screen.getByText("test-database")).toBeInTheDocument();
    });

    it("renders without badge when no database selected", () => {
      mockGetGraphDatabase.mockReturnValue(null);

      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} showBadge={true} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("Props handling", () => {
    it("renders with different sizes", () => {
      const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

      sizes.forEach((size) => {
        const { container, unmount } = renderWithProviders(
          <DatabaseSelector {...defaultProps} size={size} />,
        );

        expect(container).toBeInTheDocument();
        unmount();
      });
    });

    it("uses correct graphId for store interactions", () => {
      const customGraphId = "custom-graph-456";

      renderWithProviders(
        <DatabaseSelector {...defaultProps} graphId={customGraphId} />,
      );

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(customGraphId);
    });
  });

  describe("Store integration", () => {
    it("handles empty database list", () => {
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          databases: [],
          setGraphDatabase: mockSetGraphDatabase,
          getGraphDatabase: mockGetGraphDatabase,
        }),
      );

      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} />,
      );

      expect(container).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Select database"),
      ).toBeInTheDocument();
    });

    it("handles null database selection", () => {
      mockGetGraphDatabase.mockReturnValue(null);

      const { container } = renderWithProviders(
        <DatabaseSelector {...defaultProps} />,
      );

      expect(container).toBeInTheDocument();
    });

    it("retrieves current selection from store", () => {
      const selectedDb = "/path/to/selected.duckdb";
      mockGetGraphDatabase.mockReturnValue(selectedDb);

      renderWithProviders(<DatabaseSelector {...defaultProps} />);

      expect(mockGetGraphDatabase).toHaveBeenCalledWith(testGraphId);
    });
  });
});
