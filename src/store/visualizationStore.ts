import { create } from "zustand";

export type Resolution = "hour" | "day" | "week" | "month" | "year";
export type ChartType =
  | "capacity"
  | "database"
  | "system-costs"
  | "production-costs";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CapacityOptions {
  asset?: string;
  startYear?: number;
  endYear?: number;
}

export interface GraphConfig {
  id: string;
  type: ChartType;
  containerId: number; // Add containerId to track which container this graph belongs to
  title: string;
  error: string | null;
  isLoading: boolean;
  options: CapacityOptions | null; // Each KPI should define its own options structure
  graphDBFilePath: string | null; // For when each graph has its own DB file
}

export interface ConfigToSave {
  resolution: Resolution;
  dateRange: DateRange;
  graphs: GraphConfig[];
  globalDBFilePath: string | null;
}

export interface VisualizationState {
  // Database connection
  globalDBFilePath: string | null;
  isLoading: boolean;
  error: string | null;

  // Visualization settings
  resolution: Resolution;
  dateRange: DateRange;
  graphs: GraphConfig[];

  // Actions
  setGlobalDBFilePath: (path: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  setResolution: (resolution: Resolution) => void;
  setDateRange: (dateRange: DateRange) => void;

  addGraph: (type: ChartType, containerId: number) => void;
  removeGraph: (id: string) => void;
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;

  saveConfig: () => string;
  loadConfig: (config: string) => void;
}

const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Database connection
  globalDBFilePath: null,
  isLoading: false,
  error: null,

  // Visualization settings
  resolution: "day",
  dateRange: { startDate: new Date(), endDate: new Date() },
  graphs: [],

  // Actions
  setGlobalDBFilePath: (path: string | null) => set({ globalDBFilePath: path }),
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),

  setResolution: (resolution: Resolution) => set({ resolution }),
  setDateRange: (dateRange: DateRange) => set({ dateRange }),

  addGraph: async (type: ChartType, containerId: number) => {
    set((state) => {
      return {
        graphs: [
          ...state.graphs,
          {
            graphDBFilePath: null, // Default to null for new graphs
            id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            containerId,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
            error: null,
            isLoading: false,
            options: null,
          },
        ],
      };
    });
  },

  removeGraph: (id) =>
    set((state) => ({
      graphs: state.graphs.filter((graph) => graph.id !== id),
    })),

  updateGraph: (id, updates) =>
    set((state) => ({
      graphs: state.graphs.map((graph) =>
        graph.id === id ? { ...graph, ...updates } : graph,
      ),
    })),

  saveConfig: (): string => {
    const state = get();
    const config: ConfigToSave = {
      resolution: state.resolution,
      dateRange: state.dateRange,
      graphs: state.graphs,
      globalDBFilePath: state.globalDBFilePath,
    };
    return JSON.stringify(config);
  },

  loadConfig: (configStr: string) => {
    try {
      const config = JSON.parse(configStr) as ConfigToSave;
      set({
        resolution: config.resolution || "day",
        dateRange: config.dateRange || {
          startDate: new Date(),
          endDate: new Date(),
        },
        // Transform SavedGraphConfig[] to GraphConfig[] by adding missing data property
        graphs: (config.graphs || []).map((graph) => ({
          ...graph,
          containerId: 0, // Default containerId for loaded graphs
        })),
        globalDBFilePath: config.globalDBFilePath,
      });
    } catch (error) {
      console.error("Failed to load configuration:", error);
      set({ error: "Failed to load dashboard configuration." });
    }
  },
}));

export default useVisualizationStore;
