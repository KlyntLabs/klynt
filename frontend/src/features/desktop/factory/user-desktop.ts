import { userApps } from "../apps/registry/user-apps";
import { userMenubar } from "../menubar/user-menubar";
import { createLocalStorageAdapter } from "../persistence/local-storage-adapter";
import type { DesktopConfig } from "./types";

export function buildUserDesktop(context: DesktopConfig["context"]): DesktopConfig {
  return {
    id: `user:${context.user?.id ?? "me"}`,
    title: "User Desktop",
    apps: userApps,
    menubar: userMenubar,
    background: { presetId: "fabric" },
    persistence: createLocalStorageAdapter(),
    context,
  };
}
