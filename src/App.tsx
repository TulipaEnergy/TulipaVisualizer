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
 * This component serves as the root of the visualization application, providing a responsive
 * layout for managing energy databases and displaying interactive charts.
 *
 * ## Layout Architecture:
 * - **Fixed Left Sidebar** (300px width): Database management panel with file upload,
 *   connection status, and database metadata display
 * - **Scrollable Main Content Area** (remaining width): Dynamic grid of visualization
 *   cards that users can add, configure, and remove
 * - **Fixed Toolbar** (80px height): Global controls spanning full application width
 *
 * ## State Management:
 * - Integrates with Zustand `visualizationStore` for global application state
 * - Reactive UI updates based on database connection status via `hasAnyDatabase()`
 * - Dynamic graph management with `addGraph()` and individual graph removal
 * - State persists across component re-renders for user session continuity
 *
 * ## Responsive Design Decisions:
 * - Fixed sidebar approach chosen over collapsible to maintain consistent database context
 * - SimpleGrid automatically adapts from 1 column (mobile) to 2 columns (desktop+)
 * - Viewport height calculations (`100vh - 80px`) ensure proper scrolling behavior
 * - Padding and spacing scaled using Mantine's responsive tokens
 *
 * ## Desktop Integration:
 * - Optimized for Tauri desktop environment with native window controls
 * - Layout accommodates various window sizes and system UI elements
 * - Proper z-index management prevents overlay conflicts with native dialogs
 *
 * @returns {JSX.Element} The complete application layout with toolbar, sidebar, and main content
 */
export default function App() {
  // Extract state and actions from Zustand store for database and graph management
  const { addGraph, graphs, hasAnyDatabase } = useVisualizationStore();

  return (
    <Stack p={0} h="100vh">
      {/* Fixed Toolbar - Global application controls and status */}
      <Toolbar />

      <Box
        style={{
          display: "flex",
          paddingTop: "80px", // Offset for fixed toolbar height
        }}
      >
        {/* Fixed Left Sidebar - Database Management Panel */}
        <Box
          style={{
            position: "fixed",
            left: 0,
            top: "80px", // Position below toolbar
            width: "300px", // Fixed width for consistent layout
            height: "calc(100vh - 80px)", // Full height minus toolbar
            zIndex: 100, // Ensure sidebar stays above main content
          }}
        >
          <Paper
            withBorder
            p="md"
            h="100%"
            style={{ borderRadius: 0, overflow: "auto" }}
          >
            {/* DatabaseList handles file uploads, connections, and metadata display */}
            <DatabaseList />
          </Paper>
        </Box>

        {/* Main Content Area - Visualization Dashboard */}
        <Box
          style={{
            marginLeft: "300px", // Offset for fixed sidebar width
            width: "calc(100% - 300px)", // Remaining viewport width
            height: "100%",
            overflow: "auto", // Enable scrolling for large numbers of graphs
          }}
        >
          <Container
            fluid
            py="md"
            style={{
              flex: 1,
              width: "100%",
              maxWidth: "100%", // Override Mantine's default max-width
              padding: "0 16px", // Consistent horizontal padding
            }}
          >
            {/* Conditional rendering: Only show graph interface when databases are connected */}
            {hasAnyDatabase() && (
              <>
                <Stack gap="md" align="center" style={{ width: "100%" }}>
                  {/* Graph Management Controls */}
                  <Box
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    {/* Add new visualization card with default configuration */}
                    <Button
                      onClick={() => {
                        // Creates a new graph with unique ID and default KPI selection
                        addGraph("default");
                      }}
                      color="green"
                    >
                      Add Graph
                    </Button>
                  </Box>

                  {/* Responsive Grid Layout for Visualization Cards */}
                  {/* 
                    SimpleGrid provides responsive behavior:
                    - base: 1 column (mobile/narrow screens)
                    - sm: 2 columns (tablet and desktop)
                    Each GraphCard manages its own state, chart configuration, and data fetching
                  */}
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
            {/* 
              When no databases are connected, the main area remains empty,
              encouraging users to upload database files via the sidebar
            */}
          </Container>
        </Box>
      </Box>
    </Stack>
  );
}
