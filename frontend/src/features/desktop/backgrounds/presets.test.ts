import { describe, expect, it } from "vitest";
import { backgroundPresets, getPresetById } from "./presets";

describe("backgroundPresets", () => {
  it("contains three presets", () => {
    expect(backgroundPresets).toHaveLength(3);
  });

  it("has unique ids", () => {
    const ids = backgroundPresets.map((preset) => preset.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("marks dots-dark as dark", () => {
    const preset = getPresetById("dots-dark");
    expect(preset?.dark).toBe(true);
  });

  it("returns the fabric preset by id", () => {
    const preset = getPresetById("fabric");
    expect(preset?.id).toBe("fabric");
    expect(preset?.src).toBe("/wallpapers/fabric.svg");
  });

  it("returns undefined for an unknown id", () => {
    expect(getPresetById("missing")).toBeUndefined();
  });
});
