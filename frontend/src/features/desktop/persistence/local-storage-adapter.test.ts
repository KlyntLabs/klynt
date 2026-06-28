import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalStorageAdapter } from "./local-storage-adapter";
import type { DesktopLayout } from "./types";

const desktopId = "test-desktop";
const storageKey = `klynt-desktop-layout:${desktopId}`;

function createStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
}

function createLayout(): DesktopLayout {
  return {
    version: 1,
    backgroundPresetId: "default",
    icons: [{ appId: "app-1", x: 10, y: 20 }],
    windows: [
      {
        appId: "app-1",
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        state: "normal",
      },
    ],
  };
}

describe("createLocalStorageAdapter", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      writable: true,
    });
  });

  it("returns canEdit true by default", () => {
    const adapter = createLocalStorageAdapter();
    expect(adapter.canEdit()).toBe(true);
  });

  it("returns the configured canEdit value", () => {
    const adapter = createLocalStorageAdapter(false);
    expect(adapter.canEdit()).toBe(false);
  });

  it("returns null layout when no stored data", async () => {
    localStorage.removeItem(storageKey);
    const adapter = createLocalStorageAdapter();
    const result = await adapter.load(desktopId);
    expect(result).toEqual({ ok: true, layout: null });
  });

  it("loads a stored layout successfully", async () => {
    const layout = createLayout();
    localStorage.setItem(storageKey, JSON.stringify(layout));
    const adapter = createLocalStorageAdapter();
    const result = await adapter.load(desktopId);
    expect(result).toEqual({ ok: true, layout });
  });

  it("saves a layout successfully", async () => {
    const layout = createLayout();
    const adapter = createLocalStorageAdapter();
    const result = await adapter.save(desktopId, layout);
    expect(result).toEqual({ ok: true });
    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(layout));
  });

  it("returns an unknown error when localStorage.getItem throws", async () => {
    const getItemSpy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("storage failure");
    });
    const adapter = createLocalStorageAdapter();
    const result = await adapter.load(desktopId);
    expect(result).toEqual({ ok: false, error: "unknown", retryable: false });
    getItemSpy.mockRestore();
  });

  it("returns an unknown error when JSON.parse throws", async () => {
    localStorage.setItem(storageKey, "not-json");
    const adapter = createLocalStorageAdapter();
    const result = await adapter.load(desktopId);
    expect(result).toEqual({ ok: false, error: "unknown", retryable: false });
  });

  it("returns an unknown error when localStorage.setItem throws", async () => {
    const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage failure");
    });
    const adapter = createLocalStorageAdapter();
    const result = await adapter.save(desktopId, createLayout());
    expect(result).toEqual({ ok: false, error: "unknown", retryable: false });
    setItemSpy.mockRestore();
  });
});
