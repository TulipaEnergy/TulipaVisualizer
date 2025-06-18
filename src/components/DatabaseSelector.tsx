import React from "react";
import { Select, Group } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import useVisualizationStore from "../store/visualizationStore";

interface DatabaseSelectorProps {
  graphId: string;
  size: "xs" | "sm" | "md" | "lg" | "xl";
}

const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({
  graphId,
  size,
}) => {
  const { databases, setGraphDatabase, getGraphDatabase } =
    useVisualizationStore();

  // Create select options
  const selectData = [
    ...databases.map((db) => ({
      value: db,
      label:
        db
          .split(/[\\/]/)
          .pop()
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
