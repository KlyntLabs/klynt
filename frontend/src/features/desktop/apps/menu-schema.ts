export type MenuActionId =
  | "app:rename"
  | "app:delete"
  | "app:duplicate"
  | "app:export"
  | "app:share"
  | `custom:${string}`;

export type MenuCondition =
  | { type: "role"; role: "owner" | "admin" | "member" }
  | { type: "appLocked"; value: boolean }
  | { type: "contentField"; path: string; equals: unknown }
  | { type: "negation"; condition: MenuCondition };

export type MenuItem = {
  type: "item";
  id: string;
  label: string;
  action: MenuActionId;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  visible?: MenuCondition;
  metadata?: Record<string, unknown>;
};

export type MenuSeparator = {
  type: "separator";
};

export type MenuGroup = {
  type: "group";
  id: string;
  label?: string;
  children: MenuEntry[];
};

export type MenuEntry = MenuItem | MenuSeparator | MenuGroup;

export type ContentMenuSchema = {
  id: string;
  root: MenuEntry[];
};

export type ResolvedMenuItem = MenuItem & {
  effectiveDisabled: boolean;
  effectiveVisible: boolean;
  resolvedShortcut?: string;
};

export function isMenuGroup(entry: MenuEntry): entry is MenuGroup {
  return typeof entry === "object" && entry !== null && entry.type === "group";
}

export function isMenuItem(entry: MenuEntry): entry is MenuItem {
  return typeof entry === "object" && entry !== null && entry.type === "item";
}

export function isMenuSeparator(entry: MenuEntry): entry is MenuSeparator {
  return typeof entry === "object" && entry !== null && entry.type === "separator";
}
