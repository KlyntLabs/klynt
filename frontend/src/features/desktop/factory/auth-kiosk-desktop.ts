import { authApps } from "../apps/registry/auth-apps";
import { authMenubar } from "../menubar/auth-menubar";
import { createNoOpAdapter } from "../persistence/no-op-adapter";
import type { DesktopConfig } from "./types";

export function buildAuthKioskDesktop(appId: string): DesktopConfig {
  const app = authApps.find((a) => a.id === appId);
  if (!app) {
    throw new Error(`Unknown auth app: ${appId}`);
  }

  return {
    id: `auth:${appId}`,
    title: "Klynt",
    apps: [app],
    menubar: authMenubar,
    background: { presetId: "fabric" },
    persistence: createNoOpAdapter(),
    context: { user: null },
    locked: true,
    singleApp: true,
  };
}
