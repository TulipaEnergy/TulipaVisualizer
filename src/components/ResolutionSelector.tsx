import { Resolution } from "../store/visualizationStore";
import useVisualizationStore from "../store/visualizationStore";
import { Group, Text, Select } from "@mantine/core";

interface ResolutionSelectorProps {
  className?: string;
}

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  className,
}) => {
  const { resolution, setResolution } = useVisualizationStore();

  const handleChange = (value: string | null) => {
    if (value) {
      setResolution(value as Resolution);
    }
  };

  return (
    <Group className={className} align="center">
      <Text size="sm" fw={500}>
        Resolution:
      </Text>
      <Select
        value={resolution}
        onChange={handleChange}
        data={[
          { value: "minute", label: "Minute" },
          { value: "hour", label: "Hour" },
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        size="sm"
      />
    </Group>
  );
};

export default ResolutionSelector;
