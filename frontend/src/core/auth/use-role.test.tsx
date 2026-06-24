import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRole } from "./auth-identity";
import { useAuthStore } from "./auth-store";

function setUser(role: "admin" | "instructor" | "student") {
  useAuthStore.getState().setSession({
    id: "u-1",
    email: "a@b.com",
    username: "a",
    name: "A",
    role,
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
  });
}

describe("useRole", () => {
  it("identifies admin role", () => {
    useAuthStore.getState().reset();
    setUser("admin");
    const { result } = renderHook(() => useRole());
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.hasRole(["admin", "instructor"])).toBe(true);
  });

  it("identifies instructor role", () => {
    useAuthStore.getState().reset();
    setUser("instructor");
    const { result } = renderHook(() => useRole());
    expect(result.current.isInstructor).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it("identifies student role", () => {
    useAuthStore.getState().reset();
    setUser("student");
    const { result } = renderHook(() => useRole());
    expect(result.current.isStudent).toBe(true);
    expect(result.current.isInstructor).toBe(false);
  });
});
