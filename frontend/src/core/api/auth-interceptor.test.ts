import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { server } from "@/test/msw/server";
import { apiClient } from "./api-client";

describe("authInterceptor", () => {
  it("clears session on 401 for protected endpoint", async () => {
    const clearSession = vi.spyOn(useAuthStore.getState(), "clearSession");
    server.use(
      http.get("/api/v1/protected", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(apiClient.get("/protected")).rejects.toThrow();
    expect(clearSession).toHaveBeenCalledOnce();
    clearSession.mockRestore();
  });

  it("does not clear session on 401 for login endpoint", async () => {
    const clearSession = vi.spyOn(useAuthStore.getState(), "clearSession");
    server.use(
      http.post("/api/v1/auth/login", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(apiClient.post("/auth/login", {})).rejects.toThrow();
    expect(clearSession).not.toHaveBeenCalled();
    clearSession.mockRestore();
  });
});
