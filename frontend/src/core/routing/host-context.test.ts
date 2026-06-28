import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getHostContext, isApexHost, isProfileHost, isTenantHost } from "./host-context";

const baseDomain = "klynt.dev";

const originalDomain = import.meta.env.VITE_APP_DOMAIN;

describe("getHostContext", () => {
  it("returns apex for base domain", () => {
    expect(getHostContext("klynt.dev", baseDomain)).toEqual({ type: "apex" });
  });

  it("returns apex for www", () => {
    expect(getHostContext("www.klynt.dev", baseDomain)).toEqual({ type: "apex" });
  });

  it("returns login for login subdomain", () => {
    expect(getHostContext("login.klynt.dev", baseDomain)).toEqual({ type: "login" });
  });

  it("returns admin for admin subdomain", () => {
    expect(getHostContext("admin.klynt.dev", baseDomain)).toEqual({ type: "admin" });
  });

  it("returns tenant for slug subdomain", () => {
    expect(getHostContext("acme.klynt.dev", baseDomain)).toEqual({ type: "tenant", slug: "acme" });
  });

  it("lowercases hostnames (login)", () => {
    expect(getHostContext("Login.Klynt.Dev", baseDomain)).toEqual({ type: "login" });
  });

  it("lowercases hostnames (tenant)", () => {
    expect(getHostContext("ACME.Klynt.Dev", baseDomain)).toEqual({ type: "tenant", slug: "acme" });
  });

  it("returns profile for u.username subdomain", () => {
    expect(getHostContext("u.jayden.klynt.dev", baseDomain)).toEqual({
      type: "profile",
      username: "jayden",
    });
  });

  it("returns reserved for u subdomain", () => {
    expect(getHostContext("u.klynt.dev", baseDomain)).toEqual({
      type: "reserved",
      subdomain: "u",
    });
  });

  it("returns reserved for api subdomain", () => {
    expect(getHostContext("api.klynt.dev", baseDomain)).toEqual({
      type: "reserved",
      subdomain: "api",
    });
  });

  it("returns unknown for multi-level subdomains", () => {
    expect(getHostContext("foo.bar.klynt.dev", baseDomain)).toEqual({
      type: "unknown",
      subdomain: "foo.bar",
    });
  });

  it("returns apex for hostname not matching base domain", () => {
    expect(getHostContext("acme.example.com", baseDomain)).toEqual({ type: "apex" });
  });

  it("returns apex for suffix-match attack domain", () => {
    expect(getHostContext("evilklynt.dev", baseDomain)).toEqual({ type: "apex" });
  });
});

describe("host predicates", () => {
  beforeEach(() => {
    import.meta.env.VITE_APP_DOMAIN = baseDomain;
  });

  afterEach(() => {
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
  });

  it("isApexHost identifies apex hosts", () => {
    expect(isApexHost("klynt.dev")).toBe(true);
    expect(isApexHost("www.klynt.dev")).toBe(true);
    expect(isApexHost("acme.klynt.dev")).toBe(false);
    expect(isApexHost("u.jayden.klynt.dev")).toBe(false);
  });

  it("isTenantHost identifies tenant hosts", () => {
    expect(isTenantHost("acme.klynt.dev")).toBe(true);
    expect(isTenantHost("klynt.dev")).toBe(false);
    expect(isTenantHost("login.klynt.dev")).toBe(false);
  });

  it("isProfileHost identifies profile hosts", () => {
    expect(isProfileHost("u.jayden.klynt.dev")).toBe(true);
    expect(isProfileHost("u.klynt.dev")).toBe(false);
    expect(isProfileHost("acme.klynt.dev")).toBe(false);
    expect(isProfileHost("klynt.dev")).toBe(false);
  });
});
