import { create } from "zustand";
import { EnergyFlowOptions } from "../types/GeoEnergyFlow";
import { Resolution } from "../types/resolution";

export type ChartType =
  | "capacity"
  | "database"
  | "system-costs"
  | "production-prices-duration-series"
  | "storage-prices"
  | "geo-imports-exports"
  | "transportation-prices"
  | "residual-load"
  | "default";

export interface CapacityOptions {
  type: "capacity";
  asset?: string;
  startYear?: number;
  endYear?: number;
}

// Union type for all possible chart options
export type ChartOptions =
  | CapacityOptions
  | EnergyFlowOptions
  | ProductionPriceOptions;

export interface ProductionPriceOptions {
  type: "production-prices";
  resolution?: Resolution;
  year?: number;
}

export interface GraphConfig {
  id: string;
  type: ChartType;
  title: string;
  error: string | null;
  isLoading: boolean;
  filtersByCategory: { [key: number]: number[] };
  breakdownNodes: number[];
  options: ChartOptions | null;
  graphDBFilePath: string | null; // For when each graph has its own DB file
  lastApplyTimestamp: number;
}

export interface VisualizationState {
  // Database registry
  databases: string[]; // file paths
  isLoading: boolean;
  error: string | null;

  // Visualization settings
  graphs: GraphConfig[];

  // Actions
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

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

  mustGetFiltering: (id: string) => { [key: number]: number[] };
  updateFiltersForCategory: (
    graphId: string,
    categoryRootId: number,
    newFilters: number[],
  ) => void;
}

const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Database connection
  isLoading: false,
  error: null,
  databases: [],

  // Visualization settings
  graphs: [],

  // Actions
  setIsLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),

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
            filtersByCategory: {},
            breakdownNodes: [],
            lastApplyTimestamp: Date.now(),
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
      if (!state.databases.includes(filePath)) {
        return {
          databases: [...state.databases, filePath],
        };
      }
      return state;
    });
  },

  removeDatabase: async (filePath: string) => {
    set((state) => ({
      databases: state.databases.filter((db) => db != filePath),
      graphs: state.graphs.filter((g) => g.graphDBFilePath != filePath),
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

  mustGetFiltering(graphId: string): { [key: number]: number[] } {
    return get().graphs.find((g) => g.id === graphId)!.filtersByCategory;
  },

  updateFiltersForCategory(
    graphId: string,
    categoryRootId: number,
    newFilters: number[],
  ) {
    set((state) => ({
      graphs: state.graphs.map((g) => {
        if (g.id == graphId) {
          return {
            ...g,
            filtersByCategory: {
              ...g.filtersByCategory,
              [categoryRootId]: newFilters,
            },
          };
        }
        return g;
      }),
    }));
  },
}));

export default useVisualizationStore;
