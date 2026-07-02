import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToastStore } from "@/core/notifications/toast-store";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import type { DesktopConfig } from "../factory/types";
import type { DesktopLayout } from "../persistence/types";
import type { Window } from "../window-manager/window-module";

export function useDesktopLayoutSave(
  config: DesktopConfig,
  desktopWindows: Window[],
  backgroundPresetId: string,
  isLoading: boolean,
  isBelowLg: boolean,
  isOsDesktop: boolean,
  handleReload: () => void
): void {
  const { t } = useTranslation("home");
  const configRef = useRef(config);
  configRef.current = config;
  const addToast = useToastStore((state) => state.addToast);
  const iconTree = useIconTreeStore((s) => s.trees[config.id]);

  useEffect(() => {
    if (isLoading) return;
    if (isBelowLg && isOsDesktop) return;
    if (!configRef.current.persistence.canEdit()) return;

    const layout: DesktopLayout = {
      version: 1,
      backgroundPresetId,
      iconTree: iconTree ?? [],
      windows: desktopWindows.map((window) => ({
        appId: window.appId,
        x: window.x,
        y: window.y,
        width: window.width,
        height: window.height,
        state: window.state,
      })),
    };

    configRef.current.persistence.save(config.id, layout).then((result) => {
      if (!result.ok) {
        if (result.error === "conflict") {
          addToast({
            message: t("desktop.toast.layoutSaveError"),
            type: "error",
            duration: 10000,
            action: {
              label: t("desktop.conflict.reload"),
              onClick: handleReload,
            },
          });
          return;
        }

        addToast({
          message: t("desktop.toast.layoutSaveError"),
          type: "error",
          duration: 5000,
        });
      }
    });
  }, [
    isBelowLg,
    isOsDesktop,
    desktopWindows,
    backgroundPresetId,
    config.id,
    isLoading,
    iconTree,
    t,
    addToast,
    handleReload,
  ]);
}
