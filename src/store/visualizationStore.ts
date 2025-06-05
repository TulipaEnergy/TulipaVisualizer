import { create } from "zustand";
import { EnergyFlowOptions } from "../types/GeoEnergyFlow";

export type Resolution = "hour" | "day" | "week" | "month" | "year";
export type ChartType =
  | "capacity"
  | "database"
  | "system-costs"
  | "production-prices"
  | "production-prices-period"
  | "production-prices-duration-series"
  | "storage-prices"
  | "geo-imports-exports"
  | "default";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CapacityOptions {
  asset?: string;
  startYear?: number;
  endYear?: number;
}

// Union type for all possible chart options
export type ChartOptions = CapacityOptions | EnergyFlowOptions;

export interface GraphConfig {
  id: string;
  type: ChartType;
  title: string;
  error: string | null;
  isLoading: boolean;
  options: ChartOptions | null;
  graphDBFilePath: string | null; // For when each graph has its own DB file
}

export interface VisualizationState {
  // Database registry
  databases: string[]; // file paths
  isLoading: boolean;
  error: string | null;

  // Visualization settings
  resolution: Resolution;
  dateRange: DateRange;
  graphs: GraphConfig[];

  // Actions
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  setResolution: (resolution: Resolution) => void;
  setDateRange: (dateRange: DateRange) => void;

  addGraph: (type: ChartType) => void;
  mustGetGraph: (id: string) => GraphConfig;
  removeGraph: (id: string) => void;
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;

  // saveConfig: () => string;
  // loadConfig: (config: string) => void;

  addDatabase: (filePath: string) => void;
  removeDatabase: (dbId: string) => void;
  setGraphDatabase: (graphId: string, dbId: string) => void;
  getGraphDatabase: (graphId: string) => string | null;
  hasAnyDatabase: () => boolean;
}

const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Database connection
  isLoading: false,
  error: null,
  databases: [],

  // Visualization settings
  resolution: "day",
  dateRange: { startDate: new Date(), endDate: new Date() },
  graphs: [],

  // Actions
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setResolution: (resolution: Resolution) => set({ resolution }),
  setDateRange: (dateRange: DateRange) => set({ dateRange }),

  addGraph: (type: ChartType) => {
    set((state) => {
      return {
        graphs: [
          ...state.graphs,
          {
            graphDBFilePath: null, // Default to null for new graphs
            id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
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

  addDatabase: async (filePath: string) => {
    set((state) => {
      const DBs = state.databases;
      if (!DBs.includes(filePath)) {
        // only add a new DB if it wasn't added before
        DBs.push(filePath);
      }
      return {
        databases: DBs,
      };
    });
  },

  removeDatabase: async (filePath: string) => {
    set((state) => ({
      databases: state.databases.filter((db) => db != filePath),
    }));
  },

  setGraphDatabase: (graphId: string, dbPath: string) => {
    set((state) => ({
      graphs: state.graphs.map((g) => {
        if (g.id == graphId) {
          g.graphDBFilePath = dbPath;
          return g;
        }
        return g;
      }),
    }));
  },

  getGraphDatabase: (graphId: string): string | null => {
    const res = get().graphs.filter((g) => g.id === graphId);
    if (res.length === 0) {
      return null;
    }
    return res[0].graphDBFilePath;
  },

  hasAnyDatabase(): boolean {
    return get().databases.length > 0;
  },

  mustGetGraph(id: string): GraphConfig {
    const res = get().graphs.find((g) => g.id === id);
    if (!res) {
      console.error("Trying to get graph for non existent id: " + id);
      throw new Error("Trying to get graph for non existent id: " + id);
    }
    return res;
  },
}));

export default useVisualizationStore;
