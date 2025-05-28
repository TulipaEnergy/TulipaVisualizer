import ResolutionSelector from "./ResolutionSelector";
import TimeFramePicker from "./TimeFramePicker";
import useVisualizationStore from "../store/visualizationStore";
import { Paper, Group, Divider, Text, Title } from "@mantine/core";

const Toolbar: React.FC = () => {
  const { isLoading, hasAnyDatabase } = useVisualizationStore();

  return (
    <Paper p="md" radius="md" withBorder shadow="xs">
      <Group wrap="wrap" justify="space-between" gap="md" align="center">
        <Title order={2}>Tulipa Energy Visualizer</Title>

        {hasAnyDatabase() && (
          <Group wrap="wrap" gap="md" align="center">
            <ResolutionSelector />

            <Divider orientation="vertical" />
            <TimeFramePicker />

            {isLoading && (
              <>
                <Divider orientation="vertical" />
                <Text size="sm">Loading...</Text>
              </>
            )}
          </Group>
        )}
      </Group>
    </Paper>
  );
};

export default Toolbar;
