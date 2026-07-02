export type ContextMenuActionId =
  | "desktop:new-folder"
  | "desktop:new-markdown"
  | "desktop:new-notes"
  | "desktop:new-video"
  | "desktop:paste"
  | "desktop:refresh"
  | "desktop:change-background"
  | "app:open"
  | "app:rename"
  | "app:delete"
  | "app:cut"
  | "app:copy"
  | `custom:${string}`;

export type ContextMenuTarget =
  | { kind: "desktop"; desktopId: string }
  | { kind: "icon"; appId: string; desktopId: string }
  | { kind: "folder"; folderId: string; desktopId: string };

export type ContextMenuCondition =
  | { type: "role"; role: "owner" | "admin" | "member" }
  | { type: "selectionEmpty"; value: boolean }
  | { type: "isFolder"; value: boolean }
  | { type: "locked"; value: boolean }
  | { type: "negation"; condition: ContextMenuCondition };

export type ContextMenuItem = {
  type: "item";
  id: string;
  label: string;
  action: ContextMenuActionId;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  visible?: ContextMenuCondition;
  metadata?: Record<string, unknown>;
};

export type ContextMenuSeparator = {
  type: "separator";
};

export type ContextMenuGroup = {
  type: "group";
  id: string;
  label?: string;
  children: ContextMenuEntry[];
};

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator | ContextMenuGroup;

export type ContextMenuSchema = {
  id: string;
  root: ContextMenuEntry[];
};

export function isContextMenuGroup(entry: ContextMenuEntry): entry is ContextMenuGroup {
  return typeof entry === "object" && entry !== null && entry.type === "group";
}

export function isContextMenuItem(entry: ContextMenuEntry): entry is ContextMenuItem {
  return typeof entry === "object" && entry !== null && entry.type === "item";
}

export function isContextMenuSeparator(entry: ContextMenuEntry): entry is ContextMenuSeparator {
  return typeof entry === "object" && entry !== null && entry.type === "separator";
}
