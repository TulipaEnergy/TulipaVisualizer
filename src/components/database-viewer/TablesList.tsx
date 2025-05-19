import { Paper, Text, ScrollArea, Group, ActionIcon } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface TablesListProps {
  tables: string[];
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
  onShowSchema: (tableName: string) => void;
}

export const TablesList = ({
  tables,
  selectedTable,
  onTableSelect,
  onShowSchema,
}: TablesListProps) => {
  return (
    <Paper p="md" radius="md" withBorder shadow="sm" h="100%">
      <Text fw={500} size="lg" mb="md">
        Tables
      </Text>
      {tables.length > 0 ? (
        <ScrollArea h={300} type="auto" offsetScrollbars scrollbarSize={8}>
          {tables.map((tableName) => (
            <Group
              key={tableName}
              p="xs"
              style={{
                cursor: "pointer",
                backgroundColor:
                  selectedTable === tableName
                    ? "var(--mantine-color-blue-0)"
                    : "transparent",
                borderRadius: "4px",
                transition: "background-color 150ms ease",
                "&:hover": {
                  backgroundColor:
                    selectedTable === tableName
                      ? "var(--mantine-color-blue-1)"
                      : "var(--mantine-color-gray-0)",
                },
              }}
              onClick={() => onTableSelect(tableName)}
            >
              <Text size="sm" style={{ flex: 1 }} truncate>
                {tableName}
              </Text>
              <ActionIcon
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowSchema(tableName);
                }}
                title="Show schema"
              >
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Group>
          ))}
        </ScrollArea>
      ) : (
        <Text size="sm" c="dimmed">
          No tables found. Please select a valid DuckDB file from the toolbar.
        </Text>
      )}
    </Paper>
  );
};
