import { useEffect, useState } from "react";
import {
  Select,
  NumberInput,
  Stack,
  Paper,
  Text,
  Container,
} from "@mantine/core";
import {
  fetchAssets,
  fetchMinYear,
  fetchMaxYear,
} from "../../services/capacityQuery";
import { EChartsOption } from "echarts";
import { fetchCapacityData } from "../../services/capacityQuery";
import useVisualizationStore, {
  CapacityOptions,
} from "../../store/visualizationStore";
import ReactECharts from "echarts-for-react";

export const capacityGraph = async (
  asset?: string,
  startYear?: number,
  endYear?: number,
): Promise<EChartsOption> => {
  // If any of the required inputs is missing, show a “no selection” placeholder
  if (!asset || startYear == null || endYear == null) {
    let missing = "";
    if (!asset) missing = "asset";
    else if (startYear == null) missing = "start year";
    else missing = "end year";

    return {
      title: {
        text: `No ${missing} selected`,
        left: "center",
      },
      tooltip: { show: false },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    };
  }

  // Otherwise fetch the data and build a bar chart
  const data = await fetchCapacityData(asset, startYear, endYear);
  const years = data.map((d) => d.year.toString());
  const capacities = data.map((d) => d.installed_capacity);

  return {
    title: {
      text: `${asset} capacity (${startYear}-${endYear})`,
      left: "center",
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: years,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      name: "Installed Capacity",
    },
    dataZoom: [{ type: "slider", start: 0, end: 100 }],
    series: [
      {
        name: "Installed Capacity",
        type: "bar",
        data: capacities,
      },
    ],
  };
};

interface GraphCardProps {
  graphId: string;
}

const Capacity: React.FC<GraphCardProps> = ({ graphId }) => {
  const { globalDBFilePath, graphs, updateGraph } = useVisualizationStore();

  const graph = graphs.find((g) => g.id === graphId);

  const [assets, setAssets] = useState<string[]>([]);
  const [localStart, setLocalStart] = useState<number>(
    graph?.options?.startYear ?? 900,
  );
  const [localEnd, setLocalEnd] = useState<number>(
    graph?.options?.endYear ?? 4000,
  );

  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  useEffect(() => {
    const fetchDataAndConfigureChart = async () => {
      try {
        // setLoadingData(true);
        const option = await capacityGraph(
          graph!.options?.asset,
          localStart,
          localEnd,
        );
        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Error fetching or processing data for chart: ${err}`);
      } finally {
        // setLoadingData(false);
      }
    };

    fetchDataAndConfigureChart();
  }, [globalDBFilePath, graph, localStart, localEnd]);

  useEffect(() => {
    if (graph?.options?.startYear != null)
      setLocalStart(graph.options?.startYear);
    if (graph?.options?.endYear != null) setLocalEnd(graph.options?.endYear);
  }, [graph?.options?.startYear, graph?.options?.endYear, globalDBFilePath]);

  useEffect(() => {
    if (graph?.type !== "capacity") {
      setAssets([]);
      return;
    }
    const loadAssets = async () => {
      try {
        const list = await fetchAssets();
        setAssets(list);
      } catch (err) {
        console.error("Could not load assets:", err);
      }
    };
    loadAssets();
  }, [graph?.type, globalDBFilePath]);

  const handleAssetChange = async (value: string | null) => {
    if (graph && value) {
      const minYear = await fetchMinYear(value);
      const maxYear = await fetchMaxYear(value);
      setLocalStart(minYear);
      setLocalEnd(maxYear);
      updateGraph(graph.id, {
        options: {
          asset: value,
          startYear: minYear,
          endYear: maxYear,
        } as CapacityOptions,
      });
    }
  };

  const handleLocalStartChange = async (v: string | number | null) => {
    const newVal = v === null ? "" : v;
    setLocalStart(newVal as number);

    if (typeof newVal === "number" && graph?.options) {
      const minYear = await fetchMinYear(graph?.options?.asset);
      // only commit if within [minYear, graph.endYear]
      if (
        newVal >= minYear &&
        (graph.options.endYear == null || newVal <= graph.options.endYear)
      ) {
        updateGraph(graph.id, {
          options: { ...graph.options, startYear: newVal },
        });
      }
    }
  };

  const handleLocalEndChange = async (v: string | number | null) => {
    var newVal = v === null ? "" : v;
    setLocalEnd(newVal as number);

    if (
      typeof newVal === "number" &&
      graph?.options &&
      (graph.options?.startYear == null || newVal >= graph.options.startYear)
    ) {
      const minYear = await fetchMinYear(graph.options.asset);
      const endYear = await fetchMaxYear(graph.options.asset);
      if (newVal < minYear) newVal = minYear;
      if (newVal > endYear) newVal = endYear;
      setLocalEnd(newVal);
      updateGraph(graph.id, { options: { ...graph.options, endYear: newVal } });
    }
  };

  const handleStartBlur = async () => {
    const parsed = parseInt(localStart as unknown as string, 10);
    if (isNaN(parsed) || !graph?.options) {
      setLocalStart(graph?.options?.startYear ?? 800); // reset back to last valid from the store
      return;
    }
    const minYear = await fetchMinYear(graph.options.asset);
    let clamped = Math.max(parsed, minYear);
    if (graph.options.endYear != null) {
      clamped = Math.min(clamped, graph.options.endYear);
    }

    setLocalStart(clamped);
    updateGraph(graph.id, {
      options: { ...graph.options, startYear: clamped },
    });
  };

  const handleEndBlur = () => {
    if (typeof localEnd === "number") return;
    const parsed = parseInt(localEnd as string, 10);
    if (
      !isNaN(parsed) &&
      graph?.options &&
      (graph.options?.startYear == null || parsed >= graph.options.startYear)
    ) {
      updateGraph(graph.id, { options: { ...graph.options, endYear: parsed } });
    }
  };

  return (
    <Stack>
      {graph && (
        <Select
          value={graph.options?.asset || ""}
          onChange={handleAssetChange}
          data={assets.map((a) => ({ value: a, label: a }))}
          placeholder={assets.length ? "Select asset" : ""}
          size="xs"
          style={{ width: 140 }}
        />
      )}

      {graph?.options && (
        <NumberInput
          placeholder="Start Year"
          value={localStart}
          onChange={handleLocalStartChange}
          onBlur={handleStartBlur}
          min={0}
          max={graph.options.endYear}
          step={1}
          size="xs"
        />
      )}

      {graph?.options && (
        <NumberInput
          placeholder="End Year"
          value={localEnd}
          onChange={handleLocalEndChange}
          onBlur={handleEndBlur}
          min={graph.options.startYear}
          max={3000}
          step={1}
          size="xs"
        />
      )}

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
        <Paper
          p="md"
          radius="md"
          withBorder
          shadow="xs"
          style={{
            height: "500px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>No chart data available after processing.</Text>
        </Paper>
      )}
    </Stack>
  );
};

export default Capacity;
