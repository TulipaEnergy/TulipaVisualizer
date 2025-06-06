import { Resolution } from "../types/resolution";
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
          { value: "hours", label: "Hour" },
          { value: "days", label: "Day" },
          { value: "weeks", label: "Week" },
          { value: "months", label: "Month" },
        ]}
        size="sm"
      />
    </Group>
  );
};

export default ResolutionSelector;
