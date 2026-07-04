import type { ContextMenuSchema } from "./menu-schema";

const commonFileOperations: ContextMenuSchema["root"] = [
  {
    type: "item",
    id: "open",
    label: "Open",
    labelKey: "menu.open",
    action: "app:open",
  },
  {
    type: "item",
    id: "rename",
    label: "Rename",
    labelKey: "menu.rename",
    action: "app:rename",
  },
  { type: "separator" },
  {
    type: "item",
    id: "cut",
    label: "Cut",
    labelKey: "menu.cut",
    action: "app:cut",
  },
  {
    type: "item",
    id: "copy",
    label: "Copy",
    labelKey: "menu.copy",
    action: "app:copy",
  },
  { type: "separator" },
  {
    type: "item",
    id: "delete",
    label: "Delete",
    labelKey: "menu.delete",
    action: "app:delete",
    visible: { type: "locked", value: false },
  },
];

export const desktopBackgroundMenu: ContextMenuSchema = {
  id: "desktop-background-menu",
  root: [
    {
      type: "group",
      id: "new",
      label: "New",
      labelKey: "menu.new",
      children: [
        {
          type: "item",
          id: "new-folder",
          label: "New Folder",
          labelKey: "menu.newFolder",
          action: "desktop:new-folder",
        },
        {
          type: "item",
          id: "new-markdown",
          label: "New Markdown",
          labelKey: "menu.newMarkdown",
          action: "desktop:new-markdown",
        },
        {
          type: "item",
          id: "new-notes",
          label: "New Notes",
          labelKey: "menu.newNotes",
          action: "desktop:new-notes",
        },
        {
          type: "item",
          id: "new-video",
          label: "New Video",
          labelKey: "menu.newVideo",
          action: "desktop:new-video",
        },
      ],
    },
    { type: "separator" },
    {
      type: "item",
      id: "paste",
      label: "Paste",
      labelKey: "menu.paste",
      action: "desktop:paste",
    },
    { type: "separator" },
    {
      type: "item",
      id: "refresh",
      label: "Refresh",
      labelKey: "menu.refresh",
      action: "desktop:refresh",
    },
    {
      type: "item",
      id: "change-background",
      label: "Change Background",
      labelKey: "menu.changeBackground",
      action: "desktop:change-background",
    },
  ],
};

export const desktopIconMenu: ContextMenuSchema = {
  id: "desktop-icon-menu",
  root: [...commonFileOperations],
};

export const desktopFolderMenu: ContextMenuSchema = {
  id: "desktop-folder-menu",
  root: [
    ...commonFileOperations.slice(0, 2),
    { type: "separator" },
    {
      type: "item",
      id: "new-folder-inside",
      label: "New Folder inside",
      labelKey: "menu.newFolderInside",
      action: "desktop:new-folder",
    },
    { type: "separator" },
    ...commonFileOperations.slice(3),
  ],
};
