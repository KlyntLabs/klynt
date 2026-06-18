import { describe, expect, it } from "vitest";
import { useToastStore } from "./toast-store";

describe("toast store", () => {
  it("adds and removes toasts", () => {
    useToastStore.getState().reset();
    useToastStore.getState().addToast({ message: "hello", type: "info", duration: 3000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("resets to initial state", () => {
    useToastStore.getState().addToast({ message: "hello", type: "info", duration: 3000 });
    useToastStore.getState().reset();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("clears all toasts", () => {
    useToastStore.getState().reset();
    useToastStore.getState().addToast({ message: "one", type: "info", duration: 3000 });
    useToastStore.getState().addToast({ message: "two", type: "error", duration: 3000 });
    useToastStore.getState().clearToasts();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
