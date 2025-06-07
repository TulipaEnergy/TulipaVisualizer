import Toolbar from "./components/Toolbar";
import DatabaseList from "./components/DatabaseList";
import useVisualizationStore from "./store/visualizationStore";
import {
  Container,
  Button,
  Stack,
  Box,
  Paper,
  Accordion,
  Code,
  Grid,
  SimpleGrid,
} from "@mantine/core";
import "@mantine/core/styles.css"; // Import Mantine core styles
import "./styles/index.css";
import GraphCard from "./components/GraphCard";

// Component to display the current state of both stores
const StoreStateLogger = () => {
  const visualizationState = useVisualizationStore();

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
        <Accordion.Item value="visualization-state">
          <Accordion.Control>Visualization Store State</Accordion.Control>
          <Accordion.Panel>
            <Box style={{ maxHeight: "40vh", overflow: "auto" }}>
              <Code block>{JSON.stringify(visualizationState, null, 2)}</Code>
            </Box>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
};

export default function App() {
  const { addGraph, graphs, hasAnyDatabase } = useVisualizationStore();

  return (
    <Stack p="md" h="100vh">
      <Toolbar />
      <Grid style={{ flex: 1 }}>
        <Grid.Col span={3}>
          <Paper withBorder p="md" h="100%">
            <DatabaseList />
          </Paper>
        </Grid.Col>

        <Grid.Col span={9}>
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
            {hasAnyDatabase() && (
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
                    <Button
                      onClick={() => {
                        addGraph("default");
                      }}
                      color="green"
                    >
                      Add Graph
                    </Button>
                  </Box>

                  <SimpleGrid
                    cols={{ base: 1, sm: 2 }}
                    spacing="md"
                    style={{
                      width: "100%",
                    }}
                  >
                    {graphs.map((graph) => (
                      <GraphCard key={graph.id} graphId={graph.id} />
                    ))}
                  </SimpleGrid>
                </Stack>
              </>
            )}
          </Container>
        </Grid.Col>
      </Grid>

      <StoreStateLogger />
    </Stack>
  );
}
