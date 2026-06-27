import type { WritableDraft } from "immer";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type WindowState = "normal" | "minimized" | "maximized";

export interface Window {
  id: string;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  state: WindowState;
  zIndex: number;
}

export type WindowGeometry = Pick<Window, "x" | "y" | "width" | "height">;

type WindowManagerState = {
  windows: Record<string, Window[]>;
  activeWindowId: Record<string, string | null>;
  nextZIndex: number;
  preMaximizeRects: Record<string, WindowGeometry>;

  openApp: (desktopId: string, appId: string, defaultRect?: Partial<Window>) => void;
  closeWindow: (desktopId: string, windowId: string) => void;
  focusWindow: (desktopId: string, windowId: string) => void;
  moveWindow: (desktopId: string, windowId: string, rect: WindowGeometry) => void;
  minimizeWindow: (desktopId: string, windowId: string) => void;
  maximizeWindow: (desktopId: string, windowId: string) => void;
  restoreWindow: (desktopId: string, windowId: string) => void;
  reset: () => void;
};

const DEFAULT_WINDOW_WIDTH = 680;
const DEFAULT_WINDOW_HEIGHT = 520;
const Z_INDEX_BASE = 100;
const Z_INDEX_COMPACT_THRESHOLD = 10000;
const MENUBAR_HEIGHT = 36;

const EMPTY_WINDOWS: Window[] = [];

const compactZIndexes = (draft: WritableDraft<WindowManagerState>) => {
  const allWindows = Object.values(draft.windows).flat();
  const sorted = allWindows.slice().sort((a, b) => a.zIndex - b.zIndex);
  sorted.forEach((w, index) => {
    w.zIndex = Z_INDEX_BASE + index;
  });
  draft.nextZIndex = Z_INDEX_BASE + sorted.length + 1;
};

const maybeCompactZIndexes = (draft: WritableDraft<WindowManagerState>) => {
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

const getCenteredRect = (width: number, height: number): WindowGeometry => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  return {
    x: Math.max(16, (vw - width) / 2),
    y: Math.max(MENUBAR_HEIGHT * 2, (vh - height) / 2 - MENUBAR_HEIGHT),
    width,
    height,
  };
};

const initialState: Omit<
  WindowManagerState,
  | "openApp"
  | "closeWindow"
  | "focusWindow"
  | "moveWindow"
  | "minimizeWindow"
  | "maximizeWindow"
  | "restoreWindow"
  | "reset"
> = {
  windows: {},
  activeWindowId: {},
  nextZIndex: Z_INDEX_BASE,
  preMaximizeRects: {},
};

export const useWindowManager = create<WindowManagerState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      openApp: (desktopId, appId, defaultRect) =>
        set((draft) => {
          const desktopWindows = draft.windows[desktopId] ?? [];

          const width = defaultRect?.width ?? DEFAULT_WINDOW_WIDTH;
          const height = defaultRect?.height ?? DEFAULT_WINDOW_HEIGHT;
          const rect = getCenteredRect(width, height);

          const newWindow: Window = {
            id: generateId(),
            appId,
            x: defaultRect?.x ?? rect.x,
            y: defaultRect?.y ?? rect.y,
            width,
            height,
            state: (defaultRect?.state as WindowState) ?? "normal",
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
          delete draft.preMaximizeRects[windowId];

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
          const win = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (win) {
            win.zIndex = draft.nextZIndex;
            draft.nextZIndex += 1;
            maybeCompactZIndexes(draft);
          }
          draft.activeWindowId[desktopId] = windowId;
        }),

      moveWindow: (desktopId, windowId, rect) =>
        set((draft) => {
          const win = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (!win || win.state === "maximized") {
            return;
          }

          win.x = rect.x;
          win.y = rect.y;
          win.width = rect.width;
          win.height = rect.height;
        }),

      minimizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const win = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (win) {
            win.state = "minimized";
          }
        }),

      maximizeWindow: (desktopId, windowId) =>
        set((draft) => {
          const win = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (!win) {
            return;
          }

          if (win.state !== "maximized") {
            draft.preMaximizeRects[windowId] = {
              x: win.x,
              y: win.y,
              width: win.width,
              height: win.height,
            };
          }

          win.state = "maximized";
          win.x = 0;
          win.y = MENUBAR_HEIGHT;
          win.width = globalThis.window.innerWidth;
          win.height = globalThis.window.innerHeight - MENUBAR_HEIGHT;
        }),

      restoreWindow: (desktopId, windowId) =>
        set((draft) => {
          const win = draft.windows[desktopId]?.find((w) => w.id === windowId);
          if (!win) {
            return;
          }

          win.state = "normal";

          const prevRect = draft.preMaximizeRects[windowId];
          if (prevRect) {
            win.x = prevRect.x;
            win.y = prevRect.y;
            win.width = prevRect.width;
            win.height = prevRect.height;
            delete draft.preMaximizeRects[windowId];
          }
        }),

      reset: () => set(initialState),
    })),
    { name: "window-manager" }
  )
);

export const useDesktopWindows = (desktopId: string) =>
  useWindowManager((s) => s.windows[desktopId] ?? EMPTY_WINDOWS);

export const useActiveWindowId = (desktopId: string) =>
  useWindowManager((s) => s.activeWindowId[desktopId] ?? null);
