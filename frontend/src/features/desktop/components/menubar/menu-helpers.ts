import { useMemo } from "react";
import type { DesktopAction } from "@/features/desktop/apps/types";
import type { MenubarItem, MenubarSchema } from "@/features/desktop/menubar/types";

export interface MenuItem {
  label: string;
  onClick?: () => void;
  separator?: boolean;
  shortcut?: string;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

function itemToMenuItem(
  item: MenubarItem,
  onAction: (action: DesktopAction) => void
): MenuItem | null {
  switch (item.type) {
    case "action":
      return {
        label: item.label,
        shortcut: item.shortcut,
        onClick: () => onAction(item.action),
      };
    case "separator":
      return { label: "", separator: true };
    case "submenu":
      return { label: item.label, onClick: () => {} };
    default:
      return null;
  }
}

export function useMenuGroups(
  menubar: MenubarSchema,
  onAction: (action: DesktopAction) => void
): MenuGroup[] {
  return useMemo(() => {
    return menubar.menus
      .filter(
        (menu): menu is { type: "submenu"; label: string; items: MenubarItem[] } =>
          menu.type === "submenu"
      )
      .map((menu) => ({
        label: menu.label,
        items: menu.items
          .map((item) => itemToMenuItem(item, onAction))
          .filter((item): item is MenuItem => item !== null),
      }));
  }, [menubar.menus, onAction]);
}
