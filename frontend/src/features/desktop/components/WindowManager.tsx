import { AnimatePresence } from "framer-motion";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import type { DesktopConfig } from "../factory/types";
import WindowComponent from "./Window";

const EMPTY_WINDOWS: [] = [];

interface WindowManagerProps {
  config: DesktopConfig;
}

export default function WindowManager({ config }: WindowManagerProps) {
  const desktopWindows = useDesktopStore((s) => s.windows[config.id]);
  const windows = desktopWindows ?? EMPTY_WINDOWS;

  return (
    <div className="absolute inset-0" style={{ top: 36 }}>
      <AnimatePresence>
        {windows
          .filter((w) => w.state !== "minimized")
          .map((w) => {
            const app = config.apps.find((a) => a.id === w.appId);
            if (!app) return null;
            const AppComponent = app.component;
            return (
              <WindowComponent
                key={w.id}
                desktopId={config.id}
                window={w}
                title={app.title}
                errorFallback={app.errorFallback}
                retryLimit={app.retryLimit}
              >
                <AppComponent />
              </WindowComponent>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
