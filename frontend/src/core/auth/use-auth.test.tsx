import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuth } from "./use-auth";
import { useAuthStore } from "./auth-store";

describe("useAuth", () => {
  it("reflects auth store state", () => {
    useAuthStore.getState().reset();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      result.current.setSession(
        { id: "u-1", email: "a@b.com", name: "A", role: "student" },
        "token"
      );
    });
    expect(result.current.isAuthenticated).toBe(true);
  });
});
