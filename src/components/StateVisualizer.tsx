import React from "react";
import { Accordion, Box, Code } from "@mantine/core";
import { IconChevronUp } from "@tabler/icons-react";
import useVisualizationStore from "../store/visualizationStore";

const StateVisualizer: React.FC = () => {
  const visualizationState = useVisualizationStore();

  return (
    <Accordion
      mt="md"
      style={{
        position: "absolute",
        bottom: "0px",
        left: "0px",
        width: "100%",
        zIndex: 1000,
        backgroundColor: "var(--mantine-color-gray-1)",
        boxShadow: "0 -2px 10px var(--mantine-color-gray-3)",
        opacity: "0.9",
      }}
    >
      <Accordion.Item value="visualization-state">
        <Accordion.Control chevron={<IconChevronUp />}>
          Application State
        </Accordion.Control>
        <Accordion.Panel>
          <Box style={{ maxHeight: "40vh", overflow: "auto" }}>
            <Code block>{JSON.stringify(visualizationState, null, 2)}</Code>
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

export default StateVisualizer;
