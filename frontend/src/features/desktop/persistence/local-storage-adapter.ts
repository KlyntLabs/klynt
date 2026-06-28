import type { DesktopLayout, LoadResult, PersistenceAdapter, SaveResult } from "./types";

function storageKey(desktopId: string): string {
  return `klynt-desktop-layout:${desktopId}`;
}

export function createLocalStorageAdapter(canEdit = true): PersistenceAdapter {
  const adapter: PersistenceAdapter = {
    async load(desktopId: string): Promise<LoadResult> {
      try {
        const raw = localStorage.getItem(storageKey(desktopId));
        if (raw === null) {
          return { ok: true, layout: null };
        }
        const layout: DesktopLayout = JSON.parse(raw) as DesktopLayout;
        return { ok: true, layout };
      } catch {
        return { ok: false, error: "unknown", retryable: false };
      }
    },

    async save(desktopId: string, layout: DesktopLayout): Promise<SaveResult> {
      try {
        localStorage.setItem(storageKey(desktopId), JSON.stringify(layout));
        return { ok: true };
      } catch {
        return { ok: false, error: "unknown", retryable: false };
      }
    },

    canEdit() {
      return canEdit;
    },
  };

  return adapter;
}
