import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import RegisterSuccessPage from "./register-success-page";

describe("RegisterSuccessPage", () => {
  /**
   * See not-found-page.test.tsx: Astryx's `Link` renders an anchor only when `href` is set.
   * Without it this "Go to login" degraded to a non-navigating button — the one action on the
   * page a freshly-registered user needs.
   */
  it("offers a real link to login, not a button that looks like one", () => {
    render(<RegisterSuccessPage />);

    const link = screen.getByRole("link", { name: /go to login/i });

    expect(link).toHaveAttribute("href", "/login");
  });
});
