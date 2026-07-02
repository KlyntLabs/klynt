import type { AppType } from "../api/desktop-apps-api";
import type { ContextMenuActionId, ContextMenuTarget } from "./menu-schema";

export type ActionContext = {
  target: ContextMenuTarget;
  tenantSlug: string;
  userRole?: "owner" | "admin" | "member" | "guest";
  openApp?: (appId: string) => void;
  createApp?: (type: AppType, parentId?: string | null) => Promise<void>;
  deleteApp?: (appId: string) => Promise<void>;
  refreshDesktop?: () => void;
  changeBackground?: () => void;
};

export type ActionHandler = (ctx: ActionContext) => void | Promise<void>;

function targetFolderId(target: ContextMenuTarget): string | null {
  return target.kind === "folder" ? target.folderId : null;
}

const contextMenuActionRegistryImpl: Record<
  Exclude<ContextMenuActionId, `custom:${string}`>,
  ActionHandler
> = {
  "desktop:new-folder": (ctx) => ctx.createApp?.("folder", targetFolderId(ctx.target)),
  "desktop:new-markdown": (ctx) => ctx.createApp?.("markdown", targetFolderId(ctx.target) ?? null),
  "desktop:new-notes": (ctx) => ctx.createApp?.("notes", targetFolderId(ctx.target) ?? null),
  "desktop:new-video": (ctx) => ctx.createApp?.("video", targetFolderId(ctx.target) ?? null),
  "desktop:paste": () => {
    // Placeholder: clipboard paste will be wired in Task 5.1.
  },
  "desktop:refresh": (ctx) => ctx.refreshDesktop?.(),
  "desktop:change-background": (ctx) => ctx.changeBackground?.(),
  "app:open": (ctx) => {
    if (ctx.target.kind === "icon") {
      ctx.openApp?.(ctx.target.appId);
    } else if (ctx.target.kind === "folder") {
      ctx.openApp?.(ctx.target.folderId);
    }
  },
  "app:rename": () => {
    // Placeholder: real rename will open an inline dialog in Task 5.1.
  },
  "app:delete": (ctx) => {
    if (ctx.target.kind === "icon") {
      ctx.deleteApp?.(ctx.target.appId);
    } else if (ctx.target.kind === "folder") {
      ctx.deleteApp?.(ctx.target.folderId);
    }
  },
  "app:cut": () => {
    // Placeholder: clipboard cut will be wired in Task 5.1.
  },
  "app:copy": () => {
    // Placeholder: clipboard copy will be wired in Task 5.1.
  },
};

export const contextMenuActionRegistry: Record<ContextMenuActionId, ActionHandler> =
  contextMenuActionRegistryImpl as Record<ContextMenuActionId, ActionHandler>;

export async function executeContextMenuAction(
  actionId: ContextMenuActionId,
  ctx: ActionContext
): Promise<void> {
  if (actionId.startsWith("custom:")) {
    return;
  }

  const knownActionId = actionId as keyof typeof contextMenuActionRegistryImpl;
  const handler = contextMenuActionRegistryImpl[knownActionId];
  if (!handler) {
    throw new Error(`Unknown context menu action: ${actionId}`);
  }

  await handler(ctx);
}
