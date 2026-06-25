import { render as rtlRender } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/core/auth/auth-store";
import { HostRouter } from "./host-router";

const originalLocation = window.location;

function mockHost(href: string) {
  const url = new URL(href);
  vi.stubGlobal("location", {
    ...originalLocation,
    host: url.host,
    hostname: url.hostname,
    href: url.href,
    protocol: url.protocol,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    replace: vi.fn(),
  });
  vi.stubGlobal("import.meta.env.VITE_APP_DOMAIN", "lvh.me");
  vi.stubGlobal("import.meta.env.VITE_APP_PROTOCOL", "http");
}

describe("HostRouter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().reset();
    useAuthStore.getState().setLoading(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects apex tenant path to tenant subdomain", () => {
    mockHost("http://lvh.me:5174/tenants/acme/members");
    rtlRender(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://acme.lvh.me:5174/members");
  });

  it("redirects apex username path to profile subdomain", () => {
    mockHost("http://lvh.me:5174/jayden");
    rtlRender(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://u.jayden.lvh.me:5174/");
  });

  it("redirects apex login path to login subdomain", () => {
    mockHost("http://lvh.me:5174/login");
    rtlRender(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://login.lvh.me:5174/");
  });

  it("redirects apex dashboard path to admin subdomain", () => {
    mockHost("http://lvh.me:5174/dashboard");
    rtlRender(<HostRouter />);
    expect(window.location.replace).toHaveBeenCalledWith("http://admin.lvh.me:5174/");
  });
});
