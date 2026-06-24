import type { ComponentType } from "react";
import type { DesktopAction } from "../apps/types";

export type MenubarItem =
  | {
      type: "action";
      label: string;
      shortcut?: string;
      icon?: ComponentType<{ className?: string }>;
      variant?: "default" | "primary";
      action: DesktopAction;
    }
  | { type: "submenu"; label: string; items: MenubarItem[] }
  | { type: "separator" }
  | { type: "window-list" };

export type MenubarSchema = {
  brand: { label: string; menu?: MenubarItem[] };
  menus: MenubarItem[];
  trailing: MenubarItem[];
};
