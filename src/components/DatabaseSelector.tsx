import React from "react";
import { Select, Group } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import useVisualizationStore from "../store/visualizationStore";

/**
 * Database selection dropdown component for individual graph configurations.
 * Allows users to assign a specific database to a graph for visualization.
 */
interface DatabaseSelectorProps {
  /** Unique identifier of the graph that will use the selected database */
  graphId: string;
  /** Size variant for the select input to match surrounding UI elements */
  size: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * Dropdown selector that connects a specific graph to a loaded database.
 * Displays friendly database names (without paths and extensions) while
 * maintaining the full file path for backend operations. Updates the graph's
 * database association when selection changes.
 */
const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  graphId,
  size,
}) => {
  const { databases, setGraphDatabase, getGraphDatabase } =
    useVisualizationStore();

  // Transform database paths into select options for UI rendering
  const selectData = [
    ...databases.map((db) => ({
      value: db,
      label:
        db
          // Extract filename from full path - handles both Windows (\) and Unix (/) separators
          // Examples: "/path/to/file.duckdb" → "file.duckdb", "C:\folder\file.duckdb" → "file.duckdb"
          .split(/[\\/]/)
          .pop()
          // Remove .duckdb extension for cleaner UI display
          // Examples: "energy_model.duckdb" → "energy_model", "data.duckdb" → "data"
          ?.replace(/\.duckdb$/, "") ?? "PLACEHOLDER",
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
        style={{ width: "250px" }}
        comboboxProps={{ withinPortal: false }}
      />
    </Group>
  );
};

export default DatabaseSelector;
