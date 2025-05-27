import { Text, Container, Loader, Paper, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  getSystemCost,
  FixedAssetCostRow,
} from "../../services/systemCostsQuery";
import useVisualizationStore from "../../store/visualizationStore";

const SystemCosts: React.FC = () => {
  const { globalDBFilePath } = useVisualizationStore();

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  const [chartOptions, setChartOptions] = useState<any>(null);

  useEffect(() => {
    const fetchDataAndConfigureChart = async () => {
      try {
        setLoadingData(true);
        const transformedData: FixedAssetCostRow[] = await getSystemCost();

        const years: number[] = [
          ...new Set(transformedData.map((item) => item.milestone_year)),
        ].sort((a, b) => a - b);
        const assets: string[] = [
          ...new Set(transformedData.map((item) => item.asset)),
        ];

        const series = assets.map((assetName: string) => ({
          name: assetName,
          type: "bar",
          stack: "total",
          emphasis: {
            focus: "series",
          },
          data: years.map((year: number) => {
            const item = transformedData.find(
              (d: FixedAssetCostRow) =>
                d.milestone_year === year && d.asset === assetName,
            );
            return item ? item.assets_fixed_cost : 0;
          }),
        }));

        const option = {
          title: {
            text: "Assets Fixed Cost by Milestone Year",
            left: "center",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
            formatter: function (params: any[]) {
              let totalCost = 0;
              let tooltipContent = `<strong>${params[0].name}</strong><br/>`;
              params.forEach((item) => {
                totalCost += item.value as number;
                tooltipContent +=
                  `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>` +
                  `${item.seriesName}: ${Number(item.value).toFixed(2)}<br/>`;
              });
              tooltipContent += `<hr style="margin: 5px 0;"/><strong>Total: ${totalCost.toFixed(2)}</strong>`;
              return tooltipContent;
            },
          },
          legend: {
            data: assets,
            bottom: "0%",
            type: "scroll",
          },
          xAxis: {
            type: "category",
            data: years,
            name: "Milestone Year",
            nameLocation: "end",
            nameTextStyle: {
              align: "right",
              verticalAlign: "top",
              padding: [20, 10, 0, 0],
            },
            axisLabel: {
              rotate: 45,
            },
          },
          yAxis: {
            type: "value",
            name: "Fixed Cost",
            axisLabel: {
              formatter: "{value}",
            },
          },
          grid: {
            left: "3%",
            right: "4%",
            top: "10%",
            bottom: "15%",
            containLabel: true,
          },
          series: series,
        };

        setChartOptions(option);
      } catch (err) {
        console.error("Error fetching or processing data for chart:", err);
        setErrorData(`Error fetching or processing data for chart: ${err}`);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDataAndConfigureChart();
  }, [globalDBFilePath]); // Refreshes whenever you select a diff db file

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
          color: "red",
        }}
      >
        <Text>{errorData}</Text>
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
            <Text>No chart data available after processing.</Text>
          </Paper>
        )}
      </Stack>
    </Container>
  );
};

export default SystemCosts;
