import { useEffect, useState } from "react";
import {
  Select,
  Stack,
  Paper,
  Text,
  Container,
  Group,
  Flex,
} from "@mantine/core";
import type {
  EChartsOption,
  BarSeriesOption,
  TooltipComponentOption,
} from "echarts";
import useVisualizationStore, {
  CapacityOptions,
} from "../../store/visualizationStore";
import ReactECharts from "echarts-for-react";
import { getAssets } from "../../services/metadata";
import { getCapacity } from "../../services/capacityQuery";

const capacityGraph = async (
  asset: string,
  dbPath: string,
): Promise<EChartsOption> => {
  const data = await getCapacity(dbPath, asset);
  const round2 = (v: number) => Math.round(v * 100) / 100; // round to 2 decimals

  // Data transformation for visualization
  const years = data.map((d) => d.year.toString());
  const final_capacities = data.map((d) => round2(d.final_capacity));
  const initial_capacities = data.map((d) => round2(d.initial_capacity));
  const investments = data.map((d) =>
    d.investment >= 0 ? round2(d.investment) : null,
  );
  const decommissions = data.map((d) =>
    d.decommission >= 0 ? -round2(d.decommission) : null,
  );

  /**
   * Creates canvas-based stripe patterns for investment/decommission visualization.
   * Provides visual distinction between different capacity change types.
   */
  function createStripeCanvas(color: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(4, 0);
    ctx.lineWidth = 1;
    ctx.stroke();
    return c;
  }

  // Four-series stacked bar configuration for capacity evolution
  const series: BarSeriesOption[] = [
    {
      name: "Initial Capacity",
      type: "bar",
      data: initial_capacities,
      itemStyle: { color: "#8A8A8A" },
      stack: "old",
      emphasis: { focus: "series" },
    },
    {
      name: "Investment",
      type: "bar",
      data: investments,
      itemStyle: {
        color: {
          type: "pattern",
          image: createStripeCanvas("#43A047"),
          repeat: "repeat",
        },
      },
      stack: "old",
      emphasis: { focus: "series" },
    },
    {
      name: "Decommission",
      type: "bar",
      data: decommissions,
      itemStyle: {
        color: {
          type: "pattern",
          image: createStripeCanvas("#D32F2F"),
          repeat: "repeat",
        },
      },
      stack: "old",
      emphasis: { focus: "series" },
    },
    {
      name: "Final Capacity",
      type: "bar",
      data: final_capacities,
      itemStyle: { color: "#5470C6" },
      barGap: "5%",
      stack: "new",
      emphasis: { focus: "series" },
    },
  ];

  /**
   * Custom tooltip configuration with pattern-aware styling.
   * Recreates visual patterns in tooltip for consistency with chart.
   */
  const tooltip: TooltipComponentOption = {
    trigger: "axis",
    axisPointer: { type: "shadow" },
    formatter: (params: any) => {
      const arr = Array.isArray(params) ? params : [params];
      const year = arr[0]?.name || "";
      let html = `<strong>${year}</strong><br/>`;

      arr.forEach((item: any) => {
        if (item.value == null) {
          return;
        }

        // Recreate stripe patterns in tooltip using CSS gradients
        let styleStr: string;
        if (item.seriesName === "Investment") {
          styleStr = `
          background-image:
            repeating-linear-gradient(
              -45deg,
              #43A047 0,
              #43A047 2px,
              transparent 2px,
              transparent 4px
            );
        `;
        } else if (item.seriesName === "Decommission") {
          styleStr = `
          background-image:
            repeating-linear-gradient(
              -45deg,
              #D32F2F 0,
              #D32F2F 2px,
              transparent 2px,
              transparent 4px
            );
        `;
        } else {
          styleStr = `background-color: ${item.color};`;
        }

        html +=
          `<span
          style="display:inline-block;
                  margin-right:4px;
                  border-radius:10px;
                  width:10px;
                  height:10px;
                  ${styleStr}
          "></span> ` + `${item.seriesName}: ${item.value.toFixed(2)} MW<br/>`;
      });

      return html;
    },
  };

  const option: EChartsOption = {
    tooltip,
    legend: {
      data: [
        "Final Capacity",
        "Investment",
        "Decommission",
        "Initial Capacity",
      ],
      bottom: "0%",
      type: "scroll",
    },
    xAxis: {
      type: "category",
      data: years,
      name: "Year",
      nameLocation: "middle",
      nameTextStyle: { padding: [10, 0, 0, 0] },
    },
    yAxis: {
      type: "value",
      name: "Capacity (MW)",
      axisLabel: { formatter: "{value}" },
    },
    grid: {
      left: "3%",
      right: "4%",
      top: "12%",
      bottom: "12%",
      containLabel: true,
    },
    series,
  };

  return option;
};

