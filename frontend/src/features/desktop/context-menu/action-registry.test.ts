import { describe, expect, it, vi } from "vitest";
import { type ActionContext, executeContextMenuAction } from "./action-registry";

function createMockContext(overrides?: Partial<ActionContext>): ActionContext {
  return {
    target: { kind: "desktop", desktopId: "desktop-1" },
    tenantSlug: "tenant-1",
    openApp: vi.fn(),
    createApp: vi.fn().mockResolvedValue(undefined),
    deleteApp: vi.fn().mockResolvedValue(undefined),
    refreshDesktop: vi.fn(),
    changeBackground: vi.fn(),
    ...overrides,
  };
}

describe("executeContextMenuAction", () => {
  it("desktop:new-folder calls createApp with folder type and null parent on desktop target", async () => {
    const ctx = createMockContext();
    await executeContextMenuAction("desktop:new-folder", ctx);
    expect(ctx.createApp).toHaveBeenCalledWith("folder", null);
  });

  it("desktop:new-folder passes folder id when target is a folder", async () => {
    const ctx = createMockContext({
      target: { kind: "folder", folderId: "folder-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("desktop:new-folder", ctx);
    expect(ctx.createApp).toHaveBeenCalledWith("folder", "folder-1");
  });

  it("desktop:new-markdown calls createApp with markdown type and parent id", async () => {
    const ctx = createMockContext({
      target: { kind: "folder", folderId: "folder-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("desktop:new-markdown", ctx);
    expect(ctx.createApp).toHaveBeenCalledWith("markdown", "folder-1");
  });

  it("desktop:new-notes calls createApp with notes type and null parent on desktop target", async () => {
    const ctx = createMockContext();
    await executeContextMenuAction("desktop:new-notes", ctx);
    expect(ctx.createApp).toHaveBeenCalledWith("notes", null);
  });

  it("desktop:new-video calls createApp with video type and null parent on desktop target", async () => {
    const ctx = createMockContext();
    await executeContextMenuAction("desktop:new-video", ctx);
    expect(ctx.createApp).toHaveBeenCalledWith("video", null);
  });

  it("desktop:paste is a no-op", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("desktop:paste", ctx)).resolves.toBeUndefined();
    expect(ctx.createApp).not.toHaveBeenCalled();
  });

  it("desktop:refresh calls refreshDesktop", async () => {
    const ctx = createMockContext();
    await executeContextMenuAction("desktop:refresh", ctx);
    expect(ctx.refreshDesktop).toHaveBeenCalled();
  });

  it("desktop:change-background calls changeBackground", async () => {
    const ctx = createMockContext();
    await executeContextMenuAction("desktop:change-background", ctx);
    expect(ctx.changeBackground).toHaveBeenCalled();
  });

  it("app:open calls openApp with target.appId for icon target", async () => {
    const ctx = createMockContext({
      target: { kind: "icon", appId: "app-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("app:open", ctx);
    expect(ctx.openApp).toHaveBeenCalledWith("app-1");
  });

  it("app:open calls openApp with folderId for folder target", async () => {
    const ctx = createMockContext({
      target: { kind: "folder", folderId: "folder-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("app:open", ctx);
    expect(ctx.openApp).toHaveBeenCalledWith("folder-1");
  });

  it("app:rename is a no-op", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("app:rename", ctx)).resolves.toBeUndefined();
    expect(ctx.createApp).not.toHaveBeenCalled();
  });

  it("app:delete calls deleteApp with target.appId for icon target", async () => {
    const ctx = createMockContext({
      target: { kind: "icon", appId: "app-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("app:delete", ctx);
    expect(ctx.deleteApp).toHaveBeenCalledWith("app-1");
  });

  it("app:delete calls deleteApp with folderId for folder target", async () => {
    const ctx = createMockContext({
      target: { kind: "folder", folderId: "folder-1", desktopId: "desktop-1" },
    });
    await executeContextMenuAction("app:delete", ctx);
    expect(ctx.deleteApp).toHaveBeenCalledWith("folder-1");
  });

  it("app:cut is a no-op", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("app:cut", ctx)).resolves.toBeUndefined();
    expect(ctx.createApp).not.toHaveBeenCalled();
  });

  it("app:copy is a no-op", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("app:copy", ctx)).resolves.toBeUndefined();
    expect(ctx.createApp).not.toHaveBeenCalled();
  });

  it("custom action ids are no-ops", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("custom:foo", ctx)).resolves.toBeUndefined();
    expect(ctx.createApp).not.toHaveBeenCalled();
  });

  it("throws for unknown action ids", async () => {
    const ctx = createMockContext();
    await expect(executeContextMenuAction("unknown:action" as never, ctx)).rejects.toThrow(
      "Unknown context menu action: unknown:action"
    );
  });

  it("does nothing when optional callbacks are missing", async () => {
    const ctx = createMockContext({
      openApp: undefined,
      createApp: undefined,
      deleteApp: undefined,
      refreshDesktop: undefined,
      changeBackground: undefined,
    });
    await expect(executeContextMenuAction("desktop:refresh", ctx)).resolves.toBeUndefined();
    await expect(executeContextMenuAction("app:open", ctx)).resolves.toBeUndefined();
  });
});
