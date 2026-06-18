import { describe, expect, it } from "vitest";
import { ApiError, createApiError } from "./api-error";
import { AxiosError } from "axios";

describe("createApiError", () => {
  it("creates error from axios error with response body", () => {
    const axiosError = new AxiosError("Request failed", undefined, undefined, undefined, {
      status: 409,
      data: { code: "conflict", message: "email already registered" },
    } as never);

    const error = createApiError(axiosError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.code).toBe("conflict");
    expect(error.message).toBe("email already registered");
    expect(error.isUnauthorized).toBe(false);
  });

  it("marks 401 errors as unauthorized", () => {
    const axiosError = new AxiosError("Unauthorized", undefined, undefined, undefined, {
      status: 401,
      data: { code: "unauthorized", message: "Unauthorized" },
    } as never);

    const error = createApiError(axiosError);
    expect(error.isUnauthorized).toBe(true);
  });

  it("falls back for unknown errors", () => {
    const error = createApiError("boom");
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.code).toBe("UNKNOWN_ERROR");
  });
});
