import { useMemo } from "react";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";

function findNodeInArray(nodes: IconTreeNode[], appId: string): IconTreeNode | undefined {
  for (const node of nodes) {
    if (node.appId === appId) {
      return node;
    }
  }
  return undefined;
}

function resolveCurrentNodes(tree: IconTreeNode[], path: string[]): IconTreeNode[] {
  if (path.length === 0) {
    return tree;
  }

  let current = tree;
  for (const appId of path) {
    const node = findNodeInArray(current, appId);
    if (!node) {
      return tree;
    }
    current = node.children ?? [];
  }

  return current;
}

export function useCurrentFolderContents(desktopId: string): {
  path: string[];
  currentNodes: IconTreeNode[];
  openFolder: (appId: string) => void;
  closeFolder: () => void;
  navigateToRoot: () => void;
  navigateToIndex: (index: number) => void;
} {
  const { trees, openFolderPaths, openFolder, closeFolder, navigateToRoot, navigateToIndex } =
    useIconTreeStore();

  const tree = trees[desktopId] ?? [];
  const path = openFolderPaths[desktopId] ?? [];
  const currentNodes = useMemo(() => resolveCurrentNodes(tree, path), [tree, path]);

  return {
    path,
    currentNodes,
    openFolder: (appId: string) => openFolder(desktopId, appId),
    closeFolder: () => closeFolder(desktopId),
    navigateToRoot: () => navigateToRoot(desktopId),
    navigateToIndex: (index: number) => navigateToIndex(desktopId, index),
  };
}
