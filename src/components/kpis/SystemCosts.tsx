import { Text, Container, Loader, Paper, Stack } from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";

import {
  getAssetCostsByYear,
  getFlowCostsByYear,
  FlowSystemCostPerYear,
  AssetSystemCostPerYear,
  getUniqueCarriers,
  getUniqueYears,
} from "../../services/systemCosts";
import useVisualizationStore from "../../store/visualizationStore";

interface SystemCostsProps {
  graphId: string;
}

type EChartsOption = echarts.EChartsOption;

const SystemCosts: React.FC<SystemCostsProps> = ({ graphId }) => {
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<EChartsOption | null>(null);
  const { getGraphDatabase, updateGraph } = useVisualizationStore();
  const dbFilePath = getGraphDatabase(graphId);

  useEffect(() => {
    updateGraph(graphId, { title: "Asset & Flow Operation Costs" });
  }, []);

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
        const [series, legendData, years] = await getSeries(dbFilePath);

        const option: EChartsOption = {
          title: {
            left: "0",
            subtext: "By Year, with flows grouped by Carrier",
          },
          tooltip: {
            trigger: "axis",
            axisPointer: {
              type: "shadow",
            },
            formatter: function (params: any[]) {
              let totalCost = 0;
              let tooltipContent = `<strong>${params[0].name}</strong><br/>`;

              // Sort params to group fixed and variable costs, and then by carrier
              const sortedParams = [...params].sort((a, b) => {
                const nameA = a.seriesName.toLowerCase();
                const nameB = b.seriesName.toLowerCase();

                // Prioritize Asset costs
                if (nameA.includes("asset") && !nameB.includes("asset"))
                  return -1;
                if (!nameA.includes("asset") && nameB.includes("asset"))
                  return 1;

                // Then group fixed vs variable
                if (nameA.includes("fixed") && !nameB.includes("fixed"))
                  return -1;
                if (!nameA.includes("fixed") && nameB.includes("fixed"))
                  return 1;

                // Then by carrier name
                return nameA.localeCompare(nameB);
              });

              sortedParams.forEach((item) => {
                if (
                  item.value !== null &&
                  item.value !== undefined &&
                  item.value !== 0
                ) {
                  totalCost += item.value as number;
                  tooltipContent +=
                    `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>` +
                    `${item.seriesName}: ${Number(item.value).toFixed(2)}<br/>`;
                }
              });
              tooltipContent += `<hr style="margin: 5px 0;"/><strong>Total: ${totalCost.toFixed(
                2,
              )}</strong>`;
              return tooltipContent;
            },
          } as any,
          legend: {
            data: legendData,
            bottom: "0%",
            type: "scroll",
          },
          xAxis: {
            type: "category",
            data: years,
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
          dataZoom: [
            {
              bottom: "40px",
              orient: "horizontal",
              minSpan: Math.floor(100 / years.length) - 1,
              brushSelect: false,
            },
            {
              orient: "vertical",
              brushSelect: false,
              minSpan: 10,
              filterMode: "none",
              left: 20,
            },
          ],
          grid: {
            left: "60px",
            right: "40px",
            top: "70px",
            bottom: "80px",
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
  );
};

async function getSeries(
  dbFilePath: string,
): Promise<[echarts.SeriesOption[], string[], number[]]> {
  const assetData: AssetSystemCostPerYear[] =
    await getAssetCostsByYear(dbFilePath);

  const flowData: FlowSystemCostPerYear[] =
    await getFlowCostsByYear(dbFilePath);

  const years = getUniqueYears(assetData, flowData);
  const uniqueCarriers = getUniqueCarriers(flowData);

  const series: echarts.BarSeriesOption[] = [
    {
      name: "Asset - Fixed",
      type: "bar",
      data: years.map((year) => {
        const yearData = assetData.find((d) => d.year === year);
        return yearData ? yearData.asset_fixed_costs : 0;
      }),
      stack: "Asset Costs",
    },
    {
      name: "Asset - Unit On",
      type: "bar",
      data: years.map((year) => {
        const yearData = assetData.find((d) => d.year === year);
        return yearData ? yearData.unit_on_costs : 0;
      }),
      stack: "Asset Costs",
    },
  ];

  const legendData: string[] = ["Asset - Fixed", "Asset - Unit On"];

  uniqueCarriers.forEach((carrier) => {
    let foundData = false;
    series.push({
      name: `Flow Fixed - ${carrier}`,
      type: "bar",
      data: years.map((year) => {
        const yearData = flowData.find((d) => d.year === year);
        if (yearData?.flow_fixed_costs_by_carrier[carrier]) {
          foundData = true;
          return yearData?.flow_fixed_costs_by_carrier[carrier];
        } else {
          return 0;
        }
      }),
      stack: "Flow Costs",
    });
    if (foundData) {
      legendData.push(`Flow Fixed - ${carrier}`);
    }

    foundData = false;
    series.push({
      name: `Flow Variable - ${carrier}`,
      type: "bar",
      data: years.map((year) => {
        const yearData = flowData.find((d) => d.year === year);
        if (yearData?.flow_variable_costs_by_carrier[carrier]) {
          foundData = true;
          return yearData?.flow_variable_costs_by_carrier[carrier];
        } else {
          return 0;
        }
      }),
      stack: "Flow Costs",
    });
    if (foundData) {
      legendData.push(`Flow Variable - ${carrier}`);
    }
  });

  return [series, legendData, years];
}

export default SystemCosts;
