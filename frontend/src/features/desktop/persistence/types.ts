export type BackgroundConfig = {
  presetId: string;
};

export type DesktopLayout = {
  version: number;
  backgroundPresetId: string;
  icons?: Array<{ appId: string; x: number; y: number }>;
  windows: Array<{
    appId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    state: "normal" | "minimized" | "maximized";
  }>;
};

export type LoadResult =
  | { ok: true; layout: DesktopLayout | null }
  | { ok: false; error: "network" | "not-found" | "forbidden" | "unknown"; retryable: boolean };

export type SaveResult =
  | { ok: true }
  | {
      ok: false;
      error: "network" | "conflict" | "forbidden" | "validation" | "unknown";
      retryable: boolean;
    };

export interface PersistenceAdapter {
  load(desktopId: string): Promise<LoadResult>;
  save(desktopId: string, layout: DesktopLayout): Promise<SaveResult>;
  canEdit(): boolean;
  isLoading?: boolean;
  isSyncing?: boolean;
  lastError?: LoadResult | SaveResult | null;
}
