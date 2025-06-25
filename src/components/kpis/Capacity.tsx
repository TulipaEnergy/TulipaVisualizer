import { useEffect, useState } from "react";
import { Stack, Paper, Text, Container, Flex } from "@mantine/core";
import type {
  EChartsOption,
  BarSeriesOption,
  TooltipComponentOption,
} from "echarts";
import useVisualizationStore from "../../store/visualizationStore";
import ReactECharts from "echarts-for-react";
import { getCapacity } from "../../services/capacityQuery";

const capacityGraphAllAssets = async (
  dbPath: string,
  filters: Record<number, number[]>,
  grouper: number[],
): Promise<EChartsOption> => {
  const data = await getCapacity(dbPath, filters, grouper);
  const round2 = (v: number) => Math.round(v * 100) / 100;

  // Get all unique years and assets
  const allYears: string[] = [
    ...new Set(data.map((d) => d.year.toString())),
  ].sort();
  const assets: string[] = [...new Set(data.map((d) => d.asset))].sort();

  // Filter out years where all assets have zero/null values for all capacity types
  const validYears = allYears.filter((year) => {
    return assets.some((asset) => {
      const assetYearData = data.find(
        (d) => d.asset === asset && d.year.toString() === year,
      );
      if (!assetYearData) return false;

      // Check if any of the capacity values are non-zero
      const hasInitialCapacity = assetYearData.initial_capacity > 0;
      const hasFinalCapacity = assetYearData.final_capacity > 0;
      const hasInvestment = assetYearData.investment > 0;
      const hasDecommission = assetYearData.decommission > 0;

      return (
        hasInitialCapacity ||
        hasFinalCapacity ||
        hasInvestment ||
        hasDecommission
      );
    });
  });

  // If no valid years, return empty chart
  if (validYears.length === 0) {
    return {
      title: {
        text: "No capacity data available",
        left: "center",
        top: "center",
      },
      xAxis: { type: "category", data: [] },
      yAxis: { type: "value" },
      series: [],
    };
  }

  // Canvas helper for stripes
  function createStripeCanvas(color: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(4, 0);
    ctx.lineWidth = 1;
    ctx.stroke();
    return c;
  }

  // Color palette for different assets (only for final capacity)
  const assetColors = [
    "#5470C6",
    "#91CC75",
    "#FAC858",
    "#EE6666",
    "#73C0DE",
    "#3BA272",
    "#FC8452",
    "#9A60B4",
    "#EA7CCC",
    "#8B5A2B",
  ];

  const series: BarSeriesOption[] = [];

  // Create series for each capacity type across all assets
  assets.forEach((asset, assetIndex) => {
    const assetColor = assetColors[assetIndex % assetColors.length];
    const assetData = data.filter((d) => d.asset === asset);

    // Create data arrays for this asset using only valid years
    const initial_capacities = validYears.map((year) => {
      const item = assetData.find((d) => d.year.toString() === year);
      const value = item ? round2(item.initial_capacity) : 0;
      return value === 0 ? null : value;
    });

    const final_capacities = validYears.map((year) => {
      const item = assetData.find((d) => d.year.toString() === year);
      const value = item ? round2(item.final_capacity) : 0;
      return value === 0 ? null : value;
    });

    const investments = validYears.map((year) => {
      const item = assetData.find((d) => d.year.toString() === year);
      const value = item && item.investment > 0 ? round2(item.investment) : 0;
      return value === 0 ? null : value;
    });

    const decommissions = validYears.map((year) => {
      const item = assetData.find((d) => d.year.toString() === year);
      const value =
        item && item.decommission > 0 ? -round2(item.decommission) : 0;
      return value === 0 ? null : value;
    });

    // Check if this asset has any data in the valid years
    const hasAnyData =
      initial_capacities.some((v) => v !== null) ||
      final_capacities.some((v) => v !== null) ||
      investments.some((v) => v !== null) ||
      decommissions.some((v) => v !== null);

    if (hasAnyData) {
      // First bar group: IC, INV, DEC (stacked together, no gap between them)
      series.push(
        {
          name: "Initial Capacity",
          type: "bar",
          data: initial_capacities,
          itemStyle: { color: "#8A8A8A" }, // Always grey
          stack: `left-${asset}`, // Left stack for IC, INV, DEC
          emphasis: { focus: "series" },
        },
        {
          name: "Investments",
          type: "bar",
          data: investments,
          itemStyle: {
            color: {
              type: "pattern",
              image: createStripeCanvas("#43A047"), // Always green striped
              repeat: "repeat",
            },
          },
          stack: `left-${asset}`, // Left stack for IC, INV, DEC
          emphasis: { focus: "series" },
        },
        {
          name: "Decommissions",
          type: "bar",
          data: decommissions,
          itemStyle: {
            color: {
              type: "pattern",
              image: createStripeCanvas("#D32F2F"), // Always red striped
              repeat: "repeat",
            },
          },
          stack: `left-${asset}`, // Left stack for IC, INV, DEC
          emphasis: { focus: "series" },
        },
      );

      // Second bar group: FC (separate stack to create gap from first group)
      series.push({
        name: `${asset}`,
        type: "bar",
        data: final_capacities,
        itemStyle: { color: assetColor },
        stack: `right-${asset}`, // Right stack for FC
        emphasis: { focus: "series" },
      });
    }
  });

  /**
   * Custom tooltip configuration with pattern-aware styling.
   * Recreates visual patterns in tooltip for consistency with chart.
   */
  const tooltip: TooltipComponentOption = {
    trigger: "item", // Changed from "axis" to "item" to show only hovered bar
    className: "custom-tooltip",
    extraCssText: `
      max-height: 300px;
      overflow-y: auto;
      max-width: 400px;
      scrollbar-width: thin;
      scrollbar-color: #888 #f1f1f1;
    `,
    formatter: (params: any) => {
      if (!params) return "";

      const year = params.name;
      const seriesName = params.seriesName;
      const value = params.value;

      // Extract asset name from series name or stack name
      let assetName = "";
      if (
        seriesName === "Initial Capacity" ||
        seriesName === "Investments" ||
        seriesName === "Decommissions"
      ) {
        // For these series, we need to find which asset this data point belongs to
        // We can do this by checking which asset has non-null data for this year and series

        for (const asset of assets) {
          const assetData = data.find(
            (d) => d.asset === asset && d.year.toString() === year,
          );
          if (assetData) {
            let hasValue = false;
            if (
              seriesName === "Initial Capacity" &&
              assetData.initial_capacity > 0
            ) {
              hasValue = true;
            } else if (
              seriesName === "Investments" &&
              assetData.investment > 0
            ) {
              hasValue = true;
            } else if (
              seriesName === "Decommissions" &&
              assetData.decommission > 0
            ) {
              hasValue = true;
            }

            if (hasValue) {
              // Check if this matches the actual value in the tooltip
              let expectedValue = 0;
              if (seriesName === "Initial Capacity") {
                expectedValue = round2(assetData.initial_capacity);
              } else if (seriesName === "Investments") {
                expectedValue = round2(assetData.investment);
              } else if (seriesName === "Decommissions") {
                expectedValue = -round2(assetData.decommission);
              }

              if (Math.abs(expectedValue - (value || 0)) < 0.01) {
                assetName = asset;
                break;
              }
            }
          }
        }

        if (!assetName) assetName = "Unknown";
      } else {
        // For final capacity series, the series name is the asset name
        assetName = seriesName;
      }

      // Get the actual data for this asset and year from the original data
      const assetYearData = data.find(
        (d) => d.asset === assetName && d.year.toString() === year,
      );

      if (!assetYearData) {
        return `<div style="font-weight: bold;">Year ${year}</div>
                <div>Asset: ${assetName}</div>
                <div>${seriesName}: ${value !== null ? value.toFixed(1) : "N/A"}</div>`;
      }

      let html = `<div style="font-weight: bold; margin-bottom: 8px;">Year ${year}</div>`;
      html += `<div style="font-weight: bold; color: ${assetColors[assets.indexOf(assetName) % assetColors.length]}; margin-bottom: 4px;">${assetName}</div>`;

      // Show the specific value being hovered
      if (seriesName === "Initial Capacity") {
        html += `<div style="margin: 2px 0;"><span style="display:inline-block; margin-right:4px; border-radius:2px; width:8px; height:8px; background-color: #8A8A8A;"></span><strong>Initial Capacity: ${assetYearData.initial_capacity.toFixed(1)} MW</strong></div>`;
      } else if (seriesName === "Investments") {
        html += `<div style="margin: 2px 0;"><span style="display:inline-block; margin-right:4px; border-radius:2px; width:8px; height:8px; background-image: repeating-linear-gradient(-45deg, #43A047 0, #43A047 1px, transparent 1px, transparent 2px);"></span><strong>Investments: ${assetYearData.investment.toFixed(1)} MW</strong></div>`;
      } else if (seriesName === "Decommissions") {
        html += `<div style="margin: 2px 0;"><span style="display:inline-block; margin-right:4px; border-radius:2px; width:8px; height:8px; background-image: repeating-linear-gradient(-45deg, #D32F2F 0, #D32F2F 1px, transparent 1px, transparent 2px);"></span><strong>Decommissions: ${assetYearData.decommission.toFixed(1)} MW</strong></div>`;
      } else {
        // Final capacity
        html += `<div style="margin: 2px 0;"><span style="display:inline-block; margin-right:4px; border-radius:2px; width:8px; height:8px; background-color: ${assetColors[assets.indexOf(assetName) % assetColors.length]};"></span><strong>Final Capacity: ${assetYearData.final_capacity.toFixed(1)} MW</strong></div>`;
      }

      // Show other values as context
      html += `<div style="margin-top: 8px; padding-top: 4px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">`;
      html += `<div>Initial: ${assetYearData.initial_capacity.toFixed(1)} MW</div>`;
      if (assetYearData.investment > 0) {
        html += `<div>Investments: +${assetYearData.investment.toFixed(1)} MW</div>`;
      }
      if (assetYearData.decommission > 0) {
        html += `<div>Decommissions: -${assetYearData.decommission.toFixed(1)} MW</div>`;
      }
      html += `<div>Final: ${assetYearData.final_capacity.toFixed(1)} MW</div>`;
      html += `</div>`;

      return html;
    },
  };

  // Create legend data with general items and asset names
  const legendData = [
    "Initial Capacity",
    "Investments",
    "Decommissions",
    ...assets.map((asset) => asset),
  ];

  const option: EChartsOption = {
    tooltip,
    legend: {
      data: legendData,
      bottom: "0%",
      type: "scroll",
    },
    dataZoom: [
      {
        bottom: "40px",
        orient: "horizontal",
        minSpan:
          validYears.length > 0 ? Math.floor(100 / validYears.length) - 1 : 10,
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
    xAxis: {
      type: "category",
      data: validYears,
      name: "Year",
      nameLocation: "middle",
      nameTextStyle: { padding: [10, 0, 0, 0] },
    },
    yAxis: {
      type: "value",
      name: "Capacity (MW)",
      axisLabel: { formatter: "{value}" },
    },
    grid: {
      left: "60px",
      right: "40px",
      top: "30px",
      bottom: "90px",
      containLabel: true,
    },
    series,
    barCategoryGap: "10%", // Space between different asset groups
    barGap: "1%", // gap between the two bar groups within each asset (left group and right group)
  };

  return option;
};

interface CapacityProps {
  graphId: string;
}

const Capacity: React.FC<CapacityProps> = ({ graphId }) => {
  const { mustGetGraph, updateGraph } = useVisualizationStore();

  const graph = mustGetGraph(graphId);

=======
>>>>>>> main
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);

  const dbFilePath = graph.graphDBFilePath!;

  // Initialize component with default title
  useEffect(() => {
    updateGraph(graphId, { title: "Capacity by Year - All Assets" });
  }, []);

  // Database change handler: reset state and reload assets
  useEffect(() => {
    console.log("DB CHANGED");
    // Reset error and chart state
    setErrorData(null);
    setChartOptions(null);

    // Generate chart immediately when DB changes
    generateChart();
  }, [dbFilePath, graph.lastApplyTimestamp]);

  const generateChart = async () => {
    console.log("GENERATING GRAPH FOR ALL ASSETS");

    // Clear previous error and old chart
    setErrorData(null);
    setChartOptions(null);

    try {
      console.log("GENERATING GRAPH for all assets");
      const option = await capacityGraphAllAssets(
        dbFilePath,
        graph.filtersByCategory,
        graph.breakdownNodes,
      );
      setChartOptions(option);
    } catch (err) {
      console.error("Error fetching or processing data for chart:", err);
      setErrorData(`Error fetching or processing data for chart: ${err}`);
      setChartOptions(null);
    }
  };

  return (
    <Stack>
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
          <Text c="dimmed">Loading chart...</Text>
        </Flex>
      )}
    </Stack>
  );
};

export default Capacity;
