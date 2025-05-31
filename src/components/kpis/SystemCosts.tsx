import { Text, Container, Loader, Paper, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  getAssetCostsByYear,
  getFlowCostsByYear,
} from "../../services/systemCosts";
import useVisualizationStore from "../../store/visualizationStore";

interface SystemCostsProps {
  graphId: string;
}

const SystemCosts: React.FC<SystemCostsProps> = ({ graphId }) => {
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const { getGraphDatabase } = useVisualizationStore();
  const dbFilePath = getGraphDatabase(graphId);

  useEffect(() => {
    (async () => {
      // Reset states at the beginning of each fetch
      setLoadingData(true);
      setErrorData(null);

      // DB File should always be provided - see assertion in GraphCard
      if (!dbFilePath) {
        setErrorData("No database selected");
        setLoadingData(false);
        return;
      }

      try {
        const assetData: {
          year: number;
          asset_fixed_costs: number;
          unit_on_costs: number;
        }[] = await getAssetCostsByYear(dbFilePath);

        const flowData: {
          year: number;
          flow_fixed_costs: number;
          flow_variable_costs: number;
        }[] = await getFlowCostsByYear(dbFilePath);

        // Check if we got any data
        if (assetData.length === 0 && flowData.length === 0) {
          setErrorData("No system cost data found in the selected database");
          setLoadingData(false);
          return;
        }

        // Define a single series for the total fixed cost
        const series = [
          {
            name: "Asset Fixed",
            type: "bar",
            data: assetData.map((i) => i.asset_fixed_costs),
            stack: "Asset Costs",
          },
          {
            name: "Unit On",
            type: "bar",
            data: assetData.map((i) => i.unit_on_costs),
            stack: "Asset Costs",
          },
          {
            name: "Flow Fixed",
            type: "bar",
            data: flowData.map((i) => i.flow_fixed_costs),
            stack: "Flow Costs",
          },
          {
            name: "Flow Variable",
            type: "bar",
            data: flowData.map((i) => i.flow_variable_costs),
            stack: "Flow Costs",
          },
        ];

        const years = [
          ...new Set([...assetData, ...flowData].map((item) => item.year)),
        ].sort((a, b) => a - b);

        const option = {
          title: {
            text: "Total Asset and Flow Costs by Year", // Updated chart title
            left: "center",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
            formatter: function (params: any[]) {
              let totalCost = 0;
              let tooltipContent = `<strong>${params[0].name}</strong><br/>`; // Year
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
            // Update legend data to match all new series names
            data: ["Asset Fixed", "Unit On", "Flow Fixed", "Flow Variable"],
            bottom: "0%",
            type: "scroll",
          },
          xAxis: {
            type: "category",
            data: years, // Use the combined and sorted years for the x-axis categories
            name: "Year",
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
            name: "Cost",
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
        setErrorData(
          "Failed to load system cost data. " +
            (err instanceof Error ? err.message : ""),
        );
      } finally {
        setLoadingData(false);
      }
    })();
  }, [dbFilePath]); // Refreshes whenever you select a diff db file

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
