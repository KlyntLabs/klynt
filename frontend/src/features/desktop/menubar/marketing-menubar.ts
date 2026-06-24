import { marketingApps } from "../apps/registry/marketing-apps";
import type { MenubarItem, MenubarSchema } from "./types";

const MENU_GROUP_ORDER = ["productOS", "pricing", "docs", "community", "company", "more"];

function buildMenubarSchema(): MenubarSchema {
  const groups: MenubarItem[] = [];
  const seenGroups = new Set<string>();

  for (const group of MENU_GROUP_ORDER) {
    const groupApps = marketingApps.filter((app) => app.menuGroup === group);
    if (groupApps.length === 0) continue;

    seenGroups.add(group);
    groups.push({
      type: "submenu",
      label: group,
      items: groupApps.map((app) => ({
        type: "action",
        label: app.shortTitle || app.title,
        action: { type: "open-app", appId: app.id },
      })),
    });
  }

  const remainingGroups = Array.from(
    new Set(
      marketingApps.map((app) => app.menuGroup).filter((group): group is string => Boolean(group))
    )
  );

  for (const group of remainingGroups) {
    if (seenGroups.has(group)) continue;
    const groupApps = marketingApps.filter((app) => app.menuGroup === group);
    groups.push({
      type: "submenu",
      label: group,
      items: groupApps.map((app) => ({
        type: "action",
        label: app.shortTitle || app.title,
        action: { type: "open-app", appId: app.id },
      })),
    });
  }

  return {
    brand: { label: "Klynt" },
    menus: groups,
    trailing: [
      {
        type: "action",
        label: "Get started",
        variant: "primary",
        action: { type: "open-app", appId: "pricing" },
      },
      { type: "action", label: "Search", action: { type: "noop" } },
      { type: "action", label: "Notifications", action: { type: "noop" } },
      { type: "action", label: "Profile", action: { type: "noop" } },
    ],
  };
}

export const marketingMenubar = buildMenubarSchema();
