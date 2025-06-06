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
  getProductionPriceDurationSeries,
  ProductionPriceDurationSeriesRow,
  getProductionYears,
} from "../../services/productionPriceQuery";
import useVisualizationStore from "../../store/visualizationStore";
import { Resolution } from "../../types/resolution";

interface ProductionPricesDurationSeriesProps {
  graphId: string;
}

const ProductionPricesDurationSeries: React.FC<
  ProductionPricesDurationSeriesProps
> = ({ graphId }) => {
  const { getGraphDatabase } = useVisualizationStore();
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Hours);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const dbPath = getGraphDatabase(graphId);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await getProductionYears(dbPath!);
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
    const fetchData = async () => {
      if (!dbPath) {
        setErrorData("No database selected.");
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
        const data: ProductionPriceDurationSeriesRow[] =
          await getProductionPriceDurationSeries(dbPath, resolution, year);

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

        const chartOption = {
          title: {
            text: "Assets Production Price Duration Series",
            left: "center",
          },
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
            name: "Production Price",
          },
          grid: {
            left: "3%",
            right: "4%",
            top: "10%",
            bottom: "15%",
            containLabel: true,
          },
          series: Array.from(groupedByAsset.entries()).map(([asset, data]) => ({
            type: "custom",
            name: asset,
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

        setChartOptions(chartOption);
      } catch (err) {
        setErrorData("Failed to load production prices.");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [dbPath, resolution, year]);

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
        }}
      >
        <Text color="red">{errorData}</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" h="100%">
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
            <Text>No chart data available.</Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default ProductionPricesDurationSeries;
