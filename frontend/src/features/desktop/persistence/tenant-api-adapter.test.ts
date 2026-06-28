import { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import { tenantLayoutApi } from "@/features/tenant/api/tenant-layout-api";
import { createTenantApiAdapter } from "./tenant-api-adapter";
import type { DesktopLayout } from "./types";

const slug = "acme";
const layout: DesktopLayout = {
  version: 1,
  backgroundPresetId: "fabric",
  icons: [],
  windows: [],
};

function axiosError(status: number): AxiosError {
  const error = new AxiosError("Request failed");
  error.response = {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: {} as never,
  };
  return error;
}

describe("createTenantApiAdapter", () => {
  it("reflects the configured edit permission", () => {
    const editable = createTenantApiAdapter({ slug, canEditShared: true });
    expect(editable.canEdit()).toBe(true);

    const readonly = createTenantApiAdapter({ slug, canEditShared: false });
    expect(readonly.canEdit()).toBe(false);
  });

  it("loads a shared layout and strips the etag", async () => {
    const getSharedSpy = vi.spyOn(tenantLayoutApi, "getShared").mockResolvedValue({
      data: { data: { ...layout, etag: "v1" } },
    } as never);

    const adapter = createTenantApiAdapter({ slug, canEditShared: false });
    const result = await adapter.load("desktop-1");

    expect(getSharedSpy).toHaveBeenCalledWith(slug);
    expect(result).toEqual({ ok: true, layout });

    getSharedSpy.mockRestore();
  });

  it("returns a retryable network error when loading fails", async () => {
    const getSharedSpy = vi
      .spyOn(tenantLayoutApi, "getShared")
      .mockRejectedValue(new Error("boom"));

    const adapter = createTenantApiAdapter({ slug, canEditShared: false });
    const result = await adapter.load("desktop-1");

    expect(result).toEqual({ ok: false, error: "network", retryable: true });

    getSharedSpy.mockRestore();
  });

  it("saves a layout using the etag from the last load", async () => {
    const getSharedSpy = vi.spyOn(tenantLayoutApi, "getShared").mockResolvedValue({
      data: { data: { ...layout, etag: "v1" } },
    } as never);
    const updateSharedSpy = vi.spyOn(tenantLayoutApi, "updateShared").mockResolvedValue({
      data: { data: { ...layout, etag: "v2" } },
    } as never);

    const adapter = createTenantApiAdapter({ slug, canEditShared: true });
    await adapter.load("desktop-1");
    const result = await adapter.save("desktop-1", layout);

    expect(updateSharedSpy).toHaveBeenCalledWith(slug, layout, "v1");
    expect(result).toEqual({ ok: true });

    getSharedSpy.mockRestore();
    updateSharedSpy.mockRestore();
  });

  it("refuses to save when the user cannot edit shared layouts", async () => {
    const adapter = createTenantApiAdapter({ slug, canEditShared: false });
    const result = await adapter.save("desktop-1", layout);

    expect(result).toEqual({ ok: false, error: "forbidden", retryable: false });
  });

  it("returns a conflict error on 409 responses", async () => {
    const updateSharedSpy = vi
      .spyOn(tenantLayoutApi, "updateShared")
      .mockRejectedValue(axiosError(409));

    const adapter = createTenantApiAdapter({ slug, canEditShared: true });
    const result = await adapter.save("desktop-1", layout);

    expect(result).toEqual({ ok: false, error: "conflict", retryable: true });

    updateSharedSpy.mockRestore();
  });

  it("returns a forbidden error on 403 responses", async () => {
    const updateSharedSpy = vi
      .spyOn(tenantLayoutApi, "updateShared")
      .mockRejectedValue(axiosError(403));

    const adapter = createTenantApiAdapter({ slug, canEditShared: true });
    const result = await adapter.save("desktop-1", layout);

    expect(result).toEqual({ ok: false, error: "forbidden", retryable: false });

    updateSharedSpy.mockRestore();
  });

  it("returns a retryable network error for other save failures", async () => {
    const updateSharedSpy = vi
      .spyOn(tenantLayoutApi, "updateShared")
      .mockRejectedValue(new Error("boom"));

    const adapter = createTenantApiAdapter({ slug, canEditShared: true });
    const result = await adapter.save("desktop-1", layout);

    expect(result).toEqual({ ok: false, error: "network", retryable: true });

    updateSharedSpy.mockRestore();
  });
});
