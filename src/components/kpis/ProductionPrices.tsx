import { Text, Container, Loader, Paper, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  getProductionPricePeriod,
  ProductionPricePeriodRow,
} from "../../services/productionPriceQuery";
import useVisualizationStore from "../../store/visualizationStore";

interface ProductionPricesPeriodProps {
  graphId: string;
}

const ProductionPricesPeriod: React.FC<ProductionPricesPeriodProps> = ({
  graphId,
}) => {
  const { getGraphDatabase } = useVisualizationStore();
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  const dbPath = getGraphDatabase(graphId);

  useEffect(() => {
    const fetchData = async () => {
      if (!dbPath) {
        setErrorData("No database selected.");
        return;
      }

      try {
        setLoadingData(true);
        const data: ProductionPricePeriodRow[] =
          await getProductionPricePeriod(dbPath);

        // Sort and compute cumulative x start for each period
        const sorted = [...data].sort(
          (a, b) => a.milestone_year - b.milestone_year || a.period - b.period,
        );

        let currentX = 0;
        const xMap = new Map<string, number>();
        const barWidths = new Map<string, number>();

        for (const row of sorted) {
          const key = `${row.milestone_year}-P${row.period}`;
          if (!xMap.has(key)) {
            currentX += row.length;
            xMap.set(key, currentX);
            barWidths.set(key, row.length);
          }
        }

        const groupedByAsset = new Map<
          string,
          { name: string; value: [number, number, number] }[]
        >();
        for (const d of sorted) {
          const key = `${d.milestone_year}-P${d.period}`;
          const xEnd = xMap.get(key)!;
          const width = barWidths.get(key)!;
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
            text: "Assets Production Price by Period",
            left: "center",
          },
          tooltip: {
            trigger: "item",
            formatter: (params: any) => {
              const y = params.value[2];
              return `
                <strong>${params.name}</strong><br/>
                Price: ${y.toFixed(2)}
              `;
            },
          },
          xAxis: {
            type: "value",
            name: "Time in Periods",
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
  }, [dbPath]);

  if (loadingData) {
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

export default ProductionPricesPeriod;
