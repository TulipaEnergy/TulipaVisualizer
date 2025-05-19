import { useState } from "react";
import { Table } from "apache-arrow";
import useVisualizationStore, {
  ChartType,
  GraphConfig,
} from "../store/visualizationStore";
import { getDefaultChartData } from "../data/mock/graphMock";
import { fetchGraphData } from "../services/databaseOperations";

/**
 * Custom hook for handling visualization data fetching and processing
 */
export const useVisualization = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    graphs,
    dateRange,
    resolution,
    selectedTable,
    systemVariables,
    updateGraph,
    removeGraph,
    addGraph,
    setQueryResult,
  } = useVisualizationStore();

  /**
   * Fetch data for a specific graph
   */
  const fetchGraphDataForVisualization = async (graphId: string) => {
    const graph = graphs.find((g) => g.id === graphId);
    if (!graph || !selectedTable) return;

    try {
      setIsLoading(true);
      setError(null);

      // Format dates for SQL
      const startDate = dateRange.startDate
        ? dateRange.startDate.toISOString().split("T")[0]
        : null;
      const endDate = dateRange.endDate
        ? dateRange.endDate.toISOString().split("T")[0]
        : null;

      try {
        const result = await fetchGraphData(
          selectedTable,
          graph.systemVariable,
          resolution,
          startDate,
          endDate,
        );

        setQueryResult(graph.id, result);

        // Process the data for the chart
        const processedData = processDataForChart(result, graph.type);
        updateGraph(graph.id, { data: processedData });
        return processedData;
      } catch (queryError: any) {
        console.error("Query error:", queryError);
        setError(`Failed to fetch data: ${queryError.message || queryError}`);
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Process raw query results into chart-friendly format
   */
  const processDataForChart = (
    result: Table<any> | null,
    chartType: ChartType,
  ) => {
    if (!result) return getDefaultChartData(chartType);

    // In a real implementation, this would transform data from the Arrow Table
    // For now, we return the mock data
    return getDefaultChartData(chartType);
  };

  /**
   * Create a new graph in a container
   */
  const createGraph = (type: ChartType, containerId: number) => {
    addGraph(type, containerId);
  };

  /**
   * Update a graph's properties
   */
  const updateGraphConfig = (id: string, updates: Partial<GraphConfig>) => {
    // Check if we're updating the chart type
    if (updates.type) {
      // When changing chart type, we need to update the data structure
      const newChartType = updates.type;
      // Get default data for this chart type
      const defaultData = getDefaultChartData(newChartType);

      // Update both the type and data structure
      updateGraph(id, {
        ...updates,
        data: defaultData,
      });

      // No need to call fetchGraphData explicitly since the useEffect
      // in GraphCard will trigger due to the type change
    } else {
      updateGraph(id, updates);
    }
  };

  /**
   * Delete a graph
   */
  const deleteGraph = (id: string) => {
    removeGraph(id);
  };

  return {
    isLoading,
    error,
    graphs,
    systemVariables,
    fetchGraphData: fetchGraphDataForVisualization,
    processDataForChart,
    createGraph,
    updateGraphConfig,
    deleteGraph,
  };
};

export default useVisualization;
