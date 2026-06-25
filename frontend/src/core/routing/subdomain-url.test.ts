import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAdminUrl,
  buildApexUrl,
  buildLoginUrl,
  buildProfileUrl,
  buildTenantUrl,
} from "./subdomain-url";

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

describe("subdomain-url", () => {
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

  it("builds tenant URL", () => {
    expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
  });

  it("builds profile URL", () => {
    expect(buildProfileUrl("jayden")).toBe("http://u.jayden.lvh.me:5174/");
  });

  it("builds login URL with from param", () => {
    expect(buildLoginUrl("http://acme.lvh.me:5174/members")).toBe(
      "http://login.lvh.me:5174/?from=http%3A%2F%2Facme.lvh.me%3A5174%2Fmembers"
    );
  });

  it("builds login URL without from param", () => {
    expect(buildLoginUrl()).toBe("http://login.lvh.me:5174/");
  });

  it("builds admin URL", () => {
    expect(buildAdminUrl("/admin")).toBe("http://admin.lvh.me:5174/admin");
  });

  it("builds apex URL", () => {
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });

  it("normalizes path without leading slash", () => {
    expect(buildTenantUrl("acme", "members")).toBe("http://acme.lvh.me:5174/members");
    expect(buildApexUrl("dashboard")).toBe("http://lvh.me:5174/dashboard");
    expect(buildAdminUrl("admin")).toBe("http://admin.lvh.me:5174/admin");
  });

  it("builds URLs from a tenant subdomain context", () => {
    stubLocation("acme.lvh.me:5174");
    expect(buildTenantUrl("other", "/members")).toBe("http://other.lvh.me:5174/members");
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });

  it("builds URLs from a login subdomain context", () => {
    stubLocation("login.lvh.me:5174");
    expect(buildLoginUrl()).toBe("http://login.lvh.me:5174/");
    expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });

  it("strips www from apex host when building tenant URL", () => {
    stubLocation("www.lvh.me:5174");
    expect(buildTenantUrl("acme", "/members")).toBe("http://acme.lvh.me:5174/members");
    expect(buildApexUrl("/dashboard")).toBe("http://lvh.me:5174/dashboard");
  });
});
