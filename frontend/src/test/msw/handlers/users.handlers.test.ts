import { describe, expect, it } from "vitest";
import { apiClient } from "@/core/api/api-client";

describe("users handlers", () => {
  it("returns conflict for duplicate email", async () => {
    await expect(
      apiClient.post("/auth/register", { email: "duplicate@example.com", password: "pass" })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns rate limited for rate email", async () => {
    await expect(
      apiClient.post("/auth/register", { email: "rate@example.com", password: "pass" })
    ).rejects.toMatchObject({ status: 429 });
  });

  it("returns user id on register", async () => {
    const { data } = await apiClient.post("/auth/register", {
      email: "new@example.com",
      password: "pass",
    });
    expect(data.data).toBeDefined();
  });

  it("returns unauthorized for locked email login", async () => {
    await expect(
      apiClient.post("/auth/login", { email: "locked@example.com", password: "pass" })
    ).rejects.toMatchObject({ status: 401 });
  });

  it("returns user on login", async () => {
    const { data } = await apiClient.post("/auth/login", {
      email: "ok@example.com",
      password: "pass",
    });
    expect(data.data.user).toBeDefined();
  });

  it("returns current user", async () => {
    const { data } = await apiClient.get("/users/me");
    expect(data.data.email).toBeDefined();
  });

  it("returns success on logout", async () => {
    const { data } = await apiClient.post("/auth/logout");
    expect(data.message).toBeDefined();
  });

  it("returns invalid token for invalid verify", async () => {
    await expect(apiClient.post("/auth/verify-email", { token: "invalid" })).rejects.toMatchObject({
      status: 400,
    });
  });

  it("returns success on valid verify", async () => {
    const { data } = await apiClient.post("/auth/verify-email", { token: "valid" });
    expect(data.message).toBeDefined();
  });

  it("returns success on request password reset", async () => {
    const { data } = await apiClient.post("/auth/request-password-reset", {
      email: "a@b.com",
    });
    expect(data.message).toBeDefined();
  });

  it("returns invalid token for invalid reset", async () => {
    await expect(
      apiClient.post("/auth/reset-password", { token: "invalid", new_password: "pass" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns success on valid reset", async () => {
    const { data } = await apiClient.post("/auth/reset-password", {
      token: "valid",
      new_password: "pass",
    });
    expect(data.message).toBeDefined();
  });
});
