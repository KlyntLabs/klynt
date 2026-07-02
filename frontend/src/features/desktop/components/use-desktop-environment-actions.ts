import { useCallback, useState } from "react";
import type { AppSummary, AppType } from "@/features/desktop/api/desktop-apps-api";
import type { ActionContext } from "@/features/desktop/context-menu/action-registry";
import type { ContextMenuTarget } from "@/features/desktop/context-menu/menu-schema";
import { useDesktopContextMenu } from "@/features/desktop/context-menu/use-desktop-context-menu";
import {
  createDesktopApp,
  deleteDesktopApp,
} from "@/features/desktop/desktop-manager/desktop-actions";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { AppTypeId } from "../apps/app-type-registry";
import type { DesktopConfig } from "../factory/types";

type NewAppDialogState = {
  open: boolean;
  defaultType?: AppTypeId;
  parentId?: string | null;
};

type UseDesktopEnvironmentActionsResult = {
  menuState: ReturnType<typeof useDesktopContextMenu>["state"];
  closeMenu: () => void;
  newAppDialog: NewAppDialogState;
  setNewAppDialog: (state: NewAppDialogState) => void;
  actionContext: ActionContext;
  handleOpenContextMenu: (event: React.MouseEvent, appId: string, isFolder: boolean) => void;
  handleBackgroundContextMenu: (event: React.MouseEvent) => void;
  handleCreateAppFromDialog: (values: { type: AppTypeId; title: string }) => Promise<void>;
};

export function useDesktopEnvironmentActions(
  config: DesktopConfig,
  apps: AppSummary[],
  refetch: () => void,
  changeBackground: () => void
): UseDesktopEnvironmentActionsResult {
  const { openApp } = useWindowManager();
  const tenantSlug = config.context.tenantSlug ?? "";
  const { state: menuState, openMenu, closeMenu } = useDesktopContextMenu();
  const [newAppDialog, setNewAppDialog] = useState<NewAppDialogState>({ open: false });

  const handleOpenApp = useCallback(
    (appId: string) => {
      openApp(config.id, appId);
    },
    [config.id, openApp]
  );

  const handleDeleteApp = useCallback(
    async (appId: string) => {
      const app = apps.find((item) => item.id === appId);
      await deleteDesktopApp({
        desktopId: config.id,
        slug: tenantSlug,
        appId,
        isLocked: app?.locked,
      });
    },
    [apps, config.id, tenantSlug]
  );

  const handleCreateAppFromMenu = useCallback(async (type: AppType, parentId?: string | null) => {
    setNewAppDialog({
      open: true,
      defaultType: type as AppTypeId,
      parentId: parentId ?? null,
    });
  }, []);

  const handleCreateAppFromDialog = useCallback(
    async (values: { type: AppTypeId; title: string }) => {
      const app = await createDesktopApp({
        desktopId: config.id,
        slug: tenantSlug,
        type: values.type,
        title: values.title,
        parentId: newAppDialog.parentId,
      });
      handleOpenApp(app.id);
    },
    [config.id, tenantSlug, newAppDialog.parentId, handleOpenApp]
  );

  const handleOpenContextMenu = useCallback(
    (event: React.MouseEvent, appId: string, isFolder: boolean) => {
      const target: ContextMenuTarget = isFolder
        ? { kind: "folder", folderId: appId, desktopId: config.id }
        : { kind: "icon", appId, desktopId: config.id };
      openMenu(event, target);
    },
    [config.id, openMenu]
  );

  const handleBackgroundContextMenu = useCallback(
    (event: React.MouseEvent) => {
      openMenu(event, { kind: "desktop", desktopId: config.id });
    },
    [config.id, openMenu]
  );

  const actionContext: ActionContext = {
    target: menuState.open ? menuState.target : { kind: "desktop", desktopId: config.id },
    tenantSlug,
    userRole: config.context.tenantRole,
    openApp: handleOpenApp,
    createApp: handleCreateAppFromMenu,
    deleteApp: handleDeleteApp,
    refreshDesktop: refetch,
    changeBackground,
  };

  return {
    menuState,
    closeMenu,
    newAppDialog,
    setNewAppDialog,
    actionContext,
    handleOpenContextMenu,
    handleBackgroundContextMenu,
    handleCreateAppFromDialog,
  };
}
