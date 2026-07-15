import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@/test/render";
import { useThemeStore } from "./theme-store";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    useThemeStore.getState().reset();
  });

  it("defaults to following the system", () => {
    render(<ThemeToggle />);

    expect(useThemeStore.getState().mode).toBe("system");
  });

  it("switches the theme mode when a new option is picked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /dark/i }));

    expect(useThemeStore.getState().mode).toBe("dark");
  });

  it("offers light, dark and system", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("combobox"));

    expect(await screen.findByRole("option", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /system/i })).toBeInTheDocument();
  });
});
