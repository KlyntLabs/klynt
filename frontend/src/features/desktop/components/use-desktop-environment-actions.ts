import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { type AppSummary, AppType, desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";
import type { ActionContext } from "@/features/desktop/context-menu/action-registry";
import type { ContextMenuTarget } from "@/features/desktop/context-menu/menu-schema";
import { useDesktopContextMenu } from "@/features/desktop/context-menu/use-desktop-context-menu";
import {
  createDesktopApp,
  deleteDesktopApp,
} from "@/features/desktop/desktop-manager/desktop-actions";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import type { AppTypeId } from "../apps/app-type-registry";
import type { DesktopConfig } from "../factory/types";
import { useDesktopShortcuts } from "./use-desktop-shortcuts";

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
  selectedAppId: string | null;
  setSelectedAppId: (appId: string | null) => void;
};

export function useDesktopEnvironmentActions(
  config: DesktopConfig,
  apps: AppSummary[],
  refetch: () => void,
  changeBackground: () => void
): UseDesktopEnvironmentActionsResult {
  const queryClient = useQueryClient();
  const { openApp } = useWindowManager();
  const tenantSlug = config.context.tenantSlug ?? "";
  const { state: menuState, openMenu, closeMenu } = useDesktopContextMenu();
  const [newAppDialog, setNewAppDialog] = useState<NewAppDialogState>({ open: false });
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const handleOpenApp = useCallback(
    (appId: string) => {
      openApp(config.id, appId);
    },
    [config.id, openApp]
  );

  const refreshBundleInBackground = useCallback(() => {
    desktopAppsApi
      .getDesktop(tenantSlug)
      .then((response) => {
        const bundle = response.data.data;
        useIconTreeStore.getState().setBundleEtag(config.id, bundle.etag);
        queryClient.setQueryData(["desktop-bundle", tenantSlug], bundle);
      })
      .catch((error) => {
        console.error("Failed to refresh desktop bundle:", error);
      });
  }, [tenantSlug, queryClient, config.id]);

  const handleDeleteApp = useCallback(
    async (appId: string) => {
      const app = apps.find((item) => item.id === appId);
      try {
        await deleteDesktopApp({
          desktopId: config.id,
          slug: tenantSlug,
          appId,
          isLocked: app?.locked,
        });
        refreshBundleInBackground();
      } catch (error) {
        console.error("Failed to delete app:", error);
      }
    },
    [apps, config.id, tenantSlug, refreshBundleInBackground]
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
      if (values.type !== "folder") {
        handleOpenApp(app.id);
      }
      refreshBundleInBackground();
    },
    [config.id, tenantSlug, newAppDialog.parentId, handleOpenApp, refreshBundleInBackground]
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

  const handleOpenSelected = useCallback(() => {
    if (!selectedAppId) return;
    const app = apps.find((item) => item.id === selectedAppId);
    const tree = useIconTreeStore.getState().trees[config.id] ?? [];
    const node = tree.find((item) => item.appId === selectedAppId);
    const isFolder = app?.type === "folder" || node?.children !== undefined;
    if (isFolder) {
      useIconTreeStore.getState().openFolder(config.id, selectedAppId);
    } else {
      handleOpenApp(selectedAppId);
    }
  }, [selectedAppId, apps, config.id, handleOpenApp]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedAppId) return;
    await handleDeleteApp(selectedAppId);
    setSelectedAppId(null);
  }, [selectedAppId, handleDeleteApp]);

  const handleNewApp = useCallback(() => {
    setNewAppDialog({ open: true, defaultType: "folder" });
  }, []);

  const handleCloseOverlay = useCallback(() => {
    closeMenu();
    setNewAppDialog({ open: false });
  }, [closeMenu]);

  useDesktopShortcuts({
    onNewApp: handleNewApp,
    onDeleteSelected: handleDeleteSelected,
    onOpenSelected: handleOpenSelected,
    onRefresh: refetch,
    onCloseOverlay: handleCloseOverlay,
    selectedAppId,
  });

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
    selectedAppId,
    setSelectedAppId,
  };
}
