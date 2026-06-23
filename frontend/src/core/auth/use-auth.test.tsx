import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useAuth } from "./auth-identity";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "u-1",
  email: "a@b.com",
  name: "A",
  role: "student" as const,
  status: "active" as const,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("useAuth", () => {
  it("reflects auth store state", () => {
    useAuthStore.getState().reset();
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      result.current.setSession(mockUser);
    });
    expect(result.current.isAuthenticated).toBe(true);
  });
});
