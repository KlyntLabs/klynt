import type { ContextMenuSchema } from "./menu-schema";

export const desktopBackgroundMenu: ContextMenuSchema = {
  id: "desktop-background-menu",
  root: [
    {
      type: "group",
      id: "new",
      label: "New",
      children: [
        {
          type: "item",
          id: "new-folder",
          label: "New Folder",
          action: "desktop:new-folder",
        },
        {
          type: "item",
          id: "new-markdown",
          label: "New Markdown",
          action: "desktop:new-markdown",
        },
        {
          type: "item",
          id: "new-notes",
          label: "New Notes",
          action: "desktop:new-notes",
        },
        {
          type: "item",
          id: "new-video",
          label: "New Video",
          action: "desktop:new-video",
        },
      ],
    },
    { type: "separator" },
    {
      type: "item",
      id: "paste",
      label: "Paste",
      action: "desktop:paste",
    },
    { type: "separator" },
    {
      type: "item",
      id: "refresh",
      label: "Refresh",
      action: "desktop:refresh",
    },
    {
      type: "item",
      id: "change-background",
      label: "Change Background",
      action: "desktop:change-background",
    },
  ],
};

export const desktopIconMenu: ContextMenuSchema = {
  id: "desktop-icon-menu",
  root: [
    {
      type: "item",
      id: "open",
      label: "Open",
      action: "app:open",
    },
    {
      type: "item",
      id: "rename",
      label: "Rename",
      action: "app:rename",
    },
    { type: "separator" },
    {
      type: "item",
      id: "cut",
      label: "Cut",
      action: "app:cut",
    },
    {
      type: "item",
      id: "copy",
      label: "Copy",
      action: "app:copy",
    },
    { type: "separator" },
    {
      type: "item",
      id: "delete",
      label: "Delete",
      action: "app:delete",
      visible: { type: "locked", value: false },
    },
  ],
};

export const desktopFolderMenu: ContextMenuSchema = {
  id: "desktop-folder-menu",
  root: [
    {
      type: "item",
      id: "open",
      label: "Open",
      action: "app:open",
    },
    {
      type: "item",
      id: "rename",
      label: "Rename",
      action: "app:rename",
    },
    { type: "separator" },
    {
      type: "item",
      id: "new-folder-inside",
      label: "New Folder inside",
      action: "desktop:new-folder",
    },
    { type: "separator" },
    {
      type: "item",
      id: "cut",
      label: "Cut",
      action: "app:cut",
    },
    {
      type: "item",
      id: "copy",
      label: "Copy",
      action: "app:copy",
    },
    { type: "separator" },
    {
      type: "item",
      id: "delete",
      label: "Delete",
      action: "app:delete",
      visible: { type: "locked", value: false },
    },
  ],
};