interface CapacityProps {
  graphId: string;
}

const Capacity: React.FC<CapacityProps> = ({ graphId }) => {
  const { mustGetGraph, updateGraph } = useVisualizationStore();

  const graph = mustGetGraph(graphId);

  // Local state for UI data and chart configuration
  const [assets, setAssets] = useState<string[]>([]);

  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  const dbFilePath = graph.graphDBFilePath!;

  // Initialize component with default title
  useEffect(() => {
    updateGraph(graphId, { title: "Capacity by Year" });
  }, []);

  // Database change handler: reset state and reload assets
  useEffect(() => {
    console.log("DB CHANGED");
    // Reset error and chart state
    setErrorData(null);
    updateGraph(graphId, { options: null });

    (async () => {
      try {
        const list = await getAssets(dbFilePath);
        setAssets(list);
      } catch (err) {
        setErrorData(err as string);
        console.error("Could not load assets:", err);
      }
    })();
  }, [dbFilePath]);

  // Chart generation effect: handles data loading and validation
  useEffect(() => {
    console.log("GENERATING GRAPH");
    (async () => {
      // Clear previous state
      setErrorData(null);
      setChartOptions(null);

      const asset = (graph.options as CapacityOptions)?.asset;

      if (!asset) {
        console.log("NO ASSET, RESETTING OPTIONS");
        setChartOptions(null);
        return;
      }

      // Check if all required inputs are available. If any is missing, it shows it on the UI.
      if (!(graph.options as CapacityOptions)?.asset) {
        console.log("NO GRAPH OPTIONS");
        setChartOptions(null);
        return;
      }

      // Generate chart with validated inputs
      try {
        console.log("GENERATING GRAPH for: " + JSON.stringify(graph.options));
        const capacityOptions = graph.options as CapacityOptions;
        const option = await capacityGraph(capacityOptions.asset!, dbFilePath);
        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Error fetching or processing data for chart: ${err}`);
        setChartOptions(null);
      }
    })();
  }, [graph.options]);

  // Event handlers for user interactions
  const handleAssetChange = (value: string | null) => {
    if (value) {
      updateGraph(graph.id, {
        options: {
          ...(graph.options as CapacityOptions),
          asset: value,
        } as CapacityOptions,
      });
    }
  };

  return (
    <Stack>
      {/* User input controls with cross-validation */}
      <Group>
        <Select
          value={(graph.options as CapacityOptions)?.asset || null}
          onChange={handleAssetChange}
          data={assets.map((a) => ({ value: a, label: a }))}
          placeholder={assets.length ? "Select asset" : ""}
          size="xs"
          style={{ width: 140 }}
        />
      </Group>

      {/* Conditional rendering: error state, chart, or configuration prompt */}
      {errorData ? (
        <Container
          size="xl"
          h="100%"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "red",
          }}
        >
          <Text>{errorData}</Text>
        </Container>
      ) : chartOptions ? (
        <Paper
          p="md"
          radius="md"
          withBorder
          shadow="xs"
          style={{ height: "500px" }}
        >
          <ReactECharts option={chartOptions} style={{ height: "100%" }} />
        </Paper>
      ) : (
        <Flex h="100%" justify="center" align="center" mih="500px">
          <Text c="dimmed">Please configure chart</Text>
        </Flex>
      )}
    </Stack>
  );
};

export default Capacity;
