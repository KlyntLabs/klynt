import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/core/api/api-client";

import { type CreateAppPayload, desktopAppsApi, type UpdateAppPayload } from "./desktop-apps-api";

vi.mock("@/core/api/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("desktopAppsApi", () => {
  const slug = "acme";
  const appId = "app-123";

  it("creates a desktop app", () => {
    const payload: CreateAppPayload = {
      type: "markdown",
      title: "Notes",
      content: { body: "hello" },
    };
    desktopAppsApi.create(slug, payload);
    expect(apiClient.post).toHaveBeenCalledWith(`/tenants/${slug}/desktop/apps`, payload);
  });

  it("fetches the desktop bundle", () => {
    desktopAppsApi.getDesktop(slug);
    expect(apiClient.get).toHaveBeenCalledWith(`/tenants/${slug}/desktop`);
  });

  it("fetches a single app", () => {
    desktopAppsApi.getApp(slug, appId);
    expect(apiClient.get).toHaveBeenCalledWith(`/tenants/${slug}/apps/${appId}`);
  });

  it("updates an app", () => {
    const payload: UpdateAppPayload = {
      etag: "abc",
      title: "Updated",
    };
    const signal = new AbortController().signal;
    desktopAppsApi.update(slug, appId, payload, { signal });
    expect(apiClient.patch).toHaveBeenCalledWith(`/tenants/${slug}/apps/${appId}`, payload, {
      signal,
    });
  });

  it("updates an app without a signal", () => {
    const payload: UpdateAppPayload = { etag: "abc" };
    desktopAppsApi.update(slug, appId, payload);
    expect(apiClient.patch).toHaveBeenCalledWith(`/tenants/${slug}/apps/${appId}`, payload, {
      signal: undefined,
    });
  });

  it("deletes an app", () => {
    desktopAppsApi.delete(slug, appId);
    expect(apiClient.delete).toHaveBeenCalledWith(`/tenants/${slug}/apps/${appId}`);
  });
});
