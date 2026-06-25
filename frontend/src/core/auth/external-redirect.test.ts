import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isExternalUrl, navigateExternal } from "./external-redirect";

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

describe("navigateExternal", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  beforeEach(() => {
    replaceSpy = vi.fn();
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        host: "lvh.me:5174",
        hostname: "lvh.me",
        protocol: "http:",
        port: "5174",
        href: "http://lvh.me:5174/login",
        replace: replaceSpy,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("resolves relative URL against current origin and navigates", () => {
    navigateExternal("/dashboard");
    expect(replaceSpy).toHaveBeenCalledWith("http://lvh.me:5174/dashboard");
  });

  it("navigates to absolute https URL", () => {
    navigateExternal("https://example.com");
    expect(replaceSpy).toHaveBeenCalledWith("https://example.com/");
  });

  it("throws for non-HTTP(S) URL", () => {
    expect(() => navigateExternal("javascript:alert(1)")).toThrow(
      "Refusing to navigate to non-HTTP(S) URL: javascript:alert(1)"
    );
  });
});
