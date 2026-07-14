import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

/**
 * `system` follows the OS. `light` / `dark` pin it.
 *
 * This is the prop Astryx's `<Theme mode>` takes, and it is the ONLY thing that may set the
 * colour mode — Astryx syncs `data-theme` onto `<html>` from it, which is what portalled
 * content (dialogs, popovers, toasts) reads to resolve its `light-dark()` tokens. Setting a
 * class on `<body>` by hand, as the old shadcn layer half-did, does nothing.
 */
export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  reset: () => void;
}

const STORAGE_KEY = "klynt-theme-mode";

/**
 * Fall back to memory when there is no localStorage. Two environments have none: jsdom under
 * Vitest, and a browser in a locked-down privacy mode. Reaching for `localStorage` directly
 * throws in both, taking the whole store — and therefore the app — down with it. The
 * preference simply does not survive a reload there, which is the correct degradation.
 */
function safeStorage(): Storage {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.getItem(STORAGE_KEY);
      return localStorage;
    }
  } catch {
    // fall through to the in-memory shim
  }

  const memory = new Map<string, string>();
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
    removeItem: (key) => void memory.delete(key),
    clear: () => memory.clear(),
    key: (index) => Array.from(memory.keys())[index] ?? null,
    get length() {
      return memory.size;
    },
  };
}

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        mode: "system",
        setMode: (mode) => set({ mode }, false, "theme/setMode"),
        reset: () => set({ mode: "system" }, false, "theme/reset"),
      }),
      { name: STORAGE_KEY, storage: createJSONStorage(safeStorage) }
    ),
    { name: "ThemeStore" }
  )
);
