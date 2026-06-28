import axios from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { apiClient, generateIdempotencyKey } from "./api-client";

/**
 * Creates a throw-away axios client with the same case-transform interceptors
 * used by {@link apiClient}. This lets us verify the transform behavior for
 * error responses without the global auth interceptor wrapping the error.
 */
function createTransformingClient() {
  const client = axios.create({ baseURL: "/api/v1" });

  client.interceptors.request.use((config) => {
    if (config.data && typeof config.data === "object") {
      config.data = decamelizeKeys(config.data);
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      if (response.data && typeof response.data === "object") {
        response.data = camelizeKeys(response.data);
      }
      return response;
    },
    (error) => {
      if (error.response?.data && typeof error.response.data === "object") {
        error.response.data = camelizeKeys(error.response.data);
      }
      return Promise.reject(error);
    }
  );

  return client;
}

describe("apiClient", () => {
  it("has the configured baseURL", () => {
    expect(apiClient.defaults.baseURL).toBe(import.meta.env.VITE_API_BASE_URL || "/api/v1");
  });

  it("has the default JSON content-type header", () => {
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});

describe("request transform", () => {
  it("decamelizes request body keys before sending", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/v1/transform-test", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ received: true });
      })
    );

    await apiClient.post("/transform-test", {
      rememberMe: true,
      permissionIds: ["perm-1", "perm-2"],
      userProfile: { fullName: "Ada Lovelace" },
    });

    expect(capturedBody).toEqual({
      remember_me: true,
      permission_ids: ["perm-1", "perm-2"],
      user_profile: { full_name: "Ada Lovelace" },
    });
  });
});

describe("response transform", () => {
  it("camelizes response body keys", async () => {
    server.use(
      http.get("/api/v1/transform-test", () =>
        HttpResponse.json({
          data: {
            user_profile: {
              full_name: "Ada Lovelace",
              created_at: "2024-01-01T00:00:00Z",
            },
          },
        })
      )
    );

    const { data } = await apiClient.get("/transform-test");

    expect(data).toEqual({
      data: {
        userProfile: {
          fullName: "Ada Lovelace",
          createdAt: "2024-01-01T00:00:00Z",
        },
      },
    });
  });
});

describe("error response transform", () => {
  it("camelizes error response body keys", async () => {
    const client = createTransformingClient();

    server.use(
      http.get("/api/v1/transform-test", () =>
        HttpResponse.json(
          { error_code: "invalid_token", error_message: "Invalid token" },
          { status: 400 }
        )
      )
    );

    await expect(client.get("/transform-test")).rejects.toMatchObject({
      response: {
        data: { errorCode: "invalid_token", errorMessage: "Invalid token" },
      },
    });
  });
});

describe("generateIdempotencyKey", () => {
  it("returns a UUID string", () => {
    const key = generateIdempotencyKey();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });
});
