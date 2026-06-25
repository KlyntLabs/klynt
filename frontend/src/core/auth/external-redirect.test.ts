import { describe, expect, it } from "vitest";
import { isExternalUrl } from "./external-redirect";

describe("isExternalUrl", () => {
  it("returns true for absolute https URLs", () => {
    expect(isExternalUrl("https://example.com")).toBe(true);
  });

  it("returns true for absolute http URLs", () => {
    expect(isExternalUrl("http://example.com")).toBe(true);
  });

  it("returns false for relative paths", () => {
    expect(isExternalUrl("/dashboard")).toBe(false);
  });

  it("returns false for bare relative paths", () => {
    expect(isExternalUrl("dashboard")).toBe(false);
  });

  it("returns false for protocol-relative URLs", () => {
    expect(isExternalUrl("//example.com")).toBe(false);
  });
});
