import axios from "axios";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { type AuthInterceptorDeps, registerAuthInterceptor } from "./auth-interceptor";

function createFakeDeps(overrides?: Partial<AuthInterceptorDeps>): AuthInterceptorDeps {
  return {
    clearSession: vi.fn(),
    logger: { info: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

function createTestClient() {
  return axios.create({ baseURL: "/api/v1" });
}

describe("authInterceptor", () => {
  it("clears session on 401 for protected endpoint", async () => {
    const deps = createFakeDeps();
    const client = createTestClient();
    registerAuthInterceptor(client, deps);

    server.use(
      http.get("/api/v1/protected", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(client.get("/protected")).rejects.toThrow();
    expect(deps.clearSession).toHaveBeenCalledOnce();
  });

  it("does not clear session on 401 for login endpoint", async () => {
    const deps = createFakeDeps();
    const client = createTestClient();
    registerAuthInterceptor(client, deps);

    server.use(
      http.post("/api/v1/auth/login", () => {
        return new HttpResponse(null, { status: 401 });
      })
    );

    await expect(client.post("/auth/login", {})).rejects.toThrow();
    expect(deps.clearSession).not.toHaveBeenCalled();
  });
});
