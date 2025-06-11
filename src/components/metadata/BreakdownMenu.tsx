import React, { useEffect } from "react";
import { Group, Text, Select, ScrollArea, Flex, Badge } from "@mantine/core";
import { TreeSelect, TreeSelectChangeEvent } from "primereact/treeselect";
import { TreeNode } from "primereact/treenode";
import { useState } from "react";
import useVisualizationStore from "../../store/visualizationStore";
import { SelectedBreakdownKeys, MetadataTrees } from "../../types/metadata";
import { getAllMetadata } from "../../services/metadata";
import { IconArrowsSplit } from "@tabler/icons-react";

interface BreakdownProps {
  graphId: string;
}

const FilteringScrollMenu: React.FC<BreakdownProps> = ({ graphId }) => {
  const [data, setData] = useState<MetadataTrees>({});
  const [metadataTree, setMetadataTree] = useState<string | null>(null);
  const [selectorState, setSelectorState] = useState<SelectedBreakdownKeys>({});
  const { updateGraph } = useVisualizationStore();

  useEffect(() => {
    (async () => {
      setData(await getAllMetadata());
    })();
  }, []);

  useEffect(() => {
    setSelectorState({});
    updateGraph(graphId, { breakdownNodes: [] });
  }, [metadataTree]);

  const handleSelectionChange = (value: string | null) => {
    if (value) {
      setMetadataTree(value);
    }
  };

  return (
    <Group gap="xs" align="center" wrap="nowrap">
      <Flex
        gap="sm"
        justify="center"
        align="center"
        direction="row"
        wrap="nowrap"
      >
        <IconArrowsSplit size={"2rem"} color="var(--mantine-color-gray-6)" />
        <Text size="xs" style={{ minWidth: "fit-content" }}>
          Breakdown by
        </Text>
        <Select
          size="xs"
          data={Object.keys(data).map((v) => ({ label: v, value: v }))}
          value={metadataTree}
          onChange={handleSelectionChange}
          placeholder="Select category"
          style={{ minWidth: "150px" }}
          comboboxProps={{ withinPortal: false }}
        />
        <Text size="xs">in</Text>
      </Flex>

      <ScrollArea.Autosize
        type="auto"
        scrollbarSize={6}
        style={{ width: "100%" }}
        scrollHideDelay={0}
        w="100%"
      >
        <Group
          gap="8px"
          align="center"
          wrap="nowrap"
          style={{ minWidth: "max-content" }}
        >
          <TreeSelect
            value={selectorState}
            onChange={(e: TreeSelectChangeEvent) => {
              const selectorState = e.value as SelectedBreakdownKeys;

              updateGraph(graphId, {
                breakdownNodes: Object.keys(selectorState).filter(
                  (key) => selectorState[key],
                ),
              });

              setSelectorState(selectorState);
            }}
            options={metadataTree ? data[metadataTree].children : undefined}
            selectionMode="multiple"
            display="chip"
            placeholder="Select Items"
            style={{
              maxWidth: "90%",
              fontSize: "var(--mantine-font-size-xs)",
              fontFamily: "var(--mantine-font-family)",
            }}
            panelStyle={{ marginTop: "10px" }}
            filter
            valueTemplate={(selectedNodes) => {
              const selectedNodesArray: TreeNode[] = Array.isArray(
                selectedNodes,
              )
                ? selectedNodes
                : [selectedNodes];
              if (selectedNodesArray.length === 0) {
                return <Text size="xs">...</Text>;
              }

              const selectedNodesSet = new Set(
                selectedNodesArray.map((node) => node.key),
              );
              const parentNodesSet = new Set<string>();

              selectedNodesArray.forEach((node) => {
                if (node.children) {
                  node.children.forEach((child) => {
                    if (selectedNodesSet.has(child.key)) {
                      parentNodesSet.add(node.key! as string);
                    }
                  });
                }
              });

              return (
                <Group gap="xs" wrap="nowrap" style={{ paddingRight: "3rem" }}>
                  {selectedNodesArray.map((i) => {
                    return (
                      <Badge
                        key={i.label}
                        color="blue"
                        variant="light"
                        size="xs"
                        style={{ minWidth: "fit-content" }}
                      >
                        {parentNodesSet.has(i.key! as string)
                          ? i.label + "-other"
                          : i.label}
                      </Badge>
                    );
                  })}
                </Group>
              );
            }}
          ></TreeSelect>
        </Group>
      </ScrollArea.Autosize>
    </Group>
  );
};

export default FilteringScrollMenu;
