import { describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

const mockUser = {
  id: "u-1",
  email: "test@example.com",
  name: "Test User",
  role: "student" as const,
};

describe("auth store", () => {
  it("sets and clears session", () => {
    useAuthStore.getState().reset();
    useAuthStore.getState().setSession(mockUser, "token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe("token");

    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("resets to initial state", () => {
    useAuthStore.getState().setSession(mockUser, "token");
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
