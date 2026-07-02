import { act, renderHook } from "@testing-library/react";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/core/api/api-error";
import { desktopAppsApi } from "../api/desktop-apps-api";
import { useContentAutosave } from "./use-content-autosave";

const slug = "acme";
const appId = "app-1";
const initialEtag = "etag-1";
const newEtag = "etag-2";

function makeAppResponse(etag: string) {
  return {
    data: {
      data: {
        id: appId,
        type: "notes" as const,
        title: "Test App",
        content: {},
        menu_config: {},
        owner_id: null,
        locked: false,
        etag,
      },
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as never,
  };
}

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

function apiError(status: number): ApiError {
  return new ApiError({ message: "API error", status, code: "TEST_ERROR" });
}

describe("useContentAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls update with the correct payload after the debounce window", async () => {
    const updateSpy = vi
      .spyOn(desktopAppsApi, "update")
      .mockResolvedValue(makeAppResponse(newEtag));

    const content = { text: "hello" };
    const menuConfig = { theme: "dark" };

    renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content,
        menuConfig,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(slug, appId, {
      etag: initialEtag,
      content,
      menu_config: menuConfig,
    });
  });

  it("calls onEtagChange with the new etag and clears error on success", async () => {
    vi.spyOn(desktopAppsApi, "update").mockResolvedValue(makeAppResponse(newEtag));
    const onEtagChange = vi.fn();

    const { result } = renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content: { text: "hello" },
        onEtagChange,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onEtagChange).toHaveBeenCalledWith(newEtag);
    expect(result.current.error).toBeNull();
  });

  it("calls onConflict and sets a conflict error on 409 responses", async () => {
    vi.spyOn(desktopAppsApi, "update").mockRejectedValue(axiosError(409));
    const onConflict = vi.fn();

    const { result } = renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content: { text: "hello" },
        onConflict,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe("The content was modified by another session.");
  });

  it("calls onConflict for ApiError 409 responses", async () => {
    vi.spyOn(desktopAppsApi, "update").mockRejectedValue(apiError(409));
    const onConflict = vi.fn();

    const { result } = renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content: { text: "hello" },
        onConflict,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(result.current.error?.message).toBe("The content was modified by another session.");
  });

  it("calls onError and sets the error on network errors", async () => {
    const networkError = new Error("network failure");
    vi.spyOn(desktopAppsApi, "update").mockRejectedValue(networkError);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content: { text: "hello" },
        onError,
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(onError).toHaveBeenCalledWith(networkError);
    expect(result.current.error).toBe(networkError);
  });

  it("reflects isSaving as true during the save and false after", async () => {
    vi.spyOn(desktopAppsApi, "update").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(makeAppResponse(newEtag) as never), 100);
        })
    );

    const { result } = renderHook(() =>
      useContentAutosave({
        slug,
        appId,
        etag: initialEtag,
        content: { text: "hello" },
      })
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isSaving).toBe(false);
  });

  it("does not call update when appId is empty", async () => {
    const updateSpy = vi
      .spyOn(desktopAppsApi, "update")
      .mockResolvedValue(makeAppResponse(newEtag));

    renderHook(() =>
      useContentAutosave({
        slug,
        appId: "",
        etag: initialEtag,
        content: { text: "hello" },
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("does not call update when slug is empty", async () => {
    const updateSpy = vi
      .spyOn(desktopAppsApi, "update")
      .mockResolvedValue(makeAppResponse(newEtag));

    renderHook(() =>
      useContentAutosave({
        slug: "",
        appId,
        etag: initialEtag,
        content: { text: "hello" },
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("uses the latest etag from a previous save for subsequent saves", async () => {
    const updateSpy = vi
      .spyOn(desktopAppsApi, "update")
      .mockResolvedValueOnce(makeAppResponse(newEtag))
      .mockResolvedValueOnce(makeAppResponse("etag-3"));

    const { rerender } = renderHook(
      ({ content }) =>
        useContentAutosave({
          slug,
          appId,
          etag: initialEtag,
          content,
        }),
      {
        initialProps: { content: { text: "first" } },
      }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    rerender({ content: { text: "second" } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy).toHaveBeenLastCalledWith(slug, appId, {
      etag: newEtag,
      content: { text: "second" },
      menu_config: undefined,
    });
  });
});
