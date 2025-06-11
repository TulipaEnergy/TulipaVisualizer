import { TreeNode } from "primereact/treenode";

export interface MetadataTrees {
  [categoryName: string]: TreeNode;
}

export interface SelectedFilteringKeys {
  [key: string]: {
    checked: boolean;
    partialChecked: boolean;
  };
}

export interface SelectedBreakdownKeys {
  [key: string]: boolean;
}
