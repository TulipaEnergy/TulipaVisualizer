import {
  Text,
  Container,
  Loader,
  Paper,
  Stack,
  Select,
  Group,
  Switch,
  SegmentedControl,
} from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  getStoragePriceDurationSeries,
  StoragePriceDurationSeriesRow,
} from "../../services/storagePriceQuery";
import { getAssetsCarriers, getYears } from "../../services/metadata";
import useVisualizationStore from "../../store/visualizationStore";
import { Resolution } from "../../types/resolution";
import { hasMetadata } from "../../services/metadata";

interface StoragePricesProps {
  graphId: string;
}

const StoragePrices: React.FC<StoragePricesProps> = ({ graphId }) => {
  const { getGraphDatabase, updateGraph, mustGetGraph } =
    useVisualizationStore();
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Days);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean>(false);
  const [storageType, setStorageType] = useState<string>("short-term");
  const [carrier, setCarrier] = useState<string>("all");
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);

  const dbPath = getGraphDatabase(graphId);
  const { lastApplyTimestamp } = mustGetGraph(graphId);

  useEffect(() => {
    updateGraph(graphId, { title: "Assets Storage Price Duration Series" });
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await getYears(dbPath!);
        setAvailableYears(years.map((y) => y.year));
        if (!year && years.length > 0) {
          setYear(years[0].year);
        }
      } catch (err) {
        console.error("Failed to fetch years:", err);
      }
    };
    fetchYears();
    const fetchCarriers = async () => {
      try {
        const carriers = await getAssetsCarriers(dbPath!);
        setAvailableCarriers(carriers.map((y) => y.carrier));
        if (!carrier && carriers.length > 0) {
          setCarrier(carriers[0].carrier);
        }
      } catch (err) {
        console.error("Failed to fetch carriers:", err);
      }
    };
    fetchCarriers();
  }, [dbPath]);

  useEffect(() => {
    const fetchDataAndConfigureChart = async () => {
      setErrorData(null);
      setLoadingData(true);

      if (!dbPath) {
        setErrorData("No database selected");
        setLoadingData(false);
        return;
      }

      try {
        if (year === null) return;
        const graph = mustGetGraph(graphId);
        let data: StoragePriceDurationSeriesRow[] =
          await getStoragePriceDurationSeries(
            dbPath,
            resolution,
            year!,
            storageType,
            carrier,
            graph.filtersByCategory,
            graph.breakdownNodes,
          );

        const expandedData: StoragePriceDurationSeriesRow[] = [];

        for (const row of data) {
          const { global_start, global_end, y_axis, ...rest } = row;
          const duration = global_end - global_start;

          if (duration == 0) continue;

          for (let t = global_start; t < global_end; t++) {
            expandedData.push({
              ...rest,
              global_start: Number(t),
              global_end: Number(t) + 1,
              y_axis,
            });
          }
        }
        data = expandedData;

        // Without breakdown, sum up the y_axis values of all assets
        if (
          !(await hasMetadata(graph.graphDBFilePath!)) ||
          graph.breakdownNodes.length === 0
        ) {
          const grouped = new Map<string, StoragePriceDurationSeriesRow>();

          for (const row of data) {
            const key = `${row.milestone_year}_${row.global_start}_${row.global_end}`;

            if (!grouped.has(key)) {
              grouped.set(key, { ...row, asset: `${carrier}` });
            } else {
              // Sum y_axis values
              const existing = grouped.get(key)!;
              existing.y_axis += row.y_axis;
            }
            data = Array.from(grouped.values());
          }
        }
        let times: number[];

        if (checked) {
          const totalByTime = new Map<number, number>();
          for (const d of data) {
            const t = Number(d.global_start);
            totalByTime.set(t, (totalByTime.get(t) ?? 0) + d.y_axis);
          }
          times = Array.from(totalByTime.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([t]) => t);
        } else {
          times = Array.from(
            new Set(data.map((d) => Number(d.global_start))),
          ).sort((a, b) => a - b);
        }

        const byCarrier = new Map<string, Map<number, number>>();
        data.forEach((d) => {
          const start = Number(d.global_start);
          const value = d.y_axis;
          const carrier = d.asset;
          if (!byCarrier.has(carrier)) byCarrier.set(carrier, new Map());
          byCarrier.get(carrier)!.set(start, value);
        });

        const series = Array.from(byCarrier.entries()).map(
          ([carrier, map]) => ({
            name: carrier,
            type: "bar",
            stack: "total",
            data: times.map((t) => map.get(t)),
          }),
        );

        const options = {
          barCategoryGap: "0%",
          barGap: "0%",

          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            formatter: (params: any[]) => {
              const t = Number(params[0].axisValue);
              const dur = 1;
              const unit = resolution;
              const header = `<strong>Price (${unit} ${t}-${t + dur})</strong>`;

              const lines = params
                .filter((p) => p.value !== undefined && p.value !== 0)
                .map((p) => `${p.marker} ${p.seriesName}: ${p.value}`);
              return lines.length > 0 ? [header, ...lines].join("<br/>") : "";
            },
          },
          xAxis: {
            type: "category",
            name: `Time in ${resolution}`,
            nameLocation: "middle",
            nameGap: 30,
            data: times.sort((a, b) => a - b).map((t) => t.toString()),
          },
          yAxis: {
            type: "value",
            name: "Price",
            nameTextStyle: {
              align: "right",
            },
          },
          grid: {
            left: "60px",
            right: "40px",
            top: "30px",
            bottom: "70px",
            containLabel: true,
          },
          dataZoom: [
            {
              type: "slider",
              orient: "horizontal",
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
          series,
        };

        setChartOptions(options);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Failed to load storage price data: ${err}`);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDataAndConfigureChart();
  }, [
    dbPath,
    resolution,
    year,
    checked,
    storageType,
    carrier,
    lastApplyTimestamp,
  ]); // Refreshes whenever you select a diff db file

  if (loadingData && year !== null) {
    return (
      <Container
        size="xl"
        h="100%"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader />
      </Container>
    );
  }

  if (errorData) {
    return (
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
    );
  }

  return (
    <Stack>
      <Group justify="apart" align="flex-end">
        <Select
          label="Resolution"
          value={resolution}
          onChange={(val) => {
            if (!val) return;
            if (val === resolution) {
              return;
            }
            setResolution(val as Resolution);
          }}
          data={[
            { value: Resolution.Hours, label: "Hours" },
            { value: Resolution.Days, label: "Days" },
            { value: Resolution.Weeks, label: "Weeks" },
            { value: Resolution.Months, label: "Months" },
            { value: Resolution.Years, label: "Years" },
          ]}
          size="xs"
          style={{ maxWidth: 160 }}
        />
        <Select
          label="Year"
          value={year?.toString() || ""}
          onChange={(val) => {
            if (!val) return;
            if (val === year?.toString()) {
              return;
            }
            setYear(Number(val));
          }}
          data={availableYears.map((y) => ({
            value: y.toString(),
            label: y.toString(),
          }))}
          size="xs"
          style={{ maxWidth: 160 }}
          placeholder="Select year"
          disabled={availableYears.length === 0}
        />
        <Select
          label="Carrier"
          value={carrier}
          onChange={(val) => {
            if (!val) return;
            if (val === carrier) {
              return;
            }
            setCarrier(val);
          }}
          data={[
            { value: "all", label: "all" },
            ...availableCarriers.sort().map((c) => ({
              value: c,
              label: c,
            })),
          ]}
          size="xs"
          style={{ maxWidth: 160 }}
          placeholder="Select carrier"
          disabled={availableCarriers.length === 0}
        />
        <SegmentedControl
          value={storageType}
          onChange={setStorageType}
          data={[
            { label: "Short-term", value: "short-term" },
            { label: "Long-term", value: "long-term" },
            { label: "Both", value: "both" },
          ]}
        />
        <Switch
          label="Duration Curve"
          onLabel="ON"
          offLabel="OFF"
          checked={checked}
          style={{ maxWidth: 160 }}
          onChange={(event) => setChecked(event.currentTarget.checked)}
        />
      </Group>
      {chartOptions ? (
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

export default StoragePrices;
