import { create, type StateCreator } from "zustand";

let _idCounter = 0;
const generateId = () => `window-${++_idCounter}-${Date.now().toString(36)}`;

export interface WindowState {
  id: string;
  route: string;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isActive: boolean;
}

interface DesktopStore {
  viewMode: "desktop" | "website";
  windows: WindowState[];
  activeWindowId: string | null;
  cookieDismissed: boolean;
  nextZIndex: number;

  setViewMode: (mode: "desktop" | "website") => void;
  openWindow: (
    route: string,
    title: string,
    options?: Partial<Omit<WindowState, "id" | "zIndex">>
  ) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  setWindowPosition: (id: string, position: { x: number; y: number }) => void;
  setWindowSize: (id: string, size: { width: number; height: number }) => void;
  dismissCookie: () => void;
}

const DEFAULT_WINDOW_WIDTH = 680;
const DEFAULT_WINDOW_HEIGHT = 520;

const getCenteredPosition = (width: number, height: number, zIndex: number): WindowState => {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const x = Math.max(16, (vw - width) / 2);
  const y = Math.max(48, (vh - height) / 2 - 36);
  return {
    id: "",
    route: "",
    title: "",
    position: { x, y },
    size: { width, height },
    zIndex,
    isMinimized: false,
    isMaximized: false,
    isActive: true,
  };
};

const desktopStore: StateCreator<DesktopStore> = (set, get) => ({
  viewMode: "desktop",
  windows: [],
  activeWindowId: null,
  cookieDismissed: (() => {
    try {
      return localStorage.getItem("cookie-dismissed") === "true";
    } catch {
      return false;
    }
  })(),
  nextZIndex: 100,

  setViewMode: (mode) => set({ viewMode: mode }),

  openWindow: (route, title, options) => {
    const state = get();
    const existingWindow = state.windows.find(
      (w: WindowState) => w.route === route && !w.isMinimized
    );
    if (existingWindow) {
      get().focusWindow(existingWindow.id);
      return;
    }

    const newZIndex = state.nextZIndex + 1;
    const size = {
      width: options?.size?.width || DEFAULT_WINDOW_WIDTH,
      height: options?.size?.height || DEFAULT_WINDOW_HEIGHT,
    };
    const windowTitle = title || route;
    const base = getCenteredPosition(size.width, size.height, newZIndex);

    const newWindow: WindowState = {
      ...base,
      id: generateId(),
      route,
      title: windowTitle,
      position: options?.position || base.position,
      size: options?.size || size,
      isMinimized: false,
      isMaximized: false,
      isActive: true,
    };

    set({
      windows: [...state.windows.map((w: WindowState) => ({ ...w, isActive: false })), newWindow],
      activeWindowId: newWindow.id,
      nextZIndex: newZIndex,
    });
  },

  closeWindow: (id) => {
    const state = get();
    const filtered = state.windows.filter((w: WindowState) => w.id !== id);
    const newActiveId = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
    set({
      windows: filtered.map((w: WindowState) =>
        w.id === newActiveId ? { ...w, isActive: true } : w
      ),
      activeWindowId: newActiveId,
    });
  },

  focusWindow: (id) => {
    const state = get();
    const newZIndex = state.nextZIndex + 1;
    set({
      windows: state.windows.map((w: WindowState) => ({
        ...w,
        isActive: w.id === id,
        zIndex: w.id === id ? newZIndex : w.zIndex,
      })),
      activeWindowId: id,
      nextZIndex: newZIndex,
    });
  },

  minimizeWindow: (id) => {
    const state = get();
    const updated = state.windows.map((w: WindowState) =>
      w.id === id ? { ...w, isMinimized: true, isActive: false } : w
    );
    const remaining = updated.filter((w: WindowState) => !w.isMinimized);
    const newActiveId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    set({
      windows: updated.map((w: WindowState) =>
        w.id === newActiveId ? { ...w, isActive: true } : w
      ),
      activeWindowId: newActiveId,
    });
  },

  maximizeWindow: (id) => {
    const state = get();
    set({
      windows: state.windows.map((w: WindowState) =>
        w.id === id ? { ...w, isMaximized: true } : w
      ),
    });
  },

  restoreWindow: (id) => {
    const state = get();
    set({
      windows: state.windows.map((w: WindowState) =>
        w.id === id ? { ...w, isMaximized: false, isMinimized: false } : w
      ),
    });
  },

  setWindowPosition: (id, position) => {
    const state = get();
    set({
      windows: state.windows.map((w: WindowState) => (w.id === id ? { ...w, position } : w)),
    });
  },

  setWindowSize: (id, size) => {
    const state = get();
    set({
      windows: state.windows.map((w: WindowState) => (w.id === id ? { ...w, size } : w)),
    });
  },

  dismissCookie: () => {
    try {
      localStorage.setItem("cookie-dismissed", "true");
    } catch {
      // ignore
    }
    set({ cookieDismissed: true });
  },
});

export const useDesktopStore = create(desktopStore);
