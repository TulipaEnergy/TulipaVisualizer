import { create } from "zustand";
import { EnergyFlowOptions } from "../types/GeoEnergyFlow";
import { Resolution } from "../types/resolution";

/**
 * Chart type enumeration defining all available visualization types.
 * Supports dynamic chart creation and type switching for flexible analysis.
 */
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

/**
 * Capacity analysis configuration options.
 * Controls asset selection and analysis parameters for capacity visualizations.
 */
export interface CapacityOptions {
  /** Specific asset identifier for targeted capacity analysis */
  asset?: string;
}

/**
 * Union type for all possible chart-specific configuration options.
 * Enables type-safe options handling across different visualization types.
 * 
 * Design Decision: Currently includes core option types with planned expansion
 * for additional chart-specific options as visualization features mature.
 * Future options will include storage-specific, transport-specific configurations.
 */
export type ChartOptions =
  | CapacityOptions
  | EnergyFlowOptions
  | ProductionPriceOptions;

/**
 * Production price analysis configuration options.
 * Controls temporal resolution and year selection for price analysis.
 * 
 * Current Implementation: Basic resolution and year selection
 * Planned Extensions: Asset filtering, dual value types, method selection
 */
export interface ProductionPriceOptions {
  /** Time aggregation resolution for price data analysis */
  resolution?: Resolution;
  /** Analysis year for milestone data filtering */
  year?: number;
}

/**
 * Individual graph configuration containing all state and options.
 * Manages visualization settings, filtering, database connections, and UI state
 * for each chart instance in the application's dynamic dashboard.
 */
export interface GraphConfig {
  /** Unique identifier for graph instance management */
  id: string;
  /** Chart type determining visualization component and data queries */
  type: ChartType;
  /** User-editable chart title for dashboard organization */
  title: string;
  /** Error message for display when chart encounters issues */
  error: string | null;
  /** Loading state indicator for data fetch operations */
  isLoading: boolean;
  /** Hierarchical filtering system: category root ID -> array of selected filter IDs */
  filtersByCategory: { [key: number]: number[] };
  /** Node IDs for breakdown/drill-down analysis */
  breakdownNodes: number[];
  /** Chart-specific configuration options (type-dependent) */
  options: ChartOptions | null;
  /** Per-graph database file path for multi-database support */
  graphDBFilePath: string | null;
  /** Timestamp for tracking when filters were last applied */
  lastApplyTimestamp: number;
}

/**
 * Main application state interface managing visualization dashboard.
 * Centralized state management for database connections, graph configurations,
 * and global application state using Zustand store pattern.
 */
export interface VisualizationState {
  // Database registry
  /** Array of database file paths currently loaded */
  databases: string[];
  /** Global loading state for database operations */
  isLoading: boolean;
  /** Global error state with user-friendly messages */
  error: string | null;

  // Visualization settings
  /** Array of graph configurations for dynamic chart management */
  graphs: GraphConfig[];

  // Actions
  /** Updates global loading state for UI feedback */
  setIsLoading: (isLoading: boolean) => void;
  /** Sets global error message with null to clear */
  setError: (error: string | null) => void;

  /** Creates new graph instance with specified chart type */
  addGraph: (type: ChartType) => void;
  /** Retrieves graph configuration with error handling for missing graphs */
  mustGetGraph: (id: string) => GraphConfig;
  /** Removes graph and cleans up associated state */
  removeGraph: (id: string) => void;
  /** Updates specific graph properties with partial configuration */
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;

  // saveConfig: () => string;
  // loadConfig: (config: string) => void;

  /** Adds database to registry with duplicate prevention */
  addDatabase: (filePath: string) => void;
  /** Removes database and performs cascade cleanup of associated graphs */
  removeDatabase: (dbId: string) => void;
  /** Associates database with specific graph for multi-database support */
  setGraphDatabase: (graphId: string, dbId: string) => void;
  /** Retrieves database path associated with graph */
  getGraphDatabase: (graphId: string) => string | null;
  /** Checks if any databases are currently loaded */
  hasAnyDatabase: () => boolean;

  /** Retrieves hierarchical filtering configuration for graph */
  mustGetFiltering: (id: string) => { [key: number]: number[] };
  /** Updates filter selection for specific category in graph */
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
