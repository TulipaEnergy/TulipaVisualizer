import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// Mock the Tauri API
vi.mock("@tauri-apps/api", () => {
  return {
    invoke: vi.fn(() => Promise.resolve({})),
  };
});

// Mock the Tauri dialog plugin
vi.mock("@tauri-apps/plugin-dialog", () => {
  return {
    open: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve(null)),
  };
});

// Mock the Tauri opener plugin
vi.mock("@tauri-apps/plugin-opener", () => {
  return {
    open: vi.fn(() => Promise.resolve(null)),
  };
});

// Setup to handle ECharts (which uses canvas)
global.matchMedia =
  global.matchMedia ||
  function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };

// Reset all mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
