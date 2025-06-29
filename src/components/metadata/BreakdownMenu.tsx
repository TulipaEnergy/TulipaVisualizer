import React, { useEffect } from "react";
import { Group, Text, Select, ScrollArea, Flex, Badge } from "@mantine/core";
import { TreeSelect, TreeSelectChangeEvent } from "primereact/treeselect";
import { TreeNode } from "primereact/treenode";
import { useState } from "react";
import useVisualizationStore from "../../store/visualizationStore";
import { MetaTreeRootsByCategoryName } from "../../types/metadata";
import { getAllMetadata, hasMetadata } from "../../services/metadata";
import { IconArrowsSplit } from "@tabler/icons-react";

interface SelectedBreakdownKeys {
  [key: string]: boolean;
}

interface BreakdownProps {
  graphId: string;
}

const BreakdownMenu: React.FC<BreakdownProps> = ({ graphId }) => {
  const [data, setData] = useState<MetaTreeRootsByCategoryName>({});
  const [metadataTree, setMetadataTree] = useState<string | null>(null);
  const [selectorState, setSelectorState] = useState<SelectedBreakdownKeys>({});
  const { updateGraph, getGraphDatabase } = useVisualizationStore();

  const dbPath = getGraphDatabase(graphId)!;
  useEffect(() => {
    (async () => {
      if (await hasMetadata(dbPath)) {
        setData(await getAllMetadata(dbPath));
      } else {
        setData({});
      }
    })();
  }, [dbPath]);

  useEffect(() => {
    setSelectorState({});
    updateGraph(graphId, { breakdownNodes: [] });
  }, [metadataTree, getGraphDatabase(graphId)]);

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
          data={
            data ? Object.keys(data).map((v) => ({ label: v, value: v })) : []
          }
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
                breakdownNodes: Object.keys(selectorState)
                  .filter((key) => selectorState[key])
                  .map((t) => Number(t)),
              });

              setSelectorState(selectorState);
            }}
            options={
              metadataTree && data[metadataTree]
                ? data[metadataTree].children
                : undefined
            }
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
              let selectedNodesArray: TreeNode[];
              if (Array.isArray(selectedNodes)) {
                selectedNodesArray = selectedNodes;
              } else {
                selectedNodesArray = [selectedNodes];
              }

              if (selectedNodesArray.length === 0) {
                return <Text size="xs">...</Text>;
              }

              return (
                <Group gap="xs" wrap="nowrap" style={{ paddingRight: "3rem" }}>
                  {selectedNodesArray.map((node) => {
                    return (
                      <Badge
                        key={node.label}
                        color="blue"
                        variant="light"
                        size="xs"
                        style={{ minWidth: "fit-content" }}
                      >
                        {node.label}
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

export default BreakdownMenu;
