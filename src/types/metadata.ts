import { TreeNode } from "primereact/treenode";

/**
 * Hierarchical metadata tree structure for asset filtering and categorization.
 * Maps category names to PrimeReact TreeNode structures for advanced filtering UI.
 * Enables complex metadata-based filtering with nested asset relationships.
 */
export interface MetaTreeRootsByCategoryName {
  /** Category name as key, mapped to hierarchical tree structure for filtering UI */
  [categoryName: string]: TreeNode;
}
