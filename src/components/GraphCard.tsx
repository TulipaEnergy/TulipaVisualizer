import { useEffect, useState, useRef, Dispatch, SetStateAction } from "react";
import ReactECharts from "echarts-for-react";
import {
  Stack,
  TextInput,
  Select,
  Group,
  Text,
  Flex,
  Loader,
  Paper,
  ActionIcon,
  Divider,
  Button,
  Alert,
  Tooltip,
} from "@mantine/core";
import useVisualizationStore, {
  ChartType,
  GraphConfig,
} from "../store/visualizationStore";
import DatabaseViewer from "./database-viewer/DatabaseViewer";
import DatabaseSelector from "./DatabaseSelector";
import Capacity from "./kpis/Capacity";
import SystemCosts from "./kpis/SystemCosts";
import ProductionPricesDurationSeries from "./kpis/ProductionPrices";
import StoragePrices from "./kpis/StoragePrices";
import GeoImportsExports from "./kpis/GeoImportsExports";
import TransportationPricesDurationSeries from "./kpis/TransportationPrices";
import FilteringScrollMenu from "./metadata/FilteringScrollMenu";
import SupplyStackedBarSeries from "./kpis/ResidualLoad";
import BreakdownMenu from "./metadata/BreakdownMenu";
import "../styles/components/metadata/treeSelect.css";
import { hasMetadata } from "../services/metadata";
import { IconInfoCircle } from "@tabler/icons-react";

interface GraphCardProps {
  graphId: string;
}

type MetadataShowStatus = "Hide" | "Disable" | "Enable";

const GraphCard: React.FC<GraphCardProps> = ({ graphId }) => {
  const { updateGraph, removeGraph, mustGetGraph } = useVisualizationStore();

  const graph = mustGetGraph(graphId);

  // Interactive resize state management
  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [enableMetadata, setEnableMetadata] =
    useState<MetadataShowStatus>("Hide");
  const chartRef = useRef<ReactECharts>(null);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: "capacity", label: "Asset capacity" },
    { value: "system-costs", label: "System Costs" },
    { value: "production-prices-duration-series", label: "Production Prices" },
    { value: "storage-prices", label: "Storage Prices" },
    { value: "transportation-prices", label: "Transportation Prices" },
    { value: "geo-imports-exports", label: "Geographical Imports/Exports" },
    { value: "residual-load", label: "Residual Load" },
    { value: "database", label: "SQL explorer" },
  ];

  useEffect(() => {
    (async () => {
      if (!graph.graphDBFilePath) {
        setEnableMetadata("Hide");
        return;
      }

      const chartsWithMetaFeatures = [
        "residual-load",
        "system-costs",
        "production-prices-duration-series",
        "storage-prices",
      ];
      if (!chartsWithMetaFeatures.includes(graph.type as string)) {
        setEnableMetadata("Hide");
        return;
      }

      if (!(await hasMetadata(graph.graphDBFilePath))) {
        setEnableMetadata("Disable");
        return;
      }

      setEnableMetadata("Enable");
    })();
  }, [graph.graphDBFilePath, graph.type]);

  // Dynamic height adjustment based on chart type
  useEffect(() => {
    if (graph?.type == "database") {
      setHeight(1150);
      setIsFullWidth(true);
    } else {
      setHeight(400);
    }
  }, [graph.type]);

  // Mouse-based resize interaction handling
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

  // ECharts automatic resize handling for responsive charts
  useEffect(() => {
    if (chartRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        chartRef.current?.getEchartsInstance().resize();
      });

      const chartElement = document.getElementById(graphId);
      if (chartElement) {
        resizeObserver.observe(chartElement);
      }

      return () => {
        if (chartElement) {
          resizeObserver.unobserve(chartElement);
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
            style={{ flexGrow: 1, fontWeight: 600 }}
          />

          <Group wrap="nowrap" gap="xs">
            <Select
              value={graph.type}
              onChange={handleTypeChange}
              data={chartTypes}
              placeholder="Choose a type"
              size="sm"
              style={{
                width: "fit-content",
              }}
              styles={{
                input: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              }}
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

        <DatabaseSelector graphId={graphId} size="xs" />

        {getMetadataComponent(graph, enableMetadata, setEnableMetadata)}

        <Divider />

        <div style={{ flexGrow: 1, position: "relative" }}>
          {graph.isLoading ? (
            <Flex h="100%" justify="center" align="center">
              <Loader size="md" />
            </Flex>
          ) : graph.error ? (
            <Flex h="100%" justify="center" align="center">
              <Text c="red">{graph.error}</Text>
            </Flex>
          ) : !graph.graphDBFilePath ? (
            <Flex h="100%" justify="center" align="center">
              <Text c="dimmed">Please select a database above</Text>
            </Flex> // In all of the components below, the graphs must have a db file selected
          ) : graph.type === "database" ? (
            <DatabaseViewer graphId={graphId} />
          ) : graph.type === "system-costs" ? (
            <SystemCosts graphId={graphId} />
          ) : graph.type === "production-prices-duration-series" ? (
            <ProductionPricesDurationSeries graphId={graphId} />
          ) : graph.type === "storage-prices" ? (
            <StoragePrices graphId={graphId} />
          ) : graph.type === "transportation-prices" ? (
            <TransportationPricesDurationSeries graphId={graphId} />
          ) : graph.type === "capacity" ? (
            <Capacity graphId={graphId} />
          ) : graph.type === "geo-imports-exports" ? (
            <GeoImportsExports graphId={graphId} />
          ) : graph.type === "residual-load" ? (
            <SupplyStackedBarSeries graphId={graphId} />
          ) : (
            <Flex h="100%" justify="center" align="center">
              <Text c="dimmed"> Please select a chart type above </Text>
            </Flex>
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

function getMetadataComponent(
  graph: GraphConfig,
  enable: MetadataShowStatus,
  setEnableMetadata: Dispatch<SetStateAction<MetadataShowStatus>>,
) {
  const { updateGraph } = useVisualizationStore();
  const icon = <IconInfoCircle />;

  switch (enable) {
    case "Enable": {
      return (
        <>
          <FilteringScrollMenu graphId={graph.id} />

          <BreakdownMenu graphId={graph.id} />

          <Button
            disabled={hasEmptyTreeSelection(graph)}
            size="xs"
            variant="outline"
            style={{ maxWidth: "200px" }}
            onClick={() => {
              updateGraph(graph.id, { lastApplyTimestamp: Date.now() });
            }}
          >
            Apply filter and breakdown
          </Button>
        </>
      );
    }
    case "Disable": {
      return (
        <Tooltip
          label="Filtering and breakdown features require a metadata-enriched DuckDB file. See User Guide for further details."
          withArrow={true}
        >
          <Alert
            variant="light"
            color="yellow"
            radius="xs"
            withCloseButton
            title="Metadata features disabled"
            icon={icon}
            onClose={() => {
              setEnableMetadata("Hide");
            }}
            style={{ maxWidth: "fit-content", padding: "10px" }}
          ></Alert>
        </Tooltip>
      );
    }
    case "Hide": {
      return <></>;
    }
  }
}

function hasEmptyTreeSelection(graph: GraphConfig): boolean {
  return Object.values(graph.filtersByCategory).some(
    (selectedNodesInTree) => selectedNodesInTree.length === 0,
  );
}
