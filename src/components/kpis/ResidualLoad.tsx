import {
  Text,
  Container,
  Loader,
  Paper,
  Stack,
  Select,
  Group,
  Checkbox,
} from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";

import {
  getNonRenewables,
  getRenewables,
  getSupplyYears,
} from "../../services/residualLoadQuery";
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
  const { getGraphDatabase, updateGraph } = useVisualizationStore();

  // States for dropdowns and data
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Hours);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIndividual, setShowIndividual] = useState(true); // toggle between individual sources or grouped

  const dbPath = getGraphDatabase(graphId);

  useEffect(() => {
    updateGraph(graphId, { title: "Supply by source" });
  }, []);

  // Load available years
  useEffect(() => {
    if (!dbPath) return;
    getSupplyYears(dbPath)
      .then((ys) => {
        const yrs = ys.map((y) => y.year).sort();
        setAvailableYears(yrs);
        if (yrs.length && year === null) {
          setYear(yrs[0]); // default to first year if none selected yet
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
      try {
        setLoading(true);
        setError(null);

        const [renewablesData, nonData] = await Promise.all([
          getRenewables(dbPath, resolution, year),
          getNonRenewables(dbPath, resolution, year),
        ]);
        const allData = [...renewablesData, ...nonData]; // merge renewables and nonrenewables

        const times = Array.from(
          new Set(allData.map((d) => Number(d.global_start))),
        ).sort((a, b) => a - b);

        // compute duration per time for the tooltip below
        const durationMap = new Map<number, number>(
          allData.map((d) => {
            const start = Number(d.global_start);
            const end = Number(d.global_end);
            return [start, end - start];
          }),
        );

        let series: any[];

        if (showIndividual) {
          // Build one series per asset
          const byAsset = new Map<string, Map<number, number>>();
          allData.forEach((d) => {
            const start = Number(d.global_start);
            const value = d.y_axis;
            const asset = d.asset;
            if (!byAsset.has(asset)) byAsset.set(asset, new Map());
            byAsset.get(asset)!.set(start, value);
          });

          series = Array.from(byAsset.entries()).map(([asset, map]) => ({
            name: asset,
            type: "bar",
            stack: "total", // stack all on top of each other
            data: times.map((t) => map.get(t) ?? 0),
          }));
        } else {
          // Aggregate into two series: Renewables and Nonrenewables
          const renewableSums = new Map<number, number>();
          const nonSums = new Map<number, number>();

          times.forEach((t) => {
            // sum all renewables at time t
            const rSum = renewablesData
              .filter((d) => Number(d.global_start) === t)
              .reduce((acc, d) => acc + d.y_axis, 0);
            // sum all nonrenewables at time t
            const nrSum = nonData
              .filter((d) => Number(d.global_start) === t)
              .reduce((acc, d) => acc + d.y_axis, 0);

            renewableSums.set(t, rSum);
            nonSums.set(t, nrSum);
          });

          // Two stacked series only
          series = [
            {
              name: "Renewables",
              type: "bar",
              stack: "total",
              data: times.map((t) => renewableSums.get(t) ?? 0),
            },
            {
              name: "Nonrenewables",
              type: "bar",
              stack: "total",
              data: times.map((t) => nonSums.get(t) ?? 0),
            },
          ];
        }

        // Common chart options
        const options = {
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
            {
              type: "inside",
            },
          ],
          grid: {
            left: "60px",
            right: "40px",
            top: "40px",
            bottom: "100px",
            containLabel: true,
          },
          series,
        };

        setChartOptions(options);
      } catch (err) {
        console.error(err);
        setError("Failed to load supply data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dbPath, year, resolution, showIndividual]);

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
        {/* Controls: resolution, year, and toggle */}
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
          {/* Checkbox toggles between views */}
          <Checkbox
            label="Show individual sources"
            checked={showIndividual}
            onChange={(e) => setShowIndividual(e.currentTarget.checked)}
          />
        </Group>

        {/* Chart container */}
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
