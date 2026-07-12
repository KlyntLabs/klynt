import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouterLink } from "./router-link";

test("maps href to a client-side router link", () => {
  render(
    <MemoryRouter>
      <RouterLink href="/dashboard" className="x">
        go
      </RouterLink>
    </MemoryRouter>
  );
  const link = screen.getByRole("link", { name: "go" });
  expect(link).toHaveAttribute("href", "/dashboard");
  expect(link).toHaveClass("x");
});

test("renders external hrefs as a plain anchor", () => {
  render(
    <MemoryRouter>
      <RouterLink href="https://example.com">out</RouterLink>
    </MemoryRouter>
  );
  expect(screen.getByRole("link", { name: "out" })).toHaveAttribute("href", "https://example.com");
});

test("renders protocol-relative hrefs as a plain anchor, not an app route", () => {
  // Rendered WITHOUT a router on purpose: a plain <a> needs no router
  // context, but React Router's <Link> calls useHref/useResolvedPath and
  // throws outside a <Router>. So if the !href.startsWith("//") guard is
  // ever dropped, "//evil.com" would route through <Link> and this render
  // would throw instead of producing a plain external anchor — locking the
  // guard against a silent protocol-relative-URL regression.
  render(<RouterLink href="//evil.com">nope</RouterLink>);
  const link = screen.getByRole("link", { name: "nope" });
  expect(link.tagName).toBe("A");
  expect(link).toHaveAttribute("href", "//evil.com");
});
