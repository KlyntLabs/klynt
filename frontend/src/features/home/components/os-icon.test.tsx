import { screen } from "@testing-library/react";
import { Home } from "lucide-react";
import { describe, expect, it } from "vitest";
import { routePaths } from "@/core/routing/route-paths";
import { render } from "@/test/render";
import { OsIcon } from "./os-icon";

describe("OsIcon", () => {
  it("renders a labelled link to the given route", () => {
    render(<OsIcon to={routePaths.register} icon={Home} label="Register" />);

    const link = screen.getByRole("link", { name: "Register" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", routePaths.register);
  });
});
