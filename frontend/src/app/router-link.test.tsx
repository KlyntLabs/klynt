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
