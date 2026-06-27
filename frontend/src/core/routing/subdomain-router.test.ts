import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAdminUrl,
  buildApexUrl,
  buildLoginUrl,
  buildProfileUrl,
  buildSubdomainUrl,
  buildTenantUrl,
  getHostContext,
  isApexHost,
  isProfileHost,
  isTenantHost,
} from "./subdomain-router";

const originalDomain = import.meta.env.VITE_APP_DOMAIN;
const originalProtocol = import.meta.env.VITE_APP_PROTOCOL;

function stubLocation(host: string) {
  const [hostname, port] = host.split(":");
  Object.defineProperty(window, "location", {
    value: { host, hostname, protocol: "http:", port: port || "", href: `http://${host}/` },
    writable: true,
    configurable: true,
  });
}

describe("subdomain-router", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    stubLocation("lvh.me:5174");
    import.meta.env.VITE_APP_DOMAIN = "lvh.me";
    import.meta.env.VITE_APP_PROTOCOL = "http";
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
    import.meta.env.VITE_APP_PROTOCOL = originalProtocol;
  });

  it("parses tenant from hostname", () => {
    stubLocation("acme.lvh.me:5174");
    expect(getHostContext()).toEqual({ type: "tenant", slug: "acme" });
    expect(isTenantHost()).toBe(true);
    expect(isApexHost()).toBe(false);
  });

  it("parses profile from hostname", () => {
    stubLocation("u.jayden.lvh.me:5174");
    expect(getHostContext()).toEqual({ type: "profile", username: "jayden" });
    expect(isProfileHost()).toBe(true);
  });

  it("builds tenant URL", () => {
    expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
  });

  it("builds profile URL", () => {
    expect(buildProfileUrl("jayden")).toBe("http://u.jayden.lvh.me:5174/");
  });

  it("builds login URL with redirect", () => {
    expect(buildLoginUrl("http://acme.lvh.me:5174/members")).toBe(
      "http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers"
    );
  });

  it("builds login URL without redirect", () => {
    expect(buildLoginUrl()).toBe("http://login.lvh.me:5174/");
  });

  it("builds admin URL", () => {
    expect(buildAdminUrl("/admin")).toBe("http://admin.lvh.me:5174/admin");
  });

  it("builds apex URL", () => {
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });

  it("builds arbitrary subdomain URL", () => {
    expect(buildSubdomainUrl("api", "/v1/status")).toBe("http://api.lvh.me:5174/v1/status");
  });

  it("normalizes path without leading slash", () => {
    expect(buildTenantUrl("acme", "members")).toBe("http://acme.lvh.me:5174/members");
    expect(buildApexUrl("dashboard")).toBe("http://lvh.me:5174/dashboard");
    expect(buildAdminUrl("admin")).toBe("http://admin.lvh.me:5174/admin");
  });

  it("strips www from apex host when building tenant URL", () => {
    stubLocation("www.lvh.me:5174");
    expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
    expect(isApexHost()).toBe(true);
  });

  it("falls back to configured domain for unknown hosts", () => {
    stubLocation("api.lvh.me:5174");
    expect(getHostContext()).toEqual({ type: "reserved", subdomain: "api" });
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });
});
