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
  asset?: string;
}

// Union type for all possible chart options
// TODO add options for all graph-specific options?
export type ChartOptions =
  | CapacityOptions
  | EnergyFlowOptions
  | ProductionPriceOptions;

// TODO populate this?
export interface ProductionPriceOptions {
  resolution?: Resolution;
  year?: number;
}

export interface GraphConfig {
  id: string;
  type: ChartType;
  title: string;
  error: string | null;
  isLoading: boolean;
  /** Hierarchical filtering system: category root ID -> array of selected filter IDs */
  filtersByCategory: { [key: number]: number[] };
  /** Node IDs for breakdown/drill-down analysis */
  breakdownNodes: number[];
  options: ChartOptions | null;
  /** Per-graph database file path for multi-database support */
  graphDBFilePath: string | null;
  /** Timestamp for tracking when filters were last applied */
  lastApplyTimestamp: number;
}

export interface VisualizationState {
  // Database registry
  /** Array of database file paths currently loaded */
  databases: string[];
  isLoading: boolean;
  error: string | null;

  // Visualization settings
  /** Array of graph configurations for dynamic chart management */
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
      ...state,
      graphs: state.graphs.filter((graph) => graph.id !== id),
    })),

  updateGraph: (id, updates) =>
    set((state) => ({
      ...state,
      graphs: state.graphs.map((graph) =>
        graph.id === id ? { ...graph, ...updates } : graph,
      ),
    })),

  /**
   * Adds database to registry with duplicate prevention.
   * Maintains referential integrity by checking existing paths.
   */
  addDatabase: (filePath: string) => {
    set((state) => {
      if (!state.databases.includes(filePath)) {
        return {
          ...state,
          databases: [...state.databases, filePath],
        };
      }
      return state;
    });
  },

  /**
   * Removes database and performs cascade cleanup of associated graphs.
   * Prevents orphaned graph configurations when database is removed.
   */
  removeDatabase: (filePath: string) => {
    set((state) => ({
      ...state,
      databases: state.databases.filter((db) => db !== filePath),
      graphs: state.graphs.filter((g) => g.graphDBFilePath !== filePath),
    }));
  },

  setGraphDatabase: (graphId: string, dbPath: string) => {
    set((state) => ({
      ...state,
      graphs: state.graphs.map((g) => {
        if (g.id === graphId) {
          return {
            ...g,
            graphDBFilePath: dbPath,
          };
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

  /** Retrieves graph configuration with error handling for missing graphs */
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
      ...state,
      graphs: state.graphs.map((g) => {
        if (g.id === graphId) {
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
