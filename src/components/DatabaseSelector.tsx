import React from "react";
import { Select, Group, Badge, Tooltip } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import useVisualizationStore from "../store/visualizationStore";

interface DatabaseSelectorProps {
  graphId: string;
  size: "xs" | "sm" | "md" | "lg" | "xl";
  showBadge: boolean;
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  graphId,
  size,
  showBadge,
}) => {
  const { databases, setGraphDatabase, getGraphDatabase } =
    useVisualizationStore();

  // Transform database paths into select options for UI rendering
  const selectData = [
    ...databases.map((db) => ({
      value: db,
      label: db,
    })),
  ];

  const handleSelectionChange = (value: string | null) => {
    if (value) {
      setGraphDatabase(graphId, value);
    }
  };

  return (
    <Group gap="xs" align="center" wrap="nowrap">
      <IconDatabase size={14} color="var(--mantine-color-gray-6)" />

      <Select
        size={size}
        data={selectData}
        value={getGraphDatabase(graphId)}
        onChange={handleSelectionChange}
        placeholder="Select database"
        style={{ minWidth: "150px" }}
        comboboxProps={{ withinPortal: false }}
      />

      {/* Active database indicator with shortened filename display */}
      {showBadge && getGraphDatabase(graphId) && (
        <Tooltip
          label={`Active: ${getGraphDatabase(graphId)}`}
          withinPortal={false}
        >
          <Badge
            size="xs"
            color="blue"
            variant="filled"
            style={{ cursor: "help" }}
          >
            {getGraphDatabase(graphId)!
              .split(/[\\/]/)
              .pop()
              ?.replace(/\.duckdb$/, "") ?? "PLACEHOLDER"}
          </Badge>
        </Tooltip>
      )}
    </Group>
  );
};

export default DatabaseSelector;
