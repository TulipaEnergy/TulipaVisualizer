import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Toolbar from "./Toolbar";

// Mock the store
vi.mock("../store/visualizationStore", () => ({
  default: vi.fn(),
}));

// Mock DocumentationModal
vi.mock("./DocumentationModal", () => ({
  default: vi.fn(),
}));

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock logo import
vi.mock("../assets/tulipaLogo.png", () => ({
  default: "mocked-logo.png",
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe("Toolbar", () => {
  let mockUseVisualizationStore: any;
  let mockDocumentationModal: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked modules
    const { default: useVisualizationStore } = await import(
      "../store/visualizationStore"
    );
    const { default: DocumentationModal } = await import(
      "./DocumentationModal"
    );

    mockUseVisualizationStore = useVisualizationStore as any;
    mockDocumentationModal = DocumentationModal as any;

    // Default mock implementation
    mockUseVisualizationStore.mockReturnValue({
      isLoading: false,
      hasAnyDatabase: () => false,
    });

    // Mock DocumentationModal to render a simple div
    mockDocumentationModal.mockImplementation(
      ({ opened, onClose }: { opened: boolean; onClose: () => void }) =>
        opened ? (
          <div data-testid="documentation-modal">
            <button onClick={onClose}>Close Modal</button>
          </div>
        ) : null,
    );
  });

  describe("Basic Rendering", () => {
    it("should render application branding", () => {
      renderWithProvider(<Toolbar />);

      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    it("should render documentation button", () => {
      renderWithProvider(<Toolbar />);

      expect(
        screen.getByRole("button", { name: /documentation/i }),
      ).toBeInTheDocument();
    });

    it("should not show loading indicator when not loading", () => {
      mockUseVisualizationStore.mockReturnValue({
        isLoading: false,
        hasAnyDatabase: () => true,
      });

      renderWithProvider(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    it("should show loading indicator when loading and has database", () => {
      mockUseVisualizationStore.mockReturnValue({
        isLoading: true,
        hasAnyDatabase: () => true,
      });

      renderWithProvider(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should not show loading indicator when no database", () => {
      mockUseVisualizationStore.mockReturnValue({
        isLoading: true,
        hasAnyDatabase: () => false,
      });

      renderWithProvider(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("Documentation Modal Integration", () => {
    it("should not show documentation modal initially", () => {
      renderWithProvider(<Toolbar />);

      expect(
        screen.queryByTestId("documentation-modal"),
      ).not.toBeInTheDocument();
    });

    it("should open documentation modal when button is clicked", async () => {
      renderWithProvider(<Toolbar />);

      const docButton = screen.getByRole("button", { name: /documentation/i });
      fireEvent.click(docButton);

      await waitFor(() => {
        expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      });
    });

    it("should close documentation modal when close is called", async () => {
      renderWithProvider(<Toolbar />);

      // Open modal
      const docButton = screen.getByRole("button", { name: /documentation/i });
      fireEvent.click(docButton);

      await waitFor(() => {
        expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText("Close Modal");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByTestId("documentation-modal"),
        ).not.toBeInTheDocument();
      });
    });

    it("should pass correct props to DocumentationModal", async () => {
      renderWithProvider(<Toolbar />);

      const docButton = screen.getByRole("button", { name: /documentation/i });
      fireEvent.click(docButton);

      await waitFor(() => {
        expect(mockDocumentationModal).toHaveBeenCalledWith(
          expect.objectContaining({
            opened: true,
            onClose: expect.any(Function),
          }),
          {},
        );
      });
    });
  });

  describe("State Management", () => {
    it("should toggle modal state correctly", async () => {
      renderWithProvider(<Toolbar />);

      const docButton = screen.getByRole("button", { name: /documentation/i });

      // Initially closed
      expect(
        screen.queryByTestId("documentation-modal"),
      ).not.toBeInTheDocument();

      // Open modal
      fireEvent.click(docButton);
      await waitFor(() => {
        expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText("Close Modal");
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(
          screen.queryByTestId("documentation-modal"),
        ).not.toBeInTheDocument();
      });

      // Open again
      fireEvent.click(docButton);
      await waitFor(() => {
        expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Button Properties", () => {
    it("should have correct button styling and icon", () => {
      renderWithProvider(<Toolbar />);

      const docButton = screen.getByRole("button", { name: /documentation/i });
      expect(docButton).toHaveClass(/mantine-Button-root/);
    });

    it("should be focusable and accessible", () => {
      renderWithProvider(<Toolbar />);

      const docButton = screen.getByRole("button", { name: /documentation/i });
      expect(docButton).toBeEnabled();
      expect(docButton).toHaveAttribute("type", "button");
    });
  });

  describe("Layout and Positioning", () => {
    it("should have fixed positioning styles", () => {
      renderWithProvider(<Toolbar />);

      // Look for the Paper component with fixed positioning instead of banner role
      const toolbar = screen
        .getByText("Tulipa Energy Visualizer")
        .closest(".mantine-Paper-root");
      expect(toolbar).toHaveStyle({
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        "z-index": "1000",
      });
    });

    it("should have proper layout structure", () => {
      renderWithProvider(<Toolbar />);

      expect(screen.getByText("Tulipa Energy Visualizer")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /documentation/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  describe("Loading State Variations", () => {
    it("should handle loading state with database correctly", () => {
      mockUseVisualizationStore.mockReturnValue({
        isLoading: true,
        hasAnyDatabase: () => true,
      });

      renderWithProvider(<Toolbar />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toHaveStyle({
        "text-align": "center",
        "margin-top": "10px",
      });
    });

    it("should handle different store states", () => {
      mockUseVisualizationStore.mockReturnValue({
        isLoading: false,
        hasAnyDatabase: () => false,
      });

      renderWithProvider(<Toolbar />);

      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
  });

  describe("Integration Tests", () => {
    it("should work with real store state changes", () => {
      const { rerender } = renderWithProvider(<Toolbar />);

      // Initially no loading
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

      // Update store to loading state
      mockUseVisualizationStore.mockReturnValue({
        isLoading: true,
        hasAnyDatabase: () => true,
      });

      rerender(
        <MantineProvider>
          <Toolbar />
        </MantineProvider>,
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should maintain documentation modal state during loading changes", async () => {
      const { rerender } = renderWithProvider(<Toolbar />);

      // Open documentation modal
      const docButton = screen.getByRole("button", { name: /documentation/i });
      fireEvent.click(docButton);

      await waitFor(() => {
        expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      });

      // Change loading state
      mockUseVisualizationStore.mockReturnValue({
        isLoading: true,
        hasAnyDatabase: () => true,
      });

      rerender(
        <MantineProvider>
          <Toolbar />
        </MantineProvider>,
      );

      // Modal should still be open
      expect(screen.getByTestId("documentation-modal")).toBeInTheDocument();
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });
});
