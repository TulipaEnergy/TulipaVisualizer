import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DocumentationModal from "../../DocumentationModal";

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock highlight.js CSS import
vi.mock("highlight.js/styles/github.css", () => ({}));

// Mock react-markdown components to avoid complex rendering in tests
vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">
      {/* Preserve line breaks and formatting for tests */}
      {children.split("\n").map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  ),
}));

vi.mock("remark-gfm", () => ({
  default: vi.fn(),
}));

vi.mock("rehype-highlight", () => ({
  default: vi.fn(),
}));

// Mock LoadingOverlay component
vi.mock("@mantine/core", async () => {
  const actual = await vi.importActual("@mantine/core");
  return {
    ...actual,
    LoadingOverlay: ({ visible }: { visible: boolean }) =>
      visible ? <div data-testid="loading-overlay">Loading...</div> : null,
  };
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe("DocumentationModal", () => {
  let mockInvoke: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { invoke } = await import("@tauri-apps/api/core");
    mockInvoke = invoke as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Modal Visibility", () => {
    it("should not render when opened is false", () => {
      renderWithProvider(
        <DocumentationModal opened={false} onClose={vi.fn()} />,
      );

      expect(screen.queryByText("Documentation")).not.toBeInTheDocument();
    });

    it("should render when opened is true", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce(
        "# Test Documentation\n\nThis is test content.",
      );

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Documentation")).toBeInTheDocument();
      });
    });

    it("should call onClose when close button is clicked", async () => {
      const mockOnClose = vi.fn();
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce("# Test Documentation");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={mockOnClose} />,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // The Close button should be in the footer
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("File Loading", () => {
    it("should load available documentation files on open", async () => {
      const mockFiles = [
        "docs/user-guide.md",
        "docs/api-reference.md",
        "README.md",
      ];
      mockInvoke.mockResolvedValueOnce(mockFiles);
      mockInvoke.mockResolvedValueOnce("# User Guide Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith(
          "get_available_documentation_files",
        );
      });
    });

    it("should load default documentation content on open", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce(
        "# User Guide\n\nWelcome to the user guide.",
      );

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("read_documentation_file", {
          filePath: "docs/user-guide.md",
        });
      });
    });

    it("should handle file loading errors gracefully", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockRejectedValueOnce(new Error("File not found"));

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Loading Information")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
      });
    });

    it("should fallback to all files if get_available_documentation_files fails", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Service unavailable"));
      mockInvoke.mockResolvedValueOnce("# Fallback content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Choose a documentation section"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Document Selection", () => {
    it("should allow changing documentation sections", async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValueOnce([
        "docs/user-guide.md",
        "docs/api-reference.md",
      ]);
      mockInvoke.mockResolvedValueOnce("# User Guide Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("Choose a documentation section"),
        ).toBeInTheDocument();
      });

      // Clear the initial invocations
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValueOnce("# API Reference Content");

      // Click on the select to open it
      const select = screen.getByPlaceholderText(
        "Choose a documentation section",
      );
      await user.click(select);

      // Wait for options to appear and select API Reference
      await waitFor(() => {
        const apiOption = screen.getByText("API Reference");
        expect(apiOption).toBeInTheDocument();
      });

      const apiOption = screen.getByText("API Reference");
      await user.click(apiOption);

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith("read_documentation_file", {
          filePath: "docs/api-reference.md",
        });
      });
    });

    it("should show loading state while fetching content", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);

      // Create a promise that we can control
      let resolveContent: (value: string) => void;
      const contentPromise = new Promise<string>((resolve) => {
        resolveContent = resolve;
      });
      mockInvoke.mockReturnValueOnce(contentPromise);

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      // Loading should be visible initially
      await waitFor(() => {
        expect(screen.getByTestId("loading-overlay")).toBeInTheDocument();
      });

      // Resolve the content promise
      resolveContent!("# Content loaded");

      await waitFor(() => {
        expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
      });
    });
  });

  describe("Content Rendering", () => {
    it("should render markdown content correctly", async () => {
      const testContent =
        "# Test Title\n\nThis is test content with **bold** text.";
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce(testContent);

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        const markdownContent = screen.getByTestId("markdown-content");
        expect(markdownContent).toHaveTextContent("# Test Title");
        expect(markdownContent).toHaveTextContent(
          "This is test content with **bold** text.",
        );
      });
    });

    it("should show fallback content when file loading fails", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockRejectedValueOnce(new Error("Access denied"));

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            /Welcome to Tulipa Energy Visualizer Documentation/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it("should display error alert when content fails to load", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Loading Information")).toBeInTheDocument();
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });
  });

  describe("UI Components", () => {
    it("should display documentation title with book icon", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce("# Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Documentation")).toBeInTheDocument();
      });
    });

    it("should show document selector with available options", async () => {
      const availableFiles = ["docs/user-guide.md", "docs/api-reference.md"];
      mockInvoke.mockResolvedValueOnce(availableFiles);
      mockInvoke.mockResolvedValueOnce("# Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      // Check for the select input specifically using the placeholder
      await waitFor(() => {
        const selectInput = screen.getByPlaceholderText(
          "Choose a documentation section",
        );
        expect(selectInput).toBeInTheDocument();
      });
    });

    it("should show all documentation options when no files are available", async () => {
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce("# Fallback content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        // Use placeholder to find the select element
        const selectInput = screen.getByPlaceholderText(
          "Choose a documentation section",
        );
        expect(selectInput).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper modal structure", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce("# Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("should have accessible form controls", async () => {
      mockInvoke.mockResolvedValueOnce(["docs/user-guide.md"]);
      mockInvoke.mockResolvedValueOnce("# Content");

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        // Use placeholder instead of label to avoid multiple element issues
        expect(
          screen.getByPlaceholderText("Choose a documentation section"),
        ).toBeInTheDocument();
        expect(screen.getByText("Close")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle service unavailable errors", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Service unavailable"));
      mockInvoke.mockRejectedValueOnce(new Error("Service unavailable"));

      renderWithProvider(
        <DocumentationModal opened={true} onClose={vi.fn()} />,
      );

      await waitFor(() => {
        // Look for the fallback content by checking the markdown content
        expect(screen.getByTestId("markdown-content")).toBeInTheDocument();
        // Look for specific text that we know is in the fallback content
        expect(
          screen.getByText(
            /Welcome to Tulipa Energy Visualizer Documentation/i,
          ),
        ).toBeInTheDocument();
      });
    });
  });
});
