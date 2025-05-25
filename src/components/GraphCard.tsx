import { useEffect, useState, useRef } from "react";
import ReactECharts from "echarts-for-react";
import {
  Paper,
  Group,
  TextInput,
  Select,
  ActionIcon,
  Stack,
  Loader,
  Text,
  Flex,
} from "@mantine/core";
import useVisualizationStore, { ChartType } from "../store/visualizationStore";
import useVisualization from "../hooks/useVisualization";
import DatabaseViewer from "./database-viewer/DatabaseViewer";
import Capacity from "./Capacity";
import SystemCosts from "./SystemCosts";
import ProductionCosts from "./ProductionCosts";
import { executeCustomQuery } from "../services/databaseOperations";

interface GraphCardProps {
  graphId: string;
  dbFile: string;
}

const GraphCard: React.FC<GraphCardProps> = ({ graphId, dbFile }) => {
  const {
    isLoading,
    error,
    graphs,
    systemVariables,
    fetchGraphData,
    updateGraphConfig,
    deleteGraph,
  } = useVisualization();

  const {
    dateRange,
    resolution,
    selectedTable,
    setTables,
    setColumns,
    setIsLoading: setStoreIsLoading,
  } = useVisualizationStore();

  const graph = graphs.find((g) => g.id === graphId);

  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const chartRef = useRef<ReactECharts>(null);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: "capacity", label: "Capacity Chart" },
    { value: "bar", label: "Bar Chart" },
    { value: "line", label: "Line Chart" },
    { value: "pie", label: "Pie Chart" },
    { value: "scatter", label: "Scatter Plot" },
    { value: "area", label: "Area Chart" },
    { value: "database", label: "Database View" },
    { value: "system-costs", label: "System Costs" },
    { value: "production-costs", label: "Production Costs" },
  ];

  // Fetch database tables when the graph type is "database"
  const fetchDatabaseTables = async () => {
    try {
      setStoreIsLoading(true);

      // Query to get all tables from the database
      const tablesResult = await executeCustomQuery("SHOW TABLES");

      // Extract table names from the result
      const tableNames: string[] = [];

      // Get the column name that contains the table names
      const schema = tablesResult.schema;
      const tableNameColumn = schema.fields[0].name; // Typically "name" or "table_name"

      // Extract table names
      for (let i = 0; i < tablesResult.numRows; i++) {
        const row = tablesResult.get(i);
        if (row && row[tableNameColumn]) {
          tableNames.push(row[tableNameColumn]);
        }
      }

      // Update tables in the store
      setTables(tableNames);

      // Fetch columns for each table
      const columnsMap: Record<string, string[]> = {};
      for (const tableName of tableNames) {
        try {
          const columnsResult = await executeCustomQuery(
            `PRAGMA table_info('${tableName}')`,
          );
          const columnNames: string[] = [];

          for (let i = 0; i < columnsResult.numRows; i++) {
            const row = columnsResult.get(i);
            if (row && row.name) {
              columnNames.push(row.name);
            }
          }

          columnsMap[tableName] = columnNames;
        } catch (error) {
          console.error(
            `Error fetching columns for table ${tableName}:`,
            error,
          );
        }
      }

      // Update columns in the store
      setColumns(columnsMap);

      console.log("Loaded tables:", tableNames);
    } catch (error) {
      console.error("Error fetching database tables:", error);
    } finally {
      setStoreIsLoading(false);
    }
  };

  // Fetch graph data when relevant parameters change
  useEffect(() => {
    if (graph && selectedTable) {
      // Add a small delay before fetching data when changing chart type
      // This ensures the component has time to update its state
      if (graph.type) {
        fetchGraphData(graphId);
      }
    }
  }, [
    graph?.type,
    graph?.systemVariable,
    dateRange,
    resolution,
    selectedTable,
  ]);

  // Load tables when the graph type changes to "database"
  useEffect(() => {
    if (graph && graph.type === "database") {
      fetchDatabaseTables();
    }
  }, [graph?.type]);

  // Adjust height based on content after data loads
  useEffect(() => {
    if (!isLoading && graph && graph.data) {
      // For charts, we try to estimate a good starting height
      if (graph.type !== "database") {
        // Start with a base height
        const baseHeight = 300;

        // For pie charts, we can use a more compact height
        if (graph.type === "pie") {
          setHeight(350);
        } else if (graph.type === "bar" || graph.type === "line") {
          // For bar and line charts, try to adjust based on data complexity
          const dataPoints = graph.data?.series?.[0]?.data?.length || 0;
          const estimatedHeight = Math.max(
            350,
            Math.min(600, baseHeight + (dataPoints > 10 ? 100 : 0)),
          );
          setHeight(estimatedHeight);
        }
      } else {
        // For database views, set taller height
        setHeight(1200);
      }
    }
  }, [isLoading, graph?.data, graph?.type]);

  // Handle resize functionality
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        // Limit minimum size
        const minHeight = 200;
        const newHeight = Math.max(
          minHeight,
          e.clientY -
            (document.getElementById(graphId)?.getBoundingClientRect().top ||
              0),
        );
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, graphId]);

  // Handle ECharts resize when container dimensions change
  useEffect(() => {
    if (chartRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        chartRef.current?.getEchartsInstance().resize();
      });

      const chartContainer = document.getElementById(graphId);
      if (chartContainer) {
        resizeObserver.observe(chartContainer);
      }

      return () => {
        if (chartContainer) {
          resizeObserver.unobserve(chartContainer);
        }
        resizeObserver.disconnect();
      };
    }
  }, [graphId, isFullWidth]);

  const handleTypeChange = (value: string | null) => {
    if (graph && value) {
      // The hook will handle updating the data structure
      updateGraphConfig(graph.id, { type: value as ChartType });
    }
  };

  const handleVariableChange = (value: string | null) => {
    if (graph && value) {
      updateGraphConfig(graph.id, { systemVariable: value });
    }
  };

  const handleRemove = () => {
    deleteGraph(graphId);
  };

  const handleWidthToggle = () => {
    setIsFullWidth(!isFullWidth);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  if (!graph) return null;

  return (
    <Paper
      id={graphId}
      p="md"
      radius="md"
      withBorder
      shadow="sm"
      style={{
        position: "relative",
        gridColumn: isFullWidth ? "1 / -1" : "span 1",
        width: "100%",
        flexGrow: 1,
        minHeight: `${height}px`,
      }}
    >
      <Stack gap="sm" h="100%">
        <Group justify="space-between" wrap="nowrap">
          <TextInput
            value={graph.title}
            onChange={(e) =>
              updateGraphConfig(graph.id, { title: e.target.value })
            }
            placeholder="Chart Title"
            size="sm"
            style={{ flexGrow: 1, fontWeight: 700 }}
          />

          <Group wrap="nowrap" gap="xs">
            <Select
              value={graph.type}
              onChange={handleTypeChange}
              data={chartTypes}
              size="xs"
              style={{ width: 130 }}
            />

            {graph?.type === "capacity" && ( // shows the capacity UI
              <Capacity key={dbFile} graphId={graph.id} dbFile={dbFile} />
            )}

            <Select
              value={graph.systemVariable}
              onChange={handleVariableChange}
              data={systemVariables.map((v) => ({ value: v, label: v }))}
              size="xs"
              style={{ width: 130 }}
            />

            <ActionIcon
              variant="subtle"
              onClick={handleWidthToggle}
              title={
                isFullWidth ? "Shrink to Half Width" : "Expand to Full Width"
              }
            >
              {isFullWidth ? "½" : "↔"}
            </ActionIcon>

            <ActionIcon
              variant="subtle"
              color="red"
              onClick={handleRemove}
              title="Remove Graph"
            >
              ✖
            </ActionIcon>
          </Group>
        </Group>

        <div style={{ flexGrow: 1, position: "relative" }}>
          {isLoading ? (
            <Flex h="100%" justify="center" align="center">
              <Loader size="md" />
            </Flex>
          ) : error ? (
            <Flex h="100%" justify="center" align="center">
              <Text c="red">{error}</Text>
            </Flex>
          ) : graph.type === "database" ? (
            <DatabaseViewer />
          ) : graph.type === "system-costs" ? (
            <SystemCosts dbFile={dbFile} />
          ) : graph.type === "production-costs" ? (
            <ProductionCosts dbFile={dbFile} />
          ) : (
            <ReactECharts
              ref={chartRef}
              option={graph.data}
              style={{ height: "100%", width: "100%" }}
              notMerge={true}
            />
          )}
        </div>

        <div
          style={{
            height: 4,
            cursor: "ns-resize",
            backgroundColor: "#f0f0f0",
            marginBottom: -16,
          }}
          onMouseDown={handleResizeStart}
        />
      </Stack>
    </Paper>
  );
};

export default GraphCard;
