import { ChartType } from "../store/visualizationStore";

export interface ChartTypeOption {
  value: ChartType;
  label: string;
}

/**
 * Custom hook that provides chart type options and related functionality
 * Extracted from GraphCard for better separation of concerns
 */
export const useChartTypes = () => {
  const chartTypes: ChartTypeOption[] = [
    { value: "capacity", label: "Asset capacity" },
    { value: "system-costs", label: "System Costs" },
    { value: "production-prices-duration-series", label: "Production Prices" },
    { value: "storage-prices", label: "Storage Prices" },
    { value: "transportation-prices", label: "Transportation Prices" },
    { value: "geo-imports-exports", label: "Geographical Imports/Exports" },
    { value: "residual-load", label: "Residual Load" },
    { value: "database", label: "SQL explorer" },
  ];

  /**
   * Get chart types that support metadata features
   */
  const getChartsWithMetaFeatures = (): ChartType[] => [
    "residual-load",
    "system-costs",
    "production-prices-duration-series",
    "storage-prices",
  ];

  /**
   * Check if a chart type supports metadata features
   */
  const supportsMetadata = (chartType: ChartType): boolean => {
    return getChartsWithMetaFeatures().includes(chartType);
  };

  /**
   * Check if a chart type should be full width by default
   */
  const isFullWidthChart = (chartType: ChartType): boolean => {
    return chartType === "database";
  };

  /**
   * Get the default height for a chart type
   */
  const getDefaultHeight = (chartType: ChartType): number => {
    return chartType === "database" ? 1150 : 400;
  };

  return {
    chartTypes,
    supportsMetadata,
    isFullWidthChart,
    getDefaultHeight,
    getChartsWithMetaFeatures,
  };
};
