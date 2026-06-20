import axios from "axios";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw/server";
import { type AuthInterceptorDeps, registerAuthInterceptor } from "./auth-interceptor";

function createFakeDeps(overrides?: Partial<AuthInterceptorDeps>): AuthInterceptorDeps {
  return {
    getToken: vi.fn(() => null),
    clearSession: vi.fn(),
    logger: { info: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

function createTestClient() {
  return axios.create({ baseURL: "/api/v1" });
}

describe("authInterceptor", () => {
  it("attaches the current token to outgoing requests", async () => {
    const token = "token-123";
    const deps = createFakeDeps({ getToken: vi.fn(() => token) });
    const client = createTestClient();
    registerAuthInterceptor(client, deps);

    let capturedToken: string | null = null;
    server.use(
      http.get("/api/v1/protected", ({ request }) => {
        capturedToken = request.headers.get("Authorization");
        return HttpResponse.json({ ok: true });
      })
    );

    await client.get("/protected");

    expect(deps.getToken).toHaveBeenCalled();
    expect(capturedToken).toBe(`Bearer ${token}`);
  });

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
