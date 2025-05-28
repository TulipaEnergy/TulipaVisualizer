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
  db: string,
): Promise<EChartsOption> => {
  const data = await fetchCapacityData(asset, startYear, endYear, db);
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

interface CapacityProps {
  graphId: string;
}

const Capacity: React.FC<CapacityProps> = ({ graphId }) => {
  const { mustGetGraph, updateGraph } = useVisualizationStore();

  const graph = mustGetGraph(graphId);

  const [assets, setAssets] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  const dbFilePath = graph.graphDBFilePath!;

  // Effect 1: Reset everything when database changes
  useEffect(() => {
    // Clear all state when database changes
    setAssets([]);
    setAvailableYears([]);
    setErrorData(null);
    setChartOptions(null);

    // Reset graph options
    updateGraph(graphId, { options: null });

    // Load new assets from the new database
    const loadAssets = async () => {
      try {
        const list = await fetchAssets(dbFilePath);
        setAssets(list);
      } catch (err) {
        console.error("Could not load assets:", err);
        setErrorData(`Failed to load assets: ${err}`);
      }
    };

    loadAssets();
  }, [dbFilePath, graphId, updateGraph]);

  // Effect 2: Load available years when asset changes
  useEffect(() => {
    const loadAvailableYears = async () => {
      const asset = graph.options?.asset;

      if (!asset) {
        setAvailableYears([]);
        return;
      }

      try {
        const years = await fetchAvailableYears(dbFilePath, asset);
        const yearsArray = Array.from(years);
        setAvailableYears(yearsArray);

        // Check if current year selections are still valid, and reset if not
        let needsUpdate = false;
        const newOptions = { ...graph.options };

        if (
          newOptions.startYear != null &&
          !yearsArray.includes(newOptions.startYear)
        ) {
          newOptions.startYear = undefined;
          needsUpdate = true;
        }

        if (
          newOptions.endYear != null &&
          !yearsArray.includes(newOptions.endYear)
        ) {
          newOptions.endYear = undefined;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updateGraph(graphId, { options: newOptions });
        }
      } catch (err) {
        console.error("Failed to fetch available years:", err);
        setAvailableYears([]);
        setErrorData(`Failed to load available years: ${err}`);
      }
    };

    loadAvailableYears();
    // Clear chart when asset changes (will be regenerated by next effect)
    setChartOptions(null);
  }, [dbFilePath, graph.options?.asset, graphId, updateGraph]);

  // Effect 3: Generate chart when all required options are available
  useEffect(() => {
    const generateChart = async () => {
      // Clear previous error
      setErrorData(null);

      if (!graph.options) {
        setChartOptions(null);
        return;
      }

      // Check if all required inputs are available
      if (
        !graph.options.asset ||
        graph.options.startYear == null ||
        graph.options.endYear == null
      ) {
        setChartOptions(
          getNoSelectionOption(
            graph.options.asset,
            graph.options.startYear ?? undefined,
            graph.options.endYear ?? undefined,
          ),
        );
        return;
      }

      try {
        const option = await capacityGraph(
          graph.options.asset,
          graph.options.startYear,
          graph.options.endYear,
          dbFilePath,
        );
        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Error fetching or processing data for chart: ${err}`);
        setChartOptions(null);
      }
    };

    generateChart();
  }, [
    dbFilePath,
    graph.options?.asset,
    graph.options?.startYear,
    graph.options?.endYear,
  ]);

  const handleAssetChange = async (value: string | null) => {
    if (graph && value) {
      updateGraph(graph.id, {
        options: {
          ...graph.options,
          asset: value,
          // Reset year selections when asset changes since they may not be valid
          startYear: undefined,
          endYear: undefined,
        } as CapacityOptions,
      });
    }
  };

  const handleStartChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (graph) {
      const newOptions = { ...graph.options };
      if (year != null) {
        newOptions.startYear = year;
        // Ensure end year is not before start year
        if (newOptions.endYear != null && newOptions.endYear < year) {
          newOptions.endYear = undefined;
        }
      } else {
        newOptions.startYear = undefined;
      }
      updateGraph(graph.id, { options: newOptions });
    }
  };

  const handleEndChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (graph) {
      const newOptions = { ...graph.options };
      if (year != null) {
        newOptions.endYear = year;
        // Ensure start year is not after end year
        if (newOptions.startYear != null && newOptions.startYear > year) {
          newOptions.startYear = undefined;
        }
      } else {
        newOptions.endYear = undefined;
      }
      updateGraph(graph.id, { options: newOptions });
    }
  };

  return (
    <Stack>
      <Select
        value={graph.options?.asset || null}
        onChange={handleAssetChange}
        data={assets.map((a) => ({ value: a, label: a }))}
        placeholder={assets.length ? "Select asset" : ""}
        size="xs"
        style={{ width: 140 }}
      />

      <Select
        placeholder="Start Year"
        value={graph.options?.startYear?.toString() || null}
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
        value={graph.options?.endYear?.toString() || null}
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
