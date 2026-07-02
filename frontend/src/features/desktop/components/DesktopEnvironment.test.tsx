import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import { render } from "@/test/render";
import type { DesktopConfig } from "../factory/types";
import { createNoOpAdapter } from "../persistence/no-op-adapter";
import { DesktopEnvironment } from "./DesktopEnvironment";

vi.mock("@/features/desktop/api/desktop-apps-api", () => ({
  desktopAppsApi: {
    getDesktop: vi.fn(),
    getApp: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockConfig: DesktopConfig = {
  id: "test",
  title: "Test Desktop",
  apps: [],
  menubar: { brand: { label: "Klynt" }, menus: [], trailing: [] },
  background: { presetId: "fabric" },
  persistence: createNoOpAdapter(),
  context: { user: null },
};

const tenantConfig: DesktopConfig = {
  ...mockConfig,
  id: "tenant-test",
  context: { user: null, tenantSlug: "acme", tenantRole: "admin" },
  persistence: createNoOpAdapter(true),
};

describe("DesktopEnvironment", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
    vi.clearAllMocks();
  });

  it("renders the desktop title and menubar brand", async () => {
    render(<DesktopEnvironment config={mockConfig} />);
    expect(await screen.findByText("Klynt")).toBeInTheDocument();
  });

  it("renders the icon grid when apps and icon tree exist", async () => {
    const mockedGetDesktop = vi.mocked(desktopAppsApi.getDesktop);
    mockedGetDesktop.mockResolvedValue({
      data: {
        data: {
          etag: "bundle-etag-1",
          apps: [
            {
              id: "app-1",
              type: "markdown",
              title: "Notes",
              owner_id: null,
              locked: false,
              etag: "1",
            },
            {
              id: "folder-1",
              type: "folder",
              title: "My Folder",
              owner_id: null,
              locked: false,
              etag: "2",
            },
          ],
        },
      },
    } as never);

    useIconTreeStore.getState().setTree(tenantConfig.id, [
      { appId: "app-1", x: 0, y: 0 },
      { appId: "folder-1", x: 0, y: 0 },
    ]);

    render(<DesktopEnvironment config={tenantConfig} />);

    await waitFor(() => {
      expect(screen.getByTestId("desktop-icon-grid")).toBeInTheDocument();
    });

    expect(screen.getByTestId("desktop-icon-app-1")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-icon-folder-1")).toBeInTheDocument();
  });
});
