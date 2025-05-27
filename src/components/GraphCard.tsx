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
import DatabaseViewer from "./database-viewer/DatabaseViewer";
import Capacity from "./kpis/Capacity";
import SystemCosts from "./kpis/SystemCosts";
import ProductionCosts from "./kpis/ProductionCosts";

interface GraphCardProps {
  graphId: string;
}

const GraphCard: React.FC<GraphCardProps> = ({ graphId }) => {
  const { graphs, updateGraph, removeGraph } = useVisualizationStore();

  const graph = graphs.find((g) => g.id === graphId);

  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const chartRef = useRef<ReactECharts>(null);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: "capacity", label: "Capacity Chart" },
    { value: "system-costs", label: "System Costs" },
    { value: "production-costs", label: "Production Costs" },
    { value: "database", label: "Database View" },
  ];

  useEffect(() => {
    if (graph?.type == "database") {
      setHeight(1200);
    }
  }, [graph?.type]);

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
      updateGraph(graph.id, { type: value as ChartType, options: null });
    }
  };

  const handleRemove = () => {
    removeGraph(graphId);
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
            onChange={(e) => updateGraph(graph.id, { title: e.target.value })}
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

            {/* {graph?.type === "capacity" && ( // shows the capacity UI
              <Capacity key={globalDBFilePath} graphId={graph.id} dbFile={globalDBFilePath ?? "somepath"} />
            )} */}

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
          {graph.isLoading ? (
            <Flex h="100%" justify="center" align="center">
              <Loader size="md" />
            </Flex>
          ) : graph.error ? (
            <Flex h="100%" justify="center" align="center">
              <Text c="red">{graph.error}</Text>
            </Flex>
          ) : graph.type === "database" ? (
            <DatabaseViewer />
          ) : graph.type === "system-costs" ? (
            <SystemCosts />
          ) : graph.type === "production-costs" ? (
            <ProductionCosts />
          ) : (
            <Capacity graphId={graphId} />
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
