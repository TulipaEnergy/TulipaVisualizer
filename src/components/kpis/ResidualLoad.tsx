import {
  Text,
  Container,
  Loader,
  Paper,
  Stack,
  Select,
  Group,
} from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";

import { getSupply } from "../../services/residualLoadQuery";
import { getYears } from "../../services/metadata";
import useVisualizationStore from "../../store/visualizationStore";
import { Resolution } from "../../types/resolution";

interface SupplyStackedBarSeriesProps {
  graphId: string;
  height?: number;
}

const SupplyStackedBarSeries: React.FC<SupplyStackedBarSeriesProps> = ({
  graphId,
  height = 500,
}) => {
  const { getGraphDatabase, updateGraph, mustGetGraph } =
    useVisualizationStore();

  // grab the whole graph config, including filtersByCategory
  const graph = mustGetGraph(graphId);
  const dbPath = getGraphDatabase(graphId);

  // States for dropdowns and data
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Days);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    updateGraph(graphId, { title: "Supply by source" });
  }, []);

  // Load available years
  useEffect(() => {
    if (!dbPath) return;
    getYears(dbPath)
      .then((ys) => {
        const yrs = ys.map((y) => y.year).sort();
        setAvailableYears(yrs);
        if (yrs.length && year === null) {
          setYear(yrs[0]);
        }
      })
      .catch((e) => {
        console.error(e);
        setError("Failed to fetch available years.");
      });
  }, [dbPath]);

  // Load data and build chart
  useEffect(() => {
    if (!dbPath || year === null) return;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const supplyData = await getSupply(
          dbPath,
          resolution,
          year,
          graph.filtersByCategory,
          graph.breakdownNodes,
        );
        const times = Array.from(
          new Set(supplyData.map((d) => Number(d.global_start))),
        ).sort((a, b) => a - b);

        const durationMap = new Map<number, number>(
          supplyData.map((d) => {
            const start = Number(d.global_start);
            const end = Number(d.global_end);
            return [start, end - start];
          }),
        );

        // group by asset → build one bar‐series per asset
        const byAsset = new Map<string, Map<number, number>>();
        supplyData.forEach((d) => {
          const start = Number(d.global_start);
          const value = d.y_axis;
          const asset = d.asset;
          if (!byAsset.has(asset)) byAsset.set(asset, new Map());
          byAsset.get(asset)!.set(start, value);
        });

        const series = Array.from(byAsset.entries()).map(([asset, map]) => ({
          name: asset,
          type: "bar",
          stack: "total",
          data: times.map((t) => map.get(t) ?? 0),
        }));

        setChartOptions({
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any[]) => {
              const t = Number(params[0].axisValue);
              const dur = durationMap.get(t) ?? 0;
              const unit = resolution;
              const header = `<strong>Supply (${unit} ${t}-${t + dur})</strong>`;
              const lines = params.map(
                (p) => `${p.marker} ${p.seriesName}: ${p.value}`,
              );
              return [header, ...lines].join("<br/>");
            },
          },
          legend: { bottom: "0%", type: "scroll" },
          xAxis: {
            type: "category",
            name: `Time (${resolution})`,
            nameLocation: "middle",
            nameGap: 30,
            data: times.map((t) => t.toString()),
          },
          yAxis: { type: "value", name: "Supply (MW)" },
          dataZoom: [
            {
              type: "slider",
              orient: "horizontal",
              bottom: "40px",
              brushSelect: false,
            },
            {
              type: "slider",
              orient: "vertical",
              brushSelect: false,
              filterMode: "none",
              left: 20,
            },
            { type: "inside" },
          ],
          grid: {
            left: "60px",
            right: "40px",
            top: "40px",
            bottom: "100px",
            containLabel: true,
          },
          series,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load supply data.");
      } finally {
        setLoading(false);
      }
    })();
    // re-run when filters change as well
  }, [dbPath, year, resolution, graph.lastApplyTimestamp]);

  if (error) {
    return (
      <Container size="xl" style={{ textAlign: "center", padding: 20 }}>
        <Text color="red">{error}</Text>
      </Container>
    );
  }

  if (loading || chartOptions === null) {
    return (
      <Container
        size="xl"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height,
        }}
      >
        <Loader />
      </Container>
    );
  }

  return (
    <Container size="xl" style={{ paddingTop: 20 }}>
      <Stack gap="md">
        <Group justify="apart" align="flex-end">
          <Group>
            <Select
              label="Resolution"
              size="xs"
              value={resolution}
              onChange={(val) => val && setResolution(val as Resolution)}
              data={[
                { value: Resolution.Hours, label: "Hours" },
                { value: Resolution.Days, label: "Days" },
                { value: Resolution.Weeks, label: "Weeks" },
                { value: Resolution.Months, label: "Months" },
                { value: Resolution.Years, label: "Years" },
              ]}
            />
            <Select
              label="Year"
              size="xs"
              value={year?.toString() ?? ""}
              onChange={(val) => val && setYear(Number(val))}
              data={availableYears.map((y) => ({
                value: y.toString(),
                label: y.toString(),
              }))}
              placeholder="Select year"
            />
          </Group>
        </Group>

        <Paper p="md" radius="md" withBorder shadow="xs" style={{ height }}>
          <ReactECharts
            option={chartOptions}
            style={{ width: "100%", height: "100%" }}
          />
        </Paper>
      </Stack>
    </Container>
  );
};

export default SupplyStackedBarSeries;
