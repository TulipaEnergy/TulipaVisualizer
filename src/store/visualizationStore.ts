import { create } from "zustand";
import { Table } from "apache-arrow";
import { getDefaultChartData } from "../data/mock/graphMock";

export type Resolution = "hour" | "day" | "week" | "month" | "year";
export type ChartType =
  | "capacity"
  | "bar"
  | "line"
  | "pie"
  | "scatter"
  | "area"
  | "database"
  | "system-costs";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface GraphConfig {
  id: string;
  type: ChartType;
  containerId: number; // Add containerId to track which container this graph belongs to
  title: string;
  asset?: string;
  startYear?: number;
  endYear?: number;
  systemVariable: string;
  data: any;
  options: any;
}

export interface SavedGraphConfig {
  id: string;
  type: ChartType;
  title: string;
  systemVariable: string;
  options: any;
}

export interface ConfigToSave {
  resolution: Resolution;
  dateRange: DateRange;
  graphs: SavedGraphConfig[];
  selectedTable: string | null;
}

export interface VisualizationState {
  // Database connection
  dbFilePath: string | null;
  isLoading: boolean;
  error: string | null;

  // Data selection
  tables: string[];
  columns: Record<string, string[]>;
  selectedTable: string | null;
  systemVariables: string[];
  availableColumns: string[];

  // Visualization settings
  resolution: Resolution;
  dateRange: DateRange;
  graphs: GraphConfig[];

  // Query results
  queryResults: Record<string, Table<any> | null>;

  // Actions
  setDbFilePath: (path: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setTables: (tables: string[]) => void;
  setColumns: (columns: Record<string, string[]>) => void;
  setSelectedTable: (table: string | null) => void;
  setSystemVariables: (variables: string[]) => void;
  setResolution: (resolution: Resolution) => void;
  setDateRange: (dateRange: DateRange) => void;
  addGraph: (type: ChartType, containerId: number) => void;
  removeGraph: (id: string) => void;
  updateGraph: (id: string, updates: Partial<GraphConfig>) => void;
  setQueryResult: (id: string, result: Table<any> | null) => void;
  saveConfig: () => string;
  loadConfig: (config: string) => void;
}

const useVisualizationStore = create<VisualizationState>((set, get) => ({
  // Database connection
  dbFilePath: null,
  isLoading: false,
  error: null,

  // Data selection
  tables: [],
  columns: {},
  selectedTable: null,
  systemVariables: [],
  availableColumns: [],

  // Visualization settings
  resolution: "day",
  dateRange: { startDate: new Date(), endDate: new Date() },
  graphs: [],

  // Query results
  queryResults: {},

  // Actions
  setDbFilePath: (path) => set({ dbFilePath: path }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setTables: (tables) => set({ tables }),
  setColumns: (columns) => set({ columns }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setSystemVariables: (variables) => set({ systemVariables: variables }),
  setResolution: (resolution) => set({ resolution }),
  setDateRange: (dateRange) => set({ dateRange }),

  addGraph: async (type, containerId) => {
    // Get default data from the mock data file
    console.log("addGraph used.");
    const defaultData = await getDefaultChartData(type);

    set((state) => {
      return {
        graphs: [
          ...state.graphs,
          {
            id: `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            containerId,
            title: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
            systemVariable: state.systemVariables[0] || "",
            data: defaultData,
            options: {
              grid: { top: 40, right: 20, bottom: 40, left: 60 },
            },
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

  setQueryResult: (id, result) =>
    set((state) => ({
      queryResults: { ...state.queryResults, [id]: result },
    })),

  saveConfig: (): string => {
    const state = get();
    const config: ConfigToSave = {
      resolution: state.resolution,
      dateRange: state.dateRange,
      graphs: state.graphs.map(
        ({ id, type, title, systemVariable, options }) => ({
          id,
          type,
          title,
          systemVariable,
          options,
        }),
      ),
      selectedTable: state.selectedTable,
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
          data: [], // Add the required data property
        })),
        selectedTable: config.selectedTable || null,
      });
    } catch (error) {
      console.error("Failed to load configuration:", error);
      set({ error: "Failed to load dashboard configuration." });
    }
  },
}));

export default useVisualizationStore;
