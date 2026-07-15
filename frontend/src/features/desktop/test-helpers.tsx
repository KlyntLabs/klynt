import { Text } from "@astryxdesign/core/Text";
import { FileText } from "lucide-react";
import type { AppManifest } from "./apps/types";
import type { DesktopConfig } from "./factory/types";
import { createNoOpAdapter } from "./persistence/no-op-adapter";
import { useWindowManager } from "./window-manager/window-module";

export function resetDesktopStore() {
  useWindowManager.getState().reset();
}

export function createTestApp(overrides: Partial<AppManifest> = {}): AppManifest {
  return {
    id: overrides.id ?? "test-app",
    title: overrides.title ?? "Test App",
    route: overrides.route ?? "/test",
    icon: overrides.icon ?? FileText,
    category: overrides.category ?? "marketing",
    component: overrides.component ?? (() => <Text>Test App</Text>),
    defaultSize: overrides.defaultSize ?? { width: 400, height: 300 },
    ...overrides,
  };
}

export function createTestConfig(overrides: Partial<DesktopConfig> = {}): DesktopConfig {
  return {
    id: "test",
    title: "Test Desktop",
    apps: [],
    menubar: { brand: { label: "Klynt" }, menus: [], trailing: [] },
    background: { presetId: "fabric" },
    persistence: createNoOpAdapter(),
    context: { user: null },
    ...overrides,
  };
}
