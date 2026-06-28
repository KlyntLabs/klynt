import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useRedirectTarget } from "./use-redirect-target";

vi.mock("@/core/routing/host-context", () => ({
  getBaseDomain: vi.fn(() => "klynt.local"),
  getHostContext: vi.fn(() => ({ type: "apex" })),
}));

function createWrapper(initialEntries: string[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe("useRedirectTarget", () => {
  it("returns the from query param when present", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/?from=/dashboard"]),
    });
    expect(result.current).toBe("/dashboard");
  });

  it("returns the fallback when from is missing", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/"]),
    });
    expect(result.current).toBe("/fallback");
  });

  it("uses safe absolute URL on app subdomain", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/?from=https://app.klynt.local/dashboard"]),
    });
    expect(result.current).toBe("https://app.klynt.local/dashboard");
  });

  it("uses fallback for unsafe external URL", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/?from=https://evil.com"]),
    });
    expect(result.current).toBe("/fallback");
  });

  it("uses relative URL", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/?from=/courses/intro"]),
    });
    expect(result.current).toBe("/courses/intro");
  });

  it("uses fallback for protocol-relative URL", () => {
    const { result } = renderHook(() => useRedirectTarget("/fallback"), {
      wrapper: createWrapper(["/?from=//evil.com"]),
    });
    expect(result.current).toBe("/fallback");
  });
});
