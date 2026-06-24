import type { DesktopAction } from "../apps/types";

export type MenubarItem =
  | { type: "action"; label: string; shortcut?: string; action: DesktopAction }
  | { type: "submenu"; label: string; items: MenubarItem[] }
  | { type: "separator" }
  | { type: "window-list" };

export type MenubarSchema = {
  brand: { label: string; menu?: MenubarItem[] };
  menus: MenubarItem[];
  trailing: MenubarItem[];
};
