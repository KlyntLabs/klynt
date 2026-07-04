import { act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigateExternal } from "@/core/auth/external-redirect";
import { render } from "@/test/render";
import { InvalidTenantPage } from "./invalid-tenant-page";

vi.mock("@/core/auth/external-redirect", () => ({
  navigateExternal: vi.fn(),
}));

describe("InvalidTenantPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renders system invalid message and redirects after 5 seconds", () => {
    render(<InvalidTenantPage />);

    expect(screen.getByText(/System invalid/i)).toBeInTheDocument();
    expect(screen.getByText(/This organization does not exist/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(navigateExternal).toHaveBeenCalledTimes(1);
    expect(navigateExternal).toHaveBeenCalledWith(expect.stringContaining("http://localhost"));
  });
});
