import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { DynamicAppWindow } from "@/features/desktop/apps/dynamic-app-window";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { DesktopConfig } from "../factory/types";
import WindowComponent from "./Window";
import styles from "./window-manager.module.css";

const EMPTY_WINDOWS: [] = [];

interface WindowManagerProps {
  config: DesktopConfig;
}

export default function WindowManager({ config }: WindowManagerProps) {
  const { t } = useTranslation("home");
  const desktopWindows = useWindowManager((s) => s.windows[config.id]);
  const windows = desktopWindows ?? EMPTY_WINDOWS;

  return (
    <div className={styles.layer}>
      <AnimatePresence>
        {windows
          .filter((w) => w.state !== "minimized")
          .map((w) => {
            const app = config.apps.find((a) => a.id === w.appId);

            if (app) {
              const AppComponent = app.component;
              return (
                <WindowComponent
                  key={w.id}
                  desktopId={config.id}
                  window={w}
                  title={t(app.title as never)}
                  errorFallback={app.errorFallback}
                  retryLimit={app.retryLimit}
                  locked={config.locked}
                  singleApp={config.singleApp}
                >
                  <AppComponent />
                </WindowComponent>
              );
            }

            if (config.context.tenantSlug) {
              return (
                <WindowComponent
                  key={w.id}
                  desktopId={config.id}
                  window={w}
                  title={w.appId}
                  errorFallback={config.defaultErrorFallback}
                  retryLimit={config.defaultRetryLimit}
                  locked={config.locked}
                  singleApp={config.singleApp}
                >
                  <DynamicAppWindow
                    desktopId={config.id}
                    appId={w.appId}
                    tenantSlug={config.context.tenantSlug}
                  />
                </WindowComponent>
              );
            }

            return null;
          })}
      </AnimatePresence>
    </div>
  );
}
