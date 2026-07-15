import { Button } from "@astryxdesign/core/Button";
import { type ToastDismissFn, useToast } from "@astryxdesign/core/Toast";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { IconTreeNode } from "@/features/desktop/desktop-manager/icon-tree-module";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import type { DesktopConfig } from "../factory/types";
import type { DesktopLayout } from "../persistence/types";
import type { Window } from "../window-manager/window-module";

const SAVE_DEBOUNCE_MS = 500;

function roundIconTree(tree: IconTreeNode[]): IconTreeNode[] {
  return tree.map((node) => ({
    ...node,
    x: Math.round(node.x),
    y: Math.round(node.y),
    children: node.children ? roundIconTree(node.children) : undefined,
  }));
}

function normalizeLayout(layout: DesktopLayout): DesktopLayout {
  return {
    ...layout,
    iconTree: roundIconTree(layout.iconTree),
    windows: layout.windows.map((window) => ({
      ...window,
      x: Math.round(window.x),
      y: Math.round(window.y),
      width: Math.round(window.width),
      height: Math.round(window.height),
    })),
  };
}

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
  const toast = useToast();
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

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      configRef.current.persistence.save(config.id, normalizeLayout(layout)).then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          if (result.error === "conflict") {
            // The old store modelled an `action: { label, onClick }` that the container turned
            // into a button. Astryx has a first-class slot for it — `endContent` — so the
            // button is passed straight in, and `toast()` hands back the dismiss function that
            // retires this toast once the user has acted on it.
            let dismiss: ToastDismissFn | undefined;
            dismiss = toast({
              body: t("desktop.toast.layoutSaveError"),
              type: "error",
              isAutoHide: true,
              autoHideDuration: 10000,
              endContent: (
                <Button
                  variant="secondary"
                  size="sm"
                  label={t("desktop.conflict.reload")}
                  onClick={() => {
                    handleReload();
                    dismiss?.();
                  }}
                />
              ),
            });
            return;
          }

          toast({
            body: t("desktop.toast.layoutSaveError"),
            type: "error",
            isAutoHide: true,
            autoHideDuration: 5000,
          });
        }
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    isBelowLg,
    isOsDesktop,
    desktopWindows,
    backgroundPresetId,
    config.id,
    isLoading,
    iconTree,
    t,
    toast,
    handleReload,
  ]);
}
