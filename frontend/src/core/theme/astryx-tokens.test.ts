import { afterEach, describe, expect, it } from "vitest";
import { spacingPx } from "./astryx-tokens";

/**
 * jsdom does not evaluate Astryx's stylesheet, so `--spacing-*` reads back as "". These tests
 * exercise both paths: the live-token path (by stamping the property on <html>) and the fallback
 * (bare jsdom, where the n×4px scale is reconstructed).
 */
describe("spacingPx", () => {
  afterEach(() => {
    for (const s of [0, 4, 10]) document.documentElement.style.removeProperty(`--spacing-${s}`);
  });

  it("reads the live --spacing-<step> token in px", () => {
    document.documentElement.style.setProperty("--spacing-10", "40px");
    expect(spacingPx(10)).toBe(40);
  });

  it("falls back to the n×4px scale when the token is unreadable", () => {
    // bare jsdom: getComputedStyle returns "" for the custom property
    expect(spacingPx(0)).toBe(0);
    expect(spacingPx(4)).toBe(16);
    expect(spacingPx(10)).toBe(40);
  });

  it("falls back when the token holds a non-length value", () => {
    document.documentElement.style.setProperty("--spacing-4", "not-a-length");
    expect(spacingPx(4)).toBe(16);
  });
});
