import UploadButton from "./UploadButton";
import ResolutionSelector from "./ResolutionSelector";
import TimeFramePicker from "./TimeFramePicker";
import useVisualizationStore from "../store/visualizationStore";
import { Paper, Group, Divider, Text, Badge } from "@mantine/core";

const Toolbar: React.FC = () => {
  const { dbFilePath, isLoading } = useVisualizationStore();

  return (
    <Paper p="md" radius="md" withBorder shadow="xs">
      <Group wrap="wrap" justify="flex-start" gap="md">
        <UploadButton />

        {dbFilePath && (
          <>
            <Divider orientation="vertical" />
            <ResolutionSelector />

            <Divider orientation="vertical" />
            <TimeFramePicker />

            <Divider orientation="vertical" />
            <Group>
              <Text size="sm" fw={500}>
                Database:
              </Text>
              <Badge variant="light" color="blue" title={dbFilePath}>
                {dbFilePath.split("/").pop()}
              </Badge>
            </Group>
          </>
        )}

        {isLoading && (
          <>
            <Divider orientation="vertical" />
            <Text size="sm">Loading...</Text>
          </>
        )}
      </Group>
    </Paper>
  );
};

export default Toolbar;
