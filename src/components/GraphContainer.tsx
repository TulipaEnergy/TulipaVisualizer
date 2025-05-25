import React, { useState } from "react";
import { ChartType } from "../store/visualizationStore";
import GraphCard from "./GraphCard";
import useVisualization from "../hooks/useVisualization";
import {
  Paper,
  Title,
  Button,
  Menu,
  Group,
  Text,
  SimpleGrid,
  Box,
} from "@mantine/core";

interface GraphContainerProps {
  id: number;
  dbFile: string;
}

const GraphContainer: React.FC<GraphContainerProps> = ({ id, dbFile }) => {
  const { graphs, createGraph } = useVisualization();
  const [opened, setOpened] = useState(false);

  // Filter graphs to show only those associated with this container ID
  const containerGraphs = graphs.filter((graph) => graph.containerId === id);

  const handleAddGraph = (type: ChartType) => {
    // Pass the container ID when adding a new graph
    createGraph(type, id);
    setOpened(false);
  };

  return (
    <Paper
      p="md"
      radius="md"
      withBorder
      shadow="sm"
      mb="md"
      style={{
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <Group justify="space-between" mb="md">
        <Title order={4}>Container #{id}</Title>

        <Menu
          opened={opened}
          onChange={setOpened}
          position="bottom-end"
          closeOnClickOutside={true}
        >
          <Button onClick={() => handleAddGraph("bar")}>Add Graph</Button>
        </Menu>
      </Group>

      <Box w="100%">
        <SimpleGrid
          cols={{ base: 1, sm: 2 }}
          spacing="md"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(45%, 1fr))",
          }}
        >
          {containerGraphs.map((graph) => (
            <GraphCard
              key={`${graph.id}-${dbFile}`}
              graphId={graph.id}
              dbFile={dbFile}
            />
          ))}
        </SimpleGrid>
      </Box>

      {containerGraphs.length === 0 && (
        <Paper withBorder p="xl" radius="md" ta="center">
          <Text c="dimmed">
            No graphs added yet. Add a graph to start visualizing data.
          </Text>
        </Paper>
      )}
    </Paper>
  );
};

export default GraphContainer;
