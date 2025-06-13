import useVisualizationStore from "../store/visualizationStore";
import { Paper, Text, Title, Image, Anchor, Flex, Group } from "@mantine/core";
import logo from "../assets/tulipaLogo.png";

const Toolbar: React.FC = () => {
  const { isLoading, hasAnyDatabase } = useVisualizationStore();

  return (
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
        <Anchor
          href="https://tulipaenergy.github.io/TulipaEnergyModel.jl/stable/"
          target="_blank"
        >
          Documentation
        </Anchor>
      </Flex>

      {hasAnyDatabase() && isLoading && (
        <Text size="sm" style={{ textAlign: "center", marginTop: "10px" }}>
          Loading...
        </Text>
      )}
    </Paper>
  );
};

export default Toolbar;
