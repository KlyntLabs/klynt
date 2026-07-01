import type { IconTreeNode } from "./icon-tree-module";

export type MergedNode = IconTreeNode & {
  source: "shared" | "overlay";
  locked: boolean;
  editable: boolean;
  stale?: boolean;
};

type FlatNode = IconTreeNode & {
  parentId: string | null;
};

type MergedEntry = {
  base: IconTreeNode;
  effectiveParent: string | null;
  source: "shared" | "overlay";
  locked: boolean;
  editable: boolean;
  stale?: boolean;
};

function flatten(
  nodes: IconTreeNode[],
  map: Map<string, FlatNode>,
  parentId: string | null = null
): void {
  for (const node of nodes) {
    map.set(node.appId, { ...node, parentId });
    if (node.children) {
      flatten(node.children, map, node.appId);
    }
  }
}

function resolveTargetParent(
  effectiveParent: string | null,
  entries: Map<string, MergedEntry>,
  folderAppIds?: Set<string>
): string | null {
  if (effectiveParent === null) {
    return null;
  }
  if (!entries.has(effectiveParent)) {
    return null;
  }
  if (folderAppIds && !folderAppIds.has(effectiveParent)) {
    return null;
  }
  return effectiveParent;
}

function buildNode(
  appId: string,
  entries: Map<string, MergedEntry>,
  folderAppIds: Set<string> | undefined,
  ancestors: Set<string>,
  built: Set<string>
): MergedNode | null {
  if (ancestors.has(appId)) {
    return null;
  }
  if (built.has(appId)) {
    return null;
  }

  const entry = entries.get(appId);
  if (!entry) {
    return null;
  }

  built.add(appId);
  const nextAncestors = new Set(ancestors);
  nextAncestors.add(appId);

  const baseChildren = entry.base.children ?? [];
  const baseChildIndex = new Map<string, number>();
  baseChildren.forEach((child, index) => {
    baseChildIndex.set(child.appId, index);
  });

  const childIds: string[] = [];
  for (const [childAppId, childEntry] of entries) {
    const targetParent = resolveTargetParent(childEntry.effectiveParent, entries, folderAppIds);
    if (targetParent === appId) {
      childIds.push(childAppId);
    }
  }

  childIds.sort((a, b) => {
    const aIndex = baseChildIndex.get(a);
    const bIndex = baseChildIndex.get(b);
    if (aIndex === undefined && bIndex === undefined) {
      return 0;
    }
    if (aIndex === undefined) {
      return 1;
    }
    if (bIndex === undefined) {
      return -1;
    }
    return aIndex - bIndex;
  });

  const children: MergedNode[] = [];
  for (const childId of childIds) {
    const child = buildNode(childId, entries, folderAppIds, nextAncestors, built);
    if (child) {
      children.push(child);
    }
  }

  return {
    appId: entry.base.appId,
    x: entry.base.x,
    y: entry.base.y,
    title: entry.base.title,
    parentIdSnapshot: entry.base.parentIdSnapshot,
    source: entry.source,
    locked: entry.locked,
    editable: entry.editable,
    stale: entry.stale,
    children: children.length > 0 ? children : undefined,
  };
}

function buildTree(
  entries: Map<string, MergedEntry>,
  folderAppIds: Set<string> | undefined
): MergedNode[] {
  const roots: MergedNode[] = [];
  const built = new Set<string>();

  for (const [appId, entry] of entries) {
    const targetParent = resolveTargetParent(entry.effectiveParent, entries, folderAppIds);
    if (targetParent === null) {
      const node = buildNode(appId, entries, folderAppIds, new Set(), built);
      if (node) {
        roots.push(node);
      }
    }
  }

  for (const [appId] of entries) {
    if (!built.has(appId)) {
      const node = buildNode(appId, entries, folderAppIds, new Set(), built);
      if (node) {
        roots.push(node);
      }
    }
  }

  return roots;
}

export function mergeDesktop(options: {
  shared: IconTreeNode[];
  overlay: IconTreeNode[];
  knownAppIds: Set<string>;
  folderAppIds?: Set<string>;
  canEditShared?: boolean;
}): MergedNode[] {
  const { shared, overlay, knownAppIds, folderAppIds, canEditShared } = options;

  const sharedMap = new Map<string, FlatNode>();
  const overlayMap = new Map<string, FlatNode>();

  flatten(shared, sharedMap, null);
  flatten(overlay, overlayMap, null);

  const mergedMap = new Map<string, MergedEntry>();

  for (const appId of new Set([...sharedMap.keys(), ...overlayMap.keys()])) {
    if (!knownAppIds.has(appId)) {
      continue;
    }

    const sharedNode = sharedMap.get(appId);
    const overlayNode = overlayMap.get(appId);

    let base: IconTreeNode;
    let effectiveParent: string | null;
    let source: "shared" | "overlay";

    if (overlayNode) {
      base = overlayNode;
      effectiveParent = overlayNode.parentIdSnapshot ?? null;
      source = "overlay";
    } else if (sharedNode) {
      base = sharedNode;
      effectiveParent = sharedNode.parentId;
      source = "shared";
    } else {
      continue;
    }

    const locked = source === "shared" && !canEditShared;
    const editable = !locked;

    let stale: boolean | undefined;
    if (sharedNode && overlayNode) {
      const sharedParentId = sharedNode.parentId;
      const overlayParentSnapshot = overlayNode.parentIdSnapshot ?? null;
      if (overlayParentSnapshot !== sharedParentId) {
        stale = true;
      }
    }

    mergedMap.set(appId, {
      base,
      effectiveParent,
      source,
      locked,
      editable,
      stale,
    });
  }

  return buildTree(mergedMap, folderAppIds);
}
