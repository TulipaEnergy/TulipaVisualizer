import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import UploadButton from "../UploadButton";
import * as databaseOperations from "../../services/databaseOperations";
import useVisualizationStore from "../../store/visualizationStore";
import {
  renderWithProviders,
  createMockStoreState,
  TEST_CONSTANTS,
} from "../../test/utils";

// Mock the database operations module
vi.mock("../../services/databaseOperations");

// Mock Zustand stores
vi.mock("../../store/visualizationStore");

describe("UploadButton Component", () => {
  const mockSetError = vi.fn();
  const mockAddDatabase = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup store mocks using our test utilities
    (
      useVisualizationStore as unknown as ReturnType<typeof vi.fn>
    ).mockReturnValue(
      createMockStoreState({
        addDatabase: mockAddDatabase,
        setError: mockSetError,
      }),
    );

    mockAddDatabase.mockResolvedValue("db-123");
  });

  it("renders the upload button correctly", () => {
    renderWithProviders(<UploadButton />);
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("handles successful file upload", async () => {
    // Mock the uploadDatabaseFile function to return a successful response
    const mockFilePath = TEST_CONSTANTS.MOCK_DATABASE_PATH;
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(mockFilePath);

    renderWithProviders(<UploadButton />);
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockAddDatabase).toHaveBeenCalledWith(mockFilePath);
    });
  });

  it("handles cancelled file upload", async () => {
    // Mock the uploadDatabaseFile function to return null (user cancels)
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue(null);

    renderWithProviders(<UploadButton />);
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(button).toHaveTextContent("Upload Database File");
    });

    // Check that database was not added
    expect(mockAddDatabase).not.toHaveBeenCalled();
  });

  it("handles upload errors", async () => {
    // Mock the uploadDatabaseFile function to throw an error
    const mockError = new Error("Failed to upload file");
    (
      databaseOperations.uploadDatabaseFile as unknown as ReturnType<
        typeof vi.fn
      >
    ).mockRejectedValue(mockError);

    renderWithProviders(<UploadButton />);
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to trigger file upload
    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for error to be set
    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        `Error selecting file: ${mockError.message}`,
      );
    });

    // Check that database was not added
    expect(mockAddDatabase).not.toHaveBeenCalled();
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

    renderWithProviders(<UploadButton />);
    const button = screen.getByRole("button", {
      name: /upload database file/i,
    });

    // Click the button to start upload
    await act(async () => {
      fireEvent.click(button);
    });

    // Check that the button text changes during upload
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /uploading\.\.\./i }),
      ).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    // Resolve the upload
    await act(async () => {
      resolveUpload!(TEST_CONSTANTS.MOCK_DATABASE_PATH);
    });

    // Wait for the upload to complete and button to return to normal state
    await waitFor(() => {
      expect(button).toHaveTextContent("Upload Database File");
      expect(button).not.toBeDisabled();
    });
  });
});
