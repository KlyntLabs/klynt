import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDesktopShortcuts } from "./use-desktop-shortcuts";

function fireKeyDown(eventInit: KeyboardEventInit) {
  const event = new KeyboardEvent("keydown", eventInit);
  window.dispatchEvent(event);
}

describe("useDesktopShortcuts", () => {
  it("calls onNewApp with folder type for Ctrl+Shift+N", () => {
    const onNewApp = vi.fn();
    renderHook(() => useDesktopShortcuts({ onNewApp }));
    fireKeyDown({ key: "N", ctrlKey: true, shiftKey: true });
    expect(onNewApp).toHaveBeenCalledTimes(1);
    expect(onNewApp).toHaveBeenCalledWith("folder");
  });

  it("calls onNewApp with folder type for Cmd+Shift+N", () => {
    const onNewApp = vi.fn();
    renderHook(() => useDesktopShortcuts({ onNewApp }));
    fireKeyDown({ key: "n", metaKey: true, shiftKey: true });
    expect(onNewApp).toHaveBeenCalledTimes(1);
    expect(onNewApp).toHaveBeenCalledWith("folder");
  });

  it("does not call onNewApp for Alt+Shift+N", () => {
    const onNewApp = vi.fn();
    renderHook(() => useDesktopShortcuts({ onNewApp }));
    fireKeyDown({ key: "N", altKey: true, shiftKey: true });
    expect(onNewApp).not.toHaveBeenCalled();
  });

  it("calls onDeleteSelected when Delete is pressed with a selection", () => {
    const onDeleteSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: "app-1" }));
    fireKeyDown({ key: "Delete" });
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it("calls onDeleteSelected when Backspace is pressed with a selection", () => {
    const onDeleteSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: "app-1" }));
    fireKeyDown({ key: "Backspace" });
    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  it("does not call onDeleteSelected when no icon is selected", () => {
    const onDeleteSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: null }));
    fireKeyDown({ key: "Delete" });
    expect(onDeleteSelected).not.toHaveBeenCalled();
  });

  it("calls onOpenSelected when Enter is pressed with a selection", () => {
    const onOpenSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onOpenSelected, selectedAppId: "app-1" }));
    fireKeyDown({ key: "Enter" });
    expect(onOpenSelected).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenSelected when Space is pressed with a selection", () => {
    const onOpenSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onOpenSelected, selectedAppId: "app-1" }));
    fireKeyDown({ key: " " });
    expect(onOpenSelected).toHaveBeenCalledTimes(1);
  });

  it("does not call onOpenSelected when no icon is selected", () => {
    const onOpenSelected = vi.fn();
    renderHook(() => useDesktopShortcuts({ onOpenSelected, selectedAppId: null }));
    fireKeyDown({ key: "Enter" });
    expect(onOpenSelected).not.toHaveBeenCalled();
  });

  it("calls onCloseOverlay when Escape is pressed", () => {
    const onCloseOverlay = vi.fn();
    renderHook(() => useDesktopShortcuts({ onCloseOverlay }));
    fireKeyDown({ key: "Escape" });
    expect(onCloseOverlay).toHaveBeenCalledTimes(1);
  });

  it("calls onRefresh and prevents default for Ctrl+R", () => {
    const onRefresh = vi.fn();
    renderHook(() => useDesktopShortcuts({ onRefresh }));
    const event = new KeyboardEvent("keydown", { key: "r", ctrlKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("calls onRefresh and prevents default for Cmd+R", () => {
    const onRefresh = vi.fn();
    renderHook(() => useDesktopShortcuts({ onRefresh }));
    const event = new KeyboardEvent("keydown", { key: "r", metaKey: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("does not call onRefresh for Ctrl+Shift+R", () => {
    const onRefresh = vi.fn();
    renderHook(() => useDesktopShortcuts({ onRefresh }));
    fireKeyDown({ key: "r", ctrlKey: true, shiftKey: true });
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("ignores keydown when target is an input", () => {
    const onDeleteSelected = vi.fn();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: "app-1" }));
    const event = new KeyboardEvent("keydown", { key: "Delete", bubbles: true });
    input.dispatchEvent(event);
    expect(onDeleteSelected).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("ignores keydown when target is a textarea", () => {
    const onDeleteSelected = vi.fn();
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: "app-1" }));
    const event = new KeyboardEvent("keydown", { key: "Delete", bubbles: true });
    textarea.dispatchEvent(event);
    expect(onDeleteSelected).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("ignores keydown when target is contenteditable", () => {
    const onDeleteSelected = vi.fn();
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    document.body.appendChild(div);
    div.focus();
    renderHook(() => useDesktopShortcuts({ onDeleteSelected, selectedAppId: "app-1" }));
    const event = new KeyboardEvent("keydown", { key: "Delete", bubbles: true });
    div.dispatchEvent(event);
    expect(onDeleteSelected).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("does nothing for unrelated keys", () => {
    const onNewApp = vi.fn();
    const onDeleteSelected = vi.fn();
    const onOpenSelected = vi.fn();
    const onRefresh = vi.fn();
    const onCloseOverlay = vi.fn();
    renderHook(() =>
      useDesktopShortcuts({
        onNewApp,
        onDeleteSelected,
        onOpenSelected,
        onRefresh,
        onCloseOverlay,
        selectedAppId: "app-1",
      })
    );
    fireKeyDown({ key: "a" });
    expect(onNewApp).not.toHaveBeenCalled();
    expect(onDeleteSelected).not.toHaveBeenCalled();
    expect(onOpenSelected).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
    expect(onCloseOverlay).not.toHaveBeenCalled();
  });
});
