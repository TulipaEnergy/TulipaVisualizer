import useVisualizationStore from "../store/visualizationStore";
import { Paper, Text, Title, Image, Button, Flex, Group } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { useState } from "react";
import logo from "../assets/tulipaLogo.png";
import DocumentationModal from "./DocumentationModal";

/**
 * Fixed application header with branding, navigation, and status indicators.
 * Displays the Tulipa Energy logo, application title, documentation access,
 * and loading state when database operations are in progress. Positioned
 * as a fixed overlay at the top of the application.
 */
const Toolbar: React.FC = () => {
  const { isLoading, hasAnyDatabase } = useVisualizationStore();
  const [documentationOpened, setDocumentationOpened] = useState(false);

  return (
    <>
      <Paper
        p="md"
        radius="md"
        withBorder
        shadow="sm"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          borderRadius: 0,
        }}
      >
        <Flex justify="space-between" align="center" style={{ width: "100%" }}>
          {/* Application branding and identity */}
          <Group align="center" gap="md">
            <Image style={{ height: "30px", width: "30px" }} src={logo} />
            <Title order={2}>Tulipa Energy Visualizer</Title>
          </Group>
          
          {/* Documentation access button */}
          <Button
            leftSection={<IconBook size={16} />}
            variant="light"
            onClick={() => setDocumentationOpened(true)}
          >
            Documentation
          </Button>
        </Flex>

        {/* Conditional loading indicator for active database operations */}
        {hasAnyDatabase() && isLoading && (
          <Text size="sm" style={{ textAlign: "center", marginTop: "10px" }}>
            Loading...
          </Text>
        )}
      </Paper>

      {/* Documentation Modal */}
      <DocumentationModal
        opened={documentationOpened}
        onClose={() => setDocumentationOpened(false)}
      />
    </>
  );
};

export default Toolbar;
