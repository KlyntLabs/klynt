import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type IconTreeNode = {
  appId: string;
  x: number;
  y: number;
  icon?: string;
  children?: IconTreeNode[];
  parentIdSnapshot?: string | null;
  title?: string;
};

type IconTreeState = {
  trees: Record<string, IconTreeNode[]>;
  openFolderPaths: Record<string, string[]>;
  bundleEtags: Record<string, string>;

  setTree: (desktopId: string, tree: IconTreeNode[]) => void;
  addNode: (desktopId: string, node: IconTreeNode, parentId?: string | null) => boolean;
  removeNode: (desktopId: string, appId: string) => boolean;
  moveNode: (desktopId: string, appId: string, newParentId?: string | null) => boolean;
  renameNode: (desktopId: string, appId: string, title: string) => boolean;
  openFolder: (desktopId: string, appId: string) => void;
  closeFolder: (desktopId: string) => void;
  navigateToRoot: (desktopId: string) => void;
  navigateToIndex: (desktopId: string, index: number) => void;
  setBundleEtag: (desktopId: string, etag: string) => void;
  reset: () => void;
};

const initialState: Omit<
  IconTreeState,
  | "setTree"
  | "addNode"
  | "removeNode"
  | "moveNode"
  | "renameNode"
  | "openFolder"
  | "closeFolder"
  | "navigateToRoot"
  | "navigateToIndex"
  | "setBundleEtag"
  | "reset"
> = {
  trees: {},
  openFolderPaths: {},
  bundleEtags: {},
};

function findNode(tree: IconTreeNode[], appId: string): IconTreeNode | undefined {
  for (const node of tree) {
    if (node.appId === appId) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children, appId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function findLocation(
  tree: IconTreeNode[],
  appId: string
): { parent: IconTreeNode[]; index: number } | null {
  for (let index = 0; index < tree.length; index += 1) {
    const node = tree[index];
    if (node.appId === appId) {
      return { parent: tree, index };
    }
    if (node.children) {
      const found = findLocation(node.children, appId);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function isDescendant(
  tree: IconTreeNode[],
  ancestorAppId: string,
  targetAppId: string | undefined | null
): boolean {
  if (!targetAppId) {
    return false;
  }

  const ancestor = findNode(tree, ancestorAppId);
  if (!ancestor) {
    return false;
  }

  if (ancestor.appId === targetAppId) {
    return true;
  }

  return findNode(ancestor.children ?? [], targetAppId) !== undefined;
}

export const useIconTreeStore = create<IconTreeState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setTree: (desktopId, tree) =>
        set((draft) => {
          draft.trees[desktopId] = tree;
        }),

      addNode: (desktopId, node, parentId) => {
        let added = false;
        set((draft) => {
          const nodeToAdd: IconTreeNode = {
            ...node,
            parentIdSnapshot: parentId ?? null,
          };

          if (!parentId) {
            const tree = draft.trees[desktopId];
            if (tree) {
              tree.push(nodeToAdd);
            } else {
              draft.trees[desktopId] = [nodeToAdd];
            }
            added = true;
            return;
          }

          // When a parent is requested, the tree must already exist; adding to a
          // missing tree is treated as a no-op.
          const tree = draft.trees[desktopId];
          if (!tree) {
            return;
          }

          const parent = findNode(tree, parentId);
          if (!parent) {
            return;
          }

          parent.children = parent.children ?? [];
          parent.children.push(nodeToAdd);
          added = true;
        });
        return added;
      },

      removeNode: (desktopId, appId) => {
        let removed = false;
        set((draft) => {
          const tree = draft.trees[desktopId];
          if (!tree) {
            return;
          }

          const location = findLocation(tree, appId);
          if (!location) {
            return;
          }

          location.parent.splice(location.index, 1);
          removed = true;
        });
        return removed;
      },

      moveNode: (desktopId, appId, newParentId) => {
        let moved = false;
        set((draft) => {
          const tree = draft.trees[desktopId];
          if (!tree) {
            return;
          }

          const node = findNode(tree, appId);
          if (!node) {
            return;
          }

          const target = newParentId ? findNode(tree, newParentId) : null;
          if (newParentId && !target) {
            return;
          }
          if (newParentId && isDescendant([node], node.appId, newParentId)) {
            return;
          }

          const location = findLocation(tree, appId);
          if (!location) {
            return;
          }

          const [movedNode] = location.parent.splice(location.index, 1);
          movedNode.parentIdSnapshot = newParentId ?? null;

          if (newParentId && target) {
            target.children = target.children ?? [];
            target.children.push(movedNode);
          } else {
            tree.push(movedNode);
          }

          moved = true;
        });
        return moved;
      },

      renameNode: (desktopId, appId, title) => {
        let renamed = false;
        set((draft) => {
          const tree = draft.trees[desktopId];
          if (!tree) {
            return;
          }

          const node = findNode(tree, appId);
          if (!node) {
            return;
          }

          node.title = title;
          renamed = true;
        });
        return renamed;
      },

      openFolder: (desktopId, appId) =>
        set((draft) => {
          const path = draft.openFolderPaths[desktopId] ?? [];
          draft.openFolderPaths[desktopId] = [...path, appId];
        }),

      closeFolder: (desktopId) =>
        set((draft) => {
          const path = draft.openFolderPaths[desktopId] ?? [];
          if (path.length > 0) {
            draft.openFolderPaths[desktopId] = path.slice(0, -1);
          }
        }),

      navigateToRoot: (desktopId) =>
        set((draft) => {
          draft.openFolderPaths[desktopId] = [];
        }),

      navigateToIndex: (desktopId, index) =>
        set((draft) => {
          const path = draft.openFolderPaths[desktopId] ?? [];
          draft.openFolderPaths[desktopId] = index < 0 ? [] : path.slice(0, index + 1);
        }),

      setBundleEtag: (desktopId, etag) =>
        set((draft) => {
          draft.bundleEtags[desktopId] = etag;
        }),

      reset: () => set(() => ({ ...initialState })),
    })),
    { name: "icon-tree" }
  )
);
