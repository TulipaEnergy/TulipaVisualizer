import {
  Text,
  Container,
  Loader,
  Paper,
  Stack,
  Select,
  Group,
  Switch,
} from "@mantine/core";
import { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import {
  getTransportationPriceDurationSeries,
  TransportationPriceDurationSeriesRow,
  getTransportationYears,
  getTransportationCarriers,
} from "../../services/transportPriceQuery";
import useVisualizationStore from "../../store/visualizationStore";
import { Resolution } from "../../types/resolution";

interface TransportationPricesDurationSeriesProps {
  graphId: string;
}

const TransportationPricesDurationSeries: React.FC<
  TransportationPricesDurationSeriesProps
> = ({ graphId }) => {
  const { getGraphDatabase, updateGraph } = useVisualizationStore();
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [chartOptions, setChartOptions] = useState<any>(null);
  const [resolution, setResolution] = useState<Resolution>(Resolution.Hours);
  const [year, setYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean>(false);

  const dbPath = getGraphDatabase(graphId);

  useEffect(() => {
    updateGraph(graphId, {
      title: "Assets Transportation Price Duration Series",
    });
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      try {
        const years = await getTransportationYears(dbPath!);
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
    const fetchCarriers = async () => {
      try {
        const carriers = await getTransportationCarriers(dbPath!);
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
    const fetchData = async () => {
      setErrorData(null);
      if (!dbPath) {
        setErrorData("No database selected.");
        return;
      }

      if (year === null) {
        setChartOptions(null);
        setLoadingData(false);
        return;
      }

      if (carrier === null) {
        setChartOptions(null);
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        if (year === null || carrier === null) return;
        var data: TransportationPriceDurationSeriesRow[] =
          await getTransportationPriceDurationSeries(
            dbPath,
            year,
            carrier,
            resolution,
          );

        if (checked == true) {
          data = data.sort((a, b) => {
            return b.y_axis - a.y_axis;
          });
        }
        const groupedByRoute = new Map<
          string,
          { name: string; value: [number, number, number] }[]
        >();
        const currXEndAsset = new Map<string, number>();
        for (const d of data) {
          var currXEnd = currXEndAsset.get(d.route) || 0;
          const key = `${d.milestone_year}, ${resolution} ${d.global_start}-${d.global_end}`;
          const width = Number(d.global_end - d.global_start);
          const xEnd = currXEnd + width;
          currXEnd = currXEnd + width;
          currXEndAsset.set(d.route, currXEnd);

          const entry = {
            name: `${d.route} (${key})`,
            value: [xEnd, width, d.y_axis] as [number, number, number],
          };
          if (!groupedByRoute.has(d.route)) {
            groupedByRoute.set(d.route, []);
          }
          groupedByRoute.get(d.route)!.push(entry);
        }

        const chartOption = {
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
          series: Array.from(groupedByRoute.entries()).map(([asset, data]) => ({
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

        setChartOptions(chartOption);
      } catch (err) {
        setErrorData("Failed to load transportation prices.");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [dbPath, resolution, year, carrier, checked]);

  if (loadingData && year !== null && carrier !== null) {
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
          value={carrier || ""}
          onChange={(val) => {
            if (!val) return;
            if (val === carrier) {
              return;
            }
            setCarrier(val);
          }}
          data={availableCarriers.map((c) => ({
            value: c,
            label: c,
          }))}
          size="xs"
          style={{ maxWidth: 160 }}
          placeholder="Select carrier"
          disabled={availableCarriers.length === 0}
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
          <Text>No chart data available.</Text>
        </Paper>
      )}
    </Stack>
  );
};

export default TransportationPricesDurationSeries;
