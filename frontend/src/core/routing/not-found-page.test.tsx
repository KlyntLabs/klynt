import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { render } from "@/test/render";
import NotFoundPage from "./not-found-page";

describe("NotFoundPage", () => {
  /**
   * Astryx's `Link` only renders an anchor — and only honours `as` — when `href` is set.
   * Without it, `as={RouterLink}` silently degrades to `<button type="button" to="/">`: no
   * href, no `link` role, no navigation. It looks right and does nothing.
   *
   * Asserting the role rather than the text is the whole point: the old markup rendered the
   * label perfectly while being unclickable.
   */
  it("offers a real link home, not a button that looks like one", () => {
    render(<NotFoundPage />);

    const link = screen.getByRole("link", { name: /home/i });

    expect(link).toHaveAttribute("href", "/");
  });
});
