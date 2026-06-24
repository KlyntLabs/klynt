import type { LoadResult, PersistenceAdapter, SaveResult } from "./types";

export function createNoOpAdapter(canEdit = false): PersistenceAdapter {
  return {
    async load(): Promise<LoadResult> {
      return { ok: true, layout: null };
    },

    async save(): Promise<SaveResult> {
      return { ok: true };
    },

    canEdit() {
      return canEdit;
    },
  };
}
