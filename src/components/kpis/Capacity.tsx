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
import { fetchAvailableYears } from "../../services/capacityQuery";
import type { EChartsOption } from "echarts";
import { getCapacity } from "../../services/capacityQuery";
import useVisualizationStore, {
  CapacityOptions,
} from "../../store/visualizationStore";
import ReactECharts from "echarts-for-react";
import { getAssets } from "../../services/metadata";

const capacityGraph = async (
  asset: string,
  startYear: number,
  endYear: number,
  db: string,
): Promise<EChartsOption> => {
  const data = await getCapacity(db, asset, startYear, endYear);
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

  // Reset everything when database changes
  useEffect(() => {
    console.log("DB CHANGED");
    // reset data
    setErrorData(null);
    // reset state
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

  // Attempt to generate chart
  useEffect(() => {
    console.log("GENERATING GRAPH");
    (async () => {
      // Clear previous error and old chart
      setErrorData(null);
      setChartOptions(null);

      const asset = graph.options?.asset;

      if (!asset) {
        console.log("NO ASSET, RESETTING YEARS");
        setAvailableYears([]);
        setChartOptions(null);
        return;
      }

      try {
        const years = await fetchAvailableYears(dbFilePath, asset);
        setAvailableYears(Array.from(years));

        // Check if current year selections are still valid, and reset if not
        let needsUpdate = false;
        const newOptions = { ...graph.options };

        if (
          newOptions.startYear != null &&
          !years.includes(newOptions.startYear)
        ) {
          newOptions.startYear = undefined;
          needsUpdate = true;
        }

        if (newOptions.endYear != null && !years.includes(newOptions.endYear)) {
          newOptions.endYear = undefined;
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log("UPDATING YEARS");
          updateGraph(graphId, { options: newOptions });
        }
      } catch (err) {
        console.error("Failed to fetch available years:", err);
        setAvailableYears([]);
        setErrorData(`Failed to load available years: ${err}`);
      }

      // Check if all required inputs are available. If any is missing, it shows it on the UI.
      if (
        !graph.options?.asset ||
        !graph.options.startYear ||
        !graph.options.endYear
      ) {
        console.log("NO GRAPH OPTIONS");
        setChartOptions(null);
        return;
      }

      // All required inputs have values.
      try {
        console.log("GENERATING GRAPH for: " + JSON.stringify(graph.options));
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
    })();
  }, [graph.options]);

  const handleAssetChange = (value: string | null) => {
    if (value) {
      updateGraph(graph.id, {
        options: {
          ...graph.options,
          asset: value,
        } as CapacityOptions,
      });
    }
  };

  const handleStartChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (year != null) {
      updateGraph(graph.id, { options: { ...graph.options, startYear: year } });
    }
  };

  const handleEndChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (year != null) {
      updateGraph(graph.id, { options: { ...graph.options, endYear: year } });
    }
  };

  return (
    <Stack>
      <Group>
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
              graph?.options?.endYear != null
                ? y <= graph.options.endYear
                : true,
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
      </Group>

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
