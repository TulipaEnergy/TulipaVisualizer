import { ChartType } from "../../store/visualizationStore";

// Helper function to generate dates for time series
const generateDateSeries = (
  count: number,
  startDate: Date = new Date(2023, 0, 1),
): string[] => {
  return Array(count)
    .fill(0)
    .map((_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date.toISOString().split("T")[0];
    });
};

// Helper function to generate realistic time series data
const generateTimeSeries = (
  count: number,
  baseValue: number = 100,
  volatility: number = 0.1,
): number[] => {
  const series: number[] = [];
  let value = baseValue;

  for (let i = 0; i < count; i++) {
    // Add randomness with trend and seasonal components
    const trend = i * baseValue * 0.001; // Slight upward trend
    const seasonal = Math.sin(i / 10) * baseValue * 0.1; // Seasonal pattern
    const random = (Math.random() - 0.5) * 2 * baseValue * volatility; // Random noise

    value = baseValue + trend + seasonal + random;
    value = Math.max(0, value); // Ensure no negative values
    series.push(Math.round(value * 100) / 100); // Round to 2 decimal places
  }

  return series;
};

// Helper function to generate realistic pie data
const generatePieData = (count: number): { value: number; name: string }[] => {
  const categories = [
    "Network",
    "Storage",
    "Compute",
    "Memory",
    "I/O",
    "Database",
    "Cache",
    "API",
    "Authentication",
    "UI",
    "Background Tasks",
    "Search",
    "Analytics",
    "Logging",
    "Notifications",
  ];

  // Take a subset if needed
  const usedCategories = categories.slice(0, count);

  return usedCategories.map((cat) => {
    // Generate values that sum to a reasonable total
    const value = Math.round(100 + Math.random() * 900);
    return { value, name: cat };
  });
};

// Helper function to generate scatter plot data with correlation
const generateScatterData = (count: number): [number, number][] => {
  const data: [number, number][] = [];

  for (let i = 0; i < count; i++) {
    // Create correlated data with some noise
    const x = i / 10 + (Math.random() - 0.5) * 2;

    // Different correlation patterns
    let y;
    if (i < count / 3) {
      // Positive correlation
      y = x * 0.8 + (Math.random() - 0.5) * 2;
    } else if (i < (count * 2) / 3) {
      // Negative correlation
      y = -x * 0.5 + 10 + (Math.random() - 0.5) * 2;
    } else {
      // Cluster pattern
      const clusterX = (i % 3) * 5;
      const clusterY = (Math.floor(i / 10) % 3) * 5;
      y = clusterY + (Math.random() - 0.5) * 2;
      data.push([clusterX + (Math.random() - 0.5) * 2, y]);
      continue;
    }

    data.push([x, y]);
  }

  return data;
};

// Main function to get default chart data
export const getDefaultChartData = (type: ChartType) => {
  const DATA_POINTS = 100; // Number of data points to generate
  const dateLabels = generateDateSeries(DATA_POINTS);

  switch (type) {
    case "bar":
    case "line": {
      const seriesData = generateTimeSeries(DATA_POINTS);
      return {
        title: {
          text: `${type.charAt(0).toUpperCase() + type.slice(1)} Chart Demo`,
          left: "center",
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: dateLabels,
          axisLabel: {
            rotate: 45,
            formatter: (value: string) => {
              return value.substring(5); // Only show MM-DD
            },
          },
        },
        yAxis: { type: "value" },
        dataZoom: [
          {
            type: "slider",
            start: 0,
            end: 20, // Show first 20% by default
          },
        ],
        series: [
          {
            data: seriesData,
            type: type,
            name: "Resource Usage",
            smooth: type === "line" ? 0.2 : undefined,
          },
        ],
      };
    }

    case "area": {
      const seriesData = generateTimeSeries(DATA_POINTS);
      return {
        title: {
          text: "Area Chart Demo",
          left: "center",
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: dateLabels,
          axisLabel: {
            rotate: 45,
            formatter: (value: string) => {
              return value.substring(5); // Only show MM-DD
            },
          },
        },
        yAxis: { type: "value" },
        dataZoom: [
          {
            type: "slider",
            start: 0,
            end: 20, // Show first 20% by default
          },
        ],
        series: [
          {
            data: seriesData,
            type: "line",
            name: "Resource Usage",
            smooth: 0.2,
            areaStyle: {},
          },
        ],
      };
    }

    case "pie": {
      const pieData = generatePieData(12); // Using 12 categories
      return {
        title: {
          text: "Resource Allocation",
          left: "center",
        },
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b}: {c} ({d}%)",
        },
        legend: {
          orient: "vertical",
          left: "left",
          data: pieData.map((item) => item.name),
        },
        series: [
          {
            name: "Allocation",
            type: "pie",
            radius: ["30%", "70%"], // Donut chart looks better with many categories
            avoidLabelOverlap: true,
            itemStyle: {
              borderRadius: 10,
            },
            label: {
              formatter: "{b}: {d}%",
            },
            data: pieData,
          },
        ],
      };
    }

    case "scatter": {
      const scatterData = generateScatterData(DATA_POINTS);
      return {
        title: {
          text: "Performance Correlation",
          left: "center",
        },
        tooltip: {
          trigger: "item",
          formatter: (params: any) => {
            return `(${params.data[0].toFixed(2)}, ${params.data[1].toFixed(2)})`;
          },
        },
        xAxis: {
          type: "value",
          name: "CPU Utilization",
          nameLocation: "middle",
          nameGap: 30,
        },
        yAxis: {
          type: "value",
          name: "Response Time (ms)",
          nameLocation: "middle",
          nameGap: 30,
        },
        series: [
          {
            symbolSize: 10,
            data: scatterData,
            type: "scatter",
            name: "Data Point",
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(0, 0, 0, 0.3)",
              },
            },
          },
        ],
      };
    }

    case "database": {
      return {
        title: {
          text: "Database Explorer",
          left: "center",
        },
        // Empty chart options as we'll render DatabaseViewer component instead
        series: [],
      };
    }

    default:
      return {};
  }
};
