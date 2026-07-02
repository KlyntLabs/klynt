import type { ContentMenuSchema } from "./menu-schema";

export type AppTypeId = "markdown" | "notes" | "video" | "folder";

export type AppTypeDefinition = {
  id: AppTypeId;
  label: string;
  icon: string;
  defaultContent: Record<string, unknown>;
  defaultMenuSchema: ContentMenuSchema;
  rendererId: string;
};

const renameItem = {
  type: "item" as const,
  id: "rename",
  label: "Rename",
  action: "app:rename" as const,
};

const duplicateItem = {
  type: "item" as const,
  id: "duplicate",
  label: "Duplicate",
  action: "app:duplicate" as const,
};

const deleteItem = {
  type: "item" as const,
  id: "delete",
  label: "Delete",
  action: "app:delete" as const,
};

const separator = { type: "separator" as const };

const markdownMenuSchema: ContentMenuSchema = {
  id: "markdown-menu",
  root: [renameItem, duplicateItem, separator, deleteItem],
};

const notesMenuSchema: ContentMenuSchema = {
  id: "notes-menu",
  root: [renameItem, separator, deleteItem],
};

const videoMenuSchema: ContentMenuSchema = {
  id: "video-menu",
  root: [renameItem, separator, deleteItem],
};

const openItem = {
  type: "item" as const,
  id: "open",
  label: "Open",
  action: "custom:open" as const,
};

const folderMenuSchema: ContentMenuSchema = {
  id: "folder-menu",
  root: [renameItem, openItem, separator, deleteItem],
};

export const appTypeRegistry: Record<AppTypeId, AppTypeDefinition> = {
  markdown: {
    id: "markdown",
    label: "Markdown",
    icon: "file-text",
    defaultContent: { text: "# New Document\n" },
    defaultMenuSchema: markdownMenuSchema,
    rendererId: "markdown",
  },
  notes: {
    id: "notes",
    label: "Notes",
    icon: "sticky-note",
    defaultContent: { text: "" },
    defaultMenuSchema: notesMenuSchema,
    rendererId: "notes",
  },
  video: {
    id: "video",
    label: "Video",
    icon: "play",
    defaultContent: { src: "" },
    defaultMenuSchema: videoMenuSchema,
    rendererId: "video",
  },
  folder: {
    id: "folder",
    label: "Folder",
    icon: "folder",
    defaultContent: {},
    defaultMenuSchema: folderMenuSchema,
    rendererId: "folder",
  },
};

export function getAppType(id: AppTypeId): AppTypeDefinition {
  const definition = appTypeRegistry[id];
  if (!definition) {
    throw new Error(`Unknown app type: ${id}`);
  }
  return definition;
}

export function listAppTypes(): AppTypeDefinition[] {
  return Object.values(appTypeRegistry);
}

export function isAppType(value: string): value is AppTypeId {
  return Object.keys(appTypeRegistry).includes(value);
}
