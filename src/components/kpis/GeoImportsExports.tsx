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
  Tooltip,
  Alert,
} from "@mantine/core";
import * as echarts from "echarts";
import useVisualizationStore, {
  GraphConfig,
} from "../../store/visualizationStore";
import {
  getEnergyFlowData,
  getAvailableYearsFlows,
} from "../../services/energyFlowQuery";
import {
  EnergyFlowOptions,
  CountryEnergyFlow,
} from "../../types/GeoEnergyFlow";
import { readJSON } from "../../gateway/io";
import { hasMetadata } from "../../services/metadata";
import { IconInfoCircle } from "@tabler/icons-react";

interface EnergyFlowProps {
  graphId: string;
}

const EnergyFlow: React.FC<EnergyFlowProps> = ({ graphId }) => {
  const { mustGetGraph, updateGraph } = useVisualizationStore();

  const graph: GraphConfig<EnergyFlowOptions> = mustGetGraph(
    graphId,
  ) as GraphConfig<EnergyFlowOptions>;

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [energyData, setEnergyData] = useState<CountryEnergyFlow[]>([]);
  const [errorData, setErrorData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [worldMapLoaded, setWorldMapLoaded] = useState<boolean>(false);
  const [regionalMapLoaded, setRegionalMapLoaded] = useState<boolean>(false);
  const [hasMetadataBool, setHasMetaDataBool] = useState<boolean>(false);

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const dbFilePath = graph.graphDBFilePath!;

  const icon = <IconInfoCircle />;

  useEffect(() => {
    updateGraph(graphId, { title: "Geographical explorer" });
  }, []);

  // Reset everything when database changes
  useEffect(() => {
    console.log("ENERGY FLOW: DB CHANGED");
    // Reset data
    setErrorData(null);
    setEnergyData([]);
    setAvailableYears([]);
    // Reset state
    updateGraph(graphId, { options: null });
    // Update hasMetaDataBool
    (async () => setHasMetaDataBool(await hasMetadata(dbFilePath)))();

    // Load available years from database
    (async () => {
      try {
        setIsLoading(true);
        const years = await getAvailableYearsFlows(dbFilePath);
        setAvailableYears(years);
      } catch (err) {
        setErrorData(`Could not load available years: ${err}`);
        console.error("Could not load energy flow years:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dbFilePath]);

  // Generate chart when options change
  useEffect(() => {
    (async () => {
      // Clear previous error and data
      setErrorData(null);
      setEnergyData([]);

      if (!graph.options || !graph.options.year) {
        return;
      } else if (typeof graph.options!.level === "undefined") {
        graph.options!.level = 1; // default country view
      }

      if (!(await hasMetadata(dbFilePath))) {
        // for added safety
        return;
      }

      try {
        setIsLoading(true);

        // Get energy flow data (simplified - no aggregation)
        const flowData = await getEnergyFlowData(dbFilePath, graph.options!);
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

  // Load map data when component mounts
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

  // Initialize and update chart
  useEffect(() => {
    const categoryLevel = graph.options?.level ?? 1;
    const isRegionalView = categoryLevel === 0;
    const mapLoaded = isRegionalView ? regionalMapLoaded : worldMapLoaded;

    if (!chartRef.current || !mapLoaded || energyData.length === 0) {
      return;
    }

    // Dispose previous chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    // Initialize new chart
    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    // Prepare map data for ECharts
    const chartMapData = energyData.map((item) => ({
      name: item.group, // Use mapped name for GeoJSON compatibility
      value: item.totalExport - item.totalImport, // Net energy flow
    }));

    // Calculate min/max for color scale
    const values = chartMapData.map((d) => d.value);
    const minValue = values.length > 0 ? Math.min(...values) : -100;
    const maxValue = values.length > 0 ? Math.max(...values) : 100;

    // Choose map based on category level
    let mapName = "world";
    let zoomLevel = 1.2;

    if (isRegionalView) {
      mapName = "eu-provinces";
      zoomLevel = 0.8; // Reduced zoom for broader EU view
    }
    // ECharts option
    const mapOption = {
      backgroundColor: "transparent",
      title: {
        text: `Energy Flow - ${isRegionalView ? "EU Provinces" : "Country"} Level (${graph.options?.year})`,
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
          const region = energyData.find((c) => c.group === params.name);
          if (!region) {
            return `<div style="padding: 8px;"><strong>${params.name}</strong><br/>No energy flow data</div>`;
          }

          const netFlow = region.totalExport - region.totalImport;
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${region.group}</div>
              <div style="margin-bottom: 2px;">Total Imports: ${region.totalImport.toFixed(1)} TWh</div>
              <div style="margin-bottom: 2px;">Total Exports: ${region.totalExport.toFixed(1)} TWh</div>
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
          selectedMode: false,
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
          level: level,
        } as EnergyFlowOptions,
      });
    }
  };

  // Calculate summary statistics
  const totalImport = energyData.reduce(
    (sum, region) => sum + region.totalImport,
    0,
  );
  const totalExport = energyData.reduce(
    (sum, region) => sum + region.totalExport,
    0,
  );
  const netFlow = totalExport - totalImport;
  const isRegionalView = (graph.options?.level ?? 1) === 0;

  return (
    <Stack
      style={{
        height: "100%",
      }}
    >
      <Group justify="space-between">
        <Group>
          <Select
            placeholder="Category Level"
            value={graph.options?.level?.toString() || "1"}
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
            value={graph.options?.year?.toString() || null}
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

      {!hasMetadataBool ? (
        <Container
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Tooltip
            label="Geographical features require a metadata-enriched DuckDB file. See User Guide for further details."
            withArrow={true}
          >
            <Alert
              variant="light"
              color="yellow"
              radius="xs"
              title="Metadata features disabled"
              icon={icon}
              style={{ maxWidth: "fit-content", padding: "10px" }}
            ></Alert>
          </Tooltip>
        </Container>
      ) : errorData ? (
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
      ) : energyData.length <= 0 ? (
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
      ) : (
        <Stack gap="md">
          {/* Summary statistics */}
          <Group>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Imports
              </Text>
              <Text fw={500}>{totalImport.toFixed(1)} TWh</Text>
            </Paper>
            <Paper p="xs" withBorder>
              <Text size="xs" c="dimmed">
                Total Exports
              </Text>
              <Text fw={500}>{totalExport.toFixed(1)} TWh</Text>
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
                const regionNetFlow = region.totalExport - region.totalImport;
                return (
                  <Grid.Col key={region.id} span={{ base: 12, md: 6, lg: 4 }}>
                    <Card withBorder shadow="sm" p="md" radius="md">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start">
                          <div>
                            <Text fw={600} size="md">
                              {region.group}
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
                              {region.totalImport.toFixed(1)} TWh
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
                              {region.totalExport.toFixed(1)} TWh
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
      )}
    </Stack>
  );
};

export default EnergyFlow;
