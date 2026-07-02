import { describe, expect, it } from "vitest";
import { createNoOpAdapter } from "./no-op-adapter";

describe("createNoOpAdapter", () => {
  it("returns a successful null layout by default", async () => {
    const adapter = createNoOpAdapter();
    const result = await adapter.load("test");
    expect(result).toEqual({ ok: true, layout: null });
  });

  it("returns a successful save result", async () => {
    const adapter = createNoOpAdapter();
    const result = await adapter.save("test", {
      version: 1,
      backgroundPresetId: "default",
      iconTree: [],
      windows: [],
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns canEdit value", () => {
    expect(createNoOpAdapter().canEdit()).toBe(false);
    expect(createNoOpAdapter(true).canEdit()).toBe(true);
  });
});
