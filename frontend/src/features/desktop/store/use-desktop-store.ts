import type { WritableDraft } from "immer";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type WindowState = {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: "normal" | "minimized" | "maximized";
  zIndex: number;
};

type DesktopViewMode = "desktop" | "website";

type DesktopState = {
  activeDesktopId: string | null;
  windows: Record<string, WindowState[]>;
  activeWindowId: Record<string, string | null>;
  viewMode: DesktopViewMode;
  nextZIndex: number;

  setActiveDesktop: (id: string) => void;
  openApp: (desktopId: string, appId: string, defaultRect?: Partial<WindowState>) => void;
  closeWindow: (desktopId: string, windowId: string) => void;
  focusWindow: (desktopId: string, windowId: string) => void;
  moveWindow: (
    desktopId: string,
    windowId: string,
    rect: Omit<WindowState, "id" | "appId" | "state" | "zIndex">
  ) => void;
  minimizeWindow: (desktopId: string, windowId: string) => void;
  maximizeWindow: (desktopId: string, windowId: string) => void;
  restoreWindow: (desktopId: string, windowId: string) => void;
  setViewMode: (mode: DesktopViewMode) => void;
  reset: () => void;
};

const DEFAULT_WINDOW_WIDTH = 680;
const DEFAULT_WINDOW_HEIGHT = 520;
const Z_INDEX_BASE = 100;
const Z_INDEX_COMPACT_THRESHOLD = 10000;

const compactZIndexes = (draft: WritableDraft<DesktopState>) => {
  const allWindows = Object.values(draft.windows).flat();
  const sorted = allWindows.slice().sort((a, b) => a.zIndex - b.zIndex);
  sorted.forEach((w, index) => {
    w.zIndex = Z_INDEX_BASE + index;
  });
  draft.nextZIndex = Z_INDEX_BASE + sorted.length + 1;
};

const maybeCompactZIndexes = (draft: WritableDraft<DesktopState>) => {
  if (draft.nextZIndex > Z_INDEX_COMPACT_THRESHOLD) {
    compactZIndexes(draft);
  }
};

const generateId = (): string => {
  try {
    return nanoid();
  } catch {
    return crypto.randomUUID();
  }
};

const getCenteredRect = (width: number, height: number) => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return {
    x: Math.max(16, (vw - width) / 2),
    y: Math.max(48, (vh - height) / 2 - 36),
    width,
    height,
  };
};

const initialState = {
  activeDesktopId: null,
  windows: {},
  activeWindowId: {},
  viewMode: "desktop" as DesktopViewMode,
  nextZIndex: 100,
};

export const useDesktopStore = create<DesktopState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setActiveDesktop: (id) =>
        set((draft) => {
          draft.activeDesktopId = id;
        }),

      openApp: (desktopId, appId, defaultRect) =>
        set((draft) => {
          const desktopWindows = draft.windows[desktopId] ?? [];
          const existing = desktopWindows.find((w) => w.appId === appId);

          if (existing) {
            existing.state = "normal";
            existing.zIndex = draft.nextZIndex;
            draft.nextZIndex += 1;
            maybeCompactZIndexes(draft);
            draft.activeWindowId[desktopId] = existing.id;
            return;
          }

          const width = defaultRect?.width ?? DEFAULT_WINDOW_WIDTH;
          const height = defaultRect?.height ?? DEFAULT_WINDOW_HEIGHT;
          const rect = getCenteredRect(width, height);

          const newWindow: WindowState = {
            id: generateId(),
            appId,
            x: defaultRect?.x ?? rect.x,
            y: defaultRect?.y ?? rect.y,
            width,
            height,
            state: defaultRect?.state ?? "normal",
            zIndex: draft.nextZIndex,
          };
          draft.nextZIndex += 1;

          draft.windows[desktopId] = [...desktopWindows, newWindow];
          draft.activeWindowId[desktopId] = newWindow.id;
          maybeCompactZIndexes(draft);
        }),

      closeWindow: (desktopId, windowId) =>
        set((draft) => {
          const desktopWindows = draft.windows[desktopId] ?? [];
          const remaining = desktopWindows.filter((w) => w.id !== windowId);
          draft.windows[desktopId] = remaining;

          if (draft.activeWindowId[desktopId] === windowId) {
            const top = remaining.slice().sort((a, b) => b.zIndex - a.zIndex)[0];
            draft.activeWindowId[desktopId] = top?.id ?? null;
            if (top) {
              top.zIndex = draft.nextZIndex;
              draft.nextZIndex += 1;
            }
          }
          maybeCompactZIndexes(draft);
        }),

      focusWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (window) {
            window.zIndex = draft.nextZIndex;
            draft.nextZIndex += 1;
            maybeCompactZIndexes(draft);
          }
          draft.activeWindowId[desktopId] = windowId;
        }),

      moveWindow: (desktopId, windowId, rect) =>
        set((draft) => {
          const window = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (!window || window.state === "maximized") {
            return;
          }

          window.x = rect.x;
          window.y = rect.y;
          window.width = rect.width;
          window.height = rect.height;
        }),

      minimizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (window) {
            window.state = "minimized";
          }
        }),

      maximizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (window) {
            window.state = "maximized";
          }
        }),

      restoreWindow: (desktopId, windowId) =>
        set((draft) => {
          const window = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (window) {
            window.state = "normal";
          }
        }),

      setViewMode: (mode) =>
        set((draft) => {
          draft.viewMode = mode;
        }),

      reset: () => set(initialState),
    })),
    { name: "desktop-store" }
  )
);
