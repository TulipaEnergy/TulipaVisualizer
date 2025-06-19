import { Select } from "@mantine/core";
import { ChartType } from "../store/visualizationStore";
import { useChartTypes } from "../hooks/useChartTypes";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (value: string | null) => void;
  size?: string;
}

/**
 * Component that handles chart type selection
 * Extracted from GraphCard for better separation of concerns
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
