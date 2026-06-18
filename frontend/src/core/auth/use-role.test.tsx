import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRole } from "./auth-identity";
import { useAuthStore } from "./auth-store";

describe("useRole", () => {
  it("identifies admin role", () => {
    useAuthStore.getState().reset();
    useAuthStore
      .getState()
      .setSession({ id: "u-1", email: "a@b.com", name: "A", role: "admin" }, "token");
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasRole(["admin", "teacher"])).toBe(true);
  });

  it("identifies parent role", () => {
    useAuthStore.getState().reset();
    useAuthStore
      .getState()
      .setSession({ id: "u-2", email: "p@b.com", name: "P", role: "parent" }, "token");
    const { result } = renderHook(() => useRole());
    expect(result.current.isParent).toBe(true);
    expect(result.current.isTeacher).toBe(false);
  });
});
