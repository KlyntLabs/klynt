import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AppSummary,
  type DesktopApp,
  desktopAppsApi,
} from "@/features/desktop/api/desktop-apps-api";
import { createDesktopApp } from "@/features/desktop/desktop-manager/desktop-actions";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import { render } from "@/test/render";
import { DesktopIconGrid } from "./DesktopIconGrid";

const DESKTOP_ID = "test-desktop";
const TENANT_SLUG = "test-tenant";
const REAL_APP_ID = "real-app-id";

function createAppSummary(overrides: Partial<AppSummary> = {}): AppSummary {
  return {
    id: REAL_APP_ID,
    type: "notes",
    title: "Test Note",
    ownerId: null,
    locked: false,
    etag: "etag-1",
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("DesktopIconGrid optimistic create", () => {
  beforeEach(() => {
    useIconTreeStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("shows a temp icon, then replaces it with the real icon on API success", async () => {
    const apps = [createAppSummary()];
    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={apps}
        onOpenContextMenu={vi.fn()}
      />
    );

    expect(screen.getByTestId("desktop-empty-grid")).toBeInTheDocument();

    const deferred = createDeferred<{ data: { data: DesktopApp } }>();
    vi.spyOn(desktopAppsApi, "create").mockReturnValueOnce(
      deferred.promise as ReturnType<typeof desktopAppsApi.create>
    );

    let createPromise: Promise<DesktopApp>;

    await act(() => {
      createPromise = createDesktopApp({
        desktopId: DESKTOP_ID,
        slug: TENANT_SLUG,
        type: "notes",
        title: "Test Note",
      });
    });

    expect(screen.getByTestId(/^desktop-icon-temp-/)).toBeInTheDocument();
    expect(screen.queryByTestId(`desktop-icon-${REAL_APP_ID}`)).not.toBeInTheDocument();

    const app: DesktopApp = {
      id: REAL_APP_ID,
      type: "notes",
      title: "Test Note",
      content: {},
      menuConfig: {},
      ownerId: null,
      locked: false,
      etag: "etag-1",
    };

    deferred.resolve({ data: { data: app } });

    await act(async () => {
      await createPromise;
    });

    expect(screen.getByTestId(`desktop-icon-${REAL_APP_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId(/^desktop-icon-temp-/)).not.toBeInTheDocument();
  });

  it("removes the temp icon when the API call fails", async () => {
    const apps = [createAppSummary()];
    render(
      <DesktopIconGrid
        desktopId={DESKTOP_ID}
        tenantSlug={TENANT_SLUG}
        apps={apps}
        onOpenContextMenu={vi.fn()}
      />
    );

    const deferred = createDeferred<{ data: { data: DesktopApp } }>();
    vi.spyOn(desktopAppsApi, "create").mockReturnValueOnce(
      deferred.promise as ReturnType<typeof desktopAppsApi.create>
    );

    let createPromise: Promise<DesktopApp>;

    await act(() => {
      createPromise = createDesktopApp({
        desktopId: DESKTOP_ID,
        slug: TENANT_SLUG,
        type: "notes",
        title: "Test Note",
      });
    });

    expect(screen.getByTestId(/^desktop-icon-temp-/)).toBeInTheDocument();

    deferred.reject(new Error("Network error"));

    await act(async () => {
      await expect(createPromise).rejects.toThrow("Network error");
    });

    expect(screen.queryByTestId(/^desktop-icon-temp-/)).not.toBeInTheDocument();
    expect(screen.getByTestId("desktop-empty-grid")).toBeInTheDocument();
  });
});
