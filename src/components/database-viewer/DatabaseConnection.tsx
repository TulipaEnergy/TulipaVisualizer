import { Paper, Text } from "@mantine/core";

interface DatabaseConnectionProps {
  dbFilePath: string | null;
}

export const DatabaseConnection = ({ dbFilePath }: DatabaseConnectionProps) => {
  return (
    <Paper p="md" radius="md" withBorder shadow="sm">
      <Text fw={500} size="lg" mb="md">
        Database Connection
      </Text>
      {dbFilePath ? (
        <Text size="sm" c="dimmed">
          File: {dbFilePath}
        </Text>
      ) : (
        <Text size="sm" c="dimmed">
          No database file loaded. Please load a file from the toolbar.
        </Text>
      )}
    </Paper>
  );
};
