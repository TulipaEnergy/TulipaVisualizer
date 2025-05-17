import { useState } from "react";
// import { runTest } from "./dbConn";
import Toolbar from "./components/Toolbar";
import GraphContainer from "./components/GraphContainer";
import useVisualizationStore from "./store/visualizationStore";
import {
  Container,
  Button,
  Stack,
  Title,
  Text,
  Box,
  Paper,
  Accordion,
  Code,
  MantineProvider,
  createTheme,
} from "@mantine/core";
import "@mantine/core/styles.css"; // Import Mantine core styles
import "./styles/index.css";

// Create a theme (optional, you can customize this)
const theme = createTheme({
  // You can add your theme customizations here
  primaryColor: "blue",
});

// Component to display the current state of the visualization store
const VisualizationStateLogger = () => {
  const storeState = useVisualizationStore();

  return (
    <Paper
      withBorder
      p="xs"
      mt="md"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "40%",
        maxHeight: "50vh",
        zIndex: 1000,
        opacity: 0.9,
      }}
      shadow="md"
    >
      <Accordion>
        <Accordion.Item value="store-state">
          <Accordion.Control>Visualization Store State</Accordion.Control>
          <Accordion.Panel>
            <Box style={{ maxHeight: "40vh", overflow: "auto" }}>
              <Code block>{JSON.stringify(storeState, null, 2)}</Code>
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
};

export default function App() {
  const { dbFilePath } = useVisualizationStore();
  const [graphIds, setGraphIds] = useState<number[]>([]);

  // Function to add a new graph container
  const addGraphContainer = () => {
    setGraphIds((prev) => [...prev, Date.now()]);
  };

  // Function to remove a graph container
  const removeGraphContainer = (idToRemove: number) => {
    setGraphIds((prev) => prev.filter((id) => id !== idToRemove));
  };

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Stack p="md" h="100vh">
        {/* Integrate Toolbar at the top */}
        <Toolbar />

        <Container
          fluid
          py="md"
          style={{
            flex: 1,
            width: "100%",
            maxWidth: "100%",
            padding: "0 16px",
          }}
        >
          {/* Show visualization section when a file is selected via toolbar */}
          {dbFilePath && (
            <>
              <Stack gap="md" align="center" style={{ width: "100%" }}>
                <Box
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Title order={1}>Data Visualization</Title>
                  <Button onClick={addGraphContainer} color="green">
                    Add Graph Container
                  </Button>
                </Box>

                {/* Display all graph containers */}
                <Stack w="100%" gap="md">
                  {graphIds.map((id) => (
                    <Box
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <Button
                        onClick={() => removeGraphContainer(id)}
                        color="red"
                        variant="subtle"
                        mr="xs"
                        style={{ minWidth: "auto" }}
                      >
                        X
                      </Button>
                      <Box style={{ flexGrow: 1, width: "100%" }}>
                        <GraphContainer id={id} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </>
          )}

          {!dbFilePath && (
            <Stack align="center" justify="center" h="100%">
              <Text>
                Please connect to a database using the toolbar above to start
                visualizing data.
              </Text>
            </Stack>
          )}
        </Container>

        {/* State Logger Component */}
        <VisualizationStateLogger />
      </Stack>
    </MantineProvider>
  );
}
