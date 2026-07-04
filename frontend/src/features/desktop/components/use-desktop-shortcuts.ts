import { useEffect } from "react";
import type { AppTypeId } from "@/features/desktop/apps/app-type-registry";

export type DesktopShortcutsOptions = {
  onNewApp?: (type: AppTypeId) => void;
  onDeleteSelected?: () => void;
  onOpenSelected?: () => void;
  onRefresh?: () => void;
  onCloseOverlay?: () => void;
  selectedAppId?: string | null;
  defaultNewAppType?: AppTypeId;
};

function isInputTarget(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.getAttribute("contenteditable") === "true" ||
    target.isContentEditable
  );
}

function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey;
}

function isNewAppShortcut(event: KeyboardEvent): boolean {
  // Ctrl/Cmd+Shift+D is used instead of +N to avoid conflicting with the
  // browser's native "New Window" / "New Incognito Window" shortcuts.
  return (
    event.key.toLowerCase() === "d" && event.shiftKey && hasPrimaryModifier(event) && !event.altKey
  );
}

function isRefreshShortcut(event: KeyboardEvent): boolean {
  return (
    event.key.toLowerCase() === "r" && hasPrimaryModifier(event) && !event.shiftKey && !event.altKey
  );
}

export function useDesktopShortcuts(options: DesktopShortcutsOptions): void {
  const {
    onNewApp,
    onDeleteSelected,
    onOpenSelected,
    onRefresh,
    onCloseOverlay,
    selectedAppId,
    defaultNewAppType = "folder",
  } = options;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isInputTarget(event)) return;

      if (isNewAppShortcut(event)) {
        event.preventDefault();
        onNewApp?.(defaultNewAppType);
        return;
      }

      if (isRefreshShortcut(event)) {
        event.preventDefault();
        onRefresh?.();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseOverlay?.();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedAppId) {
        event.preventDefault();
        onDeleteSelected?.();
        return;
      }

      if ((event.key === "Enter" || event.key === " ") && selectedAppId) {
        event.preventDefault();
        onOpenSelected?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onNewApp,
    onDeleteSelected,
    onOpenSelected,
    onRefresh,
    onCloseOverlay,
    selectedAppId,
    defaultNewAppType,
  ]);
}
