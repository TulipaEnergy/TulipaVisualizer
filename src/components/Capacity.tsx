import { useEffect, useState } from "react";
import { Select, NumberInput } from "@mantine/core";
import useVisualization from "../hooks/useVisualization";
import {
  fetchAssets,
  fetchMinYear,
  fetchMaxYear,
} from "../services/capacityQuery";
import { EChartsOption } from "echarts";
import { fetchCapacityData } from "../services/capacityQuery";

export const capacityGraph = async (
  asset?: string,
  startYear?: number,
  endYear?: number,
): Promise<EChartsOption> => {
  // If any of the required inputs is missing, show a “no selection” placeholder
  if (!asset || startYear == null || endYear == null) {
    let missing = "";
    if (!asset) missing = "asset";
    else if (startYear == null) missing = "start year";
    else missing = "end year";

    return {
      title: {
        text: `No ${missing} selected`,
        left: "center",
      },
      tooltip: { show: false },
      xAxis: { show: false },
      yAxis: { show: false },
      series: [],
    };
  }

  // Otherwise fetch the data and build a bar chart
  const data = await fetchCapacityData(asset, startYear, endYear);
  const years = data.map((d) => d.year.toString());
  const capacities = data.map((d) => d.installed_capacity);

  return {
    title: {
      text: `${asset} capacity (${startYear}-${endYear})`,
      left: "center",
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: years,
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      name: "Installed Capacity",
    },
    dataZoom: [{ type: "slider", start: 0, end: 100 }],
    series: [
      {
        name: "Installed Capacity",
        type: "bar",
        data: capacities,
      },
    ],
  };
};

interface GraphCardProps {
  graphId: string;
  dbFile: string;
}

const Capacity: React.FC<GraphCardProps> = ({ graphId, dbFile }) => {
  const { graphs, updateGraphConfig } = useVisualization();

  const graph = graphs.find((g) => g.id === graphId);

  const [assets, setAssets] = useState<string[]>([]);
  const [localStart, setLocalStart] = useState<number | string | "">(
    graph?.startYear ?? "",
  );
  const [localEnd, setLocalEnd] = useState<number | string | "">(
    graph?.endYear ?? "",
  );

  useEffect(() => {
    if (graph?.startYear != null) setLocalStart(graph.startYear);
    if (graph?.endYear != null) setLocalEnd(graph.endYear);
  }, [graph?.startYear, graph?.endYear, dbFile]);

  useEffect(() => {
    if (graph?.type !== "capacity") {
      setAssets([]);
      return;
    }
    const loadAssets = async () => {
      try {
        const list = await fetchAssets();
        setAssets(list);
      } catch (err) {
        console.error("Could not load assets:", err);
      }
    };
    loadAssets();
  }, [graph?.type, dbFile]);

  const handleAssetChange = async (value: string | null) => {
    if (graph && value) {
      const minYear = await fetchMinYear(value);
      const maxYear = await fetchMaxYear(value);
      setLocalStart(minYear);
      setLocalEnd(maxYear);
      updateGraphConfig(graph.id, {
        asset: value,
        startYear: minYear,
        endYear: maxYear,
      });
    }
  };

  const handleLocalStartChange = async (v: string | number | null) => {
    const newVal = v === null ? "" : v;
    setLocalStart(newVal);

    if (typeof newVal === "number" && graph) {
      const minYear = await fetchMinYear(graph.asset);
      // only commit if within [minYear, graph.endYear]
      if (
        newVal >= minYear &&
        (graph.endYear == null || newVal <= graph.endYear)
      ) {
        updateGraphConfig(graph.id, { startYear: newVal });
      }
    }
  };

  const handleLocalEndChange = async (v: string | number | null) => {
    var newVal = v === null ? "" : v;
    setLocalEnd(newVal);

    if (
      typeof newVal === "number" &&
      graph &&
      (graph.startYear == null || newVal >= graph.startYear)
    ) {
      const minYear = await fetchMinYear(graph.asset);
      const endYear = await fetchMaxYear(graph.asset);
      if (newVal < minYear) newVal = minYear;
      if (newVal > endYear) newVal = endYear;
      setLocalEnd(newVal);
      updateGraphConfig(graph.id, { endYear: newVal });
    }
  };

  const handleStartBlur = async () => {
    const parsed = parseInt(localStart as string, 10);
    if (isNaN(parsed) || !graph) {
      setLocalStart(graph?.startYear ?? ""); // reset back to last valid from the store
      return;
    }
    const minYear = await fetchMinYear(graph.asset);
    let clamped = Math.max(parsed, minYear);
    if (graph.endYear != null) {
      clamped = Math.min(clamped, graph.endYear);
    }

    setLocalStart(clamped);
    updateGraphConfig(graph.id, { startYear: clamped });
  };

  const handleEndBlur = () => {
    if (typeof localEnd === "number") return;
    const parsed = parseInt(localEnd as string, 10);
    if (
      !isNaN(parsed) &&
      graph &&
      (graph.startYear == null || parsed >= graph.startYear)
    ) {
      updateGraphConfig(graph.id, { endYear: parsed });
    }
  };

  return (
    <>
      {graph?.type === "capacity" && (
        <Select
          value={graph.asset || ""}
          onChange={handleAssetChange}
          data={assets.map((a) => ({ value: a, label: a }))}
          placeholder={assets.length ? "Select asset" : ""}
          size="xs"
          style={{ width: 140 }}
        />
      )}

      {graph?.type === "capacity" && graph.asset != null && (
        <NumberInput
          placeholder="Start Year"
          value={localStart}
          onChange={handleLocalStartChange}
          onBlur={handleStartBlur}
          min={0}
          max={graph.endYear}
          step={1}
          size="xs"
        />
      )}

      {graph?.type === "capacity" && graph.asset != null && (
        <NumberInput
          placeholder="End Year"
          value={localEnd}
          onChange={handleLocalEndChange}
          onBlur={handleEndBlur}
          min={graph.startYear}
          max={3000}
          step={1}
          size="xs"
        />
      )}
    </>
  );
};

export default Capacity;
