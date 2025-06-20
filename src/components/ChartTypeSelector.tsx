import { Select } from "@mantine/core";
import { ChartType } from "../store/visualizationStore";
import { useChartTypes } from "../hooks/useChartTypes";

/**
 * Chart type selection dropdown for switching between different visualization types.
 * Supports all available energy model chart types including KPIs, geographic views,
 * and database browser.
 */
interface ChartTypeSelectorProps {
  /** Currently selected chart type */
  value: ChartType;
  /** Callback function when user selects a different chart type */
  onChange: (value: string | null) => void;
  /** Size variant for the select input, defaults to "sm" */
  size?: string;
}

/**
 * Dropdown component for selecting chart visualization types.
 * Extracted from GraphCard for better separation of concerns and reusability.
 * Dynamically loads available chart types and handles type switching.
 */
const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  value,
  onChange,
  size = "sm",
}) => {
  const { chartTypes } = useChartTypes();

  return (
    <Select
      value={value}
      onChange={onChange}
      data={chartTypes}
      placeholder="Choose a type"
      size={size}
      style={{
        width: "fit-content",
      }}
      styles={{
        input: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      }}
    />
  );
};

export default ChartTypeSelector;
