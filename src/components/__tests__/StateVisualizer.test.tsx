import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import StateVisualizer from "../StateVisualizer";
import {
  renderWithProviders,
  createMockStoreState,
  createMockDatabase,
  createMockGraphConfig,
} from "../../test/utils";

describe("StateVisualizer Component", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders correctly with empty state", () => {
    const mockStore = createMockStoreState({
      databases: [],
      graphs: [],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    expect(screen.getByText("Application State")).toBeInTheDocument();
    expect(screen.getByText(/"databases": \[\]/)).toBeInTheDocument();
    expect(screen.getByText(/"graphs": \[\]/)).toBeInTheDocument();
  });

  it("renders correctly with populated state", () => {
    const mockDatabase = createMockDatabase({
      id: "db-1",
      name: "Test Database",
      path: "/test/path.duckdb",
    });

    const mockGraph = createMockGraphConfig({
      id: "graph-1",
      type: "capacity",
      title: "Test Graph",
    });

    const mockStore = createMockStoreState({
      databases: [mockDatabase.path],
      graphs: [mockGraph],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    expect(screen.getByText("Application State")).toBeInTheDocument();
  });

  it("renders the state visualizer button", () => {
    const mockDatabase = createMockDatabase({
      id: "db-test",
      name: "Test Database",
      path: "/test/path.duckdb",
    });

    const mockGraph = createMockGraphConfig({
      id: "graph-test",
      type: "capacity",
      title: "Test Graph",
    });

    const mockStore = createMockStoreState({
      databases: [mockDatabase.path],
      graphs: [mockGraph],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    expect(screen.getByText("Application State")).toBeInTheDocument();
  });

  it("toggles state visibility when button is clicked", () => {
    const mockStore = createMockStoreState({});

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    // After clicking, the panel should expand and show the content
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");
  });

  it("displays databases in JSON format when state is visible", () => {
    const mockStore = createMockStoreState({
      databases: ["/test/path.duckdb"],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    expect(screen.getByText(/\/test\/path\.duckdb/)).toBeInTheDocument();
  });

  it("displays graphs in JSON format when state is visible", () => {
    const mockStore = createMockStoreState({
      graphs: [
        {
          ...createMockGraphConfig(),
          id: "graph-test",
          type: "capacity",
          title: "Test Graph",
          error: null,
          isLoading: false,
          options: null,
          graphDBFilePath: null,
          filtersByCategory: {},
          breakdownNodes: [],
        },
      ],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    expect(screen.getByText(/"id": "graph-test"/)).toBeInTheDocument();
    expect(screen.getByText(/"type": "capacity"/)).toBeInTheDocument();
    expect(screen.getByText(/"title": "Test Graph"/)).toBeInTheDocument();
  });

  it("formats JSON with proper indentation", () => {
    const mockStore = createMockStoreState({
      databases: [],
      graphs: [
        {
          ...createMockGraphConfig(),
          id: "format-test",
          type: "capacity",
          title: "Format Test",
          error: null,
          isLoading: false,
          options: null,
          graphDBFilePath: null,
          filtersByCategory: {},
          breakdownNodes: [],
        },
      ],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    // Check that the JSON is properly formatted with indentation
    const codeElement = screen.getByRole("region").querySelector("pre");
    expect(codeElement).toBeInTheDocument();

    // The JSON should be formatted with 2-space indentation
    const codeContent = codeElement?.textContent || "";
    expect(codeContent).toContain('  "graphs": [');
    expect(codeContent).toContain("    {");
  });

  it("has proper accessibility attributes", () => {
    const mockStore = createMockStoreState({});

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
    expect(toggleButton).toHaveAttribute("aria-controls");
  });

  it("updates aria-expanded when toggled", () => {
    const mockStore = createMockStoreState({});

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });

    // Initially collapsed
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  });

  it("handles empty string values in state", () => {
    const mockDatabase = createMockDatabase({
      id: "",
      name: "",
      path: "",
    });

    const mockStore = createMockStoreState({
      databases: [mockDatabase.path],
      graphs: [],
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    expect(screen.getByText(/""/)).toBeInTheDocument();
  });

  it("handles null and undefined values in state", () => {
    const mockGraph = createMockGraphConfig({
      id: "test-graph",
      title: "Test Graph",
      error: null,
      options: undefined,
    });

    const mockStore = createMockStoreState({
      databases: [],
      graphs: [mockGraph],
      error: null,
    });

    renderWithProviders(<StateVisualizer />, {
      initialStoreState: mockStore,
    });

    const toggleButton = screen.getByRole("button", {
      name: /application state/i,
    });
    fireEvent.click(toggleButton);

    expect(screen.getByText(/"error": null/)).toBeInTheDocument();
  });
});
