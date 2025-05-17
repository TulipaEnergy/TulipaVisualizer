import { useState } from "react";
import { Table } from "apache-arrow";
import { run_query } from "../debugtools/generalQuery";
import useVisualizationStore, {
  ChartType,
  GraphConfig,
} from "../store/visualizationStore";
import { getDefaultChartData } from "../data/mock/graphMock";

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
  const fetchGraphData = async (graphId: string) => {
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

      // Build the query based on the current visualization settings
      const query = buildQuery(
        graph,
        selectedTable,
        resolution,
        startDate,
        endDate,
      );

      try {
        const result = await run_query(query);
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
   * Build a SQL query based on the graph configuration
   */
  const buildQuery = (
    graph: GraphConfig,
    tableName: string,
    resolution: string,
    startDate: string | null,
    endDate: string | null,
  ): string => {
    return `
      SELECT 
        ${graph.systemVariable},
        COUNT(*) as count,
        DATE_TRUNC('${resolution}', timestamp_column) as time_bucket
      FROM ${tableName}
      ${startDate ? `WHERE timestamp_column >= '${startDate}'` : ""}
      ${startDate && endDate ? `AND timestamp_column <= '${endDate}'` : ""}
      GROUP BY time_bucket, ${graph.systemVariable}
      ORDER BY time_bucket
    `;
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
    fetchGraphData,
    processDataForChart,
    createGraph,
    updateGraphConfig,
    deleteGraph,
  };
};

export default useVisualization;
