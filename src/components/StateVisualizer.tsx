import React from "react";
import { Accordion, Box, Code, Text, Divider } from "@mantine/core";
import { IconChevronUp } from "@tabler/icons-react";
import useVisualizationStore from "../store/visualizationStore";

/**
 * Development debugging component that displays the current application state.
 * Renders the complete Zustand store state in a collapsible JSON viewer for
 * debugging and development purposes. Positioned as a semi-transparent overlay
 * at the bottom of the database list for easy access during development.
 */
const StateVisualizer: React.FC = () => {
  const visualizationState = useVisualizationStore();

  return (
    <Accordion
      style={{
        position: "absolute",
        bottom: "0px",
        left: "0px",
        width: "100%",
        backgroundColor: "var(--mantine-color-gray-0)",
        opacity: "0.9",
      }}
    >
      <Divider />
      <Accordion.Item value="visualization-state">
        <Accordion.Control chevron={<IconChevronUp />}>
          <Text>Application State</Text>
        </Accordion.Control>
        <Accordion.Panel>
          {/* Scrollable container for large state objects */}
          <Box style={{ maxHeight: "40vh", overflow: "auto" }}>
            <Code block color="var(--mantine-color-gray-0)">
              {JSON.stringify(visualizationState, null, 2)}
            </Code>
          </Box>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};

export default StateVisualizer;
