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

/**
 * Main application component implementing a two-panel layout for the Energy Model Visualizer.
 *
 * Layout Architecture:
 * - Fixed left sidebar (25% width) for database management
 * - Scrollable main content area (75% width) for visualization graphs
 * - Fixed toolbar at top spanning full width
 *
 * State Management:
 * - Uses Zustand store for global application state
 * - Reactive UI updates based on database connection status
 * - Dynamic graph management with add/remove capabilities
 */
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
        {/* Fixed Left Sidebar - Database Management */}
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

        {/* Main Content Area - Visualization Graphs */}
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
            {/* Conditional rendering based on database availability */}
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

                  {/* Responsive grid layout for visualization cards */}
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
