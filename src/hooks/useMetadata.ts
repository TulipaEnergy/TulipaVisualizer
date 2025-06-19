import { useState, useEffect } from "react";
import { ChartType } from "../store/visualizationStore";
import { hasMetadata } from "../services/metadata";
import { useChartTypes } from "./useChartTypes";

export type MetadataShowStatus = "Hide" | "Disable" | "Enable";

/**
 * Custom hook that manages metadata show status based on database path and chart type
 * Extracted from GraphCard for better separation of concerns
 */
export const useMetadata = (dbFilePath: string | null, chartType: ChartType) => {
  const [enableMetadata, setEnableMetadata] = useState<MetadataShowStatus>("Hide");
  const { supportsMetadata } = useChartTypes();

  useEffect(() => {
    (async () => {
      if (!dbFilePath) {
        setEnableMetadata("Hide");
        return;
      }

      if (!supportsMetadata(chartType)) {
        setEnableMetadata("Hide");
        return;
      }

      if (!(await hasMetadata(dbFilePath))) {
        setEnableMetadata("Disable");
        return;
      }

      setEnableMetadata("Enable");
    })();
  }, [dbFilePath, chartType, supportsMetadata]);

  return {
    enableMetadata,
    setEnableMetadata,
  };
}; 