import { describe, expect, it } from "vitest";
import {
  type AppTypeDefinition,
  appTypeRegistry,
  getAppType,
  isAppType,
  listAppTypes,
} from "./app-type-registry";

describe("app-type-registry", () => {
  describe("getAppType", () => {
    it("returns the markdown definition", () => {
      const definition = getAppType("markdown");

      expect(definition.id).toBe("markdown");
      expect(definition.label).toBe("Markdown");
      expect(definition.icon).toBe("file-text");
      expect(definition.rendererId).toBe("markdown");
      expect(definition.defaultContent).toEqual({ text: "# New Document\n" });
    });

    it("throws for an unknown app type", () => {
      expect(() => getAppType("invalid" as "markdown")).toThrow("Unknown app type: invalid");
    });
  });

  describe("listAppTypes", () => {
    it("returns 4 entries", () => {
      expect(listAppTypes()).toHaveLength(4);
    });
  });

  describe("isAppType", () => {
    it("returns true for a valid app type", () => {
      expect(isAppType("video")).toBe(true);
    });

    it("returns false for an invalid app type", () => {
      expect(isAppType("invalid")).toBe(false);
    });
  });

  describe("definitions", () => {
    it.each(
      Object.values(appTypeRegistry)
    )("$id has required fields", (definition: AppTypeDefinition) => {
      expect(definition.id).toBeDefined();
      expect(definition.label).toBeTruthy();
      expect(definition.icon).toBeTruthy();
      expect(definition.defaultContent).toBeDefined();
      expect(definition.defaultMenuSchema).toBeDefined();
      expect(definition.defaultMenuSchema.root).toBeInstanceOf(Array);
      expect(definition.rendererId).toBeTruthy();
    });
  });
});
