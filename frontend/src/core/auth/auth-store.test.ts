import { describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "u-1",
  email: "test@example.com",
  name: "Test User",
  role: "student" as const,
  status: "active" as const,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("auth store", () => {
  it("sets and clears session", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setSession(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toBe(mockUser);

    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("resets to initial state", () => {
    useAuthStore.getState().setSession(mockUser);
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("tracks loading state", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
