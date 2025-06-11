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
import {
  getStoragePriceDurationSeries,
  StoragePriceDurationSeriesRow,
  getStorageYears,
} from "../../services/storagePriceQuery";
import useVisualizationStore from "../../store/visualizationStore";
import { Resolution } from "../../types/resolution";

interface StoragePricesProps {
  graphId: string;
}

type EChartsOption = echarts.EChartsOption;

const StoragePrices: React.FC<StoragePricesProps> = ({ graphId }) => {
  const { getGraphDatabase, updateGraph } = useVisualizationStore();
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<EChartsOption | null>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Hours);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const dbPath = getGraphDatabase(graphId);

  useEffect(() => {
    updateGraph(graphId, { title: "Assets Storage Price Duration Series" });
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await getStorageYears(dbPath!);
        setAvailableYears(years.map((y) => y.year));
        if (!year && years.length > 0) {
          setYear(years[0].year);
        }
      } catch (err) {
        console.error("Failed to fetch years:", err);
      }
    };
    fetchYears();
  }, [dbPath]);

  useEffect(() => {
    const fetchDataAndConfigureChart = async () => {
      setErrorData(null);
      if (!dbPath) {
        setErrorData("No database selected");
        setLoadingData(false);
        return;
      }

      if (year === null) {
        setChartOptions(null);
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);

        if (year === null) return;
        const data: StoragePriceDurationSeriesRow[] =
          await getStoragePriceDurationSeries(dbPath, resolution, year);

        const groupedByAsset = new Map<
          string,
          { name: string; value: [number, number, number] }[]
        >();
        for (const d of data) {
          const key = `${d.milestone_year}, ${resolution} ${d.global_start}-${d.global_end}`;
          const xEnd = d.global_end;
          const width = d.global_end - d.global_start;

          const entry = {
            name: `${d.asset} (${key})`,
            value: [xEnd, width, d.y_axis] as [number, number, number],
          };
          if (!groupedByAsset.has(d.asset)) {
            groupedByAsset.set(d.asset, []);
          }
          groupedByAsset.get(d.asset)!.push(entry);
        }

        const option: EChartsOption = {
          tooltip: {
            trigger: "item",
            formatter: (params: any) => {
              const y = params.value[2];
              return `
                <strong>${params.name}</strong><br/>
                Price: ${y.toFixed(4)}
              `;
            },
          },
          xAxis: {
            type: "value",
            name: `Time in ${resolution}`,
            nameLocation: "middle",
            nameGap: 30,
            axisLabel: {
              formatter: (val: number) => val.toFixed(1),
            },
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
          series: Array.from(groupedByAsset.entries()).map(([asset, data]) => ({
            type: "custom",
            name: asset,
            clip: true,
            renderItem: (params: any, api: any) => {
              params = params; // done to escape build fail for not read value
              const x = api.value(0);
              const width = api.value(1);
              const y = api.value(2);

              const xStart = api.coord([x - width, 0])[0];
              const xEnd = api.coord([x, 0])[0];
              const yCoord = api.coord([0, y])[1];
              const yBase = api.coord([0, 0])[1];

              return {
                type: "rect",
                shape: {
                  x: xStart,
                  y: yCoord,
                  width: xEnd - xStart,
                  height: yBase - yCoord,
                },
                style: api.style(),
              };
            },
            encode: {
              x: 0,
              y: 2,
            },
            data,
          })),
        };

        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Failed to load storage price data: ${err}`);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDataAndConfigureChart();
  }, [dbPath, resolution, year]); // Refreshes whenever you select a diff db file

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
      <Group>
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
        {/* <Button size="xs" onClick={resetZoom}> */}
        {/* Reset Zoom */}
        {/* </Button> */}
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
