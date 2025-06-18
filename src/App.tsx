import Toolbar from "./components/Toolbar";
import DatabaseList from "./components/DatabaseList";
import useVisualizationStore from "./store/visualizationStore";
import {
  Container,
  Button,
  Stack,
  Box,
  Paper,
  SimpleGrid,
} from "@mantine/core";
import "@mantine/core/styles.css"; // Import Mantine core styles
import "./styles/index.css";
import GraphCard from "./components/GraphCard";

export default function App() {
  const { addGraph, graphs, hasAnyDatabase } = useVisualizationStore();

  return (
    <Stack p={0} h="100vh">
      <Toolbar />
      <Box
        style={{
          display: "flex",
          paddingTop: "80px",
        }}
      >
        {/* Fixed Left Sidebar */}
        <Box
          style={{
            position: "fixed",
            left: 0,
            top: "80px",
            width: "300px",
            height: "calc(100vh - 80px)",
            zIndex: 100,
          }}
        >
          <Paper
            withBorder
            p="md"
            h="100%"
            style={{ borderRadius: 0, overflow: "auto" }}
          >
            <DatabaseList />
          </Paper>
        </Box>

        {/* Main Content Area */}
        <Box
          style={{
            marginLeft: "300px",
            width: "calc(100% - 300px)",
            height: "100%",
            overflow: "auto",
          }}
        >
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
        </Box>
      </Box>
    </Stack>
  );
}
