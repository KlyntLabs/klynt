import { AxiosError } from "axios";
import { tenantLayoutApi } from "@/features/tenant/api/tenant-layout-api";
import type { DesktopLayout, LoadResult, PersistenceAdapter, SaveResult } from "./types";

type TenantApiAdapterOptions = {
  slug: string;
  canEditShared: boolean;
};

export function createTenantApiAdapter(options: TenantApiAdapterOptions): PersistenceAdapter {
  let etag: string | null = null;

  return {
    canEdit: () => options.canEditShared,

    async load(_desktopId): Promise<LoadResult> {
      try {
        const shared = await tenantLayoutApi.getShared(options.slug);
        etag = shared.data.data.etag;
        const { etag: _, ...layout } = shared.data.data;
        return { ok: true, layout: layout as DesktopLayout };
      } catch {
        return { ok: false, error: "network", retryable: true };
      }
    },

    async save(_desktopId, layout): Promise<SaveResult> {
      if (!options.canEditShared) return { ok: false, error: "forbidden", retryable: false };
      try {
        const result = await tenantLayoutApi.updateShared(options.slug, layout, etag ?? "");
        etag = result.data.data.etag;
        return { ok: true };
      } catch (err) {
        const axiosError = err instanceof AxiosError ? err : null;
        if (axiosError?.response?.status === 409)
          return { ok: false, error: "conflict", retryable: true };
        if (axiosError?.response?.status === 403)
          return { ok: false, error: "forbidden", retryable: false };
        return { ok: false, error: "network", retryable: true };
      }
    },
  };
}
