import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type DesktopApp, desktopAppsApi } from "@/features/desktop/api/desktop-apps-api";
import * as dynamicAppManifest from "@/features/desktop/apps/dynamic-app-manifest";
import { DynamicAppWindow } from "@/features/desktop/apps/dynamic-app-window";
import { render } from "@/test/render";

const slug = "acme";
const appId = "app-1";

function makeApp(): DesktopApp {
  return {
    id: appId,
    type: "notes",
    title: "My Notes",
    content: { text: "Hello" },
    menuConfig: {},
    ownerId: null,
    locked: false,
    etag: "etag-1",
  };
}

function makeGetAppResponse() {
  return {
    data: { data: makeApp() },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as never,
  };
}

describe("DynamicAppWindow", () => {
  beforeEach(() => {
    vi.spyOn(desktopAppsApi, "update").mockResolvedValue(makeGetAppResponse());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a spinner while the app is loading", () => {
    vi.spyOn(desktopAppsApi, "getApp").mockReturnValue(new Promise(() => {}));

    render(<DynamicAppWindow desktopId="desktop-1" appId={appId} tenantSlug={slug} />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("renders the renderer switch when the app loads", async () => {
    const getAppSpy = vi.spyOn(desktopAppsApi, "getApp").mockResolvedValue(makeGetAppResponse());

    render(<DynamicAppWindow desktopId="desktop-1" appId={appId} tenantSlug={slug} />);

    await waitFor(() => {
      expect(screen.getByTestId("dynamic-app-window")).toBeInTheDocument();
    });

    expect(screen.getByTestId("notes-editor")).toBeInTheDocument();
    expect(screen.getByText("My Notes")).toBeInTheDocument();
    expect(getAppSpy).toHaveBeenCalledWith(slug, appId);
  });

  it("shows an error message when the app fails to load", async () => {
    vi.spyOn(desktopAppsApi, "getApp").mockRejectedValue(new Error("boom"));

    render(<DynamicAppWindow desktopId="desktop-1" appId={appId} tenantSlug={slug} />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load this data/i)).toBeInTheDocument();
    });
  });

  it("shows an empty state when the app has an unknown renderer", async () => {
    vi.spyOn(desktopAppsApi, "getApp").mockResolvedValue(makeGetAppResponse());
    vi.spyOn(dynamicAppManifest, "buildAppManifest").mockReturnValue({
      appId,
      type: "notes",
      title: "My Notes",
      icon: "sticky-note",
      content: {},
      menuSchema: { id: "notes-menu", root: [] },
      rendererId: "unknown",
      locked: false,
      etag: "etag-1",
    });

    render(<DynamicAppWindow desktopId="desktop-1" appId={appId} tenantSlug={slug} />);

    await waitFor(() => {
      expect(screen.getByTestId("dynamic-app-empty-state")).toHaveTextContent("Unknown app type");
    });
  });
});
