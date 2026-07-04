import type { DesktopApp } from "../api/desktop-apps-api";
import {
  buildAppManifest,
  buildAppManifestFromSummary,
  mergeContent,
} from "./dynamic-app-manifest";

function makeApp(overrides: Partial<DesktopApp> & Pick<DesktopApp, "type">): DesktopApp {
  return {
    id: "app-1",
    title: "Test App",
    content: {},
    menuConfig: {},
    ownerId: null,
    locked: false,
    etag: "etag-1",
    ...overrides,
  };
}

describe("dynamic-app-manifest", () => {
  describe("mergeContent", () => {
    it("performs a shallow merge with overrides winning", () => {
      expect(mergeContent({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("returns a copy when overrides is empty", () => {
      const defaults = { a: 1 };
      const result = mergeContent(defaults, {});

      expect(result).toEqual(defaults);
      expect(result).not.toBe(defaults);
    });
  });

  describe("buildAppManifest", () => {
    it.each([
      ["markdown", "file-text", "markdown", { text: "# New Document\n" }],
      ["notes", "sticky-note", "notes", { text: "" }],
      ["video", "play", "video", { src: "" }],
      ["folder", "folder", "folder", {}],
    ] as const)("builds a manifest for %s apps", (type, icon, rendererId, defaultContent) => {
      const app = makeApp({ type });
      const manifest = buildAppManifest({ app });

      expect(manifest.appId).toBe("app-1");
      expect(manifest.type).toBe(type);
      expect(manifest.title).toBe("Test App");
      expect(manifest.icon).toBe(icon);
      expect(manifest.content).toEqual(defaultContent);
      expect(manifest.menuSchema.id).toBe(`${type}-menu`);
      expect(manifest.menuSchema.root).toBeInstanceOf(Array);
      expect(manifest.rendererId).toBe(rendererId);
      expect(manifest.locked).toBe(false);
      expect(manifest.etag).toBe("etag-1");
    });

    it("merges app content over defaults", () => {
      const app = makeApp({
        type: "markdown",
        content: { text: "# Custom\n" },
      });
      const manifest = buildAppManifest({ app });

      expect(manifest.content).toEqual({ text: "# Custom\n" });
    });

    it("keeps defaults when app content is empty", () => {
      const app = makeApp({ type: "markdown", content: {} });
      const manifest = buildAppManifest({ app });

      expect(manifest.content).toEqual({ text: "# New Document\n" });
    });

    it("uses menu overrides when provided", () => {
      const customRoot = [
        { type: "item" as const, id: "custom", label: "Custom", action: "app:delete" as const },
      ];
      const app = makeApp({ type: "markdown" });
      const manifest = buildAppManifest({
        app,
        menuOverrides: { id: "custom-menu", root: customRoot },
      });

      expect(manifest.menuSchema.id).toBe("custom-menu");
      expect(manifest.menuSchema.root).toEqual(customRoot);
    });

    it("falls back to default menu id when only root is overridden", () => {
      const customRoot = [
        { type: "item" as const, id: "custom", label: "Custom", action: "app:delete" as const },
      ];
      const app = makeApp({ type: "markdown" });
      const manifest = buildAppManifest({ app, menuOverrides: { root: customRoot } });

      expect(manifest.menuSchema.id).toBe("markdown-menu");
      expect(manifest.menuSchema.root).toEqual(customRoot);
    });

    it("throws for an invalid app type", () => {
      const app = makeApp({ type: "invalid" as "markdown" });

      expect(() => buildAppManifest({ app })).toThrow("Invalid app type: invalid");
    });
  });

  describe("buildAppManifestFromSummary", () => {
    it("returns the expected subset for a valid type", () => {
      const summary = {
        id: "summary-1",
        type: "video" as const,
        title: "My Video",
        ownerId: "owner-1",
        locked: true,
        etag: "etag-2",
      };
      const manifest = buildAppManifestFromSummary(summary);

      expect(manifest).toEqual({
        appId: "summary-1",
        type: "video",
        title: "My Video",
        icon: "play",
        rendererId: "video",
        locked: true,
        etag: "etag-2",
      });
    });

    it("throws for an invalid app type", () => {
      const summary = {
        id: "summary-1",
        type: "invalid" as "markdown",
        title: "Bad App",
        ownerId: null,
        locked: false,
        etag: "etag-3",
      };

      expect(() => buildAppManifestFromSummary(summary)).toThrow("Invalid app type: invalid");
    });
  });
});
