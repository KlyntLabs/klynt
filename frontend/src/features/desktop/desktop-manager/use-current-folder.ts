import { useCallback, useMemo } from "react";
import { type IconTreeNode, useIconTreeStore } from "./icon-tree-module";

function resolveCurrentNodes(tree: IconTreeNode[], path: string[]): IconTreeNode[] {
  if (path.length === 0) {
    return tree;
  }

  let current = tree;
  for (const appId of path) {
    const node = current.find((item) => item.appId === appId);
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

  const boundOpenFolder = useCallback(
    (appId: string) => openFolder(desktopId, appId),
    [desktopId, openFolder]
  );
  const boundCloseFolder = useCallback(() => closeFolder(desktopId), [desktopId, closeFolder]);
  const boundNavigateToRoot = useCallback(
    () => navigateToRoot(desktopId),
    [desktopId, navigateToRoot]
  );
  const boundNavigateToIndex = useCallback(
    (index: number) => navigateToIndex(desktopId, index),
    [desktopId, navigateToIndex]
  );

  return {
    path,
    currentNodes,
    openFolder: boundOpenFolder,
    closeFolder: boundCloseFolder,
    navigateToRoot: boundNavigateToRoot,
    navigateToIndex: boundNavigateToIndex,
  };
}
