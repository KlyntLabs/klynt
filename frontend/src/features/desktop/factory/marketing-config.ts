import {
  type MarketingAppManifest,
  marketingRegistry,
  type WindowApp,
} from "../apps/marketing-apps";
import type { AppManifest, AppRegistry, DesktopContext } from "../apps/types";
import type { MenubarItem, MenubarSchema } from "../menubar/types";
import { createNoOpAdapter } from "../persistence/no-op-adapter";
import type { DesktopConfig } from "./types";

function toAppManifest(app: WindowApp): AppManifest {
  const manifest = app.manifest as MarketingAppManifest;
  return {
    ...manifest,
    category: "marketing",
    component: app.component,
  };
}

const MENU_GROUP_ORDER = ["productOS", "pricing", "docs", "community", "company", "more"];

function buildMenubarSchema(apps: AppRegistry): MenubarSchema {
  const groups: MenubarItem[] = [];
  const seenGroups = new Set<string>();

  for (const group of MENU_GROUP_ORDER) {
    const groupApps = apps.filter((app) => app.menuGroup === group);
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
    new Set(apps.map((app) => app.menuGroup).filter((group): group is string => Boolean(group)))
  );

  for (const group of remainingGroups) {
    if (seenGroups.has(group)) continue;
    const groupApps = apps.filter((app) => app.menuGroup === group);
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

const marketingApps: AppRegistry = marketingRegistry.apps.map(toAppManifest);
const marketingDefaultApp = toAppManifest(marketingRegistry.defaultApp);

const marketingContext: DesktopContext = { user: null };

export const marketingDesktopConfig: DesktopConfig = {
  id: "marketing",
  title: "Klynt Marketing",
  apps: marketingApps,
  defaultApp: marketingDefaultApp,
  menubar: buildMenubarSchema(marketingApps),
  background: { presetId: "fabric" },
  persistence: createNoOpAdapter(),
  context: marketingContext,
};
