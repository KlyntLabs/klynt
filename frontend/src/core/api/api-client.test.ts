import { describe, expect, it } from "vitest";
import { apiClient, generateIdempotencyKey } from "./api-client";

describe("apiClient", () => {
  it("has the configured baseURL", () => {
    expect(apiClient.defaults.baseURL).toBe(import.meta.env.VITE_API_BASE_URL || "/api/v1");
  });

  it("has the default JSON content-type header", () => {
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});

describe("generateIdempotencyKey", () => {
  it("returns a UUID string", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
