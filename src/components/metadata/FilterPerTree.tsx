import React, { useEffect } from "react";
import { Group, Badge } from "@mantine/core";
import { TreeSelect, TreeSelectChangeEvent } from "primereact/treeselect";
import { TreeNode } from "primereact/treenode";
import { useState } from "react";
import useVisualizationStore from "../../store/visualizationStore";
import { SelectedFilteringKeys } from "../../types/metadata";

interface FilterPerTreeProps {
  graphId: string;
  categoryName: string;
  categoryRoot: TreeNode;
}

function mustGetKey(n: TreeNode): string {
  return n.key! as string;
}

function reduceNodeArrayToLabels(nodes: TreeNode[]): string[] {
  const displayedLabels: string[] = [];
  const displayedKeys = new Set<string>();

  for (const curNode of nodes) {
    if (!displayedKeys.has(mustGetKey(curNode))) {
      displayedLabels.push(curNode.label!);

      const stack: TreeNode[] = [];
      stack.push(curNode);
      while (stack.length !== 0) {
        const n = stack.pop()!;
        displayedKeys.add(mustGetKey(n));
        for (const child of n.children ?? []) {
          stack.push(child);
        }
      }
    }
  }

  return displayedLabels;
}

function reduceNodeArrayToKeys(nodes: TreeNode[]): string[] {
  const storedKeys: string[] = [];
  const displayedKeys = new Set<string>();

  for (const curNode of nodes) {
    if (!displayedKeys.has(mustGetKey(curNode))) {
      storedKeys.push(mustGetKey(curNode));

      const stack: TreeNode[] = [];
      stack.push(curNode);
      while (stack.length !== 0) {
        const n = stack.pop()!;
        displayedKeys.add(mustGetKey(n));
        for (const child of n.children ?? []) {
          stack.push(child);
        }
      }
    }
  }

  return storedKeys;
}

function getAllNodes(root: TreeNode): TreeNode[] {
  const result: TreeNode[] = [];
  const stack: TreeNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    if (node.children && node.children.length > 0) {
      stack.push(...node.children);
    }
  }
  return result;
}

function getAllSelected(nodes: TreeNode[]): SelectedFilteringKeys {
  const keys: string[] = [];
  const stack: TreeNode[] = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    keys.push(node.key as string);
    if (node.children && node.children.length > 0) {
      stack.push(...node.children);
    }
  }
  const allSelected: SelectedFilteringKeys = {};
  keys.forEach((key) => {
    allSelected[key] = {
      checked: true,
      partialChecked: false,
    };
  });
  return allSelected;
}

const FilterPerTree: React.FC<FilterPerTreeProps> = ({
  graphId,
  categoryName,
  categoryRoot,
}) => {
  const { updateFiltersForCategory } = useVisualizationStore();
  const currentTree = [categoryRoot];
  const categoryRootKey = mustGetKey(categoryRoot);
  const allCurrentCategoryNodes = getAllNodes(categoryRoot);

  const [selectorState, setSelectorState] = useState<SelectedFilteringKeys>(
    getAllSelected(currentTree),
  );

  useEffect(() => {
    (async () => {
      updateFiltersForCategory(graphId, categoryRootKey, [categoryRootKey]);
    })();
  }, []);

  return (
    <TreeSelect
      value={selectorState}
      onChange={(e: TreeSelectChangeEvent) => {
        if (!e.value || Object.keys(e.value).length === 0) {
          // do not allow for no value to be selected, since that would yield an empyt asset subset
          setSelectorState(getAllSelected(currentTree));
          updateFiltersForCategory(graphId, categoryRootKey, [categoryRootKey]);
        } else {
          const selectorState = e.value as SelectedFilteringKeys;

          // disregard all keys which are not checked, or are only partially checked
          const selectedCheckedKeysSet: Set<string> = new Set(
            Object.keys(selectorState).filter(
              (key) => selectorState[key].checked,
            ),
          );

          // conver the set of checked keys to an array of nodes
          const selectedNodes: TreeNode[] = allCurrentCategoryNodes.filter(
            (t) => selectedCheckedKeysSet.has(mustGetKey(t)),
          );

          updateFiltersForCategory(
            graphId,
            categoryRootKey,
            reduceNodeArrayToKeys(selectedNodes),
          );

          setSelectorState(selectorState);
        }
      }}
      options={currentTree}
      selectionMode="checkbox"
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
        const selectedNodesArray: TreeNode[] = Array.isArray(selectedNodes)
          ? selectedNodes
          : [selectedNodes];
        if (selectedNodesArray.length === 0) {
          return <>Select {categoryName}</>;
        }

        return (
          <Group gap="xs" wrap="wrap">
            {reduceNodeArrayToLabels(selectedNodesArray).map((label) =>
              label === categoryName ? (
                <Badge key={label} color="gray" variant="light" size="xs">
                  {"All " + label}
                </Badge>
              ) : (
                <Badge key={label} color="blue" variant="light" size="xs">
                  {label}
                </Badge>
              ),
            )}
          </Group>
        );
      }}
    ></TreeSelect>
  );
};

export default FilterPerTree;
