import React from "react";
import { Stack, Card, Text, Group, ActionIcon, Tooltip } from "@mantine/core";
import { IconDatabase, IconTrash } from "@tabler/icons-react";
import UploadButton from "./UploadButton";
import useVisualizationStore from "../store/visualizationStore";
import StateVisualizer from "./StateVisualizer";

const DatabaseList: React.FC = () => {
  const { databases, removeDatabase } = useVisualizationStore();
  return (
    <Stack gap="md">
      <UploadButton />

      {/* Empty state with user guidance */}
      {databases.length === 0 ? (
        <Card withBorder radius="md" p="md">
          <Text size="sm" c="dimmed" ta="center">
            No databases loaded. Upload a .duckdb file to get started.
          </Text>
        </Card>
      ) : (
        <>
          {/* Database list header with count indicator */}
          <Text size="sm" fw={500}>
            Loaded Databases ({databases.length})
          </Text>
          {databases.map((db) => (
            <Card key={db} withBorder radius="sm" p="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                  <IconDatabase
                    size={16}
                    color="var(--mantine-color-blue-6)"
                    style={{ flexShrink: 0 }}
                  />
                  <Tooltip label={`${db}`}>
                    <Text
                      size="sm"
                      lineClamp={3}
                      style={{
                        cursor: "help",
                        color: "var(--mantine-color-blue-6)",
                        fontWeight: 600,
                        fontSize: "var(--mantine-font-size-xs)",
                        // textAlign: "center",
                        backgroundColor: "var(--mantine-color-blue-0)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        width: "160px",
                      }}
                    >
                      {db
                        .split(/[\\/]/)
                        .pop()
                        ?.replace(/\.duckdb$/, "") ?? "PLACEHOLDER"}
                    </Text>
                  </Tooltip>
                </Group>

                <Tooltip label="Remove database" position="top">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    style={{
                      width: 32,
                      height: 32,
                      minWidth: 32,
                      minHeight: 32,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDatabase(db);
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Card>
          ))}
        </>
      )}

      <StateVisualizer />
    </Stack>
  );
};

export default DatabaseList;
