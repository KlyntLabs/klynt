import type { ContentMenuSchema, MenuEntry } from "../apps/menu-schema";
import type {
  ContextMenuActionId,
  ContextMenuCondition,
  ContextMenuEntry,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSchema,
} from "./menu-schema";

const VALID_CONTEXT_ACTIONS: Set<string> = new Set([
  "desktop:new-folder",
  "desktop:new-markdown",
  "desktop:new-notes",
  "desktop:new-video",
  "desktop:paste",
  "desktop:refresh",
  "desktop:change-background",
  "app:open",
  "app:rename",
  "app:delete",
  "app:cut",
  "app:copy",
]);

export function findEntryById(
  entries: ContextMenuEntry[],
  id: string
): ContextMenuEntry | undefined {
  for (const entry of entries) {
    if (entry.type !== "separator" && entry.id === id) {
      return entry;
    }
    if (entry.type === "group") {
      const found = findEntryById(entry.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function cloneEntry(entry: ContextMenuEntry): ContextMenuEntry {
  if (entry.type === "separator") {
    return { ...entry };
  }
  if (entry.type === "group") {
    return { ...entry, children: entry.children.map(cloneEntry) };
  }
  return { ...entry };
}

function convertContentEntry(entry: MenuEntry): ContextMenuEntry {
  if (entry.type === "separator") {
    return { type: "separator" };
  }
  if (entry.type === "group") {
    return {
      ...entry,
      children: entry.children.map(convertContentEntry),
    } as ContextMenuGroup;
  }

  if (!VALID_CONTEXT_ACTIONS.has(entry.action) && !entry.action.startsWith("custom:")) {
    throw new Error(`Invalid context menu action: ${entry.action}`);
  }

  return {
    ...entry,
    action: entry.action as ContextMenuActionId,
    visible: entry.visible as ContextMenuCondition | undefined,
  } as ContextMenuItem;
}

export function mergeEntries(
  base: ContextMenuEntry[],
  overrides: ContextMenuEntry[]
): ContextMenuEntry[] {
  const matchedIds = new Set<string>();

  const merged = base.map((baseEntry) => {
    if (baseEntry.type === "separator") {
      return { ...baseEntry };
    }

    const override = overrides.find(
      (entry): entry is ContextMenuEntry & { id: string } =>
        entry.type !== "separator" && entry.id === baseEntry.id
    );

    if (!override) {
      return cloneEntry(baseEntry);
    }

    if (baseEntry.type === "item" && override.type === "item") {
      matchedIds.add(override.id);
      return { ...baseEntry, ...override };
    }

    if (baseEntry.type === "group" && override.type === "group") {
      matchedIds.add(override.id);
      return {
        ...baseEntry,
        ...override,
        children: mergeEntries(baseEntry.children, override.children ?? []),
      };
    }

    // Type mismatch: keep the base entry and consume the override id so it is
    // not appended as a duplicate.
    matchedIds.add(override.id);
    return cloneEntry(baseEntry);
  });

  for (const override of overrides) {
    if (override.type === "separator") {
      merged.push({ ...override });
      continue;
    }
    if (!matchedIds.has(override.id)) {
      merged.push(cloneEntry(override));
    }
  }

  return merged;
}

export function mergeContextMenu(
  base: ContextMenuSchema,
  overrides?: Partial<ContextMenuSchema>,
  appContentMenu?: ContentMenuSchema
): ContextMenuSchema {
  let root: ContextMenuEntry[];

  if (overrides?.root) {
    root = mergeEntries(base.root, overrides.root);
  } else if (appContentMenu) {
    root = [
      ...base.root.map(cloneEntry),
      {
        type: "group",
        id: "app-content",
        children: appContentMenu.root.map(convertContentEntry),
      },
    ];
  } else {
    root = base.root.map(cloneEntry);
  }

  const hasOverrides = Boolean(overrides?.root || appContentMenu);

  return {
    ...base,
    id: hasOverrides ? `${base.id}-merged` : base.id,
    root,
  };
}
