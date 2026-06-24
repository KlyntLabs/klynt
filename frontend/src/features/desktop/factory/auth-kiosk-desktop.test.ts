import { describe, expect, it } from "vitest";
import { authApps } from "../apps/registry/auth-apps";
import { authMenubar } from "../menubar/auth-menubar";
import { buildAuthKioskDesktop } from "./auth-kiosk-desktop";

describe("buildAuthKioskDesktop", () => {
  it.each([
    "login",
    "register",
    "verify-email",
    "forgot-password",
    "reset-password",
  ] as const)("builds a locked single-app desktop for %s", (appId) => {
    const config = buildAuthKioskDesktop(appId);
    const expectedApp = authApps.find((a) => a.id === appId);

    expect(config.id).toBe(`auth:${appId}`);
    expect(config.title).toBe("Klynt");
    expect(config.locked).toBe(true);
    expect(config.singleApp).toBe(true);
    expect(config.apps).toHaveLength(1);
    expect(config.apps[0]).toBe(expectedApp);
    expect(config.menubar).toBe(authMenubar);
    expect(config.background).toEqual({ presetId: "fabric" });
    expect(config.context).toEqual({ user: null });
    expect(config.persistence.canEdit()).toBe(false);
  });

  it("throws for an unknown app id", () => {
    expect(() => buildAuthKioskDesktop("unknown")).toThrow("Unknown auth app: unknown");
  });
});
