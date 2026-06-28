import { adminApps } from "../apps/registry/admin-apps";
import { adminMenubar } from "../menubar/admin-menubar";
import { createLocalStorageAdapter } from "../persistence/local-storage-adapter";
import type { DesktopConfig } from "./types";

export function buildAdminDesktop(context: DesktopConfig["context"]): DesktopConfig {
  return {
    id: "admin",
    title: "Admin Desktop",
    apps: adminApps,
    menubar: adminMenubar,
    background: { presetId: "fabric" },
    persistence: createLocalStorageAdapter(),
    context,
  };
}
