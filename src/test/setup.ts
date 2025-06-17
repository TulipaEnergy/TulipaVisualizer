import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";

// Mock the visualization store
vi.mock("../store/visualizationStore", () => {
  const mockStore = {
    databases: [],
    isLoading: false,
    error: null,
    graphs: [],
    setIsLoading: vi.fn(),
    setError: vi.fn(),
    addGraph: vi.fn(),
    mustGetGraph: vi.fn(),
    removeGraph: vi.fn(),
    updateGraph: vi.fn(),
    addDatabase: vi.fn(),
    removeDatabase: vi.fn(),
    setGraphDatabase: vi.fn(),
    getGraphDatabase: vi.fn(),
    hasAnyDatabase: vi.fn(() => false),
    mustGetFiltering: vi.fn(() => ({})),
    updateFiltersForCategory: vi.fn(),
  };

  return {
    default: vi.fn(() => mockStore),
    __esModule: true,
  };
});

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

// Mock the Tauri fs plugin
vi.mock("@tauri-apps/plugin-fs", () => {
  return {
    readTextFile: vi.fn(() => Promise.resolve("{}")),
    writeTextFile: vi.fn(() => Promise.resolve()),
    readFile: vi.fn(() => Promise.resolve(new Uint8Array())),
    writeFile: vi.fn(() => Promise.resolve()),
    exists: vi.fn(() => Promise.resolve(false)),
  };
});

// Mock the Tauri path API
vi.mock("@tauri-apps/api/path", () => {
  return {
    resolveResource: vi.fn((path: string) => Promise.resolve(path)),
    appDir: vi.fn(() => Promise.resolve("/mock/app/dir")),
    downloadDir: vi.fn(() => Promise.resolve("/mock/download/dir")),
  };
});

// Mock the gateway/io module to avoid Tauri import issues
vi.mock("../gateway/io", () => {
  return {
    triggerDuckDBFileDialog: vi.fn(() =>
      Promise.resolve("/mock/path/to/database.duckdb"),
    ),
    readJSON: vi.fn(() => Promise.resolve({})),
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

// Mock ResizeObserver for Mantine components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver if needed
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
};

// Mock scrollIntoView for Mantine components
Element.prototype.scrollIntoView = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock Canvas operations for ECharts
const createMockCanvas = () => {
  const mockContext: any = {
    strokeStyle: "",
    fillStyle: "",
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    lineWidth: 1,
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    shadowColor: "rgba(0, 0, 0, 0)",
    lineCap: "butt",
    lineJoin: "miter",
    miterLimit: 10,
    font: "10px sans-serif",
    textAlign: "start",
    textBaseline: "alphabetic",
    direction: "inherit",
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    arc: vi.fn(),
    arcTo: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockContext),
    toDataURL: vi.fn(() => "data:image/png;base64,"),
    toBlob: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    style: {},
  };

  // Set canvas reference in context
  mockContext.canvas = mockCanvas;

  return mockCanvas;
};

// Mock document.createElement for canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn((tagName: string) => {
  if (tagName === "canvas") {
    return createMockCanvas() as any;
  }
  return originalCreateElement(tagName);
});

// Reset all mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
