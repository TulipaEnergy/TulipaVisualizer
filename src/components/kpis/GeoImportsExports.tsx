import { useEffect, useState, useRef } from "react";
import {
  Select,
  Stack,
  Paper,
  Text,
  Container,
  Group,
  Flex,
  Grid,
  Card,
} from "@mantine/core";
import * as echarts from "echarts";
import useVisualizationStore from "../../store/visualizationStore";
import {
  getEnergyFlowData,
  getAvailableYears,
  getGeoJSONName,
} from "../../services/energyFlowQuery";
import {
  EnergyFlowOptions,
  CountryEnergyFlow,
} from "../../types/GeoEnergyFlow";
import { readJSON } from "../../gateway/io";

interface EnergyFlowProps {
  graphId: string;
}

const EnergyFlow: React.FC<EnergyFlowProps> = ({ graphId }) => {
  const { mustGetGraph, updateGraph } = useVisualizationStore();

  const graph = mustGetGraph(graphId);

  // State management for geographic visualization
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [energyData, setEnergyData] = useState<CountryEnergyFlow[]>([]);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [worldMapLoaded, setWorldMapLoaded] = useState<boolean>(false);
  const [regionalMapLoaded, setRegionalMapLoaded] = useState<boolean>(false);

  // Chart instance management for proper cleanup and updates
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const dbFilePath = graph.graphDBFilePath!;

  useEffect(() => {
    updateGraph(graphId, { title: "Geographical explorer" });
  }, []);

  // Database change handler: reset state and reload available years
  useEffect(() => {
    console.log("ENERGY FLOW: DB CHANGED");
    // Reset visualization state
    setErrorData(null);
    setEnergyData([]);
    setAvailableYears([]);
    updateGraph(graphId, { options: null });

    // Load available years from database
    (async () => {
      try {
        setIsLoading(true);
        const years = await getAvailableYears(dbFilePath);
        setAvailableYears(years);
      } catch (err) {
        setErrorData(`Could not load available years: ${err}`);
        console.error("Could not load energy flow years:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dbFilePath]);

  // Chart data generation effect: loads and processes energy flow data
  useEffect(() => {
    (async () => {
      // Clear previous state
      setErrorData(null);
      setEnergyData([]);

      const selectedYear = (graph.options as EnergyFlowOptions)?.year;
      const categoryLevel =
        (graph.options as EnergyFlowOptions)?.categoryLevel ?? 1; // Default to countries

      if (!selectedYear) {
        setEnergyData([]);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch energy flow data with geographic aggregation
        const flowData = await getEnergyFlowData(
          dbFilePath,
          categoryLevel,
          selectedYear,
        );
        setEnergyData(flowData);
      } catch (err) {
        console.error("Error fetching energy flow data:", err);
        setErrorData(`Error fetching energy flow data: ${err}`);
        setEnergyData([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [graph.options]);

  useEffect(() => {
    const loadMaps = async () => {
      try {
        // Load world map for countries (level 1)
        const worldGeoJSON = await readJSON("assets/geo/world.geo.json");
        echarts.registerMap("world", worldGeoJSON);
        setWorldMapLoaded(true);
        console.log("World map registered successfully");

        // Load EU provinces map for regions (level 0)
        const euGeoJSON = await readJSON("assets/geo/eu_provinces.geo.json");
        // The EU provinces GeoJSON already uses 'name' as the property for ECharts
        // No need to modify the properties structure
        echarts.registerMap("eu-provinces", euGeoJSON);
        setRegionalMapLoaded(true);
        console.log("EU provinces map registered successfully");
      } catch (error) {
        console.error("Failed to load maps:", error);
        setErrorData(`Failed to load maps: ${error}`);
      }
    };

    loadMaps();
  }, []);

  useEffect(() => {
    const categoryLevel =
      (graph.options as EnergyFlowOptions)?.categoryLevel ?? 1;
    const isRegionalView = categoryLevel === 0;
    const mapLoaded = isRegionalView ? regionalMapLoaded : worldMapLoaded;

    if (!chartRef.current || !mapLoaded || energyData.length === 0) {
      return;
    }

    // Dispose previous chart instance to prevent memory leaks
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    // Initialize new chart with responsive configuration
    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // Transform energy data for ECharts geo visualization
    const chartMapData = energyData.map((item) => ({
      name: getGeoJSONName(item.countryName), // Use mapped name for GeoJSON compatibility
      value: item.totalExports - item.totalImports, // Net energy flow
    }));

    // Calculate dynamic color scale based on data range
    const values = chartMapData.map((d) => d.value);
    const minValue = values.length > 0 ? Math.min(...values) : -100;
    const maxValue = values.length > 0 ? Math.max(...values) : 100;

    // Configure map type and zoom level based on analysis scale
    let mapName = "world";
    let zoomLevel = 1.2;

    if (isRegionalView) {
      mapName = "eu-provinces";
      zoomLevel = 0.8; // Reduced zoom for broader EU view
    }

    // ECharts configuration with geographic visualization
    const mapOption = {
      backgroundColor: "transparent",
      title: {
        text: `Energy Flow - ${isRegionalView ? "EU Provinces" : "Country"} Level (${(graph.options as EnergyFlowOptions)?.year})`,
        left: "center",
        top: 20,
        textStyle: {
          fontSize: 16,
          fontWeight: "bold",
          color: "#333",
        },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#ccc",
        borderWidth: 1,
        textStyle: {
          color: "#333",
        },
        formatter: function (params: any) {
          // Find the region by mapped name (GeoJSON name)
          const region = energyData.find(
            (c) => getGeoJSONName(c.countryName) === params.name,
          );
          if (!region) {
            return `<div style="padding: 8px;"><strong>${params.name}</strong><br/>No energy flow data</div>`;
          }

          const netFlow = region.totalExports - region.totalImports;
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${region.countryName}</div>
              <div style="margin-bottom: 2px;">Total Imports: ${region.totalImports.toFixed(1)} TWh</div>
              <div style="margin-bottom: 2px;">Total Exports: ${region.totalExports.toFixed(1)} TWh</div>
              <div style="margin-bottom: 4px; color: ${netFlow > 0 ? "green" : netFlow < 0 ? "red" : "gray"};">
                Net Flow: ${netFlow > 0 ? "+" : ""}${netFlow.toFixed(1)} TWh
              </div>
              ${
                region.importBreakdown.length > 0
                  ? `
                <div style="margin-top: 4px; font-size: 12px; opacity: 0.8;">
                  Main import from: ${region.importBreakdown[0].partnerName} (${region.importBreakdown[0].amount.toFixed(1)} TWh)
                </div>
              `
                  : ""
              }
              ${
                region.exportBreakdown.length > 0
                  ? `
                <div style="font-size: 12px; opacity: 0.8;">
                  Main export to: ${region.exportBreakdown[0].partnerName} (${region.exportBreakdown[0].amount.toFixed(1)} TWh)
                </div>
              `
                  : ""
              }
            </div>
          `;
        },
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        text: ["Net Exporter", "Net Importer"],
        realtime: false,
        calculable: true,
        inRange: {
          color: ["#d73027", "#fee08b", "#ffffbf", "#e0f3f8", "#2166ac"],
        },
        textStyle: {
          color: "#333",
        },
        orient: "vertical",
        left: "left",
        top: "bottom",
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: "cubicInOut" as const,
      series: [
        {
          name: "Energy Flow",
          type: "map",
          map: mapName,
          roam: true,
          zoom: zoomLevel,
          data: chartMapData,
          emphasis: {
            itemStyle: {
              areaColor: "#ffa726",
              borderColor: "#333",
              borderWidth: 2,
            },
          },
          itemStyle: {
            borderColor: "#333",
            borderWidth: 0.5,
            areaColor: "#eee",
          },
          animation: true,
          animationDuration: 1000,
          animationEasing: "cubicInOut" as const,
        },
      ],
    };

    chart.setOption(mapOption, true);

    // Handle resize using ResizeObserver to detect container size changes
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };

    // Use ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartRef.current) {
      resizeObserver.observe(chartRef.current);
    }

    // Also listen for window resize as fallback
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      if (chartRef.current) {
        resizeObserver.unobserve(chartRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [energyData, worldMapLoaded, regionalMapLoaded, graph.options]);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
      }
    };
  }, []);

  const handleYearChange = (value: string | null) => {
    const year = value ? parseInt(value, 10) : null;
    if (year != null) {
      updateGraph(graph.id, {
        options: {
          ...graph.options,
          year: year,
        } as EnergyFlowOptions,
      });
    }
  };

  const handleCategoryLevelChange = (value: string | null) => {
    const level = value ? parseInt(value, 10) : null;
    if (level != null) {
      updateGraph(graph.id, {
        options: {
          ...graph.options,
          categoryLevel: level,
        } as EnergyFlowOptions,
      });
    }
  };

  // Calculate summary statistics
  const totalImports = energyData.reduce(
    (sum, region) => sum + region.totalImports,
    0,
  );
  const totalExports = energyData.reduce(
    (sum, region) => sum + region.totalExports,
    0,
  );
  const netFlow = totalExports - totalImports;
  const isRegionalView =
    ((graph.options as EnergyFlowOptions)?.categoryLevel ?? 1) === 0;

  return (
    <Stack>
      <Group justify="space-between">
        <Group>
          <Select
            placeholder="Category Level"
            value={
              (graph.options as EnergyFlowOptions)?.categoryLevel?.toString() ||
              "1"
            }
            onChange={handleCategoryLevelChange}
            data={[
              { value: "0", label: "EU Provinces" },
              { value: "1", label: "Countries" },
            ]}
            size="xs"
            style={{ width: 140 }}
          />

          <Select
            placeholder="Select Year"
            value={
              (graph.options as EnergyFlowOptions)?.year?.toString() || null
            }
            onChange={handleYearChange}
            data={availableYears.map((year) => ({
              value: year.toString(),
              label: year.toString(),
            }))}
            size="xs"
            style={{ width: 140 }}
            disabled={availableYears.length === 0}
          />
        </Group>
      </Group>

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
      ) : isLoading ? (
        <Flex h="100%" justify="center" align="center" mih="500px">
          <Text c="dimmed">Loading energy flow data...</Text>
        </Flex>
      ) : energyData.length > 0 ? (
        <Stack gap="md">
          {/* Summary statistics */}
          <Group>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Imports
              </Text>
              <Text fw={500}>{totalImports.toFixed(1)} TWh</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Exports
              </Text>
              <Text fw={500}>{totalExports.toFixed(1)} TWh</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Net Flow
              </Text>
              <Text
                fw={500}
                c={netFlow > 0 ? "green" : netFlow < 0 ? "red" : "gray"}
              >
                {netFlow > 0 ? "+" : ""}
                {netFlow.toFixed(1)} TWh
              </Text>
            </Paper>
          </Group>

          {/* Map visualization */}
          <Paper
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{ height: "600px" }}
          >
            <div ref={chartRef} style={{ width: "100%", height: "100%" }} />
          </Paper>

          {/* Detailed breakdown */}
          <Paper p="md" withBorder radius="md">
            <Text size="lg" fw={600} mb="md">
              Detailed Energy Flow Analysis -{" "}
              {isRegionalView ? "EU Provinces" : "Country"} Level
            </Text>
            <Grid>
              {energyData.map((region) => {
                const regionNetFlow = region.totalExports - region.totalImports;
                return (
                  <Grid.Col
                    key={region.countryId}
                    span={{ base: 12, md: 6, lg: 4 }}
                  >
                    <Card withBorder shadow="sm" p="md" radius="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text fw={600} size="md">
                              {region.countryName}
                            </Text>
                            <Text size="sm" c="dimmed">
                              Net: {regionNetFlow > 0 ? "+" : ""}
                              {regionNetFlow.toFixed(1)} TWh
                            </Text>
                          </div>
                          <Text
                            size="xs"
                            fw={500}
                            c={
                              regionNetFlow > 0
                                ? "green"
                                : regionNetFlow < 0
                                  ? "red"
                                  : "gray"
                            }
                          >
                            {regionNetFlow > 0
                              ? "Exporter"
                              : regionNetFlow < 0
                                ? "Importer"
                                : "Balanced"}
                          </Text>
                        </Group>

                        {/* Import/Export Summary */}
                        <Group grow>
                          <Paper
                            p="xs"
                            withBorder
                            style={{ textAlign: "center" }}
                          >
                            <Text size="xs" c="dimmed">
                              Imports
                            </Text>
                            <Text fw={500} c="blue">
                              {region.totalImports.toFixed(1)} TWh
                            </Text>
                          </Paper>
                          <Paper
                            p="xs"
                            withBorder
                            style={{ textAlign: "center" }}
                          >
                            <Text size="xs" c="dimmed">
                              Exports
                            </Text>
                            <Text fw={500} c="red">
                              {region.totalExports.toFixed(1)} TWh
                            </Text>
                          </Paper>
                        </Group>

                        {/* Top Trading Partners */}
                        {(region.importBreakdown.length > 0 ||
                          region.exportBreakdown.length > 0) && (
                          <div>
                            <Text size="sm" fw={500} mb="xs">
                              Top Trading Partners
                            </Text>
                            {region.importBreakdown
                              .slice(0, 2)
                              .map((partner, idx) => (
                                <Text
                                  key={`import-${idx}`}
                                  size="xs"
                                  c="dimmed"
                                >
                                  Import from {partner.partnerName}:{" "}
                                  {partner.amount.toFixed(1)} TWh
                                </Text>
                              ))}
                            {region.exportBreakdown
                              .slice(0, 2)
                              .map((partner, idx) => (
                                <Text
                                  key={`export-${idx}`}
                                  size="xs"
                                  c="dimmed"
                                >
                                  Export to {partner.partnerName}:{" "}
                                  {partner.amount.toFixed(1)} TWh
                                </Text>
                              ))}
                          </div>
                        )}
                      </Stack>
                    </Card>
                  </Grid.Col>
                );
              })}
            </Grid>
          </Paper>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* Summary statistics - show zeros when no data */}
          <Group>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Imports
              </Text>
              <Text fw={500}>0.0 TWh</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Exports
              </Text>
              <Text fw={500}>0.0 TWh</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Net Flow
              </Text>
              <Text fw={500} c="gray">
                0.0 TWh
              </Text>
            </Paper>
          </Group>

          {/* Detailed breakdown section - show even when empty */}
          <Paper p="md" withBorder radius="md">
            <Text size="lg" fw={600} mb="md">
              Detailed Energy Flow Analysis -{" "}
              {isRegionalView ? "EU Provinces" : "Country"} Level
            </Text>
            <Flex h="200px" justify="center" align="center">
              <Text c="dimmed">
                {availableYears.length === 0
                  ? "No energy flow data available in this database"
                  : "Please select a year to view energy flow data"}
              </Text>
            </Flex>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default EnergyFlow;
