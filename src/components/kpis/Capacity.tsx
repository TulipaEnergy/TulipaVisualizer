import { useEffect, useState } from "react";
import { Select, Stack, Paper, Text, Container } from "@mantine/core";
import { fetchAssets, fetchAvailableYears } from "../../services/capacityQuery";
import type { EChartsOption } from "echarts";
import { fetchCapacityData } from "../../services/capacityQuery";
import useVisualizationStore, {
  CapacityOptions,
} from "../../store/visualizationStore";
import ReactECharts from "echarts-for-react";

// Returns a placeholder chart when inputs are missing
const getNoSelectionOption = (
  asset?: string,
  startYear?: number,
  endYear?: number,
): EChartsOption => {
  let missing = "";
  if (!asset) missing = "asset";
  else if (startYear == null) missing = "start year";
  else if (endYear == null) missing = "end year";

  return {
    title: { text: `No ${missing} selected`, left: "center" },
    tooltip: { show: false },
    xAxis: { show: false },
    yAxis: { show: false },
    series: [],
  };
};

const capacityGraph = async (
  asset: string,
  startYear: number,
  endYear: number,
): Promise<EChartsOption> => {
  const data = await fetchCapacityData(asset, startYear, endYear);
  const round2 = (v: number) => Math.round(v * 100) / 100; // round to 2 decimals
  const years = data.map((d) => d.year.toString());
  const capacities = data.map((d) => round2(d.installed_capacity));
  const investments = data.map((d) =>
    d.investment >= 0 ? round2(d.investment) : null,
  );
  const decommissions = data.map((d) =>
    d.decommission >= 0 ? round2(d.decommission) : null,
  );

  // build the three series objects
  const seriesList = [
    { name: "Installed Capacity", data: capacities },
    { name: "Investment", data: investments },
    { name: "Decommission", data: decommissions },
  ];

  // Sort DESC so smallest max => highest z-index => drawn last (on top)
  const sortedSeries = seriesList
    .map((s) => ({ ...s, max: Math.max(...s.data.map((v) => v || 0)) }))
    .sort((a, b) => b.max - a.max);

  return {
    title: {
      text: `${asset} capacity (${startYear}–${endYear})`,
      left: "center",
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 30, data: sortedSeries.map((s) => s.name) },
    xAxis: { type: "category", data: years, axisLabel: { rotate: 45 } },
    yAxis: { type: "value", name: "Installed Capacity in MW" },
    dataZoom: [{ type: "slider", start: 0, end: 100 }],
    series: sortedSeries.map((s, idx) => ({
      name: s.name,
      type: "bar",
      data: s.data,
      barGap: "-100%", // fully overlap every series
      barCategoryGap: "20%", // slight breathing room
      z: idx + 1, // higher idx drawn last
    })),
  };
};

interface GraphCardProps {
  graphId: string;
}

const Capacity: React.FC<GraphCardProps> = ({ graphId }) => {
  const { globalDBFilePath, graphs, updateGraph } = useVisualizationStore();

  const graph = graphs.find((g) => g.id === graphId);

  const [assets, setAssets] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  useEffect(() => {
    // load available years when asset changes
    (async () => {
      var yearsArray = null; // to contain the most recent available years
      const asset = graph?.options?.asset;
      if (asset) {
        try {
          const years = await fetchAvailableYears(asset);
          yearsArray = Array.from(years);
          setAvailableYears(yearsArray);
        } catch (err) {
          console.error(err);
          setAvailableYears([]);
        }
      } else {
        setAvailableYears([]);
      }

      // reset the years if they are not in the list of available years
      if (
        yearsArray == null &&
        graph?.options?.startYear &&
        !availableYears.includes(graph?.options?.startYear)
      )
        graph.options.startYear = undefined;
      if (
        yearsArray == null &&
        graph?.options?.endYear &&
        !availableYears.includes(graph?.options?.endYear)
      )
        graph.options.endYear = undefined;
      if (
        graph?.options?.startYear &&
        (yearsArray == null || !yearsArray.includes(graph?.options?.startYear))
      )
        graph.options.startYear = undefined;
      if (
        graph?.options?.endYear &&
        (yearsArray == null || !yearsArray.includes(graph?.options?.endYear))
      )
        graph.options.endYear = undefined;
    })();

    setChartOptions(null); // clear old chart
  }, [graph?.options?.asset, globalDBFilePath]);

  useEffect(() => {
    const fetchDataAndConfigureChart = async () => {
      setChartOptions(null); // clear old chart
      try {
        // Check if all inputs have values
        if (
          !graph?.options?.asset ||
          graph?.options?.startYear == null ||
          graph?.options?.endYear == null
        ) {
          setChartOptions(
            getNoSelectionOption(
              graph?.options?.asset,
              graph?.options?.startYear ?? undefined,
              graph?.options?.endYear ?? undefined,
            ),
          );
          return;
        }
        // Otherwise
        const option = await capacityGraph(
          graph.options.asset,
          graph.options.startYear,
          graph.options.endYear,
        );
        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Error fetching or processing data for chart: ${err}`);
      }
    };

    fetchDataAndConfigureChart();
  }, [
    globalDBFilePath,
    graph?.type,
    graph?.options?.asset,
    graph?.options?.startYear,
    graph?.options?.endYear,
  ]);

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
      updateGraph(graph.id, {
        options: { ...graph.options, asset: value } as CapacityOptions,
      });
    }
  };

  const handleStartChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (year != null && graph) {
      updateGraph(graph.id, { options: { ...graph.options, startYear: year } });
    }
  };

  const handleEndChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (year != null && graph) {
      updateGraph(graph.id, { options: { ...graph.options, endYear: year } });
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

      <Select
        placeholder="Start Year"
        value={graph?.options?.startYear?.toString() || null}
        onChange={handleStartChange}
        data={availableYears
          .filter((y) =>
            graph?.options?.endYear != null ? y <= graph.options.endYear : true,
          )
          .map((y) => ({ value: y.toString(), label: y.toString() }))}
        size="xs"
        style={{ width: 140 }}
      />

      <Select
        placeholder="End Year"
        value={graph?.options?.endYear?.toString() || null}
        onChange={handleEndChange}
        data={availableYears
          .filter((y) =>
            graph?.options?.startYear != null
              ? y >= graph.options.startYear
              : true,
          )
          .map((y) => ({ value: y.toString(), label: y.toString() }))}
        size="xs"
        style={{ width: 140 }}
      />

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
