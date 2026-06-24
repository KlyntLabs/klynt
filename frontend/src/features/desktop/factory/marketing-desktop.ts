import { marketingApps, marketingRegistry } from "../apps/registry/marketing-apps";
import { marketingMenubar } from "../menubar/marketing-menubar";
import { createNoOpAdapter } from "../persistence/no-op-adapter";
import type { DesktopConfig } from "./types";

export function buildMarketingDesktop(): DesktopConfig {
  return {
    id: "marketing",
    title: "Klynt",
    apps: marketingApps,
    defaultApp: marketingRegistry.defaultApp,
    menubar: marketingMenubar,
    background: { presetId: "fabric" },
    persistence: createNoOpAdapter(),
    context: { user: null },
  };
}
