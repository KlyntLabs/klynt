import { afterEach, describe, expect, it } from "vitest";
import { easeStandard, tween } from "./astryx-motion";

/**
 * jsdom does not evaluate Astryx's imported stylesheet, so `getComputedStyle` returns "" for the
 * `--duration-*` / `--ease-standard` custom properties. These tests therefore exercise both paths:
 * the live-token path (by stamping the property inline on <html>) and the fallback path (bare
 * jsdom). Both must yield Astryx's values in framer-motion's shape.
 */
describe("astryx-motion", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--duration-medium");
    document.documentElement.style.removeProperty("--ease-standard");
  });

  it("reads the live --duration token and converts ms to seconds", () => {
    document.documentElement.style.setProperty("--duration-medium", "300ms");
    expect(tween("medium").duration).toBeCloseTo(0.3, 3);
  });

  it("reads the live --ease-standard token as a bezier array", () => {
    document.documentElement.style.setProperty("--ease-standard", "cubic-bezier(0.24, 1, 0.4, 1)");
    expect(easeStandard()).toEqual([0.24, 1, 0.4, 1]);
  });

  it("falls back to theme-neutral's shipped values when the token is unreadable", () => {
    // bare jsdom: no stylesheet, getComputedStyle returns "". Fallback mirrors what
    // theme-neutral 0.1.5 actually ships (125/700ms), not the docs' scale (175/975ms).
    expect(tween("fast").duration).toBeCloseTo(0.125, 3);
    expect(tween("slow").duration).toBeCloseTo(0.7, 3);
    expect(easeStandard()).toEqual([0.24, 1, 0.4, 1]);
  });

  it("passes choreography through without touching duration/ease", () => {
    const t = tween("medium", { delay: 0.2, repeat: 3 });
    expect(t).toMatchObject({ type: "tween", delay: 0.2, repeat: 3 });
    expect(typeof t.duration).toBe("number");
  });
});
