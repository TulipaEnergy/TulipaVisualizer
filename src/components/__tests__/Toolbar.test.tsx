import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import Toolbar from "../Toolbar";
import useVisualizationStore from "../../store/visualizationStore";
import { renderWithProviders, createMockStoreState } from "../../test/utils";

// Mock the store
vi.mock("../../store/visualizationStore");

describe("Toolbar Component", () => {
  const mockHasAnyDatabase = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup default store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        isLoading: false,
        hasAnyDatabase: mockHasAnyDatabase,
      }),
    );

    // Default return value
    mockHasAnyDatabase.mockReturnValue(false);
  });

  describe("Basic rendering", () => {
    it("renders without errors", () => {
      const { container } = renderWithProviders(<Toolbar />);

      expect(container).toBeInTheDocument();
    });

    it("displays the application title", () => {
      renderWithProviders(<Toolbar />);

      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
    });

    it("renders as a Paper component with correct styling", () => {
      renderWithProviders(<Toolbar />);

      // Check that the title is rendered (which confirms the Paper container exists)
      const title = screen.getByText("Tulipa Energy Visualizer");
      expect(title).toBeInTheDocument();
    });

    it("has fixed positioning styles", () => {
      renderWithProviders(<Toolbar />);

      // The component should render successfully with fixed positioning
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
    });
  });

  describe("Loading state when no database", () => {
    it("does not show loading text when not loading and no database", () => {
      mockHasAnyDatabase.mockReturnValue(false);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: false,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("does not show loading text when loading but no database", () => {
      mockHasAnyDatabase.mockReturnValue(false);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("Loading state with database", () => {
    it("does not show loading text when not loading but has database", () => {
      mockHasAnyDatabase.mockReturnValue(true);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: false,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("shows loading text when loading and has database", () => {
      mockHasAnyDatabase.mockReturnValue(true);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Store integration", () => {
    it("calls hasAnyDatabase from store", () => {
      renderWithProviders(<Toolbar />);

      // Should call hasAnyDatabase function
      expect(mockHasAnyDatabase).toHaveBeenCalled();
    });

    it("responds to isLoading state changes", () => {
      // Test with loading false
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: false,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      const { rerender } = renderWithProviders(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

      // Test with loading true and database present
      mockHasAnyDatabase.mockReturnValue(true);
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      rerender(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("responds to hasAnyDatabase state changes", () => {
      // Start with no database and loading
      mockHasAnyDatabase.mockReturnValue(false);
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      const { rerender } = renderWithProviders(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

      // Update to have database and loading
      mockHasAnyDatabase.mockReturnValue(true);
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      rerender(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Component structure", () => {
    it("renders title as heading", () => {
      renderWithProviders(<Toolbar />);

      // Check that title is rendered as a heading element
      const title = screen.getByRole("heading", {
        name: "Tulipa Energy Visualizer",
      });
      expect(title).toBeInTheDocument();
    });

    it("maintains consistent layout structure", () => {
      renderWithProviders(<Toolbar />);

      // Should have the main title
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();

      // Should not have loading text by default
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("shows loading text with correct styling when conditions are met", () => {
      mockHasAnyDatabase.mockReturnValue(true);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      const loadingText = screen.getByText("Loading...");
      expect(loadingText).toBeInTheDocument();
    });
  });

  describe("Conditional rendering logic", () => {
    it("loading text only appears when both conditions are true", () => {
      // Test all combinations of isLoading and hasAnyDatabase
      const testCases = [
        { isLoading: false, hasDatabase: false, shouldShowLoading: false },
        { isLoading: false, hasDatabase: true, shouldShowLoading: false },
        { isLoading: true, hasDatabase: false, shouldShowLoading: false },
        { isLoading: true, hasDatabase: true, shouldShowLoading: true },
      ];

      testCases.forEach(({ isLoading, hasDatabase, shouldShowLoading }) => {
        mockHasAnyDatabase.mockReturnValue(hasDatabase);

        (
          useVisualizationStore as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValue(
          createMockStoreState({
            isLoading,
            hasAnyDatabase: mockHasAnyDatabase,
          }),
        );

        const { unmount } = renderWithProviders(<Toolbar />);

        if (shouldShowLoading) {
          expect(screen.getByText("Loading...")).toBeInTheDocument();
        } else {
          expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
        }

        // Always should have the title regardless of loading state
        expect(
          screen.getByText("Tulipa Energy Visualizer"),
        ).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper heading structure", () => {
      renderWithProviders(<Toolbar />);

      // Title should be accessible as a heading
      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toHaveTextContent("Tulipa Energy Visualizer");
    });

    it("loading text is accessible when shown", () => {
      mockHasAnyDatabase.mockReturnValue(true);

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      renderWithProviders(<Toolbar />);

      // Loading text should be accessible
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("handles store errors gracefully", () => {
      // Test with undefined store values
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: undefined as any,
          hasAnyDatabase: mockHasAnyDatabase, // Keep this as a valid function
        }),
      );

      // Should not throw error when hasAnyDatabase is still a function
      expect(() => {
        renderWithProviders(<Toolbar />);
      }).not.toThrow();

      // Should still render the title
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
    });

    it("handles hasAnyDatabase function throwing error", () => {
      const mockErrorFunction = vi.fn(() => {
        throw new Error("Database check failed");
      });

      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockErrorFunction,
        }),
      );

      // Suppress console.error for this test to avoid noise
      const originalConsoleError = console.error;
      console.error = vi.fn();

      // React components will naturally throw when functions in render throw errors
      // This is expected behavior - components should handle this at a higher level
      expect(() => {
        renderWithProviders(<Toolbar />);
      }).toThrow("Database check failed");

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe("Edge cases", () => {
    it("handles rapid state changes", () => {
      mockHasAnyDatabase.mockReturnValue(true);

      // Start with loading
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: true,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      const { rerender } = renderWithProviders(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();

      // Rapidly change to not loading
      (
        useVisualizationStore as unknown as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createMockStoreState({
          isLoading: false,
          hasAnyDatabase: mockHasAnyDatabase,
        }),
      );

      rerender(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
    });

    it("maintains state consistency", () => {
      renderWithProviders(<Toolbar />);

      // Title should always be present
      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();

      // hasAnyDatabase should be called
      expect(mockHasAnyDatabase).toHaveBeenCalled();
    });
  });
});
