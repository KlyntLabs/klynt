import { useEffect } from "react";
import type { DesktopConfig } from "../factory/types";
import { useWindowManager } from "../window-manager/window-module";
import { DesktopEnvironment } from "./DesktopEnvironment";

interface AuthKioskDesktopProps {
  config: DesktopConfig;
}

export function AuthKioskDesktop({ config }: AuthKioskDesktopProps) {
  const openApp = useWindowManager((s) => s.openApp);

  useEffect(() => {
    if (config.singleApp && config.apps[0]) {
      const app = config.apps[0];
      openApp(config.id, app.id, {
        x: Math.max(0, (window.innerWidth - app.defaultSize.width) / 2),
        y: Math.max(36, (window.innerHeight - app.defaultSize.height) / 2),
        width: app.defaultSize.width,
        height: app.defaultSize.height,
      });
    }
  }, [config, openApp]);

  return <DesktopEnvironment config={config} />;
}
