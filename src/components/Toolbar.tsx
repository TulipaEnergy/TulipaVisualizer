import useVisualizationStore from "../store/visualizationStore";
import { Paper, Text, Title, Image, Flex, Group, Button } from "@mantine/core";
import logo from "../assets/tulipaLogo.png";
import { IconBook } from "@tabler/icons-react";
import { useState } from "react";
import DocumentationModal from "./DocumentationModal";

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
