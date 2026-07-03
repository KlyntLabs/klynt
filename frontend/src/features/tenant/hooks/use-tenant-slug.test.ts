import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseParams = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

import { useTenantSlug } from "./use-tenant-slug";

const originalDomain = import.meta.env.VITE_APP_DOMAIN;

function stubLocation(host: string) {
  const [hostname, port] = host.split(":");
  Object.defineProperty(window, "location", {
    value: { host, hostname, protocol: "http:", port: port || "", href: `http://${host}/` },
    writable: true,
    configurable: true,
  });
}

describe("useTenantSlug", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    stubLocation("lvh.me:5174");
    import.meta.env.VITE_APP_DOMAIN = "lvh.me";
    mockUseParams.mockReturnValue({});
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    import.meta.env.VITE_APP_DOMAIN = originalDomain;
    vi.clearAllMocks();
  });

  it("returns slug from tenant subdomain hostname", () => {
    stubLocation("acme.lvh.me:5174");
    const { result } = renderHook(() => useTenantSlug());
    expect(result.current).toBe("acme");
  });

  it("falls back to route param on non-tenant hosts", () => {
    stubLocation("admin.lvh.me:5174");
    mockUseParams.mockReturnValue({ slug: "from-route" });
    const { result } = renderHook(() => useTenantSlug());
    expect(result.current).toBe("from-route");
  });

  it("returns empty string when neither host nor route provides a slug", () => {
    stubLocation("admin.lvh.me:5174");
    mockUseParams.mockReturnValue({});
    const { result } = renderHook(() => useTenantSlug());
    expect(result.current).toBe("");
  });
});
