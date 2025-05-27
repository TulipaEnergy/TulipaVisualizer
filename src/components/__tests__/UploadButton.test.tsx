import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import UploadButton from "../UploadButton";
import * as databaseOperations from "../../services/databaseOperations";
import useVisualizationStore from "../../store/visualizationStore";
import { MantineProvider } from "@mantine/core"; // Import MantineProvider

// Mock the database operations module
vi.mock("../../services/databaseOperations");

// Mock Zustand store
vi.mock("../../store/visualizationStore");

// Helper function to render with MantineProvider
const renderWithMantine = (component: React.ReactElement) => {
  return render(<MantineProvider>{component}</MantineProvider>);
};

describe("UploadButton Component", () => {
  const mockSetDbFilePath = vi.fn();
  const mockSetIsLoading = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup store mock
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue({
      setGlobalDBFilePath: mockSetDbFilePath,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
    });
  });

  it("renders the upload button correctly", () => {
    renderWithMantine(<UploadButton />); // Use the helper function
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("handles successful file upload", async () => {
    // Mock the uploadDatabaseFile function to return a successful response
    const mockFilePath = "/path/to/database.duckdb";
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockFilePath);

    renderWithMantine(<UploadButton />); // Use the helper function
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await fireEvent.click(button);

    // Check that loading state was managed properly
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenLastCalledWith(false);

    // Check that file path was set
    expect(mockSetDbFilePath).toHaveBeenCalledWith(mockFilePath);

    // Check that error was cleared
    expect(mockSetError).toHaveBeenCalledWith(null);
  });

  it("handles cancelled file upload", async () => {
    // Mock the uploadDatabaseFile function to return null (user cancels)
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(null);

    renderWithMantine(<UploadButton />); // Use the helper function
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await fireEvent.click(button);

    // Check that loading state was managed properly
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenLastCalledWith(false);

    // Check that file path was not set
    expect(mockSetDbFilePath).not.toHaveBeenCalled();
  });

  it("handles upload errors", async () => {
    // Mock the uploadDatabaseFile function to throw an error
    const mockError = new Error("Failed to upload file");
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockRejectedValue(mockError);

    renderWithMantine(<UploadButton />); // Use the helper function
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await fireEvent.click(button);

    // Check that loading state was managed properly
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenLastCalledWith(false);

    // Check that error was set
    expect(mockSetError).toHaveBeenCalledWith(
      `Error selecting file: ${mockError.message}`,
    );

    // Check that file path was not set
    expect(mockSetDbFilePath).not.toHaveBeenCalled();
  });

  it("displays uploading text when in progress", async () => {
    // Create a promise that won't resolve immediately
    let resolveUpload: (value: string | null) => void;
    const uploadPromise = new Promise<string | null>((resolve) => {
      resolveUpload = resolve;
    });

    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockReturnValue(uploadPromise);

    renderWithMantine(<UploadButton />); // Use the helper function
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to start upload
    fireEvent.click(button);

    // Check that the button text changes during upload
    expect(
      screen.getByRole("button", { name: /uploading\.\.\./i }),
    ).toBeInTheDocument();
    expect(button).toBeDisabled();

    // Resolve the upload
    resolveUpload!("/path/to/file.duckdb");
  });
});
